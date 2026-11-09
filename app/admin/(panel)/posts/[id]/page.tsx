import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { can, canEditPost } from "@/lib/roles";
import { Flash, PageHead } from "../../../ui";
import { PostForm } from "../PostForm";
import { PhotoSuggest } from "../PhotoSuggest";
import { requireAccess } from "@/lib/auth";
import { getAllPosts } from "@/lib/content";

export const metadata: Metadata = { title: "ویرایش مطلب" };

export default async function EditPost({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const me = await requireAccess("posts");
  const id = Number((await params).id);
  const all = getAllPosts();
  const post = all.find((p) => p.id === id);
  if (!post) notFound();
  if (!canEditPost(me.role, me.username, post)) {
    redirect(`/admin/posts/?error=${encodeURIComponent("فقط خبرهای خودتان را که هنوز منتشر نشده‌اند می‌توانید ویرایش کنید.")}`);
  }
  return (
    <>
      <PageHead title="ویرایش مطلب" back="/admin/posts/" />
      <Flash searchParams={searchParams} />
      <PostForm post={post} canPublish={can(me.role, "publish")} />
      <PhotoSuggest post={post} all={all} />
    </>
  );
}
