// Photo suggestions for a post without its own photo: photos already on the site
// (featured images of other posts) about the same players and teams.

import type { Post } from "./types";

export const isCover = (url?: string) => !!url && /\/cover-[^/]*$/.test(url);

/** Needs a suggestion: no featured image, or only a generated cover. */
export const needsPhoto = (post: Post) => !post.featuredImage || isCover(post.featuredImage);

/** Up to `max` photos of other posts, most shared tags first, then newest. */
export function suggestPhotos(post: Post, all: Post[], max = 8): { url: string; title: string; shared: string[] }[] {
  const mine = new Set(post.tags);
  const seen = new Set<string>();
  return all
    .filter((p) => p.id !== post.id && p.featuredImage && !isCover(p.featuredImage))
    .map((p) => ({ p, shared: p.tags.filter((t) => mine.has(t)) }))
    .filter((x) => x.shared.length > 0)
    .sort((a, b) => b.shared.length - a.shared.length || b.p.date.localeCompare(a.p.date))
    .filter((x) => !seen.has(x.p.featuredImage!) && seen.add(x.p.featuredImage!))
    .slice(0, max)
    .map((x) => ({ url: x.p.featuredImage!, title: x.p.title, shared: x.shared }));
}
