import { FixtureRow, HeroCard, PostCard, SampleNotice, SectionTitle, StandingsTable } from "./components";
import { getContent, getNews } from "@/lib/content";
import { getLeague } from "@/lib/league";

export default function Home() {
  const { isSample } = getContent();
  const news = getNews();
  const featured = [...news.filter((p) => p.sticky), ...news.filter((p) => !p.sticky)].slice(0, 5);
  const featuredIds = new Set(featured.map((p) => p.id));
  const latest = news.filter((p) => !featuredIds.has(p.id)).slice(0, 9);
  const league = getLeague();

  return (
    <>
      {isSample && (
        <SampleNotice>
          این پیش‌نمایش با محتوای نمونه ساخته شده. با وارد کردن خروجی وردپرس، خبرهای واقعی سایت جایگزین می‌شوند.
        </SampleNotice>
      )}

      {featured.length > 0 && (
        <section className="hero">
          <HeroCard post={featured[0]} big />
          {featured.slice(1).map((p) => (
            <HeroCard key={p.id} post={p} />
          ))}
        </section>
      )}

      <div className="home-grid">
        <section>
          <SectionTitle>نوشته‌های اخیر</SectionTitle>
          <div className="cards">
            {(latest.length ? latest : news).map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
          </div>
        </section>

        <aside className="sidebar">
          <div className="widget">
            <SectionTitle href="/league/">نتایج زنده</SectionTitle>
            <ul className="fixtures">
              {league.fixtures.slice(0, 5).map((f, i) => (
                <FixtureRow key={i} f={f} />
              ))}
            </ul>
          </div>
          <div className="widget">
            <SectionTitle href="/league/">جدول {league.competition}</SectionTitle>
            <StandingsTable rows={league.standings} compact />
            {league.isSample && <p className="muted small">داده‌ی نمونه؛ بعداً از سرویس نتایج زنده پر می‌شود.</p>}
          </div>
        </aside>
      </div>
    </>
  );
}
