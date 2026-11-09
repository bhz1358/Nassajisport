import Link from "next/link";
import { faNum } from "@/lib/format";
import { getLeague } from "@/lib/league";
import { isOpen } from "@/lib/predict-score";
import { contestWeek, weekFixtures } from "@/lib/predictions";

/** Home page invitation to this week's prediction contest. */
export function PredictBox() {
  const fixtures = getLeague().fixtures;
  const week = contestWeek(fixtures);
  if (!week) return null;
  const open = weekFixtures(week, fixtures).filter((f) => isOpen(f)).length;
  return (
    <Link href="/predict/" className="panel home-predict">
      <span className="home-predict-icon" aria-hidden="true">🎯</span>
      <span>
        <strong>مسابقهٔ پیش‌بینی هفتهٔ {faNum(week)}</strong>
        <span>{open ? `${faNum(open)} بازی منتظر پیش‌بینی شماست` : "نتایج و جدول برترین‌ها را ببینید"}</span>
      </span>
      <span className="btn btn-primary btn-sm">{open ? "پیش‌بینی" : "جدول"}</span>
    </Link>
  );
}
