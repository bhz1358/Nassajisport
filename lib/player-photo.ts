// One look for every player photo («استودیوی نساجی»): the player cut out from a plain studio
// background and set on the club's dark red, with the shirt number large behind them. Photos
// shot elsewhere (no plain background) keep their scene, graded and framed the same way.
// Output: 800×1000 WebP.

import fs from "node:fs";
import path from "node:path";

const W = 800;
const H = 1000;
export const PHOTO_STYLE = 1; // bump when the look changes, so photos can be redone

type Sharp = typeof import("sharp").default;

/** Removes a plain (near-uniform, light) background reachable from the edges; null if there isn't one. */
async function cutout(sharp: Sharp, input: Buffer): Promise<Buffer | null> {
  const { data, info } = await sharp(input).rotate().resize(1200, 1500, { fit: "inside", withoutEnlargement: true }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const px = (i: number) => [data[i * 4], data[i * 4 + 1], data[i * 4 + 2]];
  // The background colour: the average of the border; it must be light and even.
  // Top and sides only: a studio portrait is usually cut by the bottom edge.
  const border: number[] = [];
  for (let x = 0; x < w; x += 4) border.push(x);
  for (let y = 0; y < h; y += 4) border.push(y * w, y * w + w - 1);
  const avg = [0, 0, 0];
  for (const i of border) px(i).forEach((v, k) => (avg[k] += v / border.length));
  const dist = (i: number) => Math.hypot(...px(i).map((v, k) => v - avg[k]));
  const even = border.filter((i) => dist(i) < 28).length / border.length;
  if (even < 0.8 || Math.min(...avg) < 170) return null;
  // How tight to be: a clean studio white allows a small tolerance, which keeps light parts
  // of the kit (a white collar, the badge) that are only a little darker than the backdrop.
  const spread = Math.sqrt(border.reduce((sum, i) => sum + dist(i) ** 2, 0) / border.length);
  const tol = Math.min(40, Math.max(9, spread * 3 + 6));
  // Flood from the edges through pixels close to that colour.
  const bg = new Uint8Array(w * h);
  const stack = border.filter((i) => dist(i) < tol);
  for (const i of stack) bg[i] = 1;
  while (stack.length) {
    const i = stack.pop()!;
    const x = i % w;
    for (const n of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) {
      if (n < 0 || n >= w * h || bg[n]) continue;
      if (dist(n) < tol) {
        bg[n] = 1;
        stack.push(n);
      }
    }
  }
  // One more pixel into the light fringe along the outline (anti-aliasing), not further.
  const fringe: number[] = [];
  for (let i = 0; i < w * h; i++) {
    if (bg[i]) continue;
    const x = i % w;
    const near = (x > 0 && bg[i - 1]) || (x < w - 1 && bg[i + 1]) || (i >= w && bg[i - w]) || (i + w < w * h && bg[i + w]);
    if (near && dist(i) < 70) fringe.push(i);
  }
  for (const i of fringe) bg[i] = 1;
  const alpha = Buffer.alloc(w * h);
  for (let i = 0; i < w * h; i++) alpha[i] = bg[i] ? 0 : 255;
  // Soften the edge a little so the cut doesn't look jagged.
  const soft = await sharp(alpha, { raw: { width: w, height: h, channels: 1 } }).blur(1.2).raw().toBuffer({ resolveWithObject: true });
  const step = soft.info.channels;
  const rgba = Buffer.from(data);
  for (let i = 0; i < w * h; i++) rgba[i * 4 + 3] = soft.data[i * step];
  return sharp(rgba, { raw: { width: w, height: h, channels: 4 } }).trim({ threshold: 1 }).png().toBuffer();
}

function background(number?: number): Buffer {
  const num = number
    ? `<text x="${W - 40}" y="300" text-anchor="end" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="300" fill="#e6b450" fill-opacity="0.07" stroke="#e6b450" stroke-opacity="0.35" stroke-width="4">${number}</text>`
    : "";
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs>
      <radialGradient id="g" cx="50%" cy="38%" r="70%"><stop offset="0" stop-color="#9c1a2c"/><stop offset="0.45" stop-color="#4a0b16"/><stop offset="1" stop-color="#0e0a0d"/></radialGradient>
      <pattern id="s" width="26" height="26" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)"><rect width="13" height="26" fill="#ffffff" fill-opacity="0.025"/></pattern>
      <radialGradient id="glow" cx="50%" cy="45%" r="40%"><stop offset="0" stop-color="#ff4a5c" stop-opacity="0.35"/><stop offset="1" stop-color="#ff4a5c" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#g)"/><rect width="${W}" height="${H}" fill="url(#s)"/>
    ${num}
    <rect width="${W}" height="${H}" fill="url(#glow)"/>
  </svg>`);
}

const FRONT = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset="0.68" stop-color="#0e0a0d" stop-opacity="0"/><stop offset="1" stop-color="#0e0a0d" stop-opacity="0.85"/></linearGradient>
    <radialGradient id="v" cx="50%" cy="45%" r="75%"><stop offset="0.65" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.45"/></radialGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#e6b450" stop-opacity="0"/><stop offset="0.5" stop-color="#f0c96a"/><stop offset="1" stop-color="#e6b450" stop-opacity="0"/></linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#f)"/><rect width="${W}" height="${H}" fill="url(#v)"/>
  <rect x="0" y="${H - 6}" width="${W}" height="6" fill="url(#gold)"/>
</svg>`);

