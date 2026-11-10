import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Flash, PageHead } from "../../ui";
import { SubmitButton } from "../../ui-client";
import { requireAccess } from "@/lib/auth";
import { MAX_COMMENT, nextCommentId, plainComment, saveComments } from "@/lib/comments";
import { getAllPosts, getComments } from "@/lib/content";
import { num, str, withError } from "@/lib/form";
import { faDate, faNum } from "@/lib/format";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "نظرها" };
const BACK = "/admin/comments/";

async function moderate(fd: FormData) {
  "use server";
  await requireAccess("publish");
  const id = num(fd, "id");
  const act = str(fd, "act");
  const tab = str(fd, "tab") || "pending";
  const all = getComments();
  if (act === "approve") saveComments(all.map((c) => (c.id === id ? { ...c, status: "approved" as const } : c)));
  if (act === "unapprove") saveComments(all.map((c) => (c.id === id ? { ...c, status: "pending" as const } : c)));
  if (act === "delete") saveComments(all.filter((c) => c.id !== id && c.parent !== id));
  if (act === "approve-all") saveComments(all.map((c) => (c.status === "pending" ? { ...c, status: "approved" as const } : c)));
  redirect(`${BACK}?tab=${tab}&ok=saved`);
}

async function reply(fd: FormData) {
  "use server";
  const me = await requireAccess("publish");
  const id = num(fd, "id");
  const text = str(fd, "content").trim();
  const all = getComments();
  const to = all.find((c) => c.id === id);
  if (!to || text.length < 2 || text.length > MAX_COMMENT) redirect(withError(BACK, "متن پاسخ را بنویسید."));
  // Answering a comment also approves it.
  const next = all.map((c) => (c.id === id ? { ...c, status: "approved" as const } : c));
  next.push({ id: nextCommentId(), postId: to.postId, parent: to.parent ?? to.id, author: me.name || getSettings().title, content: text, date: new Date().toISOString(), status: "approved", byStaff: true });
  saveComments(next);
  redirect(`${BACK}?tab=${str(fd, "tab") || "pending"}&ok=${encodeURIComponent("پاسخ منتشر شد.")}`);
}

export default async function CommentsAdmin({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireAccess("publish");
  const sp = await searchParams;
  const tab = sp.tab === "approved" ? "approved" : "pending";
  const posts = new Map(getAllPosts().map((p) => [p.id, p]));
  const all = getComments().filter((c) => c.status === "pending" || c.status === "approved");
  const byId = new Map(all.map((c) => [c.id, c]));
  const list = all.filter((c) => c.status === tab).sort((a, b) => b.date.localeCompare(a.date));
  const pending = all.filter((c) => c.status === "pending").length;
  return (
    <>
      <PageHead title="نظرها" />
      <Flash searchParams={searchParams} />
      <div className="a-card">
        <p className="a-hint">نظر خوانندگان زیر خبرها فقط بعد از تأیید شما منتشر می‌شود. پاسخ دادن به یک نظر، آن را هم تأیید می‌کند. نظرهای قدیمی وردپرس نمایش داده نمی‌شوند.</p>
        <div className="a-row" style={{ gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <Link href={`${BACK}?tab=pending`} className={`a-btn a-btn-small${tab === "pending" ? " a-btn-primary" : ""}`}>در انتظار تأیید ({faNum(pending)})</Link>
          <Link href={`${BACK}?tab=approved`} className={`a-btn a-btn-small${tab === "approved" ? " a-btn-primary" : ""}`}>منتشرشده</Link>
          {tab === "pending" && pending > 1 && (
            <form action={moderate}>
              <input type="hidden" name="act" value="approve-all" />
              <SubmitButton className="a-btn a-btn-small" confirm={`همهٔ ${pending} نظر منتظر تأیید منتشر شوند؟`}>تأیید همه</SubmitButton>
            </form>
          )}
        </div>
      </div>
      {list.length === 0 && <p className="a-card a-hint">{tab === "pending" ? "نظری منتظر تأیید نیست." : "هنوز نظری منتشر نشده است."}</p>}
      {list.map((c) => {
        const post = posts.get(c.postId);
        const parent = c.parent ? byId.get(c.parent) : undefined;
        const same = c.ipHash ? all.filter((x) => x.ipHash === c.ipHash).length : 0;
        const act = (a: string, label: string, cls = "a-btn a-btn-small", confirm?: string) => (
          <form action={moderate}>
            <input type="hidden" name="id" value={c.id} />
            <input type="hidden" name="act" value={a} />
            <input type="hidden" name="tab" value={tab} />
            <SubmitButton className={cls} confirm={confirm}>{label}</SubmitButton>
          </form>
        );
        return (
          <section key={c.id} className="a-card">
            <p className="a-hint">
              <b>{c.author}</b>{c.byStaff ? " (تحریریه)" : ""} · {faDate(c.date)} · زیر خبر{" "}
              {post ? <a href={`${post.path}#comments`} target="_blank">«{post.title}»</a> : "حذف‌شده"}
              {same > 1 && <> · {faNum(same)} نظر از همین فرستنده</>}
            </p>
            {parent && <p className="a-hint">در پاسخ به {parent.author}: «{plainComment(parent.content).slice(0, 80)}…»</p>}
            <p style={{ whiteSpace: "pre-wrap" }}>{c.content}</p>
            <div className="a-row" style={{ gap: 8, flexWrap: "wrap" }}>
              {tab === "pending" ? act("approve", "تأیید و انتشار", "a-btn a-btn-small a-btn-primary") : act("unapprove", "برگرداندن به انتظار")}
              {act("delete", "حذف", "a-btn a-btn-small a-btn-danger", "این نظر (و پاسخ‌هایش) حذف شود؟")}
            </div>
            {!c.byStaff && (
              <details>
                <summary className="a-hint">پاسخ از طرف سایت</summary>
                <form action={reply}>
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="tab" value={tab} />
                  <textarea name="content" rows={3} maxLength={MAX_COMMENT} required style={{ width: "100%" }} />
                  <SubmitButton className="a-btn a-btn-small">انتشار پاسخ</SubmitButton>
                </form>
              </details>
            )}
          </section>
        );
      })}
    </>
  );
}
