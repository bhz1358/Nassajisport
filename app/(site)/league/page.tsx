import type { Metadata } from "next";
import { FixtureRow, MatchHero, SampleNotice, SectionHeader, StandingsTable } from "../components";
import { faNum } from "@/lib/format";
import { getClubMatch, getLeague } from "@/lib/league";

export const metadata: Metadata = { title: "مرکز لیگ" };

export default function LeaguePage() {
  const league = getLeague();
  const clubMatch = getClubMatch(league);
  const live = league.fixtures.filter((f) => f.status === "live");
  const upcoming = league.fixtures.filter((f) => f.status === "scheduled");
  const finished = league.fixtures.filter((f) => f.status === "finished");

  return (
    <>
      {league.isSample && (
        <SampleNotice>نتایج و جدول این صفحه نمونه است. بعد از انتخاب سرویس نتایج زنده، این صفحه خودکار به‌روز می‌شود.</SampleNotice>
      )}
      <h1 className="page-title">
        {league.competition} <span className="muted">فصل {league.season}</span>
      </h1>
      {clubMatch && (
        <div className="league-hero">
          <MatchHero f={clubMatch} competition={league.competition} />
        </div>
      )}
      <div className="league-grid">
        <section className="panel">
          <SectionHeader title="جدول لیگ" />
          <div className="table-scroll">
            <StandingsTable rows={league.standings} />
          </div>
          {league.standings.some((r) => r.deducted) && (
            <p className="legend">
              {league.standings
                .filter((r) => r.deducted)
                .map((r) => `${r.team}: ${faNum(r.deducted!)} امتیاز کسر شده`)
                .join("، ")}
            </p>
          )}
          <p className="legend">
            <span className="form-W">ب</span> برد <span className="form-D">م</span> مساوی <span className="form-L">ش</span> شکست
          </p>
        </section>
        <div className="stack">
          {live.length > 0 && (
            <section className="panel">
              <SectionHeader
                title={
                  <>
                    <span className="live-dot" /> در جریان
                  </>
                }
              />
              <ul className="fixtures">
                {live.map((f, i) => (
                  <FixtureRow key={i} f={f} />
                ))}
              </ul>
            </section>
          )}
          <section className="panel">
            <SectionHeader title="بازی‌های پیش رو" />
            <ul className="fixtures">
              {upcoming.map((f, i) => (
                <FixtureRow key={i} f={f} />
              ))}
            </ul>
          </section>
          <section className="panel">
            <SectionHeader title="نتایج اخیر" />
            <ul className="fixtures">
              {finished.map((f, i) => (
                <FixtureRow key={i} f={f} />
              ))}
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}
