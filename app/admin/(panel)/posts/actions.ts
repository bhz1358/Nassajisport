"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getAllPosts, getComments, nextPostId, normalizePath, savePosts } from "@/lib/content";
import { bool, file, num, str, withError } from "@/lib/form";
import { jalaliPartsToIso } from "@/lib/jalali";
import { saveUpload } from "@/lib/media";
import { writeStore } from "@/lib/store";
import type { Post } from "@/lib/types";

const slugify = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\p{L}\p{N}-]+/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

export async function savePost(fd: FormData) {
  const user = await requireAdmin();
  const id = num(fd, "id");
  const posts = getAllPosts();
  const existing = id ? posts.find((p) => p.id === id) : undefined;
  const back = existing ? `/admin/posts/${id}/` : "/admin/posts/new/";

  const title = str(fd, "title");
  if (!title) redirect(withError(back, "عنوان لازم است."));
  const slug = slugify(str(fd, "slug") || title);
  const type = str(fd, "type") === "page" ? "page" : "post";
  const date = jalaliPartsToIso(str(fd, "date"), str(fd, "time"));
  if (str(fd, "date") && !date) redirect(withError(back, "تاریخ را به شکل ۱۴۰۵/۰۸/۱۵ و ساعت را به شکل ۱۸:۳۰ وارد کنید."));

  // Imported posts keep their WordPress URL; new posts get /slug/.
  const path = normalizePath(str(fd, "path") || existing?.path || `/${slug}/`);
  if (posts.some((p) => p.id !== id && normalizePath(p.path) === path)) {
    redirect(withError(back, `آدرس ${path} برای مطلب دیگری استفاده شده. نامک (slug) را تغییر دهید.`));
  }

  let featuredImage = str(fd, "featuredImage") || undefined;
  const upload = file(fd, "featuredImageFile");
  if (upload) {
    try {
      featuredImage = await saveUpload(upload);
    } catch (e) {
      redirect(withError(back, (e as Error).message));
    }
  }

  const content = String(fd.get("content") ?? "");
  const excerpt = str(fd, "excerpt") || content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 220);
  const seoTitle = str(fd, "seoTitle");
  const seoDescription = str(fd, "seoDescription");

  const post: Post = {
    ...(existing ?? {}),
    id: existing?.id ?? nextPostId(),
    type,
    title,
    slug,
    path,
    date: date ?? existing?.date ?? new Date().toISOString(),
    modified: new Date().toISOString(),
    author: str(fd, "author") || existing?.author || user,
    excerpt,
    content,
    categories: fd.getAll("categories").map(String),
    tags: str(fd, "tags")
      .split(/[,،]/)
      .map((t) => t.trim())
      .filter(Boolean),
    featuredImage,
    sticky: bool(fd, "sticky") || undefined,
    status: str(fd, "status") === "draft" ? "draft" : "publish",
    seo: seoTitle || seoDescription ? { title: seoTitle || undefined, description: seoDescription || undefined } : undefined,
  };

  savePosts(existing ? posts.map((p) => (p.id === id ? post : p)) : [post, ...posts]);
  redirect(`/admin/posts/${post.id}/?ok=${existing ? "saved" : "created"}`);
}

export async function deletePost(fd: FormData) {
  await requireAdmin();
  const id = num(fd, "id");
  savePosts(getAllPosts().filter((p) => p.id !== id));
  writeStore(
    "comments",
    getComments().filter((c) => c.postId !== id),
  );
  redirect("/admin/posts/?ok=deleted");
}
