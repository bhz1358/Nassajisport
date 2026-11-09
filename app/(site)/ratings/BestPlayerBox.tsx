import Link from "next/link";
import { faNum } from "@/lib/format";
import { faScore } from "@/lib/ratings-calc";
import { currentPoll, isOpenPoll, latestClosedPoll, openDuePolls, photoOf, pollBest, pollVotes } from "@/lib/ratings";
import { PlayerPhoto } from "./PlayerPhoto";

/** Home page: «بازیکن برتر هفته به انتخاب هواداران», and an invitation while a poll is open. */
export function BestPlayerBox() {
  openDuePolls();
  const open = currentPoll();
  const isOpen = open && isOpenPoll(open);
  const done = latestClosedPoll();
  const best = done ? pollBest(done) : undefined;
  if (!best && !isOpen) return null;
  return (
    <section className="panel best-player">
      <h2 className="best-player-title">⭐ بازیکن برتر هفته <small>به انتخاب هواداران</small></h2>
      {best && done && (
        <Link href="/ratings/" className="best-player-card">
          <span className="best-player-photo">
            <PlayerPhoto src={photoOf(best)} name={best.name} number={best.number} size={120} />
            <span className="best-player-score">{faScore(best.avg)}</span>
          </span>
          <strong>{best.name}</strong>
          <span className="muted">
            {done.round ? `هفتهٔ ${faNum(done.round)} · ` : ""}مقابل {done.opponent} · {faNum(pollVotes(done.key).length)} رأی
          </span>
        </Link>
      )}
      {isOpen && (
        <Link href="/ratings/" className="btn btn-primary best-player-cta">
          به بازیکنان بازی با {open!.opponent} نمره بدهید
        </Link>
      )}
    </section>
  );
}
