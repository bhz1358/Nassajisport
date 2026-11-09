// The fans' predictions, kept in DATA_DIR/predictions.json.

import { getFans } from "./fans";
import { getLeague } from "./league";
import { currentWeek } from "./weeks";
import { fixtureKey, isOpen, leaderboard, type Prediction } from "./predict-score.ts";
import { readStore, writeStore } from "./store";
import type { Fixture } from "./types";

export const getPredictions = () => readStore<Prediction[]>("predictions", () => []);

/** Saves a fan's predictions for matches still open; returns how many were saved. */
export function savePredictions(fanId: string, entries: { key: string; home: number; away: number }[]): number {
  const open = new Set(getLeague().fixtures.filter((f) => isOpen(f)).map(fixtureKey));
  const at = new Date().toISOString();
  const valid = entries.filter((e) => open.has(e.key));
  if (!valid.length) return 0;
  const keys = new Set(valid.map((e) => e.key));
  const others = getPredictions().filter((p) => !(p.fanId === fanId && keys.has(p.key)));
  writeStore("predictions", [...others, ...valid.map((e) => ({ fanId, key: e.key, home: e.home, away: e.away, at }))]);
  return valid.length;
}

/** The week the contest shows by default: the current one (results stay a day after it ends). */
export function contestWeek(fixtures: Fixture[] = getLeague().fixtures): number | undefined {
  return currentWeek(fixtures);
}

export const weekFixtures = (week: number, fixtures: Fixture[] = getLeague().fixtures) =>
  fixtures.filter((f) => f.round === week).sort((a, b) => Date.parse(a.date) - Date.parse(b.date));

export function weekTable(week: number) {
  return leaderboard(getPredictions(), weekFixtures(week), getFans());
}

export function seasonTable() {
  return leaderboard(getPredictions(), getLeague().fixtures, getFans());
}

/** How many fans predicted each match (shown once it's closed). */
export function predictionCount(key: string) {
  return getPredictions().filter((p) => p.key === key).length;
}
