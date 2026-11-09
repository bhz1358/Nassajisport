// What the Bale reminders should send, and when. Pure functions (no store, no network).

import { fixtureKey, isOpen, leaderboard, type FanLite, type Prediction } from "./predict-score.ts";
import type { Fixture } from "./types";

/** Reminders go out this long before the fan's first unpredicted match of the day. */
export const LEAD_MS = 2 * 3_600_000;

export type ReminderFan = FanLite & { chat?: number; remind?: boolean };

export const tehranDay = (iso: string | number) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Tehran" });

/**
 * Fans to remind now: their first open match today (Tehran) that they haven't predicted kicks off
 * within LEAD_MS, and they weren't reminded today. Each gets that day's unpredicted open matches.
 */
export function dueReminders(fixtures: Fixture[], fans: ReminderFan[], predictions: Prediction[], sent: Set<string>, now: number) {
  const out: { fan: ReminderFan; day: string; matches: Fixture[] }[] = [];
  const open = fixtures.filter((f) => isOpen(f, now)).sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  if (!open.length) return out;
  const predicted = new Set(predictions.map((p) => `${p.fanId}|${p.key}`));
  for (const fan of fans) {
    if (!fan.chat || fan.remind === false || fan.blocked) continue;
    const mine = open.filter((f) => !predicted.has(`${fan.id}|${fixtureKey(f)}`));
    const first = mine[0];
    if (!first || Date.parse(first.date) - now > LEAD_MS) continue;
    const day = tehranDay(first.date);
    if (sent.has(`${fan.id}|${day}`)) continue;
    out.push({ fan, day, matches: mine.filter((f) => tehranDay(f.date) === day) });
  }
  return out;
}

/** A week is over when all its matches are finished, or the contest has moved on to a later week. */
export function weekOver(fixtures: Fixture[], week: number, current?: number) {
  const ms = fixtures.filter((f) => f.round === week);
  if (!ms.length) return false;
  return ms.every((f) => f.status === "finished") || (current !== undefined && current > week && ms.some((f) => f.status === "finished"));
}

/** Each fan who predicted in the week: their points, places in the week and the season, and the week's best. */
export function weekSummaries(fixtures: Fixture[], week: number, fans: ReminderFan[], predictions: Prediction[]) {
  const weekKeys = new Set(fixtures.filter((f) => f.round === week).map(fixtureKey));
  const weekTable = leaderboard(predictions.filter((p) => weekKeys.has(p.key)), fixtures.filter((f) => f.round === week), fans);
  const seasonTable = leaderboard(predictions, fixtures, fans);
  return fans
    .filter((f) => f.chat && f.remind !== false && !f.blocked)
    .map((fan) => {
      const w = weekTable.findIndex((r) => r.fanId === fan.id);
      if (w < 0) return undefined;
      const s = seasonTable.findIndex((r) => r.fanId === fan.id);
      return {
        fan,
        points: weekTable[w].points,
        exact: weekTable[w].exact,
        weekRank: w + 1,
        weekPlayers: weekTable.length,
        seasonRank: s + 1,
        seasonPoints: seasonTable[s]?.points ?? 0,
        best: weekTable[0],
      };
    })
    .filter((x): x is NonNullable<typeof x> => !!x);
}
