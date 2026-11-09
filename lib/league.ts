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
 * Pro League logos shipped with the site (github.com/LordArma/Iran-Football-Leagues, MIT;
 * 256px here, 512px in /teams/large/ for news covers). They replace logos the fetch tool
 * downloaded into /uploads/teams/; a logo uploaded in the admin still wins.
 */
export const BUNDLED_LOGOS: Record<string, string> = {
  "آلومینیوم اراک": "/teams/aluminium-arak.webp",
  استقلال: "/teams/esteghlal.webp",
  "استقلال خوزستان": "/teams/esteghlal-khuzestan.webp",
  تراکتور: "/teams/tractor.webp",
  "خیبر خرم آباد": "/teams/kheybar.webp",
  "ذوب آهن": "/teams/zob-ahan.webp",
  سپاهان: "/teams/sepahan.webp",
  "شمس آذر قزوین": "/teams/shams-azar.webp",
  "صنعت نفت آبادان": "/teams/sanat-naft.webp",
  "فجر سپاسی": "/teams/fajr-sepasi.webp",
  فولاد: "/teams/foolad.webp",
  "مس شهر بابک": "/teams/mes-shahr-babak.webp",
  ملوان: "/teams/malavan.webp",
  "نساجی مازندران": "/teams/nassaji.webp",
  پرسپولیس: "/teams/persepolis.webp",
  پیکان: "/teams/paykan.webp",
  "چادرملو اردکان": "/teams/chadormalu.webp",
  "گل گهر": "/teams/golgohar.webp",
};

const bundledKey = (s: string) => s.replace(/[\u200c\s]+/g, " ").replace(/ي/g, "ی").replace(/ك/g, "ک").trim();
const BUNDLED_BY_KEY = new Map(Object.entries(BUNDLED_LOGOS).map(([t, u]) => [bundledKey(t), u]));

export const teamLogo = (league: LeagueData, team: string): string | undefined => {
  const set = league.teamLogos?.[team];
  if (set && !set.startsWith("/uploads/teams/")) return set;
  return BUNDLED_BY_KEY.get(bundledKey(team)) ?? set;
};

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

/** A slice of the table around the club, so the sidebar shows where it actually stands. */
export function tableAroundClub(rows: StandingRow[], span = 2): { rows: StandingRow[]; offset: number } {
  const i = rows.findIndex((r) => r.team === HOME_TEAM);
  if (i < 0) return { rows: rows.slice(0, span * 2 + 1), offset: 0 };
  const start = Math.max(0, Math.min(i - span, rows.length - (span * 2 + 1)));
  return { rows: rows.slice(start, start + span * 2 + 1), offset: start };
}

