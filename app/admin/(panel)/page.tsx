import Link from "next/link";
import { Flash, PageHead } from "../ui";
import { requireAccess } from "@/lib/auth";
import { can, canEditPost, sectionOfPath } from "@/lib/roles";
import { getAllPosts, getCategories, isSampleContent } from "@/lib/content";
import { faDate, faNum } from "@/lib/format";
import { getLeague } from "@/lib/league";
import { listMedia } from "@/lib/media";
import { getSquad } from "@/lib/squad";

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const me = await requireAccess();
  const allowed = (href: string) => {
    const section = sectionOfPath(href);
    return !section || can(me.role, section);
  };
  const canPublish = can(me.role, "publish");
  // Writers see their own posts.
  const posts = getAllPosts().filter(
    (p) => canPublish || p.createdBy === me.username,
  );
  const drafts = posts.filter((p) => p.status === "draft");
  const league = getLeague();
  const squad = getSquad();
  const live = league.fixtures.filter((f) => f.status === "live");

  const cards = [
    {
      label: "خبر منتشرشده",
      value: posts.filter((p) => p.type === "post" && p.status !== "draft")
        .length,
      href: "/admin/posts/",
    },
    {
      label: "پیش‌نویس",
      value: drafts.length,
      href: "/admin/posts/?status=draft",
    },
    {
      label: "دسته",
      value: getCategories().length,
      href: "/admin/categories/",
    },
    { label: "فایل رسانه", value: listMedia().length, href: "/admin/media/" },
    { label: "بازیکن", value: squad.players.length, href: "/admin/squad/" },
    {
      label: "بازی ثبت‌شده",
      value: league.fixtures.length,
      href: "/admin/league/",
    },
  ].filter((c) => allowed(c.href));

  return (
    <>
      <PageHead title="داشبورد">
        {can(me.role, "posts") && (
          <Link href="/admin/posts/new/" className="a-btn a-btn-primary">
            + خبر جدید
          </Link>
        )}
      </PageHead>
      <Flash searchParams={searchParams} />

      {me.role === "admin" &&
        (isSampleContent() || squad.isSample || league.isSample) && (
          <div className="a-flash is-warn">
            بخشی از محتوای سایت هنوز نمونه است.
            {isSampleContent() && (
              <>
                {" "}
                خبرهای واقعی را از{" "}
                <Link href="/admin/import/">درون‌ریزی وردپرس</Link> وارد کنید.
              </>
            )}
          </div>
        )}

      <div className="a-stats">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="a-card a-stat">
            <strong>{faNum(c.value)}</strong>
            <span>{c.label}</span>
          </Link>
        ))}
      </div>

      <div className="a-grid-2">
        {can(me.role, "posts") && (
          <section className="a-card">
            <h2>{canPublish ? "آخرین خبرها" : "خبرهای من"}</h2>
            <ul className="a-list">
              {posts
                .filter((p) => p.type === "post")
                .slice(0, 8)
                .map((p) => (
                  <li key={p.id}>
                    {canEditPost(me.role, me.username, p) ? (
                      <Link href={`/admin/posts/${p.id}/`}>{p.title}</Link>
                    ) : (
                      <span>{p.title}</span>
                    )}
                    <span className="muted">
                      {p.status === "draft" ? "پیش‌نویس" : faDate(p.date)}
                    </span>
                  </li>
                ))}
            </ul>
          </section>
        )}
        {can(me.role, "league") && (
          <section className="a-card">
            <h2>بازی‌ها</h2>
            {live.length > 0 && (
              <p className="a-live">
                ● {faNum(live.length)} بازی در جریان؛ نتیجه را به‌روز کنید.
              </p>
            )}
            <ul className="a-list">
              {league.fixtures.slice(0, 6).map((f, i) => (
                <li key={i}>
                  <span>
                    {f.home} - {f.away}
                  </span>
                  <span className="muted">
                    {f.status === "scheduled"
                      ? faDate(f.date)
                      : `${faNum(f.homeScore ?? 0)} - ${faNum(f.awayScore ?? 0)}`}
                  </span>
                </li>
              ))}
            </ul>
            <Link href="/admin/league/" className="a-btn a-btn-small">
              ویرایش نتایج و جدول
            </Link>
          </section>
        )}
      </div>
    </>
  );
}
