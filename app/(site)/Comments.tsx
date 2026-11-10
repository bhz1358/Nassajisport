import Link from "next/link";
import { faDate, faNum, faTime } from "@/lib/format";
import { formToken, MAX_COMMENT, MAX_NAME, plainComment, postComments } from "@/lib/comments";
import { currentFan } from "@/lib/fans";
import type { Comment, Post } from "@/lib/types";
import { submitComment } from "./comment-actions";

function One({ c, path, reply }: { c: Comment; path: string; reply?: boolean }) {
  return (
    <article className={`comment${c.byStaff ? " is-staff" : ""}`} id={`comment-${c.id}`}>
      <header>
        <span className="comment-avatar" aria-hidden="true">{c.author.trim().charAt(0) || "؟"}</span>
        <b>{c.author}</b>
        {c.byStaff && <span className="comment-badge">نساجی اسپرت</span>}
        <time dateTime={c.date}>{faDate(c.date)} · {faTime(c.date)}</time>
      </header>
      {/* Shown as text (React escapes it); only imported WordPress HTML needs its tags removed. */}
      <p className="comment-text">{c.status ? c.content : plainComment(c.content)}</p>
      {reply && (
        <Link href={`${path}?reply=${c.id}#comment-form`} scroll={false} className="comment-reply">
          پاسخ
        </Link>
      )}
    </article>
  );
}

/** Approved comments of a post, and the form for a new one (held for an editor's approval). */
export async function Comments({ post, sp }: { post: Post; sp: Record<string, string> }) {
  const { count, threads } = postComments(post.id);
  const fan = await currentFan();
  const replyTo = Number(sp.reply) ? threads.flatMap((t) => [t.comment, ...t.replies]).find((c) => c.id === Number(sp.reply)) : undefined;
  return (
    <section className="comments" id="comments" aria-labelledby="comments-title">
      <h2 id="comments-title">نظرها {count > 0 && <span className="muted">({faNum(count)})</span>}</h2>
      {threads.length === 0 && <p className="muted">هنوز نظری ثبت نشده است؛ اولین نفر باشید.</p>}
      {threads.map((t) => (
        <div key={t.comment.id} className="comment-thread">
          <One c={t.comment} path={post.path} reply />
          {t.replies.length > 0 && (
            <div className="comment-replies">
              {t.replies.map((r) => (
                <One key={r.id} c={r} path={post.path} />
              ))}
            </div>
          )}
        </div>
      ))}

      <form action={submitComment} className="comment-form" id="comment-form">
        <h3>{replyTo ? <>پاسخ به {replyTo.author} <Link href={`${post.path}#comment-form`} scroll={false} className="muted">(لغو)</Link></> : "نظر شما"}</h3>
        {sp.comment === "sent" && <p className="predict-notice" role="status">نظر شما ثبت شد و پس از تأیید مدیر نمایش داده می‌شود. ممنون 🌹</p>}
        {sp.comment_error && <p className="predict-notice is-error" role="alert">{sp.comment_error}</p>}
        <input type="hidden" name="postId" value={post.id} />
        <input type="hidden" name="token" value={formToken()} />
        {replyTo && <input type="hidden" name="parent" value={replyTo.id} />}
        <div className="comment-hp" aria-hidden="true">
          <label>وب‌سایت <input name="website" tabIndex={-1} autoComplete="off" /></label>
        </div>
        <label>
          نام
          <input name="author" required minLength={2} maxLength={MAX_NAME} defaultValue={fan?.name ?? ""} autoComplete="nickname" />
        </label>
        <label>
          متن نظر
          <textarea name="content" required minLength={3} maxLength={MAX_COMMENT} rows={4} />
        </label>
        <p className="muted comment-rules">نظرها پس از بررسی و تأیید منتشر می‌شوند. نظرهای توهین‌آمیز، تبلیغاتی یا خلاف قانون منتشر نمی‌شوند.</p>
        <button type="submit" className="btn btn-primary">ارسال نظر</button>
      </form>
    </section>
  );
}
