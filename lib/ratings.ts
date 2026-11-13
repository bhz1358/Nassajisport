// Fans rate Nassaji's players and coach (1–10) after each match: a poll opens by itself when
// the match is over and closes 48 hours after kick-off. After that it stays on the site to be seen
// (each fan's own scores and the averages) but can't be changed.

import crypto from "node:crypto";
import { faNum } from "./format";
import { getLeague } from "./league";
import { fixtureKey } from "./predict-score.ts";
import { bestPlayer, cleanScores, results, type Candidate, type RatingVote } from "./ratings-calc.ts";
import { HOME_TEAM } from "./site";
import { getSquad } from "./squad";
import { fixtureOf, getReports } from "./match-reports";
import { readStore, writeStore } from "./store";
import type { Fixture } from "./types";

/** Fans may rate for this long after kick-off. */
export const POLL_HOURS = 48;
const HOUR = 3_600_000;

export type Poll = {
  key: string;
  /** "نساجی مازندران - ملوان" */
  match: string;
  opponent: string;
  score?: string;
  round?: number;
  kickoff: string;
  openedAt: string;
  closesAt: string;
  candidates: Candidate[];
  /** Fans were told in Bale. */
  notified?: boolean;
  /** Reopened by the admin: the 48-hour limit doesn't apply. */
  reopened?: boolean;
  /** Candidates the admin removed: the match sheet doesn't bring them back. */
  dropped?: string[];
};

export const getPolls = () => readStore<Poll[]>("rating-polls", () => []);
export const savePolls = (p: Poll[]) => writeStore("rating-polls", p);
export const getVotes = () => readStore<RatingVote[]>("rating-votes", () => []);

/** Open until its closing time, and never more than 48 hours after kick-off (unless reopened). */
export const isOpenPoll = (p: Poll, now = Date.now()) =>
  Date.parse(p.closesAt) > now && (!!p.reopened || Date.parse(p.kickoff) + POLL_HOURS * HOUR > now);
const isClub = (t: string) => t === HOME_TEAM || t.includes("نساجی");

const norm = (s: string) => s.replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/[\s‌]+/g, " ").trim();

/**
 * Who can be rated: the lineup entered for this match (starters and substitutes) when there is
 * one, otherwise the whole squad; and the head coach. Photos come from the squad.
 */
export function candidatesFor(f: Fixture): Candidate[] {
  const squad = getSquad();
  const byName = new Map(squad.players.map((p) => [norm(p.name), p]));
  const bySlug = new Map(squad.players.map((p) => [p.slug, p]));
  const lu = squad.lineup;
  const near = lu && Math.abs(Date.parse(lu.date) - Date.parse(f.date)) < 3 * 86_400_000;
  const side = near ? [lu!.home, lu!.away].find((t) => isClub(t.team)) : undefined;
  const list: Candidate[] = [];
  const seen = new Set<string>();
  const add = (name: string, number?: number, slug?: string) => {
    const p = (slug && bySlug.get(slug)) || byName.get(norm(name));
    const id = p?.slug ?? `n-${crypto.createHash("sha1").update(norm(name)).digest("hex").slice(0, 8)}`;
    if (seen.has(id)) return;
    seen.add(id);
    list.push({ id, name: p?.name ?? name, number: number || p?.number, slug: p?.slug, photo: p?.photo, role: "player" });
  };
  // The official match sheet (گزارش بازی) comes first, then the lineup editor, then the squad.
  const key = fixtureKey(f);
  const report = getReports().find((r) => {
    const rf = fixtureOf(r);
    return rf && fixtureKey(rf) === key;
  });
  const sheet = report && [report.home, report.away].find((t) => isClub(t.team));
  if (sheet && sheet.starters.length) for (const p of [...sheet.starters, ...sheet.subs]) add(p.name, p.number);
  else if (side && side.starters.length) for (const p of [...side.starters, ...side.substitutes]) add(p.name, p.number, p.slug);
  else for (const p of [...squad.players].sort((a, b) => a.number - b.number)) add(p.name, p.number, p.slug);
  const staff = squad.staff.find((s) => /سرمربی/.test(s.role));
  const coachName = sheet?.staff.find((s) => /سرمربی/.test(s.role))?.name || side?.coach || staff?.name;
  if (coachName) {
    const photo = staff && norm(staff.name) === norm(coachName) ? staff.photo : undefined;
    list.push({ id: "coach", name: coachName, photo, role: "coach" });
  }
  return list;
}

/**
 * Opens a poll for a finished Nassaji match still inside its 48 hours, and keeps the candidates of
 * open polls in step with the match sheet (added or corrected after the poll opened); someone who
 * already has scores stays on the list.
 */
