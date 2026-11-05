import type { Metadata } from "next";
import { Flash, PageHead } from "../../../ui";
import { PostForm } from "../PostForm";

export const metadata: Metadata = { title: "خبر جدید" };

export default function NewPost({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  return (
    <>
      <PageHead title="خبر جدید" back="/admin/posts/" />
      <Flash searchParams={searchParams} />
      <PostForm />
    </>
  );
}
