import fs from "node:fs";
import path from "node:path";
import { HOME_TEAM } from "./site";
import type { Fixture, LeagueData, StandingRow } from "./types";

// For now league data comes from a JSON file that can be edited by hand.
// A live provider (football API, polled server-side and cached) will replace this.
export function getLeague(): LeagueData {
  const file = path.join(process.cwd(), "content", "league", "pro-league.json");
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

const involvesClub = (f: Fixture) => f.home === HOME_TEAM || f.away === HOME_TEAM;

/** The club's match to feature: live now, otherwise the next one, otherwise the latest result. */
export function getClubMatch(league: LeagueData): Fixture | undefined {
  const mine = league.fixtures.filter(involvesClub);
  return (
    mine.find((f) => f.status === "live") ??
    mine.filter((f) => f.status === "scheduled").sort((a, b) => a.date.localeCompare(b.date))[0] ??
    mine.filter((f) => f.status === "finished").sort((a, b) => b.date.localeCompare(a.date))[0]
  );
}

/** A slice of the table around the club, so the sidebar shows where it actually stands. */
export function tableAroundClub(rows: StandingRow[], span = 2): { rows: StandingRow[]; offset: number } {
  const i = rows.findIndex((r) => r.team === HOME_TEAM);
  if (i < 0) return { rows: rows.slice(0, span * 2 + 1), offset: 0 };
  const start = Math.max(0, Math.min(i - span, rows.length - (span * 2 + 1)));
  return { rows: rows.slice(start, start + span * 2 + 1), offset: start };
}
