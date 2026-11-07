// The whole season's schedule from Footballi's competition fixtures
// (api.footballi.net/api/v2/competitions/14/fixtures, paged with meta.previous / meta.next).

import { readFeed, type FeedMatch } from "./live-scores.ts";
import { canonicalTeam } from "./team-names.ts";
import type { Fixture, LeagueData } from "./types";

/** Footballi's competition page address or number → its id (Persian Gulf Pro League is 14). */
export function competitionId(input: string): number | undefined {
  const n = Number(input.trim().match(/competitions?\/(\d+)/)?.[1] ?? input.trim());
  return Number.isInteger(n) && n > 0 ? n : undefined;
}

/** One page of fixtures: its matches and the cursors to the pages before and after it. */
export function readFixturesPage(json: unknown): { matches: FeedMatch[]; previous?: string; next?: string } {
  const meta = ((json as { meta?: Record<string, unknown> })?.meta ?? {}) as Record<string, unknown>;
  const cursor = (v: unknown) => (typeof v === "string" && v ? v : undefined);
  return { matches: readFeed((json as { data?: unknown })?.data ?? json), previous: cursor(meta.previous), next: cursor(meta.next) };
}

export type SeasonMerge = { league: LeagueData; added: number; updated: number; skipped: string[] };

/**
 * Adds the season's matches to the league's fixtures and updates the ones already there
 * (date, week, score, status). Team names are mapped to the site's; a match whose team
 * can't be matched is skipped and reported.
 */
export function mergeSeason(league: LeagueData, matches: FeedMatch[]): SeasonMerge {
  const known = [...league.standings.map((r) => r.team), ...league.fixtures.flatMap((f) => [f.home, f.away]), ...Object.keys(league.teamLogos ?? {})];
  const knownSet = new Set(known);
  const fixtures = [...league.fixtures];
  const skipped = new Set<string>();
  let added = 0;
  let updated = 0;
  for (const m of matches) {
    const home = canonicalTeam(m.home, known);
    const away = canonicalTeam(m.away, known);
    if (!knownSet.has(home)) skipped.add(m.home);
    if (!knownSet.has(away)) skipped.add(m.away);
    if (!knownSet.has(home) || !knownSet.has(away) || home === away) continue;
    const kick = Date.parse(m.date);
    const status: Fixture["status"] = m.ended && m.homeScore !== undefined ? "finished" : m.started ? "live" : "scheduled";
    const fresh: Fixture = {
      date: m.date,
      home,
      away,
      status,
      ...(status !== "scheduled" && m.homeScore !== undefined ? { homeScore: m.homeScore, awayScore: m.awayScore } : {}),
      ...(m.round ? { round: m.round } : {}),
    };
    // The same pairing in the same week, or (without a week) within 3 days.
    const i = fixtures.findIndex(
      (f) => f.home === home && f.away === away && (m.round && f.round ? f.round === m.round : Math.abs(Date.parse(f.date) - kick) < 3 * 86_400_000),
    );
    if (i < 0) {
      fixtures.push(fresh);
      added++;
      continue;
    }
    const f = fixtures[i];
    // Keep what the site knows better: the venue, and the live minute while a match is on.
    const next: Fixture = { ...f, ...fresh, ...(status === "live" ? { minute: f.minute, liveLabel: f.liveLabel } : { minute: undefined, liveLabel: undefined }) };
    const clean = Object.fromEntries(Object.entries(next).filter(([, v]) => v !== undefined)) as Fixture;
    if (JSON.stringify(clean) !== JSON.stringify(f)) {
      fixtures[i] = clean;
      updated++;
    }
  }
  fixtures.sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  return { league: added || updated ? { ...league, fixtures } : league, added, updated, skipped: [...skipped] };
}
