// Fits a news photo into the site's standard frame (16:9, 1600×900), whatever shape
// it was taken in:
// - landscape photos close to 16:9 are cropped to it, keeping the important part
//   (sharp's "attention" strategy looks for faces, skin tones and detail);
// - portrait, square or panoramic photos would lose too much to a crop, so the whole
//   photo sits in the middle on a blurred, darkened copy of itself.

export const FRAME = { width: 1600, height: 900 };
const RATIO = FRAME.width / FRAME.height;
/** Within this range of 16:9, a crop loses little; outside it, the photo is shown whole. */
const CROP_MIN = 1.3; // includes 4:3, the usual camera and phone landscape
const CROP_MAX = 2.05;

export type FrameResult = { buffer: Buffer; mode: "crop" | "fill" };

export async function fitToFrame(input: Buffer): Promise<FrameResult> {
  const sharp = (await import("sharp")).default;
  // Apply the camera's rotation first so portrait phone photos are measured upright.
  const upright = await sharp(input).rotate().toBuffer();
  const { width = 0, height = 0 } = await sharp(upright).metadata();
  if (!width || !height) throw new Error("ابعاد عکس خوانده نشد.");
  const ratio = width / height;

  if (ratio >= CROP_MIN && ratio <= CROP_MAX) {
    const buffer = await sharp(upright)
      .resize(FRAME.width, FRAME.height, { fit: "cover", position: sharp.strategy.attention })
      .webp({ quality: 85 })
      .toBuffer();
    return { buffer, mode: "crop" };
  }

  const background = await sharp(upright)
    .resize(FRAME.width, FRAME.height, { fit: "cover" })
    .blur(40)
    .modulate({ brightness: 0.5, saturation: 0.75 })
    .toBuffer();
  // The photo itself, as large as fits, never blown up past its own size.
  const scale = Math.min(FRAME.width / width, FRAME.height / height, ratio < 1 ? 2 : 1.5);
  const fw = Math.round(width * scale);
  const fh = Math.round(height * scale);
  const foreground = await sharp(upright).resize(fw, fh, { fit: "fill" }).toBuffer();
  const buffer = await sharp(background)
    .composite([{ input: foreground, left: Math.round((FRAME.width - fw) / 2), top: Math.round((FRAME.height - fh) / 2) }])
    .webp({ quality: 85 })
    .toBuffer();
  return { buffer, mode: "fill" };
}
