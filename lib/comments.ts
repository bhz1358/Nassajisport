// Readers' comments under news posts. New ones are held for an editor's approval.

import crypto from "node:crypto";
import { getComments } from "./content";
import { readSigned, signValue } from "./auth";
import { writeStore } from "./store";
import type { Comment } from "./types";

export const MAX_COMMENT = 1500;
export const MAX_NAME = 40;

/** Only comments an editor approved (imported WordPress comments have no status: not shown). */
export const isShown = (c: Comment) => c.status === "approved";
export const saveComments = (c: Comment[]) => writeStore("comments", c);

/** Imported WordPress text may carry tags and entities: shown as plain text. */
export const plainComment = (s: string) =>
  s
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .trim();

/** The approved comments of a post: top-level ones newest last, replies under their parent. */
export function postComments(postId: number) {
  const shown = getComments().filter((c) => c.postId === postId && isShown(c)).sort((a, b) => a.date.localeCompare(b.date));
  const ids = new Set(shown.map((c) => c.id));
  const top = shown.filter((c) => !c.parent || !ids.has(c.parent));
  return { count: shown.length, threads: top.map((c) => ({ comment: c, replies: shown.filter((r) => r.parent === c.id) })) };
}

export const pendingCount = () => getComments().filter((c) => c.status === "pending").length;

/** A signed time stamp in the form: bots that post at once (or replay old forms) are refused. */
export const formToken = () => signValue({ t: Date.now() });
export function tokenProblem(token: string): string | undefined {
  const d = readSigned<{ t: number }>(token);
  if (!d) return "فرم نامعتبر است؛ صفحه را دوباره باز کنید.";
  const age = Date.now() - d.t;
  if (age < 3000) return "کمی صبر کنید و دوباره بفرستید.";
  if (age > 24 * 3_600_000) return "این صفحه خیلی وقت باز مانده؛ آن را دوباره باز کنید و نظرتان را بفرستید.";
}

export const hashIp = (ip: string) => crypto.createHash("sha256").update(`nassaji:${ip}`).digest("hex").slice(0, 16);

// 5 comments per 10 minutes per address.
const recent = new Map<string, number[]>();
export function tooMany(ipHash: string): boolean {
  const now = Date.now();
  const list = (recent.get(ipHash) ?? []).filter((t) => now - t < 600_000);
  recent.set(ipHash, list);
  if (list.length >= 5) return true;
  list.push(now);
  return false;
}

export function nextCommentId(): number {
  return getComments().reduce((m, c) => Math.max(m, c.id), 0) + 1;
}
