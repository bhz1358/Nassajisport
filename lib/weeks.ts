import type { Fixture } from "./types";

const DAY_MS = 86_400_000;
/** Midnight in Tehran (UTC+3:30, no daylight saving) of the day `iso` falls on. */
function tehranMidnight(ms: number): number {
  const ymd = new Date(ms).toLocaleDateString("en-CA", { timeZone: "Asia/Tehran" });
  return Date.parse(`${ymd}T00:00:00+03:30`);
}

/**
 * The week to show as «هفته‌ی جاری», from the match dates:
 * the latest week that has started stays until the end of the whole day after its last
 * match (its results stay up for a day); from the next day on, the next week shows.
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
      // Switch at midnight two days after the last match's day: the day after stays.
      return { round, first, switchAt: tehranMidnight(last) + 2 * DAY_MS };
    })
    .sort((a, b) => a.round - b.round);
  if (!weeks.length) return undefined;
  const started = weeks.filter((w) => w.first <= now).sort((a, b) => b.first - a.first)[0];
  if (!started) return weeks[0].round;
  if (now < started.switchAt) return started.round;
  // The week after it (by number), or the last one when the season is over.
  return (weeks.find((w) => w.round > started.round) ?? started).round;
}
