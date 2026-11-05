import type { Metadata } from "next";
import { deleteFixture, saveFixture, saveLeagueInfo, saveStandings } from "./actions";
import { Field, Flash, PageHead } from "../../ui";
import { SubmitButton } from "../../ui-client";
import { faDate } from "@/lib/format";
import { isoToJalaliParts } from "@/lib/jalali";
import { getLeague } from "@/lib/league";
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

export default function LeagueAdmin({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const league = getLeague();
  const teams = league.standings.map((r) => r.team);
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

      <section id="fixtures" className="a-card">
        <h2>بازی‌ها</h2>
        <p className="a-hint">
          برای نتیجه‌ی زنده: وضعیت را «در جریان» بگذارید و بعد از هر گل، نتیجه و دقیقه را ذخیره کنید. سایت بلافاصله به‌روز می‌شود.
          تاریخ‌ها شمسی و به وقت تهران است.
        </p>
        <div className="a-table-wrap">
          <table className="a-table a-table-form">
            <thead>
              <tr>
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

      <section id="standings" className="a-card">
        <h2>جدول لیگ</h2>
        <p className="a-hint">
          تعداد بازی و امتیاز خودکار حساب می‌شود و جدول بعد از ذخیره مرتب می‌شود. «۵ بازی اخیر» را با حروف ب (برد)، م (مساوی)، ش (شکست) از قدیم به جدید بنویسید، مثلاً «ببمشب».
          آخرین به‌روزرسانی: {faDate(league.updatedAt)}
        </p>
        <form action={saveStandings}>
          <input type="hidden" name="count" value={rows.length} />
          <div className="a-table-wrap">
            <table className="a-table a-table-form">
              <thead>
                <tr>
                  <th>تیم</th>
                  <th>برد</th>
                  <th>مساوی</th>
                  <th>باخت</th>
                  <th>زده</th>
                  <th>خورده</th>
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
                    {(["won", "drawn", "lost", "gf", "ga"] as const).map((k) => (
                      <td key={k}>
                        <input
                          name={`${k}_${i}`}
                          defaultValue={r ? { won: r.won, drawn: r.drawn, lost: r.lost, gf: r.goalsFor, ga: r.goalsAgainst }[k] : ""}
                          inputMode="numeric"
                          className="a-narrow"
                          aria-label={k}
                        />
                      </td>
                    ))}
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
