import type { Metadata } from "next";
import Link from "next/link";
import { faNum } from "@/lib/format";
import { currentFan } from "@/lib/fans";
import { getLeague } from "@/lib/league";
import { contestWeek, seasonTable, weekTable } from "@/lib/predictions";
import { Leaders } from "../ui";

export const metadata: Metadata = { title: "جدول مسابقهٔ پیش‌بینی", description: "رتبه‌بندی هواداران در مسابقهٔ پیش‌بینی لیگ برتر نساجی اسپرت، هر هفته و کل فصل." };

export default async function PredictTable({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const league = getLeague();
  const weeks = [...new Set(league.fixtures.map((f) => f.round).filter((r): r is number => !!r))].sort((a, b) => a - b);
  const week = weeks.includes(Number(sp.week)) ? Number(sp.week) : undefined;
  const fan = await currentFan();
  const current = contestWeek(league.fixtures);
  const rows = week ? weekTable(week) : seasonTable();
  return (
    <div className="predict">
      <h1 className="page-title">
        جدول مسابقهٔ پیش‌بینی <span className="muted">{week ? `هفتهٔ ${faNum(week)}` : "کل فصل"}</span>
      </h1>
      <nav className="predict-tabs" aria-label="انتخاب جدول">
        <Link href="/predict/table/" className={!week ? "is-on" : ""}>کل فصل</Link>
        {weeks.filter((w) => !current || w <= current).reverse().slice(0, 8).map((w) => (
          <Link key={w} href={`/predict/table/?week=${w}`} className={w === week ? "is-on" : ""}>هفتهٔ {faNum(w)}</Link>
        ))}
      </nav>
      <section className="panel predict-table">
        <Leaders rows={rows} me={fan?.id} empty="هنوز امتیازی ثبت نشده است." />
      </section>
      <p className="panel-link"><Link href="/predict/">→ بازگشت به پیش‌بینی بازی‌ها</Link></p>
    </div>
  );
}
