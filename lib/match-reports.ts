// Match reports: both teams' line-ups (from the league's official match sheet), coaching staff,
// referees and match details. Kept in DATA_DIR/match-reports.json; the first copy comes from
// content/match-reports.json.

import { getLeague } from "./league";
import { HOME_TEAM } from "./site";
import { readStore, seedFromContent, writeStore } from "./store";
import { canonicalTeam } from "./team-names.ts";
import type { Fixture } from "./types";

export type SheetPlayer = { number?: number; name: string; captain?: boolean };
export type TeamSheet = {
  team: string;
  kit?: { shirt?: string; shorts?: string; socks?: string };
  starters: SheetPlayer[];
  subs: SheetPlayer[];
  staff: { role: string; name: string }[];
};
export type MatchReport = {
  id: string;
  round?: number;
  matchNo?: number;
  competition?: string;
  /** Kick-off, ISO. */
  date: string;
  city?: string;
  venue?: string;
  weather?: string;
  home: TeamSheet;
  away: TeamSheet;
  officials: { role: string; name: string }[];
  /** A photo of the sheet itself (optional). */
  sheetImage?: string;
  createdAt: string;
};

export const getReports = () => readStore<MatchReport[]>("match-reports", () => seedFromContent<MatchReport[]>("match-reports.json"));
export const saveReports = (r: MatchReport[]) => writeStore("match-reports", r);
export const getReport = (id: string) => getReports().find((r) => r.id === id);

/** The league fixture this report is about (same teams within 3 days), for the score. */
export function fixtureOf(r: MatchReport): Fixture | undefined {
  const league = getLeague();
  const known = [...league.standings.map((s) => s.team), ...league.fixtures.flatMap((f) => [f.home, f.away])];
  const home = canonicalTeam(r.home.team, known);
  const away = canonicalTeam(r.away.team, known);
  return league.fixtures.find((f) => f.home === home && f.away === away && Math.abs(Date.parse(f.date) - Date.parse(r.date)) < 3 * 86_400_000);
}

/** Team names as the rest of the site writes them (for logos and the club's highlight). */
export function siteTeam(name: string): string {
  const league = getLeague();
  const known = [HOME_TEAM, ...league.standings.map((s) => s.team), ...league.fixtures.flatMap((f) => [f.home, f.away])];
  return canonicalTeam(name, known);
}

const KIT: [RegExp, string][] = [
  [/زرشکی|جگری/, "#7a1222"],
  [/سرمه/, "#1b2a5c"],
  [/آسمانی|آبی روشن/, "#5cb8ff"],
  [/آبی/, "#1f5fd6"],
  [/قرمز/, "#d32030"],
  [/سفید/, "#f4f4f4"],
  [/مشکی|سیاه/, "#151515"],
  [/زرد|طلایی/, "#f2c230"],
  [/نارنجی/, "#f07a1a"],
  [/سبز/, "#1f9a4a"],
  [/بنفش/, "#6b3fb3"],
  [/طوسی|خاکستری/, "#8a8f98"],
];
/** "قرمز" → a colour for the shirt icon; unknown names get a neutral grey. */
export const kitColor = (name?: string) => (name && KIT.find(([re]) => re.test(name))?.[1]) || "#8a8f98";

/** "week-11-nassaji-persepolis" style id from the week and teams. */
export const reportId = (round: number | undefined, home: string, away: string, date: string) =>
  `${round ? `w${round}-` : ""}${date.slice(0, 10)}-${[home, away].map((t) => t.replace(/\s+/g, "-")).join("-")}`;
