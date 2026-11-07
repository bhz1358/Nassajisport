import { HOME_TEAM } from "./site";
import { cleanTeamNames } from "./team-names";
import { readStore, seedFromContent, writeStore } from "./store";
import type { Fixture, LeagueData, StandingRow } from "./types";

// Edited in the admin panel. A live provider (football API, polled server-side) can write here later.
export function getLeague(): LeagueData {
  const league = readStore<LeagueData>("league", () => seedFromContent("league/pro-league.json"));
  const cleaned = cleanTeamNames(league);
  if (cleaned !== league) saveLeague({ ...cleaned, updatedAt: league.updatedAt });
  return cleaned;
}



/**
 * Logos shipped with the site for teams whose logo the usual sources lack
 * (iranleague.ir's Chadormalu file is missing). A logo set in the admin wins.
 */
export const BUNDLED_LOGOS: Record<string, string> = {
  "چادرملو اردکان": "/teams/chadormalu.webp",
};

export const teamLogo = (league: LeagueData, team: string): string | undefined => league.teamLogos?.[team] || BUNDLED_LOGOS[team];

export function saveLeague(league: LeagueData) {
  writeStore("league", { ...league, updatedAt: new Date().toISOString() });
}

/** Points, then goal difference, then goals scored. */
export function sortStandings(rows: StandingRow[]): StandingRow[] {
  return [...rows].sort(
    (a, b) =>
      b.points - a.points ||
      b.goalsFor - b.goalsAgainst - (a.goalsFor - a.goalsAgainst) ||
      b.goalsFor - a.goalsFor,
  );
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

/** The club's next match (or the one being played now), if any is scheduled. */
export function getNextClubMatch(league: LeagueData): Fixture | undefined {
  const mine = league.fixtures.filter(involvesClub);
  return (
    mine.find((f) => f.status === "live") ??
    mine.filter((f) => f.status === "scheduled").sort((a, b) => a.date.localeCompare(b.date))[0]
  );
}

/**
 * Results of the matchweek before `next`: by round number when fixtures have one,
 * otherwise the last finished matches played before it.
 */
export function previousRoundResults(league: LeagueData, next?: Fixture): { round?: number; fixtures: Fixture[] } {
  const finished = league.fixtures.filter((f) => f.status === "finished");
  const lastRound = next?.round
    ? next.round - 1
    : Math.max(0, ...finished.map((f) => f.round ?? 0)) || undefined;
  if (lastRound) {
    const inRound = finished.filter((f) => f.round === lastRound);
    if (inRound.length) return { round: lastRound, fixtures: inRound.sort((a, b) => a.date.localeCompare(b.date)) };
  }
  const before = next ? finished.filter((f) => f.date < next.date) : finished;
  return { fixtures: before.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 9) };
}

/** A slice of the table around the club, so the sidebar shows where it actually stands. */
export function tableAroundClub(rows: StandingRow[], span = 2): { rows: StandingRow[]; offset: number } {
  const i = rows.findIndex((r) => r.team === HOME_TEAM);
  if (i < 0) return { rows: rows.slice(0, span * 2 + 1), offset: 0 };
  const start = Math.max(0, Math.min(i - span, rows.length - (span * 2 + 1)));
  return { rows: rows.slice(start, start + span * 2 + 1), offset: start };
}