/** The styled photo, as WebP. */
export async function stylePlayerPhoto(input: Buffer, number?: number): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  const cut = await cutout(sharp, input).catch(() => null);
  if (cut) {
    // The player fills the frame from the bottom, head near the top third.
    const player = await sharp(cut).resize(Math.round(W * 0.98), Math.round(H * 0.9), { fit: "inside" }).modulate({ brightness: 1.03, saturation: 1.06 }).linear(1.06, -6).png().toBuffer();
    const meta = await sharp(player).metadata();
    // A soft dark shadow behind the player, from their own outline.
    const outline = await sharp(player).ensureAlpha().extractChannel(3).blur(18).linear(0.6, 0).png().toBuffer();
    const glow = await sharp({ create: { width: meta.width!, height: meta.height!, channels: 3, background: { r: 0, g: 0, b: 0 } } }).joinChannel(outline).png().toBuffer();
    const left = Math.round((W - meta.width!) / 2);
    const top = H - meta.height!;
    return sharp(background(number))
      .composite([
        { input: glow, left: left + 6, top: top + 10 },
        { input: player, left, top },
        { input: FRONT, left: 0, top: 0 },
      ])
      .webp({ quality: 86 })
      .toBuffer();
  }
  // A photo with its own scene: the same frame, number and colour, the scene toned toward the club's red.
  const scene = await sharp(input)
    .rotate()
    .resize(W, H, { fit: "cover", position: "attention" })
    .modulate({ saturation: 0.7, brightness: 0.92 })
    .linear(1.1, -12)
    .png()
    .toBuffer();
  const tone = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs><pattern id="s" width="26" height="26" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)"><rect width="13" height="26" fill="#ffffff" fill-opacity="0.03"/></pattern></defs>
    <rect width="${W}" height="${H}" fill="#8a1424" fill-opacity="0.32"/><rect width="${W}" height="${H}" fill="url(#s)"/></svg>`);
  const num = number
    ? Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><text x="${W - 40}" y="300" text-anchor="end" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="300" fill="#e6b450" fill-opacity="0.08" stroke="#e6b450" stroke-opacity="0.45" stroke-width="4">${number}</text></svg>`)
    : undefined;
  return sharp(scene)
    .composite([{ input: tone, blend: "soft-light" }, ...(num ? [{ input: num, left: 0, top: 0 }] : []), { input: FRONT, left: 0, top: 0 }])
    .webp({ quality: 86 })
    .toBuffer();
}

/** Photos bundled with the site (content/player-photos/<name>.jpg|webp), by player name. */
export function bundledPhoto(name: string): string | undefined {
  const dir = path.join(process.cwd(), "content", "player-photos");
  const key = name.replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/[\s‌]+/g, "-");
  for (const ext of [".jpg", ".jpeg", ".png", ".webp"]) {
    const f = path.join(dir, key + ext);
    if (fs.existsSync(f)) return f;
  }
}
