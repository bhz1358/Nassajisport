import { toLatinDigits } from "./jalali";

export const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();

/** Accepts Persian or Latin digits; empty or invalid gives `fallback`. */
export function num(fd: FormData, key: string, fallback = 0): number {
  const raw = toLatinDigits(str(fd, key));
  if (raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export const bool = (fd: FormData, key: string) => fd.get(key) === "on" || fd.get(key) === "1";

export function file(fd: FormData, key: string): File | null {
  const f = fd.get(key);
  return f instanceof File && f.size > 0 ? f : null;
}

/** Builds "/admin/x/?error=..." so a failed action can show its message. */
export function withError(path: string, message: string) {
  return `${path}?error=${encodeURIComponent(message)}`;
}
