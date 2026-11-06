import type { Metadata } from "next";
import { AdSlot } from "../../ad-slot";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SampleNotice, SectionHeader, StoryCard } from "../../components";
import { PlayerCard, PlayerPhoto } from "../../squad-ui";
import { faDate, faNum } from "@/lib/format";
import { ageOn, getPlayer, getSquad, newsAboutPlayer, positionLabel } from "@/lib/squad";

type Props = { params: Promise<{ slug: string }> };


export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const player = getPlayer((await params).slug);
  return player ? { title: `${player.name}، ${positionLabel(player.position)} نساجی` } : {};
}

export default async function PlayerPage({ params }: Props) {
  const player = getPlayer((await params).slug);
  if (!player) notFound();
  const squad = getSquad();
  const s = player.stats;
  const teammates = squad.players.filter((p) => p.position === player.position && p.slug !== player.slug).slice(0, 4);
  const news = newsAboutPlayer(player).slice(0, 3);

  const stats: [string, number][] = [
    ["بازی", s.appearances],
    ["دقیقه", s.minutes],
    player.position === "GK" ? ["کلین‌شیت", s.cleanSheets ?? 0] : ["گل", s.goals],
    ["پاس گل", s.assists],
    ["کارت زرد", s.yellowCards],
    ["کارت قرمز", s.redCards],
  ];

  return (
    <>
      <AdSlot slot={1} className="ad-top" />
      {squad.isSample && <SampleNotice>اطلاعات این بازیکن نمونه است.</SampleNotice>}
      <nav className="breadcrumb" aria-label="مسیر">
        <Link href="/team/">تیم</Link>
        <span aria-hidden="true">‹</span>
        <span>{player.name}</span>
      </nav>

      <section className="player-hero">
        <PlayerPhoto player={player} className="player-hero-photo" />
        <div className="player-hero-info">
          <span className="player-hero-number">{faNum(player.number)}</span>
          <h1>{player.name}</h1>
          <p>{positionLabel(player.position)} · نساجی مازندران</p>
        </div>
      </section>

      <div className="player-layout">
        <div>
          <section className="panel">
            <SectionHeader title={`آمار فصل ${squad.season}`} />
            <dl className="stat-grid">
              {stats.map(([label, value]) => (
                <div key={label}>
                  <dd>{faNum(value)}</dd>
                  <dt>{label}</dt>
                </div>
              ))}
            </dl>
          </section>
          {player.bio && (
            <section className="panel block-tight">
              <SectionHeader title="درباره بازیکن" />
              <p className="bio">{player.bio}</p>
            </section>
          )}
          {news.length > 0 && (
            <section className="block">
              <SectionHeader title="اخبار مرتبط" />
              <div className="rail rail-3">
                {news.map((p) => (
                  <StoryCard key={p.id} post={p} />
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="panel">
          <SectionHeader title="مشخصات" />
          <dl className="facts">
            <div>
              <dt>شماره</dt>
              <dd>{faNum(player.number)}</dd>
            </div>
            <div>
              <dt>پست</dt>
              <dd>{positionLabel(player.position)}</dd>
            </div>
            {player.birthDate && (
              <div>
                <dt>سن</dt>
                <dd>
                  {faNum(ageOn(player.birthDate))} سال <span className="muted">({faDate(player.birthDate)})</span>
                </dd>
              </div>
            )}
            {player.heightCm && (
              <div>
                <dt>قد</dt>
                <dd>{faNum(player.heightCm)} سانتی‌متر</dd>
              </div>
            )}
            {player.foot && (
              <div>
                <dt>پای تخصصی</dt>
                <dd>{player.foot}</dd>
              </div>
            )}
            {player.nationality && (
              <div>
                <dt>ملیت</dt>
                <dd>{player.nationality}</dd>
              </div>
            )}
          </dl>
        </aside>
      </div>

      {teammates.length > 0 && (
        <section className="block">
          <SectionHeader title={`دیگر ${positionLabel(player.position)}‌ها`} href="/team/#players" />
          <div className="player-grid">
            {teammates.map((p) => (
              <PlayerCard key={p.slug} player={p} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
