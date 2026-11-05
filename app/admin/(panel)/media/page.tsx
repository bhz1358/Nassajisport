import type { Metadata } from "next";
import { removeMedia, uploadMedia } from "./actions";
import { Flash, PageHead } from "../../ui";
import { CopyButton, SubmitButton } from "../../ui-client";
import { faDate, faNum } from "@/lib/format";
import { listMedia } from "@/lib/media";

export const metadata: Metadata = { title: "رسانه" };

const size = (b: number) => (b > 1024 * 1024 ? `${faNum(Math.round(b / 104857.6) / 10)} مگابایت` : `${faNum(Math.round(b / 1024))} کیلوبایت`);

export default function MediaPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const items = listMedia();
  return (
    <>
      <PageHead title="رسانه" />
      <Flash searchParams={searchParams} />

      <form action={uploadMedia} className="a-card a-upload">
        <label className="a-dropzone">
          <input type="file" name="files" multiple accept="image/jpeg,image/png,image/webp,image/gif,image/avif,video/mp4" />
          <span>عکس یا ویدیو را انتخاب کنید (چند فایل با هم هم می‌شود). حداکثر ۲۵ مگابایت برای هر فایل.</span>
        </label>
        <SubmitButton>بارگذاری</SubmitButton>
      </form>

      <p className="a-hint">برای گذاشتن عکس داخل متن خبر: «کپی آدرس» را بزنید و در ویرایشگر خبر، دکمه‌ی 🖼 را بزنید.</p>

      {items.length === 0 ? (
        <div className="a-card a-empty">هنوز فایلی بارگذاری نشده.</div>
      ) : (
        <ul className="a-media-grid">
          {items.map((m) => (
            <li key={m.url} className="a-card">
              <a href={m.url} target="_blank" className="a-media-thumb">
                {m.isVideo ? (
                  <video src={m.url} muted preload="metadata" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.url} alt="" loading="lazy" />
                )}
              </a>
              <span className="a-media-name" dir="ltr" title={m.url}>
                {m.url.split("/").pop()}
              </span>
              <span className="muted small">
                {faDate(m.mtime)} · {size(m.size)}
              </span>
              <div className="a-media-actions">
                <CopyButton text={m.url} />
                <form action={removeMedia}>
                  <input type="hidden" name="url" value={m.url} />
                  <SubmitButton className="a-btn a-btn-small a-btn-danger" confirm="این فایل حذف شود؟ اگر در خبری استفاده شده، آنجا دیگر نمایش داده نمی‌شود.">
                    حذف
                  </SubmitButton>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
