import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { UPLOADS_DIR } from "./store";

// SVG is left out on purpose: served from our own origin it could run scripts.
export const MEDIA_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

const ADMIN_SUBDIR = "admin";

/** Resolves a /uploads/... URL or relative path inside UPLOADS_DIR, refusing anything that escapes it. */
export function resolveUpload(rel: string): string | null {
  const clean = rel.replace(/^\/?uploads\//, "");
  const full = path.resolve(UPLOADS_DIR, clean);
  return full.startsWith(UPLOADS_DIR + path.sep) ? full : null;
}

function looksLike(buf: Buffer, ext: string): boolean {
  const hex = buf.subarray(0, 12).toString("hex");
  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return hex.startsWith("ffd8ff");
    case ".png":
      return hex.startsWith("89504e47");
    case ".gif":
      return hex.startsWith("47494638");
    case ".webp":
      return hex.startsWith("52494646") && buf.subarray(8, 12).toString() === "WEBP";
    case ".avif":
    case ".mp4":
      return buf.subarray(4, 8).toString() === "ftyp";
    case ".webm":
      return hex.startsWith("1a45dfa3");
    default:
      return false;
  }
}

/** Saves an uploaded file and returns its public URL (/uploads/admin/2026/11/....jpg). */
export async function saveUpload(file: File): Promise<string> {
  const ext = path.extname(file.name).toLowerCase();
  if (!MEDIA_TYPES[ext]) throw new Error(`نوع فایل «${ext || file.name}» مجاز نیست. فقط عکس (jpg، png، webp، gif، avif) و ویدیو (mp4، webm).`);
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("حجم فایل بیشتر از ۲۵ مگابایت است.");
  const buf = Buffer.from(await file.arrayBuffer());
  if (!looksLike(buf, ext)) throw new Error("محتوای فایل با پسوندش جور نیست.");

  const now = new Date();
  const dir = path.join(ADMIN_SUBDIR, String(now.getFullYear()), String(now.getMonth() + 1).padStart(2, "0"));
  const base =
    path
      .basename(file.name, path.extname(file.name))
      .replace(/[^\p{L}\p{N}_-]+/gu, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "file";
  const name = `${base}-${crypto.randomBytes(3).toString("hex")}${ext}`;
  fs.mkdirSync(path.join(UPLOADS_DIR, dir), { recursive: true });
  fs.writeFileSync(path.join(UPLOADS_DIR, dir, name), buf);
  return `/uploads/${dir.split(path.sep).join("/")}/${name}`;
}

/**
 * Saves an image converted to WebP (max `size` px on its longest side).
 * Falls back to the original file if the image library is unavailable.
 */
export async function saveUploadAsWebp(file: File, size = 512): Promise<string> {
  const ext = path.extname(file.name).toLowerCase();
  if (![".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"].includes(ext)) throw new Error("فقط عکس (jpg، png، webp، gif، avif) مجاز است.");
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("حجم فایل بیشتر از ۲۵ مگابایت است.");
  const input = Buffer.from(await file.arrayBuffer());
  if (!looksLike(input, ext)) throw new Error("محتوای فایل با پسوندش جور نیست.");
  let sharp: typeof import("sharp").default;
  try {
    sharp = (await import("sharp")).default;
  } catch {
    return saveUpload(file);
  }
  const webp = await sharp(input).rotate().resize(size, size, { fit: "inside", withoutEnlargement: true }).webp({ quality: 88 }).toBuffer();
  const base = path.basename(file.name, ext);
  return saveUpload(new File([new Uint8Array(webp)], `${base}.webp`, { type: "image/webp" }));
}

export type MediaItem = { url: string; size: number; mtime: string; isVideo: boolean };

/** Files uploaded through the admin panel, newest first. */
export function listMedia(): MediaItem[] {
  const root = path.join(UPLOADS_DIR, ADMIN_SUBDIR);
  const out: MediaItem[] = [];
  const walk = (dir: string) => {
    for (const e of fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }) : []) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (MEDIA_TYPES[path.extname(e.name).toLowerCase()]) {
        const st = fs.statSync(full);
        out.push({
          url: "/uploads/" + path.relative(UPLOADS_DIR, full).split(path.sep).join("/"),
          size: st.size,
          mtime: st.mtime.toISOString(),
          isVideo: e.name.toLowerCase().endsWith(".mp4"),
        });
      }
    }
  };
  walk(root);
  return out.sort((a, b) => b.mtime.localeCompare(a.mtime));
}

export function deleteMedia(url: string): boolean {
  const full = resolveUpload(url);
  if (!full || !full.startsWith(path.join(UPLOADS_DIR, ADMIN_SUBDIR) + path.sep)) return false;
  try {
    fs.unlinkSync(full);
    return true;
  } catch {
    return false;
  }
}
