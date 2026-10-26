import fs from "node:fs";
import path from "node:path";
import type { Category, Content, Post } from "./types";

const ROOT = path.join(process.cwd(), "content");

// content/data is written by `npm run import:wp`; until then the sample set is shown.
function loadContent(): Content {
  const dir = fs.existsSync(path.join(ROOT, "data", "posts.json"))
    ? path.join(ROOT, "data")
    : path.join(ROOT, "sample");
  const read = (file: string) => JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
  const posts: Post[] = read("posts.json");
  posts.sort((a, b) => b.date.localeCompare(a.date));
  return {
    site: read("site.json"),
    posts,
    categories: read("categories.json"),
    isSample: dir.endsWith("sample"),
  };
}

let cache: Content | undefined;
export function getContent(): Content {
  cache ??= loadContent();
  return cache;
}

export function getNews(): Post[] {
  return getContent().posts.filter((p) => p.type === "post");
}

export function getCategory(slug: string): Category | undefined {
  return getContent().categories.find((c) => c.slug === slug);
}

export function getPostsInCategory(slug: string): Post[] {
  return getNews().filter((p) => p.categories.includes(slug));
}

export function normalizePath(p: string): string {
  let out = decodeURIComponent(p).trim();
  if (!out.startsWith("/")) out = "/" + out;
  if (!out.endsWith("/")) out += "/";
  return out;
}

export function getByPath(p: string): Post | undefined {
  const wanted = normalizePath(p);
  return getContent().posts.find((post) => normalizePath(post.path) === wanted);
}

export function categoryName(slug: string): string {
  return getCategory(slug)?.name ?? slug;
}
