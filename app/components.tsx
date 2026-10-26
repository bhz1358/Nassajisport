import Link from "next/link";
import { categoryName } from "@/lib/content";
import { faNum, faShortDate, faTime, faWeekday, readingMinutes } from "@/lib/format";
import { HOME_TEAM, TICKETS_URL, VIDEO_CATEGORY } from "@/lib/site";
import type { Fixture, Post, StandingRow } from "@/lib/types";

const isVideo = (p: Post) => p.categories.includes(VIDEO_CATEGORY);

export function Thumb({ post, className = "" }: { post: Post; className?: string }) {
  return (
    <div className={`thumb ${className}`}>
      {post.featuredImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.featuredImage} alt="" loading="lazy" />
      ) : (
        <div className="thumb-empty" aria-hidden="true" />
      )}
      {isVideo(post) && <PlayIcon />}
    </div>
  );
}

function PlayIcon() {
  return (
    <span className="play" aria-label="ویدیو">
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <path d="M8 5v14l11-7z" fill="currentColor" />
      </svg>
    </span>
  );
}

export function CategoryBadge({ slug }: { slug?: string }) {
  if (!slug) return null;
  return <span className="badge">{categoryName(slug)}</span>;
}

function Meta({ post, withReading = false }: { post: Post; withReading?: boolean }) {
  return (
    <p className="meta">
      <time dateTime={post.date}>{faShortDate(post.date)}</time>
      {withReading && <span>{faNum(readingMinutes(post.content))} دقیقه مطالعه</span>}
    </p>
  );
}

export function SectionHeader({ title, href, tone }: { title: React.ReactNode; href?: string; tone?: "dark" }) {
  return (
    <div className={`section-header ${tone === "dark" ? "on-dark" : ""}`}>
      <h2>{title}</h2>
      {href && (
        <Link href={href} className="more">
          بیشتر <span aria-hidden="true">←</span>
        </Link>
      )}
    </div>
  );
}

/* ---------- Story cards ---------- */

export function LeadStory({ post }: { post: Post }) {
  return (
    <Link href={post.path} className="lead">
      <Thumb post={post} className="lead-media" />
      <div className="lead-body">
        <CategoryBadge slug={post.categories[0]} />
        <h2>{post.title}</h2>
        <p className="lead-excerpt">{post.excerpt}</p>
        <Meta post={post} withReading />
      </div>
    </Link>
  );
}

export function StoryCard({ post }: { post: Post }) {
  return (
    <Link href={post.path} className="story">
      <Thumb post={post} className="story-media" />
      <div className="story-body">
        <span className="kicker">{categoryName(post.categories[0] ?? "")}</span>
        <h3>{post.title}</h3>
        <Meta post={post} />
      </div>
    </Link>
  );
}

export function StoryRow({ post }: { post: Post }) {
  return (
    <Link href={post.path} className="story-row">
      <Thumb post={post} className="story-row-media" />
      <div>
        <h3>{post.title}</h3>
        <Meta post={post} />
      </div>
    </Link>
  );
}

export function VideoCard({ post }: { post: Post }) {
  return (
    <Link href={post.path} className="video-card">
      <Thumb post={post} className="video-media" />
      <h3>{post.title}</h3>
    </Link>
  );
}

export function OpinionCard({ post }: { post: Post }) {
  const author = post.author ?? "تحریریه";
  return (
    <Link href={post.path} className="opinion">
      <span className="avatar" aria-hidden="true">
        {author.charAt(0)}
      </span>
      <div>
        <span className="kicker">{categoryName(post.categories[0] ?? "")}</span>
        <h3>{post.title}</h3>
        <p className="meta">
          <span>{author}</span>
          <span>{faNum(readingMinutes(post.content))} دقیقه مطالعه</span>
        </p>
      </div>
    </Link>
  );
}

export function QuoteCard({ post }: { post: Post }) {
  return (
    <Link href={post.path} className="quote-card">
      <span className="quote-mark" aria-hidden="true">
        ”
      </span>
      <h3>{post.title}</h3>
      <Meta post={post} />
    </Link>
  );
}

export function LatestTimeline({ posts }: { posts: Post[] }) {
  return (
    <ol className="timeline">
      {posts.map((p) => (
        <li key={p.id}>
          <time dateTime={p.date}>{faTime(p.date)}</time>
          <Link href={p.path}>{p.title}</Link>
        </li>
      ))}
    </ol>
  );
}

/* ---------- Football ---------- */

const CREST_COLORS = ["#1a4fa3", "#c0163a", "#0f766e", "#7c3aed", "#b45309", "#0369a1", "#be185d", "#4d7c0f"];

export function Crest({ team, size = 28 }: { team: string; size?: number }) {
  const color = team === HOME_TEAM ? "#c0163a" : CREST_COLORS[[...team].reduce((a, c) => a + c.charCodeAt(0), 0) % CREST_COLORS.length];
  return (
    <span className="crest" style={{ width: size, height: size, background: color, fontSize: size * 0.42 }} aria-hidden="true">
      {team.charAt(0)}
    </span>
  );
}

