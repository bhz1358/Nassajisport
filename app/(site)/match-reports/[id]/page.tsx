import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Crest } from "../../components";
import { faDate, faNum, faTime, faWeekday } from "@/lib/format";
import { fixtureOf, getReport, siteTeam } from "@/lib/match-reports";
import { TeamSheetCard } from "../ui";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const r = getReport(decodeURIComponent((await params).id));
  if (!r) return {};
  const title = `ترکیب ${r.home.team} و ${r.away.team}${r.round ? ` (هفتهٔ ${faNum(r.round)})` : ""}`;
  return { title, description: `ترکیب اصلی، ذخیره‌ها، کادر فنی و داوران بازی ${r.home.team} - ${r.away.team} در ${r.venue ?? "لیگ برتر"}.` };
}

export default async function ReportPage({ params }: Props) {
  const r = getReport(decodeURIComponent((await params).id));
  if (!r) notFound();
  const f = fixtureOf(r);
  const played = f && f.status !== "scheduled" && f.homeScore != null;
  return (
    <article className="report">
      <p className="panel-link report-back"><Link href="/match-reports/">→ همهٔ گزارش‌ها</Link></p>
      <header className="panel report-head">
        <p className="report-kicker">
          {r.competition ?? "لیگ برتر"}
          {r.round ? ` · هفتهٔ ${faNum(r.round)}` : ""}
          {r.matchNo ? ` · بازی شمارهٔ ${faNum(r.matchNo)}` : ""}
        </p>
        <div className="report-score">
          <span className="report-team">
            <Crest team={siteTeam(r.home.team)} size={72} />
            <b>{r.home.team}</b>
            <small>میزبان</small>
          </span>
          <span className="report-result">
            {played ? (
              <strong dir="ltr">{faNum(f!.awayScore!)} - {faNum(f!.homeScore!)}</strong>
            ) : (
              <strong>{faTime(r.date)}</strong>
            )}
            {f?.status === "live" && <small className="predict-live"><span className="live-dot" /> زنده</small>}
            {f?.status === "finished" && <small>پایان بازی</small>}
          </span>
          <span className="report-team">
            <Crest team={siteTeam(r.away.team)} size={72} />
            <b>{r.away.team}</b>
            <small>میهمان</small>
          </span>
        </div>
        <ul className="report-meta">
          <li>📅 {faWeekday(r.date)} {faDate(r.date)}، ساعت {faTime(r.date)}</li>
          {r.venue && <li>🏟️ {r.venue}{r.city ? `، ${r.city}` : ""}</li>}
          {r.weather && <li>🌤️ هوا: {r.weather}</li>}
        </ul>
      </header>

      <div className="report-sheets">
        <TeamSheetCard sheet={r.home} side="میزبان" />
        <TeamSheetCard sheet={r.away} side="میهمان" />
      </div>

      {r.officials.length > 0 && (
        <section className="panel report-officials">
          <h2>داوران و ناظران</h2>
          <dl>
            {r.officials.map((o, i) => (
              <div key={i}>
                <dt>{o.role}</dt>
                <dd>{o.name}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
      {r.sheetImage && (
        <section className="panel report-image">
          <h2>برگهٔ رسمی گزارش مسابقه</h2>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <a href={r.sheetImage} target="_blank"><img src={r.sheetImage} alt={`برگهٔ گزارش ${r.home.team} - ${r.away.team}`} loading="lazy" /></a>
        </section>
      )}
    </article>
  );
}
