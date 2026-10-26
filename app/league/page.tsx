import type { Metadata } from "next";
import { FixtureRow, SampleNotice, SectionTitle, StandingsTable } from "../components";
import { getLeague } from "@/lib/league";

export const metadata: Metadata = { title: "مرکز لیگ" };

export default function LeaguePage() {
  const league = getLeague();
  const live = league.fixtures.filter((f) => f.status === "live");
  const upcoming = league.fixtures.filter((f) => f.status === "scheduled");
  const finished = league.fixtures.filter((f) => f.status === "finished");

  return (
    <>
      {league.isSample && (
        <SampleNotice>
          نتایج و جدول این صفحه نمونه است. بعد از انتخاب سرویس نتایج زنده، این صفحه خودکار به‌روز می‌شود.
        </SampleNotice>
      )}
      <h1 className="page-title">
        {league.competition} <span className="muted">فصل {league.season}</span>
      </h1>
      <div className="league-grid">
        <section className="widget">
          <SectionTitle>جدول لیگ</SectionTitle>
          <div className="table-scroll">
            <StandingsTable rows={league.standings} />
          </div>
        </section>
        <div>
          {live.length > 0 && (
            <section className="widget">
              <SectionTitle>
                <span className="live-dot" /> بازی‌های در جریان
              </SectionTitle>
              <ul className="fixtures">
                {live.map((f, i) => (
                  <FixtureRow key={i} f={f} />
                ))}
              </ul>
            </section>
          )}
          <section className="widget">
            <SectionTitle>بازی‌های پیش رو</SectionTitle>
            <ul className="fixtures">
              {upcoming.map((f, i) => (
                <FixtureRow key={i} f={f} />
              ))}
            </ul>
          </section>
          <section className="widget">
            <SectionTitle>نتایج اخیر</SectionTitle>
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
