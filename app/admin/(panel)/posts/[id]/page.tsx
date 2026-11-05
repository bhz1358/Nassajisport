import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Flash, PageHead } from "../../../ui";
import { PostForm } from "../PostForm";
import { getAllPosts } from "@/lib/content";

export const metadata: Metadata = { title: "ویرایش مطلب" };

export default async function EditPost({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const id = Number((await params).id);
  const post = getAllPosts().find((p) => p.id === id);
  if (!post) notFound();
  return (
    <>
      <PageHead title="ویرایش مطلب" back="/admin/posts/" />
      <Flash searchParams={searchParams} />
      <PostForm post={post} />
    </>
  );
}
