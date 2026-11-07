import Link from "next/link";
import { categoryName } from "@/lib/content";
import { faNum, faShortDate, faTime, faWeekday, readingMinutes } from "@/lib/format";
import { postImage } from "@/lib/images";
import { getLeague, teamLogo } from "@/lib/league";
import { getSettings, logoUrl } from "@/lib/settings";
import { HOME_TEAM, VIDEO_CATEGORY } from "@/lib/site";
import { splitTitle } from "@/lib/title";
import type { Fixture, Post, StandingRow } from "@/lib/types";

const isVideo = (p: Post) => p.categories.includes(VIDEO_CATEGORY);

export function HighlightTitle({ title }: { title: string }) {
  const [gold, rest] = splitTitle(title);
  return (
    <>
      {gold && <span className="gold-text">{gold}</span>}
      {rest}
    </>
  );
}

export function Thumb({ post, className = "", eager = false }: { post: Post; className?: string; eager?: boolean }) {
  const src = postImage(post);
  return (
    <div className={`thumb ${className}`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" loading={eager ? "eager" : "lazy"} decoding="async" />
      ) : (
        <div className="thumb-empty" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoUrl(getSettings())} alt="" />
        </div>
      )}
      {isVideo(post) && <PlayIcon />}
    </div>
  );
}

