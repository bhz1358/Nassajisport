import type { Metadata } from "next";
import { requireAccess } from "@/lib/auth";
import { can, canEditPost } from "@/lib/roles";
import Link from "next/link";
import { Flash, PageHead } from "../../ui";
import { categoryName, getAllPosts, getCategories } from "@/lib/content";
import { faDate, faNum } from "@/lib/format";

export const metadata: Metadata = { title: "خبرها" };

const PAGE_SIZE = 40;

export default async function PostsList({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const me = await requireAccess("posts");
  // Writers see the posts they wrote.
  const mineOnly = !can(me.role, "publish");
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const status = sp.status ?? "";
  const cat = sp.cat ?? "";
  const type = sp.type ?? "";
  const page = Math.max(1, Number(sp.page) || 1);

  const all = getAllPosts().filter((p) => !mineOnly || p.createdBy === me.username);
  const filtered = all.filter(
    (p) =>
      (!q || p.title.includes(q) || p.tags.some((t) => t.includes(q))) &&
      (!status || (status === "draft" ? p.status === "draft" : p.status !== "draft")) &&
      (!cat || p.categories.includes(cat)) &&
      (!type || p.type === type),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const link = (n: number) => `?${new URLSearchParams({ ...sp, page: String(n) })}`;

  return (
    <>
      <PageHead title={mineOnly ? "خبرهای من" : "خبرها و برگه‌ها"}>
        <Link href="/admin/posts/new/" className="a-btn a-btn-primary">
          + خبر جدید
        </Link>
      </PageHead>
      <Flash searchParams={searchParams} />

      <form className="a-filters" role="search">
        <input name="q" defaultValue={q} placeholder="جست‌وجو در عنوان و برچسب" aria-label="جست‌وجو" />
        <select name="status" defaultValue={status} aria-label="وضعیت">
          <option value="">همه وضعیت‌ها</option>
          <option value="publish">منتشرشده</option>
          <option value="draft">پیش‌نویس</option>
        </select>
        <select name="type" defaultValue={type} aria-label="نوع">
          <option value="">خبر و برگه</option>
          <option value="post">فقط خبر</option>
          <option value="page">فقط برگه</option>
        </select>
        <select name="cat" defaultValue={cat} aria-label="دسته">
          <option value="">همه دسته‌ها</option>
          {getCategories().map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
        <button className="a-btn">فیلتر</button>
      </form>

      <p className="muted">
        {faNum(filtered.length)} مورد از {faNum(all.length)}
      </p>

      <div className="a-card a-table-wrap">
        <table className="a-table">
          <thead>
            <tr>
              <th>عنوان</th>
              <th>دسته</th>
              <th>تاریخ</th>
              <th>وضعیت</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const future = new Date(p.date) > new Date();
              return (
                <tr key={p.id}>
                  <td>
                    {canEditPost(me.role, me.username, p) ? (
                      <Link href={`/admin/posts/${p.id}/`} className="a-strong">
                        {p.title}
                      </Link>
                    ) : (
                      <span className="a-strong" title="منتشرشده؛ ویرایش با سردبیر است">
                        {p.title}
                      </span>
                    )}
                    {p.type === "page" && <span className="a-tag">برگه</span>}
                    {p.sticky && <span className="a-tag is-accent">ویژه</span>}
                  </td>
                  <td className="muted">{p.categories.map(categoryName).join("، ")}</td>
                  <td className="muted a-nowrap">{faDate(p.date)}</td>
                  <td>
                    {p.status === "draft" ? (
                      <span className="a-tag">پیش‌نویس</span>
                    ) : future ? (
                      <span className="a-tag is-warn">زمان‌بندی‌شده</span>
                    ) : (
                      <span className="a-tag is-ok">منتشرشده</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="a-empty">
                  مطلبی پیدا نشد.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <nav className="a-pager" aria-label="صفحه‌ها">
          {page > 1 && <Link href={link(page - 1)}>قبلی</Link>}
          <span>
            صفحه {faNum(page)} از {faNum(pages)}
          </span>
          {page < pages && <Link href={link(page + 1)}>بعدی</Link>}
        </nav>
      )}
    </>
  );
}
