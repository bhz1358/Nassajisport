import type { Metadata } from "next";
import Link from "next/link";
import { SectionHeader } from "../components";
import { faDate, faNum } from "@/lib/format";
import { currentFan } from "@/lib/fans";
import { faScore } from "@/lib/ratings-calc";
import { currentPoll, isOpenPoll, openDuePolls, photoOf, pollBest, pollResults, pollVotes, seasonRatings } from "@/lib/ratings";
import { Notice } from "../predict/ui";
import { PlayerPhoto } from "./PlayerPhoto";
import { submitRatings } from "./actions";

export const metadata: Metadata = {
  title: "نمرهٔ هواداران به بازیکنان نساجی",
  description: "بعد از هر بازی به بازیکنان و سرمربی نساجی از ۱ تا ۱۰ نمره بدهید؛ بازیکن برتر هفته به انتخاب هواداران.",
};

const SCORES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export default async function RatingsPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  openDuePolls();
  const poll = currentPoll();
  const fan = await currentFan();
  const season = seasonRatings().filter((r) => r.role === "player").slice(0, 10);

  if (!poll) {
    return (
      <div className="ratings">
        <h1 className="page-title">نمرهٔ هواداران به بازیکنان</h1>
        <p className="panel muted">بعد از پایان بازی بعدی نساجی، نمره‌دهی همین‌جا باز می‌شود.</p>
      </div>
    );
  }

  const open = isOpenPoll(poll);
  const votes = pollVotes(poll.key);
  const mine = fan ? votes.find((v) => v.fanId === fan.id) : undefined;
  const showResults = !open || !!mine;
  const res = pollResults(poll);
  const best = pollBest(poll);

  return (
    <div className="ratings">
      <header className="predict-head">
        <div>
          <p className="predict-kicker">نمرهٔ هواداران{poll.round ? ` · هفتهٔ ${faNum(poll.round)}` : ""}</p>
          <h1 className="page-title">{poll.score ?? poll.match}</h1>
        </div>
      </header>
      <Notice sp={sp} />
      <div className="predict-grid">
        <section className="panel" id="rate">
          {open ? (
            <p className="ratings-status">
              <span className="live-dot" /> نمره‌دهی تا {faDate(poll.closesAt)} باز است · {faNum(votes.length)} هوادار نمره داده‌اند
            </p>
          ) : (
            <p className="ratings-status">نمره‌دهی تمام شد · {faNum(votes.length)} هوادار نمره دادند</p>
          )}
          {!open && mine && <p className="ratings-mine-note">نمره‌های شما ثبت شده است و فقط قابل دیدن است؛ مهلت تغییرش تمام شده.</p>}
          {open && !fan && (
            <div className="predict-cta">
              <p>برای نمره دادن با حساب «بله» یا «تلگرام» وارد شوید (همان حساب مسابقهٔ پیش‌بینی).</p>
              <Link href="/predict/login/?next=/ratings/" className="btn btn-primary">ورود و نمره دادن</Link>
            </div>
          )}
          {open && fan ? (
            <form action={submitRatings}>
              <input type="hidden" name="poll" value={poll.key} />
              <p className="muted ratings-help">به هر کس که بازی‌اش را دیده‌اید از ۱ (ضعیف) تا ۱۰ (عالی) نمره بدهید؛ لازم نیست به همه نمره بدهید.</p>
              <ul className="ratings-list">
                {poll.candidates.map((c) => {
                  const r = res.find((x) => x.id === c.id);
                  return (
                    <li key={c.id} className="ratings-row">
                      <PlayerPhoto src={photoOf(c)} name={c.name} number={c.number} size={48} />
                      <span className="ratings-who">
                        <b>{c.name}</b>
                        <small>{c.role === "coach" ? "سرمربی" : c.number ? `شمارهٔ ${faNum(c.number)}` : "بازیکن"}</small>
                      </span>
                      {showResults && r?.count ? <span className="ratings-avg" title={`${faNum(r.count)} نمره`}>{faScore(r.avg)}</span> : <span />}
                      <fieldset className="ratings-scale">
                        <legend className="sr-only">نمرهٔ {c.name}</legend>
                        {SCORES.map((n) => (
                          <label key={n}>
                            <input type="radio" name={`s_${c.id}`} value={n} defaultChecked={mine?.scores[c.id] === n} />
                            <span>{faNum(n)}</span>
                          </label>
                        ))}
                      </fieldset>
                    </li>
                  );
                })}
              </ul>
              <button type="submit" className="btn btn-primary predict-save">{mine ? "به‌روزرسانی نمره‌ها" : "ثبت نمره‌ها"}</button>
              {!mine && <p className="muted ratings-help">میانگین نمره‌ها بعد از ثبت نمرهٔ شما نمایش داده می‌شود.</p>}
            </form>
          ) : showResults ? (
            <ol className="ratings-results">
              {res.filter((r) => r.count > 0).map((r) => (
                <li key={r.id} className={best?.id === r.id ? "is-best" : ""}>
                  <PlayerPhoto src={photoOf(r)} name={r.name} number={r.number} size={44} />
                  <span className="ratings-who">
                    <b>{r.name}{best?.id === r.id ? " ⭐" : ""}</b>
                    <small>{r.role === "coach" ? "سرمربی" : r.number ? `شمارهٔ ${faNum(r.number)}` : "بازیکن"} · {faNum(r.count)} نمره</small>
                    {mine?.scores[r.id] ? <small className="ratings-mine">نمرهٔ شما: {faNum(mine.scores[r.id])}</small> : null}
                  </span>
                  <span className="ratings-bar"><span style={{ width: `${r.avg * 10}%` }} /></span>
                  <span className="ratings-avg">{faScore(r.avg)}</span>
                </li>
              ))}
            </ol>
          ) : null}
        </section>
        <aside className="stack">
          {season.length > 0 && (
            <section className="panel">
              <SectionHeader title="برترین‌های فصل از نگاه هواداران" />
              <ol className="leaders">
                {season.map((r, i) => (
                  <li key={r.id}>
                    <span className={`leaders-rank${i < 3 ? ` top-${i + 1}` : ""}`}>{faNum(i + 1)}</span>
                    <span className="leaders-name"><PlayerPhoto src={photoOf(r)} name={r.name} size={28} /> <span>{r.name}</span></span>
                    <span className="leaders-exact">{r.best ? `${faNum(r.best)} بار برتر` : `${faNum(r.matches)} بازی`}</span>
                    <strong className="leaders-pts">{faScore(r.avg)}</strong>
                  </li>
                ))}
              </ol>
            </section>
          )}
          <section className="panel">
            <SectionHeader title="چطور کار می‌کند؟" />
            <ul className="predict-rules">
              <li>بعد از سوت پایان هر بازی نساجی، نمره‌دهی خودکار باز می‌شود و تا ۴۸ ساعت (دو روز) بعد از شروع بازی باز می‌ماند.</li>
              <li>به بازیکنانی که در بازی حاضر بودند و سرمربی از ۱ تا ۱۰ نمره بدهید.</li>
              <li>بازیکن با بالاترین میانگین، «بازیکن برتر هفته به انتخاب هواداران» در صفحهٔ اول می‌شود.</li>
              <li>هر هوادار یک بار نمره می‌دهد و تا پایان مهلت می‌تواند تغییرش دهد؛ بعد از آن نمره‌ها بسته می‌شوند و فقط دیده می‌شوند.</li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
