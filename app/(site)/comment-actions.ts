"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getComments, getNews } from "@/lib/content";
import { clientIp } from "@/lib/client-ip";
import { hashIp, MAX_COMMENT, MAX_NAME, nextCommentId, saveComments, tokenProblem, tooMany } from "@/lib/comments";

export async function submitComment(fd: FormData) {
  // Only published news posts take comments (the same list the site shows).
  const post = getNews().find((p) => p.id === Number(fd.get("postId")));
  if (!post) redirect("/");
  const back = (q: string) => `${post.path}?${q}#comments`;
  // A field people don't see: bots fill it in. Pretend it worked.
  if (String(fd.get("website") ?? "")) redirect(back("comment=sent"));
  const problem = tokenProblem(String(fd.get("token") ?? ""));
  if (problem) redirect(back(`comment_error=${encodeURIComponent(problem)}`));
  const author = String(fd.get("author") ?? "").replace(/\s+/g, " ").trim();
  const content = String(fd.get("content") ?? "").replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  const err = (m: string) => redirect(back(`comment_error=${encodeURIComponent(m)}`));
  if (author.length < 2 || author.length > MAX_NAME) err(`نام را بنویسید (۲ تا ${MAX_NAME} حرف).`);
  if (content.length < 3) err("متن نظر خیلی کوتاه است.");
  if (content.length > MAX_COMMENT) err(`متن نظر حداکثر ${MAX_COMMENT} حرف باشد.`);
  if ((content.match(/https?:\/\/|www\./gi) ?? []).length > 2) err("در نظر بیشتر از دو لینک نگذارید.");
  const ipHash = hashIp(clientIp(await headers()));
  if (tooMany(ipHash)) err("چند نظر پشت سر هم فرستادید؛ چند دقیقهٔ دیگر دوباره امتحان کنید.");
  const all = getComments();
  const parentId = Number(fd.get("parent")) || undefined;
  const parent = parentId ? all.find((c) => c.id === parentId && c.postId === post.id) : undefined;
  saveComments([
    ...all,
    {
      id: nextCommentId(),
      postId: post.id,
      ...(parent ? { parent: parent.parent ?? parent.id } : {}),
      author,
      content,
      date: new Date().toISOString(),
      status: "pending",
      ipHash,
    },
  ]);
  redirect(back("comment=sent"));
}
