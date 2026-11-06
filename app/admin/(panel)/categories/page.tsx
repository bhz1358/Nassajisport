import type { Metadata } from "next";
import { requireAccess } from "@/lib/auth";
import { deleteCategory, saveCategory } from "./actions";
import { Field, Flash, PageHead } from "../../ui";
import { SubmitButton } from "../../ui-client";
import { getAllPosts, getCategories } from "@/lib/content";
import { faNum } from "@/lib/format";

export const metadata: Metadata = { title: "دسته‌ها" };

export default async function CategoriesPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireAccess("categories");
  const cats = getCategories();
  const posts = getAllPosts();
  const count = (slug: string) => posts.filter((p) => p.categories.includes(slug)).length;

  return (
    <>
      <PageHead title="دسته‌ها" />
      <Flash searchParams={searchParams} />
      <p className="a-hint">نامک بخشی از آدرس دسته است (/category/نامک/). منوی بالای سایت به این نامک‌ها لینک می‌دهد.</p>

      <div className="a-card a-table-wrap">
        <table className="a-table">
          <thead>
            <tr>
              <th>نام</th>
              <th>نامک</th>
              <th>زیرمجموعه‌ی</th>
              <th>مطالب</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {cats.map((c) => (
              <tr key={c.slug}>
                <td colSpan={3}>
                  <form action={saveCategory} className="a-inline-form" id={`cat-${c.slug}`}>
                    <input type="hidden" name="original" value={c.slug} />
                    <input name="name" defaultValue={c.name} aria-label="نام" required />
                    <input name="slug" defaultValue={c.slug} aria-label="نامک" dir="auto" required />
                    <select name="parent" defaultValue={c.parent ?? ""} aria-label="دسته‌ی والد">
                      <option value="">—</option>
                      {cats
                        .filter((o) => o.slug !== c.slug)
                        .map((o) => (
                          <option key={o.slug} value={o.slug}>
                            {o.name}
                          </option>
                        ))}
                    </select>
                    <SubmitButton className="a-btn a-btn-small">ذخیره</SubmitButton>
                  </form>
                </td>
                <td className="muted">{faNum(count(c.slug))}</td>
                <td>
                  <form action={deleteCategory}>
                    <input type="hidden" name="slug" value={c.slug} />
                    <SubmitButton
                      className="a-btn a-btn-small a-btn-danger"
                      confirm={`دسته‌ی «${c.name}» حذف شود؟ خبرهایش حذف نمی‌شوند، فقط از این دسته خارج می‌شوند.`}
                    >
                      حذف
                    </SubmitButton>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form action={saveCategory} className="a-card a-form-row">
        <h2>دسته‌ی جدید</h2>
        <Field label="نام">
          <input name="name" required placeholder="مثلاً: نقل و انتقالات" />
        </Field>
        <Field label="نامک" hint="انگلیسی یا فارسی، بدون فاصله">
          <input name="slug" required dir="auto" placeholder="transfers" />
        </Field>
        <Field label="زیرمجموعه‌ی">
          <select name="parent" defaultValue="">
            <option value="">—</option>
            {cats.map((o) => (
              <option key={o.slug} value={o.slug}>
                {o.name}
              </option>
            ))}
          </select>
        </Field>
        <SubmitButton>افزودن دسته</SubmitButton>
      </form>
    </>
  );
}
