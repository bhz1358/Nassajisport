import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Flash, PageHead } from "../../ui";
import { SubmitButton } from "../../ui-client";
import { requireAccess } from "@/lib/auth";
import { str, withError } from "@/lib/form";
import { faDate, faNum } from "@/lib/format";
import { getLeague } from "@/lib/league";
import { fixtureKey } from "@/lib/predict-score";
import { faScore } from "@/lib/ratings-calc";
import { candidatesFor, getPolls, getVotes, isOpenPoll, newPoll, openDuePolls, pollBest, pollResults, savePolls } from "@/lib/ratings";
import { HOME_TEAM } from "@/lib/site";
import { writeStore } from "@/lib/store";

export const metadata: Metadata = { title: "نمرهٔ هواداران به بازیکنان" };
const BACK = "/admin/ratings/";
const HOUR = 3_600_000;

async function pollAction(fd: FormData) {
  "use server";
  await requireAccess("squad");
  const key = str(fd, "key");
  const act = str(fd, "act");
  const polls = getPolls();
  const p = polls.find((x) => x.key === key);
  if (act === "create") {
    const f = getLeague().fixtures.find((x) => fixtureKey(x) === key);
    if (!f || polls.some((x) => x.key === key)) redirect(withError(BACK, "این بازی پیدا نشد یا نمره‌دهی‌اش ساخته شده است."));
    savePolls([...polls, { ...newPoll(f), notified: true }]);
    redirect(`${BACK}?ok=${encodeURIComponent("نمره‌دهی باز شد (۲۴ ساعت).")}`);
  }
  if (!p) redirect(withError(BACK, "نمره‌دهی پیدا نشد."));
  let next = p;
  if (act === "close") next = { ...p, closesAt: new Date().toISOString() };
  if (act === "reopen") next = { ...p, closesAt: new Date(Date.now() + 24 * HOUR).toISOString() };
  if (act === "refresh") {
    const f = getLeague().fixtures.find((x) => fixtureKey(x) === key);
    if (f) next = { ...p, candidates: candidatesFor(f) };
  }
  if (act === "drop") next = { ...p, candidates: p.candidates.filter((c) => c.id !== str(fd, "cand")) };
  if (act === "delete") {
    savePolls(polls.filter((x) => x.key !== key));
    writeStore("rating-votes", getVotes().filter((v) => v.poll !== key));
    redirect(`${BACK}?ok=${encodeURIComponent("نمره‌دهی و نمره‌هایش حذف شد.")}`);
  }
  savePolls(polls.map((x) => (x.key === key ? next : x)));
  redirect(`${BACK}?ok=saved`);
}

export default async function RatingsAdmin({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireAccess("squad");
  openDuePolls();
  const polls = [...getPolls()].sort((a, b) => b.kickoff.localeCompare(a.kickoff));
  const votes = getVotes();
  const have = new Set(polls.map((p) => p.key));
  const missing = getLeague()
    .fixtures.filter((f) => f.status === "finished" && (f.home === HOME_TEAM || f.away === HOME_TEAM) && !have.has(fixtureKey(f)))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 8);

  return (
    <>
      <PageHead title="نمرهٔ هواداران به بازیکنان" />
      <Flash searchParams={searchParams} />
      <div className="a-card">
        <p className="a-hint">
          بعد از سوت پایان هر بازی نساجی، نمره‌دهی (۱ تا ۱۰) برای بازیکنان و سرمربی خودکار باز می‌شود و ۲۴ ساعت می‌ماند؛ بازوی بله هم به هواداران خبر می‌دهد. فهرست بازیکنان از
          «ترکیب بازی» همان مسابقه (اصلی و ذخیره) ساخته می‌شود؛ اگر ترکیب وارد نشده باشد، همهٔ بازیکنان. اگر ترکیب را بعداً وارد کردید، «به‌روزرسانی فهرست از ترکیب» را بزنید. عکس هر
          بازیکن از صفحهٔ «بازیکنان و کادر» می‌آید. صفحهٔ هواداران: <a href="/ratings/" target="_blank">/ratings/</a>
        </p>
      </div>
      {missing.length > 0 && (
        <section className="a-card">
          <h2>باز کردن نمره‌دهی برای بازی قبلی</h2>
          <ul>
            {missing.map((f) => (
              <li key={fixtureKey(f)} className="a-row" style={{ alignItems: "center", gap: 10 }}>
                <span>{f.home} {f.homeScore}-{f.awayScore} {f.away} · {faDate(f.date)}</span>
                <form action={pollAction}>
                  <input type="hidden" name="key" value={fixtureKey(f)} />
                  <input type="hidden" name="act" value="create" />
                  <SubmitButton className="a-btn a-btn-small">باز کردن نمره‌دهی</SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}
      {polls.length === 0 && <p className="a-card a-hint">هنوز نمره‌دهی‌ای ساخته نشده است.</p>}
      {polls.map((p) => {
        const open = isOpenPoll(p);
        const n = votes.filter((v) => v.poll === p.key).length;
        const best = pollBest(p);
        const res = pollResults(p);
        const btn = (act: string, label: string, cls = "a-btn a-btn-small", confirm?: string) => (
          <form action={pollAction}>
            <input type="hidden" name="key" value={p.key} />
            <input type="hidden" name="act" value={act} />
            <SubmitButton className={cls} confirm={confirm}>{label}</SubmitButton>
          </form>
        );
        return (
          <section key={p.key} className="a-card">
            <h2>
              {p.score ?? p.match} {open ? <span className="a-tag is-ok">باز تا {faDate(p.closesAt)}</span> : <span className="a-tag">بسته</span>}
            </h2>
            <p>
              {faNum(n)} هوادار نمره داده‌اند{best ? <> · برتر: <b>{best.name}</b> ({faScore(best.avg)})</> : null}
            </p>
            <div className="a-row" style={{ gap: 8, flexWrap: "wrap" }}>
              {open ? btn("close", "بستن الان") : btn("reopen", "باز کردن دوباره (۲۴ ساعت)")}
              {btn("refresh", "به‌روزرسانی فهرست از ترکیب")}
              {btn("delete", "حذف", "a-btn a-btn-small a-btn-danger", "این نمره‌دهی و همهٔ نمره‌هایش حذف شود؟")}
            </div>
            <details>
              <summary className="a-hint">فهرست و میانگین‌ها ({faNum(p.candidates.length)} نفر)</summary>
              <table className="a-table">
                <tbody>
                  {res.map((r) => (
                    <tr key={r.id}>
                      <td>{r.role === "coach" ? "سرمربی" : r.number ? faNum(r.number) : ""}</td>
                      <td>{r.name}{r.photo ? "" : " (بدون عکس)"}</td>
                      <td>{r.count ? `${faScore(r.avg)} از ${faNum(r.count)} نمره` : "—"}</td>
                      <td>
                        <form action={pollAction}>
                          <input type="hidden" name="key" value={p.key} />
                          <input type="hidden" name="act" value="drop" />
                          <input type="hidden" name="cand" value={r.id} />
                          <SubmitButton className="a-btn a-btn-small" confirm={`«${r.name}» از فهرست این بازی برداشته شود؟`}>برداشتن</SubmitButton>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </section>
        );
      })}
    </>
  );
}
