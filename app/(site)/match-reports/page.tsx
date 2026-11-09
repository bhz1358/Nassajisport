import type { Metadata } from "next";
import Link from "next/link";
import { Crest } from "../components";
import { faDate, faNum } from "@/lib/format";
import { fixtureOf, getReports, siteTeam } from "@/lib/match-reports";

export const metadata: Metadata = {
  title: "گزارش بازی‌ها",
  description: "ترکیب دو تیم، ذخیره‌ها، کادر فنی و داوران بازی‌های نساجی مازندران در لیگ برتر، هفته به هفته.",
};

export default function ReportsPage() {
  const reports = [...getReports()].sort((a, b) => (b.round ?? 0) - (a.round ?? 0) || b.date.localeCompare(a.date));
  return (
    <div className="reports">
      <h1 className="page-title">گزارش بازی‌ها</h1>
      {reports.length === 0 && <p className="panel muted">هنوز گزارشی ثبت نشده است.</p>}
      <ul className="report-cards">
        {reports.map((r) => {
          const f = fixtureOf(r);
          const played = f?.status === "finished" && f.homeScore != null;
          return (
            <li key={r.id}>
              <Link href={`/match-reports/${encodeURIComponent(r.id)}/`} className="panel report-card">
                <span className="report-card-week">{r.round ? `هفتهٔ ${faNum(r.round)}` : "بازی"}</span>
                <span className="report-card-teams">
                  <span><Crest team={siteTeam(r.home.team)} size={36} /> {r.home.team}</span>
                  <b dir="ltr">{played ? `${faNum(f!.awayScore!)} - ${faNum(f!.homeScore!)}` : "–"}</b>
                  <span>{r.away.team} <Crest team={siteTeam(r.away.team)} size={36} /></span>
                </span>
                <span className="muted report-card-meta">{faDate(f?.date ?? r.date)}{r.venue ? ` · ${r.venue}` : ""}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
