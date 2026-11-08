// A cover picture for a news post that came without one: the club's colours and logo
// on a 16:9 frame. No text is drawn (the headline is on the page), so no font is needed.

import fs from "node:fs";
import path from "node:path";
import { FRAME } from "./photo-frame.ts";

/** Small differences from post to post (angle, glow position) so covers don't all look the same. */
function variant(seed: string) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.codePointAt(0)!) >>> 0;
  return { angle: 20 + (h % 50), glowX: 20 + ((h >> 3) % 60), glowY: 15 + ((h >> 7) % 50) };
}

export async function makeCover(seed: string, logoFile: string, brand = "#8e1b2e", accent = "#c9a45c"): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  const { width, height } = FRAME;
  const v = variant(seed);
  const stripes = Array.from({ length: 14 }, (_, i) => `<rect x="${i * 140 - 200}" y="-200" width="34" height="${height + 400}" fill="#ffffff" opacity="0.025" transform="rotate(${v.angle} ${width / 2} ${height / 2})"/>`).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0b0b0d"/><stop offset="0.55" stop-color="${brand}"/><stop offset="1" stop-color="#2a080e"/></linearGradient>
      <radialGradient id="r" cx="${v.glowX}%" cy="${v.glowY}%" r="55%"><stop offset="0" stop-color="${accent}" stop-opacity="0.35"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>${stripes}<rect width="100%" height="100%" fill="url(#r)"/>
    <rect x="0" y="${height - 10}" width="100%" height="10" fill="${accent}" opacity="0.8"/>
  </svg>`;
  const layers: { input: Buffer; left: number; top: number }[] = [];
  try {
    const size = Math.round(height * 0.5);
    const logo = await sharp(fs.readFileSync(logoFile)).resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
    layers.push({ input: logo, left: Math.round((width - size) / 2), top: Math.round((height - size) / 2) - 20 });
  } catch {
    /* no logo: the colours alone */
  }
  return sharp(Buffer.from(svg)).composite(layers).webp({ quality: 85 }).toBuffer();
}

/** Where the site's logo file is on disk (uploaded logo, or the bundled one). */
export function logoPath(logoUrl: string, uploadsDir: string, publicDir = path.join(process.cwd(), "public")): string {
  return logoUrl.startsWith("/uploads/") ? path.join(uploadsDir, logoUrl.replace(/^\/uploads\//, "").split("?")[0]) : path.join(publicDir, logoUrl.split("?")[0]);
}
