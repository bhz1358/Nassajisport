import { needsPhoto, suggestPhotos } from "@/lib/photo-suggest";
import type { Post } from "@/lib/types";
import { SubmitButton } from "../../ui-client";
import { setSuggestedPhoto } from "./actions";

/** «پیشنهاد عکس» for a post with no photo of its own. */
export function PhotoSuggest({ post, all }: { post: Post; all: Post[] }) {
  if (!needsPhoto(post)) return null;
  const list = suggestPhotos(post, all);
  return (
    <section className="a-card a-suggest" id="suggest">
      <h2>پیشنهاد عکس</h2>
      <p className="a-hint">
        این خبر عکس خودش را ندارد{post.featuredImage ? " و فعلاً کاور ساختگی دارد" : ""}. عکس‌های زیر از خبرهای قبلی سایت دربارهٔ
        همین بازیکنان و تیم‌ها پیدا شده‌اند؛ با یک کلیک تصویر شاخص این خبر می‌شوند. (اگر متن را تغییر داده‌اید، اول ذخیره کنید.)
      </p>
      {list.length ? (
        <ul className="a-suggest-grid">
          {list.map((s) => (
            <li key={s.url}>
              <img src={s.url} alt="" loading="lazy" />
              <span className="a-hint" title={s.title}>{s.shared.join("، ")}</span>
              <form action={setSuggestedPhoto}>
                <input type="hidden" name="id" value={post.id} />
                <input type="hidden" name="url" value={s.url} />
                <SubmitButton className="a-btn a-btn-small" pendingText="…">همین عکس</SubmitButton>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="a-hint">عکس مرتبطی در آرشیو سایت پیدا نشد.</p>
      )}
      <form action={setSuggestedPhoto}>
        <input type="hidden" name="id" value={post.id} />
        <input type="hidden" name="cover" value="1" />
        <SubmitButton className="a-btn" pendingText="در حال ساخت…">ساخت کاور با لوگوی تیم‌ها</SubmitButton>
      </form>
    </section>
  );
}
