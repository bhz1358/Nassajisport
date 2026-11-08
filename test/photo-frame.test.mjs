import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { fitToFrame, FRAME } from "../lib/photo-frame.ts";

const photo = (w, h) => sharp({ create: { width: w, height: h, channels: 3, background: { r: 180, g: 30, b: 50 } } }).jpeg().toBuffer();

for (const [name, w, h, mode] of [
  ["4:3 landscape", 4000, 3000, "crop"],
  ["16:9", 1920, 1080, "crop"],
  ["portrait phone photo", 1080, 1920, "fill"],
  ["square", 1200, 1200, "fill"],
  ["panorama", 3000, 900, "fill"],
  ["small 16:9", 640, 360, "crop"],
]) {
  test(`${name} → 1600×900 WebP (${mode})`, async () => {
    const r = await fitToFrame(await photo(w, h));
    const m = await sharp(r.buffer).metadata();
    assert.deepEqual([m.format, m.width, m.height, r.mode], ["webp", FRAME.width, FRAME.height, mode]);
  });
}

test("camera rotation is applied before measuring", async () => {
  // A landscape-shaped file whose EXIF says "rotate 90°" is really a portrait photo.
  const rotated = await sharp({ create: { width: 1920, height: 1080, channels: 3, background: "#888" } }).jpeg().withMetadata({ orientation: 6 }).toBuffer();
  assert.equal((await fitToFrame(rotated)).mode, "fill");
});
