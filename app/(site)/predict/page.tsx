import type { Metadata } from "next";
import Link from "next/link";
import { Crest, SectionHeader } from "../components";
import { faNum, faTime, faWeekday } from "@/lib/format";
import { currentFan } from "@/lib/fans";
import { getLeague } from "@/lib/league";
import { fixtureKey, isOpen, pointsFor } from "@/lib/predict-score";
import { contestWeek, getPredictions, seasonTable, weekFixtures, weekTable } from "@/lib/predictions";
import { submitPredictions, logoutFan } from "./actions";
import { Leaders, Notice, Rules } from "./ui";

export const metadata: Metadata = {
  title: "مسابقهٔ پیش‌بینی لیگ برتر",
  description: "نتیجهٔ بازی‌های هر هفتهٔ لیگ برتر را پیش‌بینی کنید، امتیاز بگیرید و در جدول هواداران نساجی اسپرت بالا بروید.",
};

const dayKey = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Tehran" });

export default async function PredictPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const league = getLeague();
  const weeks = [...new Set(league.fixtures.map((f) => f.round).filter((r): r is number => !!r))].sort((a, b) => a - b);
  const current = contestWeek(league.fixtures);
  const asked = Number(sp.week);
  const week = weeks.includes(asked) ? asked : current;
  const fan = await currentFan();

  if (!week) {
    return (
      <div className="predict">
        <h1 className="page-title">مسابقهٔ پیش‌بینی</h1>
        <p className="panel muted">برنامهٔ بازی‌ها هنوز ثبت نشده است.</p>
      </div>
    );
  }

  const matches = weekFixtures(week, league.fixtures);
  const all = getPredictions();
  const mine = new Map(fan ? all.filter((p) => p.fanId === fan.id).map((p) => [p.key, p]) : []);
  const counts = new Map<string, number>();
  for (const p of all) counts.set(p.key, (counts.get(p.key) ?? 0) + 1);
  const anyOpen = matches.some((f) => isOpen(f));
  const myWeek = matches.reduce((s, f) => s + (pointsFor(mine.get(fixtureKey(f)) ?? { home: -1, away: -1 }, f) ?? 0), 0);
  const i = weeks.indexOf(week);
  const prev = weeks[i - 1], next = weeks[i + 1];
  const days = [...new Set(matches.map((m) => dayKey(m.date)))];
  let n = -1;

  return (
    <div className="predict">
      <header className="predict-head">
        <div>
          <p className="predict-kicker">مسابقهٔ پیش‌بینی هواداران</p>
          <h1 className="page-title">
            پیش‌بینی هفتهٔ {faNum(week)} <span className="muted">لیگ برتر</span>
          </h1>
        </div>
        <nav className="predict-weeks" aria-label="هفته‌ها">
          {prev ? <Link href={`/predict/?week=${prev}#matches`} className="btn btn-sm btn-outline">→ هفتهٔ {faNum(prev)}</Link> : <span />}
          {week !== current && current && <Link href="/predict/#matches" className="btn btn-sm btn-outline">هفتهٔ جاری</Link>}
          {next ? <Link href={`/predict/?week=${next}#matches`} className="btn btn-sm btn-outline">هفتهٔ {faNum(next)} ←</Link> : <span />}
        </nav>
      </header>
      <Notice sp={sp} />

      <div className="predict-grid">
        <section className="panel" id="matches">
          {fan ? (
            <div className="predict-me">
              <p>
                سلام <b>{fan.name}</b>! {myWeek ? <>امتیاز شما در این هفته: <b>{faNum(myWeek)}</b></> : anyOpen ? "نتیجه‌ها را بنویسید و ذخیره کنید." : ""}
              </p>
              <div className="predict-me-links">
                <Link href="/predict/me/">پروفایل و عکس</Link>
                <form action={logoutFan}><button type="submit">خروج</button></form>
              </div>
            </div>
          ) : (
            <div className="predict-cta">
              <p>برای شرکت در مسابقه با حساب «بله» وارد شوید؛ چند ثانیه طول می‌کشد و رمز عبور لازم ندارد.</p>
              <Link href={`/predict/login/?next=${encodeURIComponent(`/predict/?week=${week}`)}`} className="btn btn-primary">ورود و شرکت در مسابقه</Link>
            </div>
          )}

          <form action={submitPredictions}>
            <input type="hidden" name="week" value={week} />
            {days.map((d) => (
              <div key={d} className="predict-day">
                <h3>{faWeekday(matches.find((m) => dayKey(m.date) === d)!.date)}</h3>
                <ul className="predict-list">
                  {matches.filter((m) => dayKey(m.date) === d).map((f) => {
                    const key = fixtureKey(f);
                    const p = mine.get(key);
                    const open = isOpen(f);
                    const pts = p ? pointsFor(p, f) : undefined;
                    if (open && fan) n++;
                    const idx = n;
                    return (
                      <li key={key} className={`predict-row${open ? " is-open" : ""}`}>
                        <span className="predict-team"><Crest team={f.home} size={30} /> <span>{f.home}</span></span>
                        <span className="predict-mid">
                          {open && fan ? (
                            <>
                              <input type="hidden" name="key" value={key} />
                              <input name={`h${idx}`} defaultValue={p?.home ?? ""} inputMode="numeric" maxLength={2} aria-label={`گل ${f.home}`} autoComplete="off" />
                              <span className="predict-dash">–</span>
                              <input name={`a${idx}`} defaultValue={p?.away ?? ""} inputMode="numeric" maxLength={2} aria-label={`گل ${f.away}`} autoComplete="off" />
                            </>
                          ) : open ? (
                            <span className="predict-time">{faTime(f.date)}</span>
                          ) : (
                            <span className="predict-result">
                              {f.homeScore != null && f.awayScore != null ? (
                                <b dir="ltr">{faNum(f.awayScore)} – {faNum(f.homeScore)}</b>
                              ) : (
                                <b>شروع شد</b>
                              )}
                              {f.status === "live" && <small className="predict-live"><span className="live-dot" /> زنده</small>}
                            </span>
                          )}
                        </span>
                        <span className="predict-team is-away"><span>{f.away}</span> <Crest team={f.away} size={30} /></span>
                        <span className="predict-foot">
                          {open ? (
                            <>تا ساعت {faTime(f.date)} باز است</>
                          ) : (
                            <>
                              {p ? <>پیش‌بینی شما: <b dir="ltr">{faNum(p.away)} – {faNum(p.home)}</b></> : fan ? "پیش‌بینی نکردید" : ""}
                              {pts !== undefined && <span className={`predict-pts pts-${pts}`}>+{faNum(pts)}</span>}
                              <span className="predict-count">{faNum(counts.get(key) ?? 0)} نفر پیش‌بینی کردند</span>
                            </>
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
            {fan && anyOpen && (
              <button type="submit" className="btn btn-primary predict-save">ذخیرهٔ پیش‌بینی‌ها</button>
            )}
          </form>
        </section>

        <aside className="stack">
          <section className="panel">
            <SectionHeader title={`برترین‌های هفتهٔ ${faNum(week)}`} href={`/predict/table/?week=${week}`} />
            <Leaders rows={weekTable(week)} me={fan?.id} limit={10} empty="بعد از پایان اولین بازی هفته، جدول این هفته پر می‌شود." />
          </section>
          <section className="panel">
            <SectionHeader title="برترین‌های فصل" href="/predict/table/" />
            <Leaders rows={seasonTable()} me={fan?.id} limit={10} empty="هنوز امتیازی ثبت نشده است." />
          </section>
          <section className="panel">
            <SectionHeader title="قوانین امتیاز" />
            <Rules />
          </section>
        </aside>
      </div>
    </div>
  );
}
