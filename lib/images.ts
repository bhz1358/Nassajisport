import fs from "node:fs";
import { resolveUpload } from "./media";
import { getSettings } from "./settings";
import type { Post } from "./types";

// Icons, emoji and avatars that sit inside post bodies but make poor cover images.
const NOT_A_PHOTO = /(\/wp-includes\/|gravatar\.com|\/emoji\/|\.svg(\?|$)|^data:)/i;

/** First real <img> in the post body, for posts that never got a featured image. */
export function firstContentImage(html: string): string | undefined {
  for (const m of html.matchAll(/<img\b[^>]*?\bsrc=["']([^"']+)["']/gi)) {
    if (!NOT_A_PHOTO.test(m[1])) return m[1];
  }
  return undefined;
}

const existsCache = new Map<string, { ok: boolean; at: number }>();
function uploadExists(url: string): boolean {
  const hit = existsCache.get(url);
  if (hit && Date.now() - hit.at < 60_000) return hit.ok;
  const file = resolveUpload(url.split("?")[0]);
  let ok = false;
  try {
    ok = !!file && fs.statSync(file).size > 0;
  } catch {
    ok = false;
  }
  existsCache.set(url, { ok, at: Date.now() });
  return ok;
}

/** Points body images whose /uploads/ file is not on this server yet at the old site. */
export function withImageFallbacks(html: string): string {
  const { sourceUrl } = getSettings();
  if (!sourceUrl) return html;
  const base = `${sourceUrl.replace(/\/$/, "")}/wp-content`;
  return html.replace(/(<img\b[^>]*?\bsrc=["'])(\/uploads\/[^"']+)/gi, (all, pre: string, src: string) =>
    uploadExists(src) ? all : `${pre}${base}${src}`,
  ).replace(/\s(srcset|sizes)=["'][^"']*["']/gi, "");
}

/**
 * The image to show for a post: its featured image, or else the first photo in its text.
 * A local /uploads/ file that has not been copied over yet is loaded from the old
 * WordPress site instead, so the card is never left empty during the migration.
 */
export function postImage(post: Post): string | undefined {
  const src = post.featuredImage || firstContentImage(post.content);
  if (!src) return undefined;
  if (!src.startsWith("/uploads/") || uploadExists(src)) return src;
  const { sourceUrl } = getSettings();
  return sourceUrl ? `${sourceUrl.replace(/\/$/, "")}/wp-content${src}` : src;
}
