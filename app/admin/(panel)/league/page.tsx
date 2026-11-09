import type { Metadata } from "next";
import { requireAccess } from "@/lib/auth";
import { deleteFixture, pasteFixtures, pasteStandings, saveFixture, saveLeagueInfo, saveStandings, saveTeamLogo, syncStandings, undoStandings, saveLiveSettings, checkLiveNow, importSeason } from "./actions";
import { Field, Flash, PageHead } from "../../ui";
import { ImageField, SubmitButton } from "../../ui-client";
import { faDate } from "@/lib/format";
import { isoToJalaliParts } from "@/lib/jalali";
import { getLeague, teamLogo } from "@/lib/league";
import { tableDifferences, tableFromResults } from "@/lib/results-table";
import { liveSettings } from "@/lib/live-sync";
import { seasonSource } from "@/lib/season-sync";
import type { Fixture } from "@/lib/types";

export const metadata: Metadata = { title: "جدول و بازی‌ها" };

const EXTRA_ROWS = 2;
const STATUS_LABEL = { scheduled: "برگزار نشده", live: "در جریان", finished: "پایان‌یافته" };

function FixtureForm({ f, index }: { f?: Fixture; index: number | "new" }) {
  const id = `fx-${index}`;
  const when = isoToJalaliParts(f?.date);
  return (
    <tr className={f?.status === "live" ? "is-live" : ""}>
      <td>
        <input form={id} name="round" defaultValue={f?.round ?? ""} inputMode="numeric" className="a-narrow" aria-label="هفته" placeholder="هفته" />
      </td>
      <td>
        <input form={id} name="home" defaultValue={f?.home} list="teams" required aria-label="میزبان" />
      </td>
      <td className="a-score">
        <input form={id} name="homeScore" defaultValue={f?.homeScore ?? ""} inputMode="numeric" aria-label="گل میزبان" />
        <span>-</span>
        <input form={id} name="awayScore" defaultValue={f?.awayScore ?? ""} inputMode="numeric" aria-label="گل میهمان" />
      </td>
      <td>
        <input form={id} name="away" defaultValue={f?.away} list="teams" required aria-label="میهمان" />
      </td>
      <td>
        <select form={id} name="status" defaultValue={f?.status ?? "scheduled"} aria-label="وضعیت">
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </td>
      <td>
        <input form={id} name="minute" defaultValue={f?.minute ?? ""} inputMode="numeric" className="a-narrow" aria-label="دقیقه" placeholder="دقیقه" />
      </td>
      <td>
        <input form={id} name="date" defaultValue={when.date} dir="ltr" className="a-date" required aria-label="تاریخ" placeholder="1405/08/15" />
      </td>
      <td>
        <input form={id} name="time" defaultValue={when.time} dir="ltr" className="a-narrow" aria-label="ساعت" placeholder="18:30" />
      </td>
      <td>
        <input form={id} name="venue" defaultValue={f?.venue} aria-label="ورزشگاه" placeholder="ورزشگاه" />
      </td>
      <td className="a-nowrap">
        <form id={id} action={saveFixture}>
          <input type="hidden" name="index" value={index} />
          <input type="hidden" name="key" value={f ? `${f.home}|${f.away}|${f.date}` : ""} />
          <SubmitButton className="a-btn a-btn-small a-btn-primary">{f ? "ذخیره" : "افزودن"}</SubmitButton>
        </form>
        {f && (
          <form action={deleteFixture}>
            <input type="hidden" name="index" value={index} />
            <input type="hidden" name="key" value={`${f.home}|${f.away}|${f.date}`} />
            <SubmitButton className="a-btn a-btn-small a-btn-danger" confirm={`بازی ${f.home} - ${f.away} حذف شود؟`}>
              حذف
            </SubmitButton>
          </form>
        )}
      </td>
    </tr>
  );
}

