import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Field, Flash, PageHead } from "../../../ui";
import { SubmitButton } from "../../../ui-client";
import { requireAccess } from "@/lib/auth";
import { faDate } from "@/lib/format";
import { getLeague } from "@/lib/league";
import { fixtureOf, getReport, type SheetPlayer, type TeamSheet } from "@/lib/match-reports";
import { fixtureKey } from "@/lib/predict-score";
import { HOME_TEAM } from "@/lib/site";
import { deleteReport, saveReport } from "../actions";

export const metadata: Metadata = { title: "گزارش بازی" };

const lines = (ps: SheetPlayer[]) =>
  ps.map((p) => `${p.number ?? ""} ${p.name}${p.captain ? " (c)" : ""}${p.goals ? (p.goals > 1 ? ` (${p.goals} گل)` : " (گل)") : ""}`.trim()).join("\n");
const pairLines = (xs: { role: string; name: string }[]) => xs.map((x) => (x.role ? `${x.role}: ${x.name}` : x.name)).join("\n");
const OFFICIALS = "داور وسط: \nکمک داور اول: \nکمک داور دوم: \nداور چهارم: \nناظر: \nناظر داوری: ";

function TeamFields({ side, sheet, label }: { side: "home" | "away"; sheet?: TeamSheet; label: string }) {
  return (
    <div className="a-card">
      <h2>{label}</h2>
      <Field label="نام تیم" hint="خالی بماند تا نام برنامهٔ بازی‌ها استفاده شود">
        <input name={`${side}_team`} defaultValue={sheet?.team} />
      </Field>
      <div className="a-grid-fields">
        <Field label="رنگ پیراهن"><input name={`${side}_shirt`} defaultValue={sheet?.kit?.shirt} placeholder="قرمز" /></Field>
        <Field label="رنگ شورت"><input name={`${side}_shorts`} defaultValue={sheet?.kit?.shorts} /></Field>
        <Field label="رنگ جوراب"><input name={`${side}_socks`} defaultValue={sheet?.kit?.socks} /></Field>
      </div>
      <Field label="ترکیب اصلی" hint="هر بازیکن یک خط: شماره و نام، مثلاً «۲ ابوالفضل کوهی»؛ کاپیتان با (c) و گلزن با (گل) یا (۲ گل) در آخر">
        <textarea name={`${side}_starters`} rows={11} defaultValue={sheet ? lines(sheet.starters) : ""} className="a-lineup-text" />
      </Field>
      <Field label="ذخیره‌ها">
        <textarea name={`${side}_subs`} rows={8} defaultValue={sheet ? lines(sheet.subs) : ""} className="a-lineup-text" />
      </Field>
      <Field label="کادر فنی" hint="هر خط: سمت: نام، مثلاً «سرمربی: سعید دقیقی»">
        <textarea name={`${side}_staff`} rows={3} defaultValue={sheet ? pairLines(sheet.staff) : "سرمربی: "} />
      </Field>
    </div>
  );
}

export default async function ReportEditor({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  await requireAccess("squad");
  const id = decodeURIComponent((await params).id);
  const r = id === "new" ? undefined : getReport(id);
  if (id !== "new" && !r) notFound();
  const fixtures = [...getLeague().fixtures].sort((a, b) => {
    const club = (f: typeof a) => (f.home === HOME_TEAM || f.away === HOME_TEAM ? 0 : 1);
    return club(a) - club(b) || b.date.localeCompare(a.date);
  });
  const current = r ? fixtureOf(r) : undefined;
  return (
    <>
      <PageHead title={r ? `گزارش ${r.home.team} - ${r.away.team}` : "گزارش تازه"} back="/admin/match-reports/" />
      <Flash searchParams={searchParams} />
      <form action={saveReport}>
        <input type="hidden" name="old" value={r?.id ?? ""} />
        <div className="a-card">
          <Field label="بازی" hint="تاریخ، هفته و نتیجه از برنامهٔ بازی‌ها می‌آید">
            <select name="fixture" defaultValue={current ? fixtureKey(current) : ""} required>
              <option value="">انتخاب کنید…</option>
              {fixtures.map((f) => (
                <option key={fixtureKey(f)} value={fixtureKey(f)}>
                  {f.round ? `هفتهٔ ${f.round} · ` : ""}{f.home} - {f.away} · {faDate(f.date)}
                </option>
              ))}
            </select>
          </Field>
          <div className="a-grid-fields">
            <Field label="شمارهٔ بازی"><input name="matchNo" defaultValue={r?.matchNo} inputMode="numeric" /></Field>
            <Field label="رقابت"><input name="competition" defaultValue={r?.competition ?? "لیگ برتر خلیج فارس"} /></Field>
            <Field label="شهر"><input name="city" defaultValue={r?.city} /></Field>
            <Field label="ورزشگاه"><input name="venue" defaultValue={r?.venue} /></Field>
            <Field label="وضعیت هوا"><input name="weather" defaultValue={r?.weather} /></Field>
          </div>
        </div>
        <div className="a-grid-2">
          <TeamFields side="home" sheet={r?.home} label="میزبان" />
          <TeamFields side="away" sheet={r?.away} label="میهمان" />
        </div>
        <div className="a-card">
          <Field label="داوران و ناظران" hint="هر خط: سمت: نام">
            <textarea name="officials" rows={6} defaultValue={r ? pairLines(r.officials) : OFFICIALS} />
          </Field>
          <Field label="عکس برگهٔ گزارش (اختیاری)" hint="زیر گزارش در سایت نمایش داده می‌شود">
            <input type="file" name="sheet" accept="image/*" />
          </Field>
          {r?.sheetImage && (
            <label className="a-check">
              <input type="checkbox" name="remove_sheet" /> حذف عکس فعلی
            </label>
          )}
          <SubmitButton>ذخیرهٔ گزارش</SubmitButton>
        </div>
      </form>
      {r && (
        <form action={deleteReport} className="a-card">
          <input type="hidden" name="id" value={r.id} />
          <SubmitButton className="a-btn a-btn-danger" confirm="این گزارش حذف شود؟">حذف گزارش</SubmitButton>
        </form>
      )}
    </>
  );
}
