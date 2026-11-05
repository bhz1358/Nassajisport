import { readStore, seedFromContent, writeStore } from "./store";
import type { Category, Comment, Post } from "./types";

// Posts imported from WordPress keep their ids; posts written in the admin panel
// start here so a later re-import never collides with them.
export const ADMIN_ID_START = 1_000_000;

const byDateDesc = (a: Post, b: Post) => b.date.localeCompare(a.date);

/** Every post and page, drafts included (admin use). */
export function getAllPosts(): Post[] {
  return readStore<Post[]>("posts", () => seedFromContent("data/posts.json", "sample/posts.json"));
}

export function savePosts(posts: Post[]) {
  writeStore("posts", [...posts].sort(byDateDesc));
}

export function nextPostId(): number {
  return Math.max(ADMIN_ID_START - 1, ...getAllPosts().map((p) => p.id)) + 1;
}

export const isPublished = (p: Post) => p.status !== "draft" && new Date(p.date) <= new Date();

export function getPublished(): Post[] {
  return getAllPosts().filter(isPublished).sort(byDateDesc);
}

export function getNews(): Post[] {
  return getPublished().filter((p) => p.type === "post");
}

export function isSampleContent(): boolean {
  return getAllPosts().some((p) => p.slug.startsWith("sample-"));
}

export function getCategories(): Category[] {
  return readStore<Category[]>("categories", () => seedFromContent("data/categories.json", "sample/categories.json"));
}

export function saveCategories(categories: Category[]) {
  writeStore("categories", categories);
}

export function getComments(): Comment[] {
  return readStore<Comment[]>("comments", () => {
    try {
      return seedFromContent<Comment[]>("data/comments.json");
    } catch {
      return [];
    }
  });
}

export function getCategory(slug: string): Category | undefined {
  return getCategories().find((c) => c.slug === slug);
}

export function getPostsInCategory(slug: string): Post[] {
  return getNews().filter((p) => p.categories.includes(slug));
}

export function normalizePath(p: string): string {
  let out = p.trim();
  try {
    out = decodeURIComponent(out);
  } catch {
    /* already decoded */
  }
  if (!out.startsWith("/")) out = "/" + out;
  if (!out.endsWith("/")) out += "/";
  return out;
}

export function getByPath(p: string): Post | undefined {
  const wanted = normalizePath(p);
  return getPublished().find((post) => normalizePath(post.path) === wanted);
}

export function categoryName(slug: string): string {
  return getCategory(slug)?.name ?? slug;
}
