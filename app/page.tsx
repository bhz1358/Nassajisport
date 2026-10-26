import Link from "next/link";
import {
  LatestTimeline,
  LeadStory,
  MatchHero,
  OpinionCard,
  QuoteCard,
  SampleNotice,
  SectionHeader,
  StandingsTable,
  StoryCard,
  StoryRow,
  VideoCard,
} from "./components";
import { getContent, getNews } from "@/lib/content";
import { getClubMatch, getLeague, tableAroundClub } from "@/lib/league";
import { OPINION_CATEGORIES, PRESS_CATEGORY, VIDEO_CATEGORY, YOUTH_CATEGORY } from "@/lib/site";
import type { Post } from "@/lib/types";

export default function Home() {
  const { isSample } = getContent();
  const news = getNews();
  const league = getLeague();
  const clubMatch = getClubMatch(league);
  const around = tableAroundClub(league.standings);

  // Each story appears once on the page: take() hands out posts that were not used yet.
  const used = new Set<number>();
  const take = (list: Post[], n: number) => {
    const out = list.filter((p) => !used.has(p.id)).slice(0, n);
    out.forEach((p) => used.add(p.id));
    return out;
  };
  const inCat = (...slugs: string[]) => news.filter((p) => p.categories.some((c) => slugs.includes(c)));

  const [lead, ...secondary] = take([...news.filter((p) => p.sticky), ...news], 3);
  const videos = take(inCat(VIDEO_CATEGORY), 4);
  const opinions = take(inCat(...OPINION_CATEGORIES), 3);
  const press = take(inCat(PRESS_CATEGORY), 2);
  const youth = take(inCat(YOUTH_CATEGORY), 3);
  const more = take(news, 8);
  const timeline = news.slice(0, 8);

  return (
    <>
      {isSample && <SampleNotice>پیش‌نمایش با محتوای نمونه؛ با وارد کردن خروجی وردپرس، خبرهای واقعی جایگزین می‌شوند.</SampleNotice>}

      <section className="top-grid">
        {lead && (
          <div className="top-lead">
            <LeadStory post={lead} />
          </div>
        )}
        <div className="top-secondary">
          {secondary.map((p) => (
            <StoryCard key={p.id} post={p} />
          ))}
        </div>
        <aside className="top-side">
          {clubMatch && <MatchHero f={clubMatch} competition={league.competition} />}
          <div className="panel">
            <SectionHeader title="آخرین اخبار" />
            <LatestTimeline posts={timeline} />
          </div>
        </aside>
      </section>

      {opinions.length > 0 && (
        <section className="block">
          <SectionHeader title="نقد و تحلیل" href="/category/review/" />
          <div className="rail rail-3">
            {opinions.map((p) => (
              <OpinionCard key={p.id} post={p} />
            ))}
          </div>
        </section>
      )}

      {videos.length > 0 && (
        <section className="video-band">
          <div className="container">
            <SectionHeader title="ویدیو" href="/category/video/" tone="dark" />
            <div className="video-grid">
              {videos.map((p) => (
                <VideoCard key={p.id} post={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      <div className="split">
        <div>
          <section className="block">
            <SectionHeader title="اخبار بیشتر" href="/category/news/" />
            <div className="rows">
              {more.map((p) => (
                <StoryRow key={p.id} post={p} />
              ))}
            </div>
          </section>
          {youth.length > 0 && (
            <section className="block">
              <SectionHeader title="تیم پایه" href="/category/youth/" />
              <div className="rail rail-3">
                {youth.map((p) => (
                  <StoryCard key={p.id} post={p} />
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="sticky-side">
          <div className="panel">
            <SectionHeader title="جدول لیگ" href="/league/" />
            <StandingsTable rows={around.rows} offset={around.offset} compact />
            <Link href="/league/" className="panel-link">
              جدول کامل و نتایج
            </Link>
          </div>
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
        </aside>
      </div>
    </>
  );
}
