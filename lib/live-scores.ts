// Live scores from Footballi's match list (api.footballi.net/api/v2/match/tab).
// Pure functions: reading the feed and merging it into the league's fixtures.

import { toLatinDigits } from "./jalali.ts";
import { canonicalTeam } from "./team-names.ts";
import type { Fixture, LeagueData } from "./types";

export const FOOTBALLI_URL = "https://api.footballi.net/api/v2/match/tab";

export type FeedMatch = {
  id: number;
  home: string;
  away: string;
  /** Kick-off, ISO. */
  date: string;
  started: boolean;
  ended: boolean;
  homeScore?: number;
  awayScore?: number;
  /** Footballi's own status text: "پایان", "45'", "بین دو نیمه"... */
  statusText?: string;
  minute?: number;
};

/** Every match object in the feed, wherever it sits (competitions, calendars, boxes). */
export function readFeed(json: unknown): FeedMatch[] {
  const out = new Map<number, FeedMatch>();
  const walk = (x: unknown) => {
    if (Array.isArray(x)) return x.forEach(walk);
    if (!x || typeof x !== "object") return;
    const o = x as Record<string, unknown>;
    const home = (o.home_team as { name_fa?: string } | undefined)?.name_fa;
    const away = (o.away_team as { name_fa?: string } | undefined)?.name_fa;
    if (typeof o.match_id === "number" && home && away && typeof o.timestamp === "number") {
      const hs = Number(o.home_team_score);
      const as = Number(o.away_team_score);
      const status = typeof o.status === "string" ? o.status.trim() : undefined;
      // The minute is in the status text while the match is on: "67'", "دقیقه ۶۷", "90+3".
      const latin = status ? toLatinDigits(status) : "";
      const min = /\d/.test(latin) ? Number(latin.match(/\d+/)?.[0]) : undefined;
      const prev = out.get(o.match_id);
      const m: FeedMatch = {
        id: o.match_id,
        home,
        away,
        date: new Date(o.timestamp * 1000).toISOString(),
        started: o.match_started === true,
        ended: o.match_ended === true || /پایان|تمام/.test(status ?? ""),
        ...(hs >= 0 && as >= 0 ? { homeScore: hs, awayScore: as } : {}),
        ...(status ? { statusText: status } : {}),
        ...(min !== undefined && min >= 0 && min <= 130 ? { minute: min } : {}),
      };
      // The same match can appear twice (list and a box); keep the more detailed copy.
      if (!prev || Object.keys(m).length > Object.keys(prev).length) out.set(o.match_id, m);
    }
    Object.values(o).forEach(walk);
  };
  walk(json);
  return [...out.values()];
}

const DAY = 86_400_000;

/**
 * Updates the league's fixtures from the feed. A feed match is used only when both
 * teams are teams of this league and a fixture between them is within 3 days of the
 * kick-off (so foreign leagues and other cups are ignored). Returns what changed.
 */
export function mergeLive(league: LeagueData, feed: FeedMatch[]): { league: LeagueData; changes: string[] } {
  const known = [
    ...league.standings.map((r) => r.team),
    ...league.fixtures.flatMap((f) => [f.home, f.away]),
  ];
  const knownSet = new Set(known);
  const changes: string[] = [];
  const fixtures = [...league.fixtures];
  for (const m of feed) {
    const home = canonicalTeam(m.home, known);
    const away = canonicalTeam(m.away, known);
    if (!knownSet.has(home) || !knownSet.has(away) || home === away) continue;
    const kick = Date.parse(m.date);
    const i = fixtures.findIndex((f) => f.home === home && f.away === away && Math.abs(Date.parse(f.date) - kick) < 3 * DAY);
    if (i < 0) continue;
    const f = fixtures[i];
    let next: Fixture;
    if (m.ended && m.homeScore !== undefined) {
      next = { ...f, status: "finished", homeScore: m.homeScore, awayScore: m.awayScore, minute: undefined, liveLabel: undefined };
    } else if (m.started) {
      next = {
        ...f,
        status: "live",
        homeScore: m.homeScore ?? f.homeScore ?? 0,
        awayScore: m.awayScore ?? f.awayScore ?? 0,
        minute: m.minute ?? f.minute,
        // Half time and the like have no minute: show Footballi's words.
        liveLabel: m.minute === undefined ? m.statusText : undefined,
      };
    } else {
      // Not started: only a changed kick-off time is taken (e.g. a match moved by the league).
      next = Math.abs(Date.parse(f.date) - kick) > 60_000 && f.status === "scheduled" ? { ...f, date: m.date } : f;
    }
    // Drop keys set to undefined so unchanged fixtures compare equal.
    next = Object.fromEntries(Object.entries(next).filter(([, v]) => v !== undefined)) as Fixture;
    if (JSON.stringify(next) !== JSON.stringify(f)) {
      fixtures[i] = next;
      const score = next.homeScore !== undefined ? ` ${next.homeScore}-${next.awayScore}` : "";
      changes.push(`${home} - ${away}:${score} ${next.status === "finished" ? "پایان" : next.status === "live" ? `زنده${next.minute ? ` دقیقه ${next.minute}` : next.liveLabel ? ` (${next.liveLabel})` : ""}` : "تغییر ساعت"}`);
    }
  }
  return { league: changes.length ? { ...league, fixtures } : league, changes };
}

export type LiveSettings = {
  enabled: boolean;
  /** "matches": only from 15 minutes before a fixture of this league to 2.5 hours after it; "always": all the time. */
  mode: "matches" | "always";
  /** Seconds between checks. */
  every: number;
  lastSync?: string;
  lastError?: string;
  lastChanges?: string[];
};

export const DEFAULT_LIVE: LiveSettings = { enabled: true, mode: "matches", every: 60 };

/** Is now a time to ask Footballi? */
export function liveWindowOpen(league: LeagueData, settings: LiveSettings, now = Date.now()): boolean {
  if (!settings.enabled) return false;
  if (settings.lastSync && now - Date.parse(settings.lastSync) < Math.max(30, settings.every) * 1000) return false;
  if (settings.mode === "always") return true;
  return league.fixtures.some((f) => {
    if (f.status === "live") return true;
    if (f.status !== "scheduled") return false;
    const t = Date.parse(f.date);
    return now >= t - 15 * 60_000 && now <= t + 150 * 60_000;
  });
}
