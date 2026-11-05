import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

// Everything the admin panel edits lives in DATA_DIR as JSON files (plus uploaded media).
// Keep this folder out of git and back it up: it is the site's database.
export const DATA_DIR = path.resolve(process.env.DATA_DIR ?? path.join(process.cwd(), "data"));
export const UPLOADS_DIR = path.join(DATA_DIR, "uploads");

type Entry = { mtimeMs: number; value: unknown };
const cache = new Map<string, Entry>();

function file(name: string) {
  return path.join(DATA_DIR, `${name}.json`);
}

/**
 * Reads data/<name>.json. When it does not exist yet, `seed` provides the first
 * version (sample or imported content) and it is written out.
 */
export function readStore<T>(name: string, seed: () => T): T {
  const f = file(name);
  let stat: fs.Stats | undefined;
  try {
    stat = fs.statSync(f);
  } catch {
    const value = seed();
    writeStore(name, value);
    return value;
  }
  const hit = cache.get(name);
  if (hit && hit.mtimeMs === stat.mtimeMs) return hit.value as T;
  const value = JSON.parse(fs.readFileSync(f, "utf8")) as T;
  cache.set(name, { mtimeMs: stat.mtimeMs, value });
  return value;
}

/** Atomic write: a crash mid-write never leaves a half-written file behind. */
export function writeStore<T>(name: string, value: T) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const f = file(name);
  const tmp = `${f}.${process.pid}.${crypto.randomBytes(4).toString("hex")}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2) + "\n");
  fs.renameSync(tmp, f);
  cache.delete(name);
}

/** Seed helper: first existing file among the candidates, relative to the project's content/ folder. */
export function seedFromContent<T>(...candidates: string[]): T {
  for (const c of candidates) {
    const f = path.join(process.cwd(), "content", c);
    if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, "utf8")) as T;
  }
  throw new Error(`No seed file found: ${candidates.join(", ")}`);
}