export default async function LeagueAdmin({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireAccess("league");
  const league = getLeague();
  const teams = league.standings.map((r) => r.team);
  // Every team in the table or the schedule, table order first.
  const teamsForLogos = [...new Set([...teams, ...league.fixtures.flatMap((f) => [f.home, f.away])])];
  const rows = [...league.standings, ...Array.from({ length: EXTRA_ROWS }, () => undefined)];

  return (
    <>
      <PageHead title="جدول و بازی‌ها" />
      <Flash searchParams={searchParams} />
      <datalist id="teams">
        {teams.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>

      <form action={saveLeagueInfo} className="a-card a-form-row">
        <Field label="نام رقابت">
          <input name="competition" defaultValue={league.competition} />
        </Field>
        <Field label="فصل">
          <input name="season" defaultValue={league.season} />
        </Field>
        <SubmitButton className="a-btn">ذخیره</SubmitButton>
      </form>

      {(() => {
        const src = seasonSource();
        return (
          <section id="season" className="a-card">
            <h2>برنامه‌ی کامل فصل (از فوتبالی)</h2>
            <p className="a-hint">
              همه‌ی بازی‌های فصل، از هفته‌ی اول تا آخرین هفته‌ای که فوتبالی برنامه‌اش را دارد، با تاریخ، ساعت و نتیجه به بخش «بازی‌ها» اضافه یا به‌روز می‌شوند و در
              صفحه‌ی جدول و نتایج هفته به هفته دیده می‌شوند. بازی‌هایی که قبلاً ثبت شده‌اند تکراری نمی‌شوند.
            </p>
            <form action={importSeason} className="a-grid-fields">
              <Field label="صفحه‌ی لیگ در فوتبالی یا شماره‌ی رقابت" hint="لیگ برتر خلیج فارس: 14">
                <input name="competition" defaultValue={`https://footballi.net/competition/${src.competition}/`} dir="ltr" required />
              </Field>
              <label className="a-check">
                <input type="checkbox" name="auto" defaultChecked={src.auto} /> روزی یک بار خودکار به‌روز شود
              </label>
              <div>
                <SubmitButton pendingText="در حال خواندن کل فصل…">دریافت برنامه‌ی کامل فصل</SubmitButton>
              </div>
            </form>
            {src.lastSync && (
              <p className="a-hint">
                آخرین دریافت: {faDate(src.lastSync)} ساعت {isoToJalaliParts(src.lastSync).time}
                {src.lastError ? ` — خطا: ${src.lastError}` : src.lastResult ? ` — ${src.lastResult}` : ""}
              </p>
            )}
          </section>
        );
      })()}

      {(() => {
        const live = liveSettings();
        return (
          <section id="live" className="a-card">
            <h2>نتایج زنده (از فوتبالی)</h2>
            <p className="a-hint">
              نتیجه، دقیقه و پایان بازی‌های لیگ برتر از سایت فوتبالی خوانده و در صفحه‌ی اول، کارت «دیدار بعدی» و نتایج هفته نشان داده می‌شود. فقط بازی‌هایی
              به‌روز می‌شوند که در بخش «بازی‌ها»ی همین صفحه ثبت شده‌اند. صفحه‌ی بازدیدکننده‌ها هم در زمان بازی هر دقیقه خودش تازه می‌شود.
            </p>
            <form action={saveLiveSettings} className="a-grid-fields">
              <label className="a-check">
                <input type="checkbox" name="enabled" defaultChecked={live.enabled} /> نتایج زنده فعال باشد
              </label>
              <Field label="زمان بررسی" hint="«زمان بازی‌ها»: از ۱۵ دقیقه قبل از هر بازی ثبت‌شده تا پایانش">
                <select name="mode" defaultValue={live.mode}>
                  <option value="matches">فقط زمان بازی‌ها</option>
                  <option value="always">همیشه</option>
                </select>
              </Field>
              <Field label="هر چند وقت یک بار">
                <select name="every" defaultValue={String(live.every)}>
                  <option value="60">هر ۱ دقیقه</option>
                  <option value="120">هر ۲ دقیقه</option>
                  <option value="300">هر ۵ دقیقه</option>
                </select>
              </Field>
              <div>
                <SubmitButton>ذخیره</SubmitButton>
              </div>
            </form>
            <form action={checkLiveNow} className="a-section-gap">
              <SubmitButton className="a-btn" pendingText="در حال خواندن…">
                بررسی همین الان
              </SubmitButton>
            </form>
            {live.lastSync && (
              <p className="a-hint">
                آخرین بررسی: {faDate(live.lastSync)} ساعت {isoToJalaliParts(live.lastSync).time}
                {live.lastError ? ` — خطا: ${live.lastError}` : " — موفق"}
                {live.lastChanges?.length ? ` · آخرین تغییرها: ${live.lastChanges.join("؛ ")}` : ""}
              </p>
            )}
          </section>
        );
      })()}

      <section id="sync" className="a-card">
        <h2>به‌روزرسانی جدول از سایت سازمان لیگ یا ورزش سه</h2>
        <div className="a-grid-2">
          <form action={syncStandings}>
            <h3 className="a-subtitle">روش ۱: خودکار از روی آدرس صفحه</h3>
            <p className="a-hint">آدرس صفحه‌ی جدول را بدهید؛ مثلاً جدول کامل سایت سازمان لیگ (iranleague.ir/fa/League-Full-Table) یا صفحه‌ی جدول ورزش سه.</p>
            <Field label="آدرس صفحه‌ی جدول">
              <input name="url" defaultValue={league.standingsSource?.url} dir="ltr" placeholder="https://www.iranleague.ir/fa/League-Full-Table" required />
            </Field>
            <label className="a-check">
              <input type="checkbox" name="auto" defaultChecked={league.standingsSource?.auto ?? true} /> هر ۳۰ دقیقه خودکار به‌روز شود
            </label>
            <SubmitButton>دریافت جدول</SubmitButton>
            {league.standingsSource?.lastSync && (
              <p className="a-hint">
                آخرین تلاش: {faDate(league.standingsSource.lastSync)} ساعت {isoToJalaliParts(league.standingsSource.lastSync).time}
                {league.standingsSource.lastError ? ` — خطا: ${league.standingsSource.lastError}` : " — موفق"}
              </p>
            )}
          </form>
          <form action={pasteStandings}>
            <h3 className="a-subtitle">روش ۲: کپی و چسباندن</h3>
            <p className="a-hint">در سایت مرجع، کل جدول را از ردیف عنوان تا آخرین تیم با موس انتخاب کنید، Ctrl+C بزنید و اینجا بچسبانید.</p>
            <Field label="جدول کپی‌شده">
              <textarea name="table" rows={7} required placeholder={"رتبه  تیم  بازی  برد  مساوی  باخت  زده  خورده  تفاضل  امتیاز\n۱  استقلال  ۱۰  ۷  ۲  ۱  ۱۸  ۶  ۱۲  ۲۳"} />
            </Field>
            <SubmitButton>به‌روزرسانی جدول</SubmitButton>
          </form>
        </div>
        {league.previousStandings?.length ? (
          <form action={undoStandings} className="a-section-gap">
            <SubmitButton className="a-btn a-btn-small" confirm="جدول به حالت قبل از آخرین به‌روزرسانی برگردد؟">
              برگرداندن جدول قبلی
            </SubmitButton>
          </form>
        ) : null}
        <p className="a-hint a-section-gap">
          «۵ بازی اخیر» هر تیم از جدول فعلی حفظ می‌شود. نام‌های کوتاه یا متفاوت (مثل «استقلال خ» یا «ملوان بندر انزلی») خودکار به نام تیم در همین سایت برگردانده می‌شوند تا لوگو و بازی‌ها درست بمانند.
        </p>
      </section>

      <section id="fixtures" className="a-card">
        <h2>بازی‌ها</h2>
        <form action={pasteFixtures} className="a-paste-fixtures">
          <h3 className="a-subtitle">افزودن برنامه با کپی از ورزش سه</h3>
          <p className="a-hint">
            در صفحه‌ی برنامه‌ی بازی‌های ورزش سه، از سطر «هفته» تا آخرین بازی را انتخاب و کپی کنید و اینجا بچسبانید. چند هفته را هم با هم می‌شود. بازی‌های تکراری به‌روز می‌شوند، نه دوبار ثبت.
          </p>
          <textarea name="schedule" rows={6} required placeholder={"12 هفته\n1405/08/15\n15:30\nسپاهان\nسپاهان\n-\nملوان\nملوان"} />
          <label className="a-check">
            <input type="checkbox" name="dropUnnumbered" defaultChecked={league.fixtures.some((f) => !f.round)} /> بازی‌های قبلی بدون شماره‌ی هفته (مثل بازی‌های نمونه) حذف شوند
          </label>
          <SubmitButton>افزودن برنامه</SubmitButton>
        </form>
        <p className="a-hint">
          برای نتیجه‌ی زنده: وضعیت را «در جریان» بگذارید و بعد از هر گل، نتیجه و دقیقه را ذخیره کنید. سایت بلافاصله به‌روز می‌شود.
          تاریخ‌ها شمسی و به وقت تهران است.
        </p>
        <div className="a-table-wrap">
          <table className="a-table a-table-form">
            <thead>
              <tr>
                <th>هفته</th>
                <th>میزبان</th>
                <th>نتیجه</th>
                <th>میهمان</th>
                <th>وضعیت</th>
                <th>دقیقه</th>
                <th>تاریخ</th>
                <th>ساعت</th>
                <th>ورزشگاه</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {league.fixtures.map((f, i) => (
                <FixtureForm key={`${f.home}|${f.away}|${f.date}`} f={f} index={i} />
              ))}
              <FixtureForm index="new" />
            </tbody>
          </table>
        </div>
      </section>

      <section id="logos" className="a-card">
        <h2>لوگوی تیم‌ها</h2>
        <p className="a-hint">
          لوگوی هر تیم را بارگذاری کنید؛ در جدول، دیدار بعدی و نتایج نشان داده می‌شود. عکس خودکار به WebP تبدیل می‌شود. بهترین نتیجه: لوگوی مربعی با پس‌زمینه‌ی شفاف (PNG).
        </p>
        <div className="a-logo-grid">
          {teamsForLogos.map((team) => (
            <form key={team} action={saveTeamLogo} className="a-logo-card">
              <input type="hidden" name="team" value={team} />
              <strong>{team}</strong>
              <ImageField name="logo" defaultValue={teamLogo(league, team)} label="" />
              <SubmitButton className="a-btn a-btn-small a-btn-primary">ذخیره</SubmitButton>
            </form>
          ))}
        </div>
      </section>

      <TableCheck />

      <section id="standings" className="a-card">
        <h2>جدول لیگ</h2>
        <p className="a-hint">
          اگر برد، مساوی و باخت را وارد کنید، تعداد بازی و امتیاز خودکار حساب می‌شود؛ اگر خالی بمانند، همان بازی و امتیازی که نوشته‌اید ذخیره می‌شود. جدول بعد از ذخیره مرتب می‌شود. «۵ بازی اخیر» را با حروف ب (برد)، م (مساوی)، ش (شکست) از قدیم به جدید بنویسید، مثلاً «ببمشب».
          آخرین به‌روزرسانی: {faDate(league.updatedAt)}
        </p>
        <form action={saveStandings}>
          <input type="hidden" name="count" value={rows.length} />
          <div className="a-table-wrap">
            <table className="a-table a-table-form">
              <thead>
                <tr>
                  <th>تیم</th>
                  <th>بازی</th>
                  <th>امتیاز</th>
                  <th>برد</th>
                  <th>مساوی</th>
                  <th>باخت</th>
                  <th>زده</th>
                  <th>خورده</th>
                  <th>کسر امتیاز</th>
                  <th>۵ بازی اخیر</th>
                  <th>حذف</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r?.team ?? `new-${i}`}>
                    <td>
                      <input name={`team_${i}`} defaultValue={r?.team} placeholder={r ? "" : "تیم جدید"} aria-label="تیم" />
                    </td>
                    <td>
                      <input name={`played_${i}`} defaultValue={r?.played ?? ""} inputMode="numeric" className="a-narrow" aria-label="بازی" />
                    </td>
                    <td>
                      <input name={`points_${i}`} defaultValue={r?.points ?? ""} inputMode="numeric" className="a-narrow" aria-label="امتیاز" />
                    </td>
                    {(["won", "drawn", "lost", "gf", "ga"] as const).map((k) => (
                      <td key={k}>
                        <input
                          name={`${k}_${i}`}
                          defaultValue={r && !r.partial ? { won: r.won, drawn: r.drawn, lost: r.lost, gf: r.goalsFor, ga: r.goalsAgainst }[k] : ""}
                          inputMode="numeric"
                          className="a-narrow"
                          aria-label={k}
                        />
                      </td>
                    ))}
                    <td>
                      <input name={`deducted_${i}`} defaultValue={r?.deducted ?? ""} inputMode="numeric" className="a-narrow" aria-label="کسر امتیاز" />
                    </td>
                    <td>
                      <input
                        name={`form_${i}`}
                        defaultValue={r?.form?.map((x) => ({ W: "ب", D: "م", L: "ش" })[x]).join("")}
                        className="a-date"
                        aria-label="۵ بازی اخیر"
                      />
                    </td>
                    <td>{r && <input type="checkbox" name={`delete_${i}`} aria-label={`حذف ${r.team}`} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <SubmitButton>ذخیره جدول</SubmitButton>
        </form>
      </section>
    </>
  );
}

/** The table compared with the match results, team by team. */
function TableCheck() {
  const league = getLeague();
  const finished = league.fixtures.filter((f) => f.status === "finished" && f.homeScore != null).length;
  const diffs = tableDifferences(league.standings, league.fixtures);
  const calc = tableFromResults(league.fixtures);
  const ok = league.standings.length - diffs.length;
  return (
    <section id="table-check" className="a-card">
      <h2>بررسی جدول با نتایج بازی‌ها</h2>
      <p className="a-hint">
        برد، مساوی، باخت، گل‌ها و امتیاز هر تیم در جدول با نتیجهٔ {finished} بازیِ تمام‌شدهٔ برنامهٔ فصل مقایسه می‌شود. نشانه‌های «۵ بازی اخیر» در سایت هم از همین نتایج
        ساخته می‌شود (سایت سازمان لیگ آن‌ها را منتشر نمی‌کند).
      </p>
      {!finished ? (
        <p className="a-hint">هنوز نتیجه‌ای در برنامهٔ بازی‌ها نیست؛ از بخش «برنامهٔ کامل فصل از فوتبالی» درون‌ریزی کنید.</p>
      ) : (
        <>
          <p>
            <span className="a-tag is-ok">{ok} تیم درست</span> {diffs.length > 0 && <span className="a-tag">{diffs.length} تیم با اختلاف</span>}
          </p>
          {diffs.length > 0 && (
            <ul>
              {diffs.map((d) => (
                <li key={d.team}>
                  <b>{d.team}</b>: {d.notes.join(" ")}
                </li>
              ))}
            </ul>
          )}
          <details>
            <summary className="a-hint">نشانه‌های ۵ بازی اخیر هر تیم (از قدیم به جدید)</summary>
            <p className="a-hint">
              {league.standings
                .map((r) => `${r.team}: ${(calc.get(r.team)?.form ?? []).map((x) => (x === "W" ? "ب" : x === "D" ? "م" : "ش")).join(" ") || "—"}`)
                .join(" · ")}
            </p>
          </details>
          <p className="a-hint">
            «جدول N بازی دارد ولی نتیجهٔ M بازی ثبت شده» یعنی نتیجهٔ بعضی بازی‌ها در برنامه نیست؛ درون‌ریزی دوبارهٔ برنامهٔ فصل از فوتبالی معمولاً درستش می‌کند.
          </p>
        </>
      )}
    </section>
  );
}
