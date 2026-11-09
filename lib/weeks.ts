import type { Fixture } from "./types";

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;
/** A match is over about two hours after kick-off (with half-time and added time). */
const MATCH_MS = 2 * HOUR_MS;

/**
 * The week to show as «هفته‌ی جاری», from the match dates:
 * the latest week that has started stays, with its results, until 24 hours after its last
 * match ends; then the next week's schedule shows.
 * Before the season, the first week. A match moved far from its week (postponed) doesn't
 * hold the week: only matches within 7 days of the week's first kick-off count.
 */
export function currentWeek(fixtures: Fixture[], now = Date.now()): number | undefined {
  const byWeek = new Map<number, number[]>();
  for (const f of fixtures) if (f.round) byWeek.set(f.round, [...(byWeek.get(f.round) ?? []), Date.parse(f.date)]);
  const weeks = [...byWeek.entries()]
    .map(([round, times]) => {
      const first = Math.min(...times);
      const last = Math.max(...times.filter((t) => t <= first + 7 * DAY_MS));
      // Results stay up for 24 hours after the last match ends.
      return { round, first, switchAt: last + MATCH_MS + DAY_MS };
    })
    .sort((a, b) => a.round - b.round);
  if (!weeks.length) return undefined;
  const started = weeks.filter((w) => w.first <= now).sort((a, b) => b.first - a.first)[0];
  if (!started) return weeks[0].round;
  if (now < started.switchAt) return started.round;
  // The week after it (by number), or the last one when the season is over.
  return (weeks.find((w) => w.round > started.round) ?? started).round;
}
