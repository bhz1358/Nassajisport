// Scoring for the fans' prediction contest. Pure functions (no store), so they are tested directly.

import type { Fixture } from "./types";

export type Prediction = { fanId: string; key: string; home: number; away: number; at: string };
export type FanLite = { id: string; name: string; blocked?: boolean };

export const POINTS = { exact: 5, difference: 3, outcome: 2 } as const;

/** A match's lasting identity: its week and teams (the date may move when a match is postponed). */
export const fixtureKey = (f: Pick<Fixture, "round" | "home" | "away" | "date">) =>
  `${f.round ?? f.date.slice(0, 10)}|${f.home}|${f.away}`;

/** Predictions close at kick-off (or as soon as the match is live or over). */
export const isOpen = (f: Fixture, now = Date.now()) => f.status === "scheduled" && Date.parse(f.date) > now;

const sign = (n: number) => Math.sign(n);

/** Points for one prediction once the match is over; undefined while it isn't. */
export function pointsFor(p: { home: number; away: number }, f: Fixture): number | undefined {
  if (f.status !== "finished" || f.homeScore == null || f.awayScore == null) return undefined;
  if (p.home === f.homeScore && p.away === f.awayScore) return POINTS.exact;
  const real = f.homeScore - f.awayScore;
  const guess = p.home - p.away;
  if (guess === real) return POINTS.difference; // right winner (or draw) and goal difference
  if (sign(guess) === sign(real)) return POINTS.outcome;
  return 0;
}

export type LeaderRow = { fanId: string; name: string; points: number; exact: number; played: number; firstAt: string };

/**
 * Ranking over the given fixtures (a week's, or the whole season's): points, then exact
 * scores, then whoever predicted first.
 */
export function leaderboard(predictions: Prediction[], fixtures: Fixture[], fans: FanLite[]): LeaderRow[] {
  const byKey = new Map(fixtures.map((f) => [fixtureKey(f), f]));
  const names = new Map(fans.filter((f) => !f.blocked).map((f) => [f.id, f.name]));
  const rows = new Map<string, LeaderRow>();
  for (const p of predictions) {
    const f = byKey.get(p.key);
    const name = names.get(p.fanId);
    if (!f || name === undefined) continue;
    const pts = pointsFor(p, f);
    if (pts === undefined) continue;
    const r = rows.get(p.fanId) ?? { fanId: p.fanId, name, points: 0, exact: 0, played: 0, firstAt: p.at };
    r.points += pts;
    r.played += 1;
    if (pts === POINTS.exact) r.exact += 1;
    if (p.at < r.firstAt) r.firstAt = p.at;
    rows.set(p.fanId, r);
  }
  return [...rows.values()].sort((a, b) => b.points - a.points || b.exact - a.exact || a.firstAt.localeCompare(b.firstAt));
}

/** "۰۹۱۲…" / "+98 912…" / "98912…" / Persian digits → "09121234567"; undefined if not an Iranian mobile. */
export function normalizePhone(raw: string): string | undefined {
  const d = raw.replace(/[۰-۹]/g, (c) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(c))).replace(/[٠-٩]/g, (c) => String("٠١٢٣٤٥٦٧٨٩".indexOf(c))).replace(/\D/g, "");
  const m = d.match(/^(?:0098|98|0)?(9\d{9})$/);
  return m ? `0${m[1]}` : undefined;
}

/** Shown to the admin only: 0912***4567. */
export const maskPhone = (p: string) => p.replace(/^(\d{4})\d{3}(\d{4})$/, "$1***$2");
