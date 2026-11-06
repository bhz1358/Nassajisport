import type { Metadata } from "next";
import { requireAccess } from "@/lib/auth";
import { can } from "@/lib/roles";
import { Flash, PageHead } from "../../../ui";
import { PostForm } from "../PostForm";

export const metadata: Metadata = { title: "خبر جدید" };

export default async function NewPost({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const me = await requireAccess("posts");
  return (
    <>
      <PageHead title="خبر جدید" back="/admin/posts/" />
      <Flash searchParams={searchParams} />
      <PostForm canPublish={can(me.role, "publish")} />
    </>
  );
}
