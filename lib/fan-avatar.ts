// Fans' profile photos: any photo they upload becomes a 256×256 WebP (re-encoded, so only
// the picture itself is kept), saved in DATA_DIR/uploads/fans/.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { getFans, saveFans, type Fan } from "./fans";
import { UPLOADS_DIR } from "./store";

const MAX = 8 * 1024 * 1024;
const DIR = path.join(UPLOADS_DIR, "fans");

function removeFile(url?: string) {
  if (!url?.startsWith("/uploads/fans/")) return;
  try {
    fs.unlinkSync(path.join(DIR, path.basename(url)));
  } catch {
    /* already gone */
  }
}

/** Saves a new photo for the fan; returns an error message, or undefined when done. */
export async function setAvatar(fan: Fan, file: File): Promise<string | undefined> {
  if (!file.size) return "عکسی انتخاب نشده است.";
  if (file.size > MAX) return "حجم عکس بیشتر از ۸ مگابایت است.";
  let webp: Buffer;
  try {
    const sharp = (await import("sharp")).default;
    webp = await sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 50_000_000 })
      .rotate()
      .resize(256, 256, { fit: "cover", position: "attention" })
      .webp({ quality: 85 })
      .toBuffer();
  } catch {
    return "این فایل عکس نیست یا خوانده نشد؛ یک عکس JPG یا PNG انتخاب کنید.";
  }
  fs.mkdirSync(DIR, { recursive: true });
  const name = `${fan.id}-${crypto.randomBytes(4).toString("hex")}.webp`;
  fs.writeFileSync(path.join(DIR, name), webp);
  const old = getFans().find((f) => f.id === fan.id)?.avatar;
  saveFans(getFans().map((f) => (f.id === fan.id ? { ...f, avatar: `/uploads/fans/${name}` } : f)));
  removeFile(old);
}

export function removeAvatar(fanId: string) {
  const old = getFans().find((f) => f.id === fanId)?.avatar;
  saveFans(getFans().map((f) => (f.id === fanId ? { ...f, avatar: undefined } : f)));
  removeFile(old);
}
