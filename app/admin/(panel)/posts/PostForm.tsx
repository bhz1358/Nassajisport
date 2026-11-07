import Link from "next/link";
import { deletePost, savePost } from "./actions";
import { Field } from "../../ui";
import { ImageField, RichEditor, SlugField, SubmitButton } from "../../ui-client";
import { getCategories } from "@/lib/content";
import { isoToJalaliParts } from "@/lib/jalali";
import { seoFor } from "@/lib/seo-auto";
import type { Post } from "@/lib/types";

/** What Google will show for the saved post. */
function SeoPreview({ post }: { post: Post }) {
  const { title, description } = seoFor(post);
  return (
    <div className="a-card a-seo-preview">
      <span className="a-label">پیش‌نمایش در گوگل</span>
      <div className="a-serp">
        <span className="a-serp-url" dir="ltr">
          {post.path}
        </span>
        <strong className="a-serp-title">{title}</strong>
        <span className="a-serp-desc">{description}</span>
      </div>
      {post.tags.length > 0 && <p className="a-hint">برچسب‌ها: {post.tags.join("، ")}</p>}
    </div>
  );
}

/** canPublish: false for writers, who save drafts for an editor to publish. */
export function PostForm({ post, canPublish = true }: { post?: Post; canPublish?: boolean }) {
  const cats = getCategories();
  const when = isoToJalaliParts(post?.date ?? new Date().toISOString());
  return (
    <>
      <form action={savePost} className="a-editor-layout">
        <input type="hidden" name="id" value={post?.id ?? ""} />
        <div className="a-editor-main">
          <div className="a-card">
            <Field label="عنوان">
              <input id="title" name="title" defaultValue={post?.title} required className="a-input-title" />
            </Field>
            <Field label="لید / خلاصه" hint="زیر عنوان و در کارت‌ها نشان داده می‌شود. اگر خالی بماند، از ابتدای متن ساخته می‌شود.">
              <textarea name="excerpt" defaultValue={post?.excerpt} rows={2} />
            </Field>
            <span className="a-label">متن</span>
            <RichEditor name="content" defaultValue={post?.content ?? ""} />
          </div>

          {post && <SeoPreview post={post} />}

          <details className="a-card">
            <summary>سئو و آدرس (اختیاری؛ خودکار پر می‌شود)</summary>
            <p className="a-hint">
              لازم نیست چیزی اینجا بنویسید: عنوان و توضیح گوگل از عنوان و متن خبر، نامک از عنوان، برچسب‌ها از نام تیم‌ها و بازیکنانی که در متن آمده‌اند، تصویر شاخص از اولین
              عکس متن، و توضیح عکس‌ها از عنوان ساخته می‌شود. فقط اگر می‌خواهید چیز دیگری باشد، اینجا بنویسید.
            </p>
            <Field label="نامک (slug)" hint="بخشی از آدرس صفحه. برای خبرهای جدید از روی عنوان ساخته می‌شود.">
              <SlugField titleId="title" defaultValue={post?.slug ?? ""} />
            </Field>
            <Field label="آدرس کامل" hint="برای خبرهای منتقل‌شده از وردپرس همان آدرس قدیمی است تا لینک‌ها خراب نشوند.">
              <input name="path" defaultValue={post?.path} dir="auto" placeholder="/نامک/" />
            </Field>
            <Field label="عنوان سئو" hint="خالی: همان عنوان خبر (حداکثر ۶۵ نویسه)">
              <input name="seoTitle" defaultValue={post?.seo?.title} placeholder="خودکار از عنوان" />
            </Field>
            <Field label="توضیحات سئو" hint="خالی: از لید یا ابتدای متن (حداکثر ۱۵۸ نویسه)">
              <textarea name="seoDescription" defaultValue={post?.seo?.description} rows={2} placeholder="خودکار از متن خبر" />
            </Field>
          </details>
        </div>

        <aside className="a-editor-side">
          <div className="a-card">
            {canPublish ? (
              <>
                <Field label="وضعیت">
                  <select name="status" defaultValue={post?.status ?? "publish"}>
                    <option value="publish">منتشرشده</option>
                    <option value="draft">پیش‌نویس</option>
                  </select>
                </Field>
                <Field label="نوع">
                  <select name="type" defaultValue={post?.type ?? "post"}>
                    <option value="post">خبر</option>
                    <option value="page">برگه (مثل درباره ما)</option>
                  </select>
                </Field>
              </>
            ) : (
              <p className="a-hint a-review-note">خبر به‌صورت پیش‌نویس ذخیره می‌شود و سردبیر پس از بررسی آن را منتشر می‌کند.</p>
            )}
            <div className="a-row">
              <Field label="تاریخ انتشار" hint="شمسی">
                <input name="date" defaultValue={when.date} dir="ltr" placeholder="1405/08/15" />
              </Field>
              <Field label="ساعت">
                <input name="time" defaultValue={when.time} dir="ltr" placeholder="18:30" />
              </Field>
            </div>
            <p className="a-hint">تاریخ آینده یعنی انتشار زمان‌بندی‌شده: خبر در آن ساعت خودکار نمایش داده می‌شود.</p>
            {canPublish && (
              <label className="a-check">
                <input type="checkbox" name="sticky" defaultChecked={post?.sticky} /> خبر ویژه (بالای صفحه اصلی)
              </label>
            )}
            <Field label="نویسنده">
              <input name="author" defaultValue={post?.author} />
            </Field>
            <SubmitButton>{!canPublish ? "ذخیره و ارسال برای بررسی" : post ? "ذخیره تغییرات" : "انتشار"}</SubmitButton>
            {post && post.status !== "draft" && (
              <Link href={post.path} target="_blank" className="a-link">
                مشاهده در سایت ↗
              </Link>
            )}
          </div>

          <div className="a-card">
            <span className="a-label">دسته‌ها</span>
            <p className="a-hint">اگر هیچ‌کدام را نزنید، خبر در «اخبار» قرار می‌گیرد.</p>
            <div className="a-checks">
              {cats.map((c) => (
                <label key={c.slug} className="a-check">
                  <input type="checkbox" name="categories" value={c.slug} defaultChecked={post?.categories.includes(c.slug)} />
                  {c.name}
                </label>
              ))}
            </div>
            <Field label="برچسب‌ها" hint="اختیاری. نام تیم‌ها و بازیکنانی که در متن آمده خودکار اضافه می‌شود؛ برچسب دیگری خواستید با ویرگول جدا کنید.">
              <input name="tags" defaultValue={post?.tags.join("، ")} />
            </Field>
          </div>

          <div className="a-card">
            <ImageField name="featuredImage" defaultValue={post?.featuredImage} label="تصویر شاخص" />
            <p className="a-hint">اگر خالی بماند، اولین عکس داخل متن تصویر شاخص می‌شود.</p>
          </div>
        </aside>
      </form>

      {post && canPublish && (
        <form action={deletePost} className="a-danger-zone">
          <input type="hidden" name="id" value={post.id} />
          <SubmitButton className="a-btn a-btn-danger" confirm={`«${post.title}» برای همیشه حذف شود؟`}>
            حذف این مطلب
          </SubmitButton>
        </form>
      )}
    </>
  );
}
