"use server";

import { redirect } from "next/navigation";
import { requireAccess } from "@/lib/auth";
import { can, canEditPost } from "@/lib/roles";
import { getAllPosts, getCategories, getComments, nextPostId, normalizePath, savePosts } from "@/lib/content";
import { bool, file, num, str, withError } from "@/lib/form";
import { jalaliPartsToIso } from "@/lib/jalali";
import { saveUpload } from "@/lib/media";
import { writeStore } from "@/lib/store";
import { getLeague } from "@/lib/league";
import { sanitizeHtml } from "@/lib/sanitize";
import { autoExcerpt, fillImageAlts, findTags, firstImage, plainText } from "@/lib/seo-auto";
import { HOME_TEAM } from "@/lib/site";
import { getSquad } from "@/lib/squad";
import type { Post } from "@/lib/types";

const slugify = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\p{L}\p{N}-]+/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

/** Teams of the league (for automatic tags). */
const teamNames = () => [...new Set([HOME_TEAM, ...getLeague().standings.map((r) => r.team)])];
/** Players and staff of the club (for automatic tags). */
const playerNames = () => {
  const squad = getSquad();
  return [...squad.players.map((p) => p.name), ...squad.staff.map((s) => s.name)];
};
/** A news post saved without a category goes to «اخبار» (or the first category). */
const defaultCategory = () => {
  const cats = getCategories();
  const news = cats.find((c) => c.slug === "news") ?? cats[0];
  return news ? [news.slug] : [];
};

export async function savePost(fd: FormData) {
  const me = await requireAccess("posts");
  const user = me.name;
  const id = num(fd, "id");
  const posts = getAllPosts();
  const existing = id ? posts.find((p) => p.id === id) : undefined;
  const back = existing ? `/admin/posts/${id}/` : "/admin/posts/new/";
  if (id && !existing) redirect(withError("/admin/posts/", "این مطلب پیدا نشد."));
  if (existing && !canEditPost(me.role, me.username, existing)) {
    redirect(withError("/admin/posts/", "فقط خبرهای خودتان را که هنوز منتشر نشده‌اند می‌توانید ویرایش کنید."));
  }
  // Writers save drafts; an editor reviews, features and publishes them.
  const canPublish = can(me.role, "publish");

  const title = str(fd, "title");
  if (!title) redirect(withError(back, "عنوان لازم است."));
  const slug = slugify(str(fd, "slug") || title);
  const type = canPublish && str(fd, "type") === "page" ? "page" : (existing?.type ?? "post");
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

  // Cleaned of anything that could run code; every picture gets a description.
  const content = fillImageAlts(sanitizeHtml(String(fd.get("content") ?? "")), title);
  const excerpt = str(fd, "excerpt") || autoExcerpt(content);
  const seoTitle = str(fd, "seoTitle");
  const seoDescription = str(fd, "seoDescription");

  const chosenCategories = fd.getAll("categories").map(String);
  const ownTags = str(fd, "tags")
    .split(/[,،]/)
    .map((t) => t.trim())
    .filter(Boolean);

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
    categories: chosenCategories.length || type === "page" ? chosenCategories : defaultCategory(),
    tags: [...new Set([...ownTags, ...findTags(`${title} ${plainText(content)}`, teamNames(), playerNames())])],
    // Without a featured image, the first picture in the text is used.
    featuredImage: featuredImage ?? firstImage(content),
    sticky: (canPublish ? bool(fd, "sticky") : existing?.sticky) || undefined,
    status: canPublish && str(fd, "status") !== "draft" ? "publish" : "draft",
    createdBy: existing ? existing.createdBy : me.username,
    seo: seoTitle || seoDescription ? { title: seoTitle || undefined, description: seoDescription || undefined } : undefined,
  };

  savePosts(existing ? posts.map((p) => (p.id === id ? post : p)) : [post, ...posts]);
  redirect(`/admin/posts/${post.id}/?ok=${existing ? "saved" : "created"}`);
}

export async function deletePost(fd: FormData) {
  await requireAccess("publish");
  const id = num(fd, "id");
  savePosts(getAllPosts().filter((p) => p.id !== id));
  writeStore(
    "comments",
    getComments().filter((c) => c.postId !== id),
  );
  redirect("/admin/posts/?ok=deleted");
}
