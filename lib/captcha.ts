// A self-hosted image captcha for the admin login (no Google/Cloudflare: they are slow or blocked
// from Iran). The answer is never sent to the browser: the cookie holds an HMAC of it with the
// site's secret, an expiry and a one-time id, so it can't be guessed offline or reused.

import crypto from "node:crypto";
import path from "node:path";
import { readSigned, signValue } from "./auth";

export const CAPTCHA_COOKIE = "ns_cap";
const TTL = 5 * 60_000;
const LEN = 5;
// No 0/1/7 look-alikes trouble in Vazirmatn digits; Latin digits are what admins type.
const DIGITS = "23456789";

const FONT = path.join(process.cwd(), "node_modules", "vazirmatn", "fonts", "ttf", "Vazirmatn-Bold.ttf");
const digest = (answer: string, nonce: string) => crypto.createHash("sha256").update(`${nonce}:${answer}`).digest("base64url");

const used = new Map<string, number>();

/** A new challenge: the PNG and the cookie value that checks it. */
export async function newCaptcha(): Promise<{ png: Buffer; cookie: string }> {
  const answer = Array.from({ length: LEN }, () => DIGITS[crypto.randomInt(DIGITS.length)]).join("");
  const nonce = crypto.randomBytes(9).toString("base64url");
  const sharp = (await import("sharp")).default;
  const W = 220, H = 72;
  const rnd = (a: number, b: number) => a + Math.random() * (b - a);
  const layers: { input: Buffer; left: number; top: number }[] = [];
  for (let i = 0; i < LEN; i++) {
    const glyph = await sharp({
      text: { text: `<span foreground="#${["f4d58d", "ffffff", "e8b04b", "f0e6c8"][i % 4]}">${answer[i]}</span>`, font: `Vazirmatn ${Math.round(rnd(30, 40))}`, fontfile: FONT, rgba: true, dpi: 72 },
    })
      .rotate(rnd(-28, 28), { background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    const meta = await sharp(glyph).metadata();
    layers.push({ input: glyph, left: Math.max(0, Math.min(W - (meta.width ?? 30), Math.round(14 + i * 40 + rnd(-6, 6)))), top: Math.max(0, Math.min(H - (meta.height ?? 40), Math.round(rnd(4, 20)))) });
  }
  // Noise: crossing curves and dots over and under the digits.
  const curve = () =>
    `<path d="M${rnd(-10, 30)} ${rnd(10, 62)} C ${rnd(40, 90)} ${rnd(-20, 92)}, ${rnd(120, 170)} ${rnd(-20, 92)}, ${rnd(190, 230)} ${rnd(10, 62)}" stroke="rgba(${Math.round(rnd(150, 255))},${Math.round(rnd(120, 220))},${Math.round(rnd(60, 160))},${rnd(0.45, 0.8).toFixed(2)})" stroke-width="${rnd(1.5, 3).toFixed(1)}" fill="none"/>`;
  const dots = Array.from({ length: 70 }, () => `<circle cx="${rnd(0, W).toFixed(1)}" cy="${rnd(0, H).toFixed(1)}" r="${rnd(0.6, 1.8).toFixed(1)}" fill="rgba(255,255,255,${rnd(0.2, 0.6).toFixed(2)})"/>`).join("");
  const svg = (inner: string) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${inner}</svg>`);
  const png = await sharp(svg(`<rect width="100%" height="100%" rx="10" fill="#3a0d12"/>${curve()}${curve()}${dots}`))
    .composite([...layers, { input: svg(`${curve()}${curve()}${curve()}`), left: 0, top: 0 }])
    .png()
    .toBuffer();
  return { png, cookie: signValue({ d: digest(answer, nonce), n: nonce, exp: Date.now() + TTL }) };
}

const toLatin = (s: string) => s.replace(/[۰-۹]/g, (c) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(c))).replace(/[٠-٩]/g, (c) => String("٠١٢٣٤٥٦٧٨٩".indexOf(c))).replace(/\s+/g, "");

/** True once per challenge when the typed answer matches (Persian or Latin digits). */
export function checkCaptcha(cookie: string | undefined, typed: string): boolean {
  const c = readSigned<{ d: string; n: string; exp: number }>(cookie);
  const now = Date.now();
  for (const [k, until] of used) if (until < now) used.delete(k);
  if (!c || typeof c.exp !== "number" || c.exp < now || used.has(c.n)) return false;
  used.set(c.n, c.exp);
  const a = Buffer.from(digest(toLatin(typed), c.n));
  const b = Buffer.from(c.d);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