export function PlayIcon({ large = false }: { large?: boolean }) {
  return (
    <span className={`play ${large ? "play-lg" : ""}`} aria-label="ویدیو">
      <svg viewBox="0 0 24 24" width={large ? 26 : 20} height={large ? 26 : 20} aria-hidden="true">
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

export function SectionHeader({ title, href, action }: { title: React.ReactNode; href?: string; action?: React.ReactNode; tone?: "dark" }) {
  return (
    <div className="section-header">
      <h2>{title}</h2>
      {action}
      {href && (
        <Link href={href} className="more">
          مشاهده همه <span aria-hidden="true">←</span>
        </Link>
      )}
    </div>
  );
}

/* ---------- Story cards ---------- */

/** Glass card from the design: gold tag, optional photo, title, meta. */
export function NewsCard({ post, withImage = false, featured = false }: { post: Post; withImage?: boolean; featured?: boolean }) {
  return (
    <Link href={post.path} className={`news-card ${featured ? "is-featured" : ""} ${withImage ? "has-image" : ""}`}>
      {withImage && <Thumb post={post} className="news-card-media" />}
      <div className="news-card-body">
        <span className="tag">{categoryName(post.categories[0] ?? "") || "خبر"}</span>
        <h3>{post.title}</h3>
        <Meta post={post} />
      </div>
    </Link>
  );
}

export function LeadStory({ post }: { post: Post }) {
  return (
    <Link href={post.path} className="lead">
      <Thumb post={post} className="lead-media" eager />
      <div className="lead-body">
        <span className="tag">{categoryName(post.categories[0] ?? "") || "خبر"}</span>
        <h2>
          <HighlightTitle title={post.title} />
        </h2>
        {post.excerpt && <p className="lead-excerpt">{post.excerpt}</p>}
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
        <span className="kicker">{categoryName(post.categories[0] ?? "")}</span>
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
      <Meta post={post} />
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

/** Breaking-news bar: crimson to gold, headlines scroll slowly and pause on hover. */
export function BreakingBar({ posts }: { posts: Post[] }) {
  if (posts.length === 0) return null;
  const items = posts.map((p) => (
    <Link key={p.id} href={p.path}>
      {p.title}
    </Link>
  ));
  return (
    <div className="breaking" role="region" aria-label="اخبار فوری">
      <div className="breaking-inner">
        <strong className="breaking-label">
          <span className="live-dot" /> اخبار فوری
        </strong>
        <div className="breaking-track">
          <div className="breaking-run">
            {items}
            {/* Second copy makes the loop seamless; hidden from screen readers. */}
            <span aria-hidden="true" className="breaking-dup">
              {items}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Football ---------- */

const CREST_COLORS = ["#6d28d9", "#b91c1c", "#0f766e", "#1d4ed8", "#b45309", "#0369a1", "#be185d", "#4d7c0f"];

export function Crest({ team, size = 28 }: { team: string; size?: number }) {
  const logo = teamLogo(getLeague(), team);
  if (logo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logo} alt="" className="crest crest-img" width={size} height={size} style={{ width: size, height: size }} loading="lazy" />;
  }
  const color =
    team === HOME_TEAM ? "var(--brand-600)" : CREST_COLORS[[...team].reduce((a, c) => a + c.charCodeAt(0), 0) % CREST_COLORS.length];
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

/** "دقیقه ۶۷", or the live feed's words when there is no minute ("بین دو نیمه"). */
const liveText = (f: Fixture) => (f.minute ? `دقیقه ${faNum(f.minute)}` : f.liveLabel || "در جریان");

function StatusLabel({ f }: { f: Fixture }) {
  if (f.status === "live")
    return (
      <span className="status is-live">
        <span className="live-dot" /> زنده · {liveText(f)}
      </span>
    );
  if (f.status === "finished") return <span className="status">پایان بازی</span>;
  return <span className="status">{faShortDate(f.date)}</span>;
}

/** Sidebar card: the club's next match with matchweek, crests, day, time and venue. */
export function NextMatchCard({ f }: { f?: Fixture }) {
  if (!f) {
    return (
      <div className="next-match is-empty">
        <span className="next-match-label">دیدار بعدی</span>
        <p className="muted">برنامه‌ی بازی بعدی هنوز ثبت نشده.</p>
      </div>
    );
  }
  const live = f.status === "live";
  return (
    <Link href="/league/" className={`next-match ${live ? "is-live" : ""}`}>
      <div className="next-match-top">
        <span className="next-match-label">{live ? "در حال برگزاری" : "دیدار بعدی"}</span>
        {f.round ? <span className="next-match-round">هفته {faNum(f.round)}</span> : null}
      </div>
      <div className="next-match-teams">
        <div className="nm-team">
          <Crest team={f.home} size={60} />
          <strong>{f.home}</strong>
        </div>
        <div className="nm-center">
          {live ? (
            <span className="nm-score" dir="ltr">
              {faNum(f.awayScore ?? 0)} - {faNum(f.homeScore ?? 0)}
            </span>
          ) : (
            <span className="nm-time">{faTime(f.date)}</span>
          )}
          <span className="nm-date">{live ? liveText(f) : faWeekday(f.date)}</span>
        </div>
        <div className="nm-team">
          <Crest team={f.away} size={60} />
          <strong>{f.away}</strong>
        </div>
      </div>
      {f.venue && <div className="next-match-foot">{f.venue}</div>}
    </Link>
  );
}

/** Compact result rows for the sidebar. */
export function ResultList({ fixtures }: { fixtures: Fixture[] }) {
  return (
    <ul className="result-list">
      {fixtures.map((f, i) => (
        <li key={i} className={f.home === HOME_TEAM || f.away === HOME_TEAM ? "is-club" : ""}>
          <span className="rl-team rl-home">
            <span className="rl-name">{f.home}</span>
            <Crest team={f.home} size={22} />
          </span>
          <Score f={f} />
          <span className="rl-team rl-away">
            <Crest team={f.away} size={22} />
            <span className="rl-name">{f.away}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Compact pill in the header: the club's live or next match. */
export function NextMatchPill({ f }: { f?: Fixture }) {
  if (!f) return null;
  const label = f.status === "live" ? "زنده" : f.status === "scheduled" ? "بازی بعدی" : "آخرین بازی";
  return (
    <Link href="/league/" className={`next-pill ${f.status === "live" ? "is-live" : ""}`} title={`${f.home} - ${f.away}`}>
      {f.status === "live" && <span className="live-dot" />}
      <span className="next-pill-label">{label}</span>
      <Crest team={f.home} size={22} />
      {f.status === "scheduled" ? (
        <span className="next-pill-score">{faTime(f.date)}</span>
      ) : (
        <span className="next-pill-score">
          {faNum(f.homeScore ?? 0)}-{faNum(f.awayScore ?? 0)}
        </span>
      )}
      <Crest team={f.away} size={22} />
    </Link>
  );
}

/** The club's featured match: the first thing a fan looks for. */
export function MatchHero({ f, competition }: { f: Fixture; competition: string }) {
  const { ticketsUrl } = getSettings();
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
          {f.status === "scheduled" && ticketsUrl && (
            <a href={ticketsUrl} className="btn btn-primary" target="_blank" rel="noopener">
              خرید بلیت
            </a>
          )}
        </div>
      </div>
    </section>
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

/** A dash for columns the source table did not give (see StandingRow.partial). */
const known = (r: StandingRow, n: number) => (r.partial ? "—" : faNum(n));

/** Home page table: every team, only played / won / lost / points. */
export function HomeStandings({ rows }: { rows: StandingRow[] }) {
  return (
    <table className="standings is-home-table">
      <thead>
        <tr>
          <th>#</th>
          <th className="team-col">تیم</th>
          <th>بازی</th>
          <th>برد</th>
          <th>باخت</th>
          <th>امتیاز</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.team} className={r.team === HOME_TEAM ? "is-club" : ""}>
            <td className="pos">{faNum(i + 1)}</td>
            <td className="team-col">
              <Crest team={r.team} size={18} />
              <span className="team-name">{r.team}</span>
            </td>
            <td>{faNum(r.played)}</td>
            <td>{known(r, r.won)}</td>
            <td>{known(r, r.lost)}</td>
            <td className="pts">
              {faNum(r.points)}
              {r.deducted ? (
                <sup className="deducted" title={`${faNum(r.deducted)} امتیاز کسر شده`}>
                  −{faNum(r.deducted)}
                </sup>
              ) : null}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function StandingsTable({ rows, offset = 0, compact = false }: { rows: StandingRow[]; offset?: number; compact?: boolean }) {
  return (
    <table className={`standings ${compact ? "is-compact" : ""}`}>
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
                <td>{known(r, r.won)}</td>
                <td>{known(r, r.drawn)}</td>
                <td>{known(r, r.lost)}</td>
                <td>{known(r, r.goalsFor)}</td>
                <td>{known(r, r.goalsAgainst)}</td>
              </>
            )}
            <td dir="ltr">{known(r, r.goalsFor - r.goalsAgainst)}</td>
            <td className="pts">
              {faNum(r.points)}
              {r.deducted ? (
                <sup className="deducted" title={`${faNum(r.deducted)} امتیاز کسر شده`}>
                  −{faNum(r.deducted)}
                </sup>
              ) : null}
            </td>
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