export function openDuePolls(now = Date.now()): Poll[] {
  const polls = getPolls();
  const have = new Set(polls.map((p) => p.key));
  const fixtures = getLeague().fixtures;
  const fresh: Poll[] = [];
  for (const f of fixtures) {
    if (f.status !== "finished" || !(isClub(f.home) || isClub(f.away))) continue;
    const key = fixtureKey(f);
    const age = now - Date.parse(f.date);
    if (have.has(key) || age < 0 || age > POLL_HOURS * HOUR) continue;
    fresh.push(newPoll(f, now));
  }
  let changed = fresh.length > 0;
  const votes = getVotes();
  const next = polls.map((p) => {
    if (!isOpenPoll(p, now)) return p;
    const f = fixtures.find((x) => fixtureKey(x) === p.key);
    if (!f) return p;
    const rated = new Set(votes.filter((v) => v.poll === p.key).flatMap((v) => Object.keys(v.scores)));
    const gone = new Set(p.dropped ?? []);
    const now_ = candidatesFor(f).filter((c) => !gone.has(c.id));
    const ids = new Set(now_.map((c) => c.id));
    const candidates = [...now_, ...p.candidates.filter((c) => rated.has(c.id) && !ids.has(c.id))];
    if (JSON.stringify(candidates) === JSON.stringify(p.candidates)) return p;
    changed = true;
    return { ...p, candidates };
  });
  if (changed) savePolls([...next, ...fresh]);
  return fresh;
}

export function newPoll(f: Fixture, now = Date.now()): Poll {
  return {
    key: fixtureKey(f),
    match: `${f.home} - ${f.away}`,
    opponent: isClub(f.home) ? f.away : f.home,
    ...(f.homeScore != null ? { score: `${f.home} ${faNum(f.homeScore)} - ${faNum(f.awayScore!)} ${f.away}` } : {}),
    ...(f.round ? { round: f.round } : {}),
    kickoff: f.date,
    openedAt: new Date(now).toISOString(),
    closesAt: new Date(Math.max(now, Date.parse(f.date) + POLL_HOURS * HOUR)).toISOString(),
    candidates: candidatesFor(f),
  };
}

/** The poll to show: the open one, else the latest closed one. */
export function currentPoll(now = Date.now()): Poll | undefined {
  const polls = [...getPolls()].sort((a, b) => b.kickoff.localeCompare(a.kickoff));
  return polls.find((p) => isOpenPoll(p, now)) ?? polls[0];
}

export const latestClosedPoll = (now = Date.now()) =>
  [...getPolls()].filter((p) => !isOpenPoll(p, now)).sort((a, b) => b.kickoff.localeCompare(a.kickoff))[0];

export const pollVotes = (key: string) => getVotes().filter((v) => v.poll === key);
export const pollResults = (p: Poll) => results(p.candidates, pollVotes(p.key));
export const pollBest = (p: Poll) => bestPlayer(p.candidates, pollVotes(p.key));

/** Saves (or replaces) a fan's ratings while the poll is open; returns how many were rated. */
export function saveRatings(fanId: string, key: string, raw: Record<string, unknown>): number {
  const poll = getPolls().find((p) => p.key === key);
  if (!poll || !isOpenPoll(poll)) return -1;
  const scores = cleanScores(raw, poll.candidates);
  const n = Object.keys(scores).length;
  if (!n) return 0;
  const others = getVotes().filter((v) => !(v.poll === key && v.fanId === fanId));
  writeStore("rating-votes", [...others, { poll: key, fanId, scores, at: new Date().toISOString() }]);
  return n;
}

/** Season: each player's average over all polls and how many times they were the fans' best. */
export function seasonRatings() {
  const votes = getVotes();
  const now = Date.now();
  const rows = new Map<string, { id: string; name: string; photo?: string; role: Candidate["role"]; sum: number; count: number; best: number; matches: number }>();
  for (const p of getPolls()) {
    const pv = votes.filter((v) => v.poll === p.key);
    for (const r of results(p.candidates, pv)) {
      if (!r.count) continue;
      const row = rows.get(r.id) ?? { id: r.id, name: r.name, photo: r.photo, role: r.role, sum: 0, count: 0, best: 0, matches: 0 };
      row.sum += r.avg * r.count;
      row.count += r.count;
      row.matches += 1;
      rows.set(r.id, row);
    }
    if (!isOpenPoll(p, now)) {
      const b = bestPlayer(p.candidates, pv);
      if (b && rows.get(b.id)) rows.get(b.id)!.best += 1;
    }
  }
  return [...rows.values()]
    .map((r) => ({ ...r, avg: Math.round((r.sum / r.count) * 10) / 10 }))
    .sort((a, b) => b.best - a.best || b.avg - a.avg);
}

/** A squad photo may have been added after the poll opened: use the current one. */
export function photoOf(c: Candidate): string | undefined {
  const squad = getSquad();
  if (c.role === "coach") return squad.staff.find((s) => /سرمربی/.test(s.role))?.photo ?? c.photo;
  return (c.slug && squad.players.find((p) => p.slug === c.slug)?.photo) || squad.players.find((p) => norm(p.name) === norm(c.name))?.photo || c.photo;
}
