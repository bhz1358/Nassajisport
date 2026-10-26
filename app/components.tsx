import Link from "next/link";
import { categoryName } from "@/lib/content";
import { faDate, faNum } from "@/lib/format";
import { HOME_TEAM } from "@/lib/site";
import type { Fixture, Post, StandingRow } from "@/lib/types";

export function Thumb({ post, className = "" }: { post: Post; className?: string }) {
  return post.featuredImage ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img className={`thumb ${className}`} src={post.featuredImage} alt="" loading="lazy" />
  ) : (
    <div className={`thumb thumb-empty ${className}`} aria-hidden="true">
      <span>N</span>
    </div>
  );
}

export function CategoryBadge({ slug }: { slug?: string }) {
  if (!slug) return null;
  return <span className="badge">{categoryName(slug)}</span>;
}

export function HeroCard({ post, big = false }: { post: Post; big?: boolean }) {
  return (
    <Link href={post.path} className={`hero-card ${big ? "hero-big" : ""}`}>
      <Thumb post={post} />
      <div className="hero-overlay">
        <CategoryBadge slug={post.categories[0]} />
        <h2>{post.title}</h2>
        {big && <p>{post.excerpt}</p>}
      </div>
    </Link>
  );
}

export function PostCard({ post }: { post: Post }) {
  return (
    <article className="card">
      <Link href={post.path} className="card-media">
        <Thumb post={post} />
        <CategoryBadge slug={post.categories[0]} />
      </Link>
      <div className="card-body">
        <h3>
          <Link href={post.path}>{post.title}</Link>
        </h3>
        <time dateTime={post.date}>{faDate(post.date)}</time>
      </div>
    </article>
  );
}

export function SectionTitle({ children, href }: { children: React.ReactNode; href?: string }) {
  return (
    <div className="section-title">
      <h2>{children}</h2>
      {href && <Link href={href}>همه</Link>}
    </div>
  );
}

export function SampleNotice({ children }: { children: React.ReactNode }) {
  return <div className="sample-notice">{children}</div>;
}

export function StandingsTable({ rows, compact = false }: { rows: StandingRow[]; compact?: boolean }) {
  return (
    <table className="standings">
      <thead>
        <tr>
          <th>#</th>
          <th className="team-col">تیم</th>
          <th>بازی</th>
          {!compact && (
            <>
              <th>برد</th>
              <th>مساوی</th>
              <th>باخت</th>
              <th>زده</th>
              <th>خورده</th>
            </>
          )}
          <th>تفاضل</th>
          <th>امتیاز</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.team} className={r.team === HOME_TEAM ? "is-home" : ""}>
            <td>{faNum(i + 1)}</td>
            <td className="team-col">{r.team}</td>
            <td>{faNum(r.played)}</td>
            {!compact && (
              <>
                <td>{faNum(r.won)}</td>
                <td>{faNum(r.drawn)}</td>
                <td>{faNum(r.lost)}</td>
                <td>{faNum(r.goalsFor)}</td>
                <td>{faNum(r.goalsAgainst)}</td>
              </>
            )}
            <td dir="ltr">{faNum(r.goalsFor - r.goalsAgainst)}</td>
            <td className="pts">{faNum(r.points)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const timeFmt = new Intl.DateTimeFormat("fa-IR", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tehran" });

export function FixtureRow({ f }: { f: Fixture }) {
  const score =
    f.status === "scheduled" ? (
      <span className="fx-time">{timeFmt.format(new Date(f.date))}</span>
    ) : (
      // Separate spans so in RTL the home score sits on the home team's side.
      <span className="fx-score">
        <span>{faNum(f.homeScore ?? 0)}</span>
        <span>-</span>
        <span>{faNum(f.awayScore ?? 0)}</span>
      </span>
    );
  const involvesHome = f.home === HOME_TEAM || f.away === HOME_TEAM;
  return (
    <li className={`fixture ${involvesHome ? "is-home" : ""}`}>
      <span className="fx-team fx-home">{f.home}</span>
      {score}
      <span className="fx-team fx-away">{f.away}</span>
      <span className={`fx-status fx-${f.status}`}>
        {f.status === "live" ? `زنده ${faNum(f.minute ?? 0)}′` : f.status === "finished" ? "پایان" : faDate(f.date)}
      </span>
    </li>
  );
}
