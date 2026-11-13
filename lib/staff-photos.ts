// Staff photos (coach, team manager, media manager…): a square, face-centred WebP shown as a round
// avatar on the team page. Photos shipped in content/staff-photos/<name>.(jpg|png|webp) are given
// to the staff member of that name once; an upload in the panel replaces it later.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { getSquad, saveSquad } from "./squad";
import { readStore, UPLOADS_DIR, writeStore } from "./store";

const DIR = path.join(UPLOADS_DIR, "staff");
const SHIPPED = path.join(process.cwd(), "content", "staff-photos");

/** Spelling-tolerant key: «آلن» and «آلان», «ي» and «ی», spaces and ZWNJ all match. */
const loose = (s: string) =>
  s.replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/[آأإ]/g, "ا").replace(/[\s‌\-_]+/g, "").replace(/ا/g, "");

/** A square 480px WebP, cropped around the most interesting part (the face). */
export async function squareStaffPhoto(input: Buffer): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  return sharp(input).rotate().resize(480, 480, { fit: "cover", position: sharp.strategy.attention }).webp({ quality: 86 }).toBuffer();
}

export function saveStaffPhoto(buf: Buffer): string {
  fs.mkdirSync(DIR, { recursive: true });
  const file = `staff-${crypto.randomBytes(4).toString("hex")}.webp`;
  fs.writeFileSync(path.join(DIR, file), buf);
  return `/uploads/staff/${file}`;
}

function shippedPhoto(name: string): string | undefined {
  if (!fs.existsSync(SHIPPED)) return;
  const key = loose(name);
  const f = fs.readdirSync(SHIPPED).find((x) => /\.(jpe?g|png|webp)$/i.test(x) && loose(path.basename(x, path.extname(x))) === key);
  return f && path.join(SHIPPED, f);
}

/** Gives staff members the photos shipped for them (each file once). Returns how many were set. */
export async function applyStaffPhotos(): Promise<number> {
  const used = new Set(readStore<string[]>("staff-photos-applied", () => []));
  let n = 0;
  for (const s of getSquad().staff) {
    const f = shippedPhoto(s.name);
    if (!f) continue;
    const stamp = `${path.basename(f)}:${fs.statSync(f).size}`;
    if (used.has(stamp)) continue;
    const photo = saveStaffPhoto(await squareStaffPhoto(fs.readFileSync(f)));
    const squad = getSquad();
    saveSquad({ ...squad, staff: squad.staff.map((x) => (x.name === s.name ? { ...x, photo } : x)) });
    used.add(stamp);
    writeStore("staff-photos-applied", [...used]);
    n++;
  }
  return n;
}
