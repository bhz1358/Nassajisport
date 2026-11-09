import Link from "next/link";
import { AdSlot } from "./ad-slot";
import { FitToColumn, HeroSlider, MediaRail, type HeroSlide } from "./client";
import { WeekSchedule } from "./week-schedule";
import { PredictBox } from "./predict/PredictBox";
import { TopFans } from "./predict/TopFans";
import {
  BreakingBar,
  NewsCard,
  NextMatchCard,
  OpinionCard,
  QuoteCard,
  SampleNotice,
  SectionHeader,
  HomeStandings,
  StoryRow,
  VideoCard,
} from "./components";
import { categoryName, getNews, isSampleContent } from "@/lib/content";
import { getLeague, getNextClubMatch } from "@/lib/league";
import { postImage } from "@/lib/images";
import { getSettings, logoUrl } from "@/lib/settings";
import { OPINION_CATEGORIES, PRESS_CATEGORY, VIDEO_CATEGORY } from "@/lib/site";
import type { Post } from "@/lib/types";

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const week = Number((await searchParams).week) || undefined;
  const isSample = isSampleContent();
  const news = getNews();
  const league = getLeague();
  const logo = logoUrl(getSettings());

  // Each story appears once on the page: take() hands out posts that were not used yet.
  const used = new Set<number>();
  const take = (list: Post[], n: number) => {
    const out: Post[] = [];
    for (const p of list) {
      if (out.length >= n) break;
      if (used.has(p.id)) continue;
      used.add(p.id);
      out.push(p);
    }
    return out;
  };
  const inCat = (...slugs: string[]) => news.filter((p) => p.categories.some((c) => slugs.includes(c)));

  const heroPosts = take([...news.filter((p) => p.sticky), ...news], 5);
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
  // More news under the cards; FitToColumn shows as many as fit beside the sidebar.
  const dailyMore = take(news.filter((p) => !p.categories.includes(VIDEO_CATEGORY)), 24);
  const videos = take(inCat(VIDEO_CATEGORY), 8);
  const opinions = take(inCat(...OPINION_CATEGORIES), 3);
  const press = take(inCat(PRESS_CATEGORY), 2);
  const more = take(news, 6);

  const nextMatch = getNextClubMatch(league);

  return (
    <>
      <HeroSlider slides={slides} logo={logo} />
      <BreakingBar posts={breaking} />
      <AdSlot slot={1} className="pbox-top" />

      {isSample && <SampleNotice>پیش‌نمایش با محتوای نمونه؛ با وارد کردن خروجی وردپرس، خبرهای واقعی جایگزین می‌شوند.</SampleNotice>}

      <div className="home-main">
        <section aria-labelledby="daily-title">
          <SectionHeader title={<span id="daily-title">اخبار روزانه</span>} href="/category/news/" />
          <div className="daily-grid">
            {daily.map((p, i) => (
              <NewsCard key={p.id} post={p} withImage featured={i === 0} />
            ))}
          </div>
          {dailyMore.length > 0 && (
            <FitToColumn target=".home-side" mobileCount={6} className="daily-more">
              {dailyMore.map((p) => (
                <StoryRow key={p.id} post={p} />
              ))}
            </FitToColumn>
          )}
        </section>

        <aside className="home-side">
          <NextMatchCard f={nextMatch} />
          <PredictBox />
          <TopFans />
          <AdSlot slot={2} />
          {league.fixtures.some((f) => f.round) && (
            <div className="panel" id="home-weeks">
              <SectionHeader title="دیدارهای هفته" href="/league/#schedule" />
              <WeekSchedule
                fixtures={league.fixtures}
                week={week}
                totalWeeks={Math.max(0, (league.standings.length - 1) * 2)}
                basePath="/"
                anchor="home-weeks"
                compact
              />
            </div>
          )}
          <div className="panel">
            <SectionHeader title="جدول رده‌بندی لیگ" href="/league/" />
            <HomeStandings rows={league.standings} />
          </div>
          <AdSlot slot={4} className="pbox-sticky" />
        </aside>
      </div>

      <AdSlot slot={3} className="pbox-wide" />

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
