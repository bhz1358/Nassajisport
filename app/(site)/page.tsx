import Link from "next/link";
import { HeroSlider, MediaRail, ResultsTabs, type HeroSlide } from "./client";
import {
  BreakingBar,
  FixtureRow,
  NewsCard,
  OpinionCard,
  QuoteCard,
  SampleNotice,
  SectionHeader,
  HomeStandings,
  StoryRow,
  VideoCard,
} from "./components";
import { categoryName, getNews, isSampleContent } from "@/lib/content";
import { getLeague } from "@/lib/league";
import { postImage } from "@/lib/images";
import { getSettings, logoUrl } from "@/lib/settings";
import { HOME_TEAM, OPINION_CATEGORIES, PRESS_CATEGORY, VIDEO_CATEGORY } from "@/lib/site";
import type { Fixture, Post } from "@/lib/types";

function FixtureList({ fixtures, empty }: { fixtures: Fixture[]; empty: string }) {
  return fixtures.length ? (
    <ul className="fixtures">
      {fixtures.map((f, i) => (
        <FixtureRow key={i} f={f} />
      ))}
    </ul>
  ) : (
    <p className="muted empty">{empty}</p>
  );
}

export default function Home() {
  const isSample = isSampleContent();
  const news = getNews();
  const league = getLeague();
  const logo = logoUrl(getSettings());

  // Each story appears once on the page: take() hands out posts that were not used yet.
  const used = new Set<number>();
  const take = (list: Post[], n: number) => {
    const out = list.filter((p) => !used.has(p.id)).slice(0, n);
    out.forEach((p) => used.add(p.id));
    return out;
  };
  const inCat = (...slugs: string[]) => news.filter((p) => p.categories.some((c) => slugs.includes(c)));

  const heroPosts = take([...news.filter((p) => p.sticky), ...news], 4);
  const slides: HeroSlide[] = heroPosts.map((p) => ({
    id: p.id,
    path: p.path,
    title: p.title,
    excerpt: p.excerpt,
    kicker: categoryName(p.categories[0] ?? "") || "خبر ویژه",
    image: postImage(p),
    isVideo: p.categories.includes(VIDEO_CATEGORY),
  }));
  const breaking = news.slice(0, 6);
  // With only a handful of posts the hero uses them all; repeat rather than leave the section empty.
  const freshDaily = take(news.filter((p) => !p.categories.includes(VIDEO_CATEGORY)), 5);
  const daily = freshDaily.length ? freshDaily : news.slice(0, 5);
  const videos = take(inCat(VIDEO_CATEGORY), 8);
  const opinions = take(inCat(...OPINION_CATEGORIES), 3);
  const press = take(inCat(PRESS_CATEGORY), 2);
  const more = take(news, 6);

  const byDate = (a: Fixture, b: Fixture) => a.date.localeCompare(b.date);
  const live = league.fixtures.filter((f) => f.status === "live");
  const upcoming = league.fixtures.filter((f) => f.status === "scheduled").sort(byDate);
  const results = league.fixtures.filter((f) => f.status === "finished").sort((a, b) => byDate(b, a));
  const clubFixtures = league.fixtures.filter((f) => f.home === HOME_TEAM || f.away === HOME_TEAM).sort(byDate);

  return (
    <>
      <HeroSlider slides={slides} logo={logo} />
      <BreakingBar posts={breaking} />

      {isSample && <SampleNotice>پیش‌نمایش با محتوای نمونه؛ با وارد کردن خروجی وردپرس، خبرهای واقعی جایگزین می‌شوند.</SampleNotice>}

      <div className="home-main">
        <section aria-labelledby="daily-title">
          <SectionHeader title={<span id="daily-title">اخبار روزانه</span>} href="/category/news/" />
          <div className="daily-grid">
            {daily.map((p, i) => (
              <NewsCard key={p.id} post={p} withImage={i === 0} featured={i === 0} />
            ))}
          </div>
        </section>

        <aside className="home-side">
          <div className="panel">
            <ResultsTabs
              panels={[
                { key: "all", label: "همه بازی‌ها", content: <FixtureList fixtures={[...live, ...upcoming, ...results].slice(0, 6)} empty="بازی‌ای ثبت نشده." /> },
                { key: "live", label: "زنده", content: <FixtureList fixtures={live} empty="الان بازی‌ای در جریان نیست." /> },
                { key: "upcoming", label: "پیش رو", content: <FixtureList fixtures={upcoming.slice(0, 6)} empty="بازی پیش رویی ثبت نشده." /> },
                { key: "results", label: "نتایج", content: <FixtureList fixtures={results.slice(0, 6)} empty="هنوز نتیجه‌ای ثبت نشده." /> },
                { key: "club", label: "بازی‌های نساجی", content: <FixtureList fixtures={clubFixtures} empty="بازی‌ای از نساجی ثبت نشده." /> },
              ]}
            />
          </div>
          <div className="panel">
            <SectionHeader title="جدول رده‌بندی لیگ" href="/league/" />
            <HomeStandings rows={league.standings} />
          </div>
        </aside>
      </div>

      {videos.length > 0 && (
        <section className="block" aria-labelledby="media-title">
          <SectionHeader title={<span id="media-title">چندرسانه‌ای</span>} href="/category/video/" />
          <MediaRail label="ویدیوها">
            {videos.map((p) => (
              <VideoCard key={p.id} post={p} />
            ))}
          </MediaRail>
        </section>
      )}

      {opinions.length > 0 && (
        <section className="block">
          <SectionHeader title="تحلیل و یادداشت" href="/category/review/" />
          <div className="rail rail-3">
            {opinions.map((p) => (
              <OpinionCard key={p.id} post={p} />
            ))}
          </div>
        </section>
      )}

      <div className="split block">
        <section>
          <SectionHeader title="اخبار بیشتر" href="/category/news/" />
          <div className="rows">
            {more.map((p) => (
              <StoryRow key={p.id} post={p} />
            ))}
          </div>
        </section>
        <aside className="side-stack">
          {press.length > 0 && (
            <div className="panel">
              <SectionHeader title="نشست خبری" href="/category/press-conference/" />
              <div className="quotes">
                {press.map((p) => (
                  <QuoteCard key={p.id} post={p} />
                ))}
              </div>
            </div>
          )}
          <Link href="/team/" className="team-cta">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logo} alt="" width={56} height={56} />
            <span>
              <strong>تیم نساجی مازندران</strong>
              <small>ترکیب، بازیکنان و کادر فنی</small>
            </span>
            <span aria-hidden="true">←</span>
          </Link>
        </aside>
      </div>
    </>
  );
}