function Score({ f }: { f: Fixture }) {
  if (f.status === "scheduled") return <span className="score is-time">{faTime(f.date)}</span>;
  // Separate spans so in RTL the home score sits on the home team's side.
  return (
    <span className={`score ${f.status === "live" ? "is-live" : ""}`}>
      <span>{faNum(f.homeScore ?? 0)}</span>
      <span className="sep">-</span>
      <span>{faNum(f.awayScore ?? 0)}</span>
    </span>
  );
}

function StatusLabel({ f }: { f: Fixture }) {
  if (f.status === "live")
    return (
      <span className="status is-live">
        <span className="live-dot" /> زنده · دقیقه {faNum(f.minute ?? 0)}
      </span>
    );
  if (f.status === "finished") return <span className="status">پایان بازی</span>;
  return <span className="status">{faShortDate(f.date)}</span>;
}

/** The club's featured match: the first thing a fan looks for. */
export function MatchHero({ f, competition }: { f: Fixture; competition: string }) {
  return (
    <section className={`match-hero ${f.status === "live" ? "is-live" : ""}`} aria-label="بازی نساجی">
      <div className="match-hero-top">
        <span>{f.status === "live" ? "در جریان" : f.status === "scheduled" ? "بازی بعدی" : "آخرین بازی"}</span>
        <span>{competition}</span>
      </div>
      <div className="match-hero-teams">
        <div className="mh-team">
          <Crest team={f.home} size={64} />
          <strong>{f.home}</strong>
        </div>
        <div className="mh-center">
          <Score f={f} />
          <StatusLabel f={f} />
        </div>
        <div className="mh-team">
          <Crest team={f.away} size={64} />
          <strong>{f.away}</strong>
        </div>
      </div>
      <div className="match-hero-foot">
        <span>
          {faWeekday(f.date)}
          {f.venue && ` · ${f.venue}`}
        </span>
        <div className="mh-actions">
          <Link href="/league/" className="btn btn-ghost">
            مرکز لیگ
          </Link>
          {f.status === "scheduled" && (
            <a href={TICKETS_URL} className="btn btn-primary" target="_blank" rel="noopener">
              خرید بلیت
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

export function ScoreStrip({ fixtures }: { fixtures: Fixture[] }) {
  if (fixtures.length === 0) return null;
  return (
    <div className="score-strip" aria-label="نتایج بازی‌ها">
      <div className="container score-strip-inner">
        <Link href="/league/" className="strip-label">
          لیگ برتر
        </Link>
        <ul>
          {fixtures.map((f, i) => (
            <li key={i} className={f.home === HOME_TEAM || f.away === HOME_TEAM ? "is-club" : ""}>
              <Link href="/league/">
                <span className="strip-teams">
                  <span>{f.home}</span>
                  <span>{f.away}</span>
                </span>
                <span className="strip-score">
                  {f.status === "scheduled" ? (
                    <span className="strip-time">{faTime(f.date)}</span>
                  ) : (
                    <>
                      <span>{faNum(f.homeScore ?? 0)}</span>
                      <span>{faNum(f.awayScore ?? 0)}</span>
                    </>
                  )}
                </span>
                {f.status === "live" && <span className="strip-live">{faNum(f.minute ?? 0)}′</span>}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function FixtureRow({ f }: { f: Fixture }) {
  const isClub = f.home === HOME_TEAM || f.away === HOME_TEAM;
  return (
    <li className={`fixture ${isClub ? "is-club" : ""}`}>
      <span className="fx-team fx-home">
        {f.home} <Crest team={f.home} size={22} />
      </span>
      <Score f={f} />
      <span className="fx-team fx-away">
        <Crest team={f.away} size={22} /> {f.away}
      </span>
      <StatusLabel f={f} />
    </li>
  );
}

const FORM_LABEL = { W: "ب", D: "م", L: "ش" } as const;

export function FormDots({ form }: { form?: StandingRow["form"] }) {
  if (!form?.length) return null;
  return (
    <span className="form">
      {form.map((r, i) => (
        <span key={i} className={`form-${r}`} title={r === "W" ? "برد" : r === "D" ? "مساوی" : "شکست"}>
          {FORM_LABEL[r]}
        </span>
      ))}
    </span>
  );
}

export function StandingsTable({
  rows,
  offset = 0,
  compact = false,
}: {
  rows: StandingRow[];
  offset?: number;
  compact?: boolean;
}) {
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
          {!compact && <th className="form-col">۵ بازی اخیر</th>}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.team} className={r.team === HOME_TEAM ? "is-club" : ""}>
            <td className="pos">{faNum(offset + i + 1)}</td>
            <td className="team-col">
              <Crest team={r.team} size={20} />
              {r.team}
            </td>
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
            {!compact && (
              <td className="form-col">
                <FormDots form={r.form} />
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function SampleNotice({ children }: { children: React.ReactNode }) {
  return <div className="sample-notice">{children}</div>;
}
