import { jalaliPartsToIso, toLatinDigits } from "./jalali.ts";
import { HOME_TEAM } from "./site.ts";
import type { Fixture } from "./types";

// Reads a fixture list copied from a sports site's schedule page (Varzesh3 layout):
//
//   12 هفته            ← matchweek
//   1405/08/14         ← date (Jalali), applies to the matches below it
//   16:30              ← kick-off, starts a match
//   شمس آذر قزوین      ← home team (often printed twice)
//   0 / - / 1          ← score, or just "-" when not played yet
//   صنعت نفت آبادان    ← away team (often printed twice)
//   خلاصه بازی         ← links and other labels are ignored

const norm = (s: string) =>
  toLatinDigits(s)
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[‌‏‎]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const ROUND = /^(?:(\d{1,2})\s*هفته|هفته\s*(\d{1,2})(?:م)?)$/;
const DATE = /^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/;
const TIME = /^(\d{1,2}):(\d{2})$/;
const SCORE_INLINE = /^(\d{1,2})\s*[-–:]\s*(\d{1,2})$/;
// Labels that sit between matches on schedule pages.
const NOISE = /^(خلاصه بازی|پخش زنده|گزارش|آمار|ویدیو|پیش بازی|زنده|بازی‌های|بازی های|برنامه|نتایج|جدول)/;

const teamName = (s: string) => (s.includes("نساجی") ? HOME_TEAM : s);

export type FixtureParse = { fixtures: Fixture[]; warnings: string[]; rounds: number[] };

export function parseFixtures(input: string): FixtureParse {
  const lines = input.split(/\r?\n/).map(norm).filter(Boolean);
  const fixtures: Fixture[] = [];
  const warnings: string[] = [];
  let round: number | undefined;
  let date: string | undefined;

  type Draft = { time: string; home?: string; away?: string; scores: number[]; sawDash: boolean };
  let d: Draft | undefined;

  const finish = () => {
    if (!d) return;
    if (!d.home || !d.away || !date) {
      warnings.push(`بازی ساعت ${d.time} کامل خوانده نشد.`);
    } else {
      const iso = jalaliPartsToIso(date, d.time);
      if (!iso) warnings.push(`تاریخ ${date} ${d.time} خوانده نشد.`);
      else {
        const played = d.scores.length === 2;
        fixtures.push({
          date: iso,
          home: teamName(d.home),
          away: teamName(d.away),
          status: played ? "finished" : "scheduled",
          ...(played ? { homeScore: d.scores[0], awayScore: d.scores[1] } : {}),
          ...(round ? { round } : {}),
        });
      }
    }
    d = undefined;
  };

  for (const line of lines) {
    const r = line.match(ROUND);
    if (r) {
      finish();
      round = Number(r[1] ?? r[2]);
      continue;
    }
    if (DATE.test(line)) {
      finish();
      date = line;
      continue;
    }
    if (TIME.test(line)) {
      finish();
      d = { time: line, scores: [], sawDash: false };
      continue;
    }
    if (!d) continue;
    const inline = line.match(SCORE_INLINE);
    if (inline && d.home && !d.away) {
      d.scores = [Number(inline[1]), Number(inline[2])];
      d.sawDash = true;
      continue;
    }
    if (/^\d{1,2}$/.test(line) && d.home && !d.away) {
      if (d.scores.length < 2) d.scores.push(Number(line));
      continue;
    }
    if (/^[-–]$/.test(line)) {
      d.sawDash = true;
      continue;
    }
    if (NOISE.test(line) || !/\p{L}/u.test(line)) continue;
    // Team names: the first is home, a repeat of it is skipped, the next different one is away.
    if (!d.home) d.home = line;
    else if (!d.away && line !== d.home) d.away = line;
  }
  finish();
  const rounds = [...new Set(fixtures.map((f) => f.round).filter((x): x is number => !!x))];
  return { fixtures, warnings, rounds };
}

const key = (f: Fixture) => `${f.round ?? ""}|${f.home}|${f.away}`;

/**
 * Merges imported fixtures into the existing list: a match with the same round and
 * teams is updated (date, score), new ones are added. With `dropUnnumbered`, old
 * matches that have no matchweek (manual or sample entries) are removed.
 */
export function mergeFixtures(existing: Fixture[], incoming: Fixture[], dropUnnumbered: boolean): Fixture[] {
  const byKey = new Map(incoming.map((f) => [key(f), f]));
  const kept = existing
    .filter((f) => !(dropUnnumbered && !f.round))
    .map((f) => {
      const update = byKey.get(key(f));
      if (!update) return f;
      byKey.delete(key(f));
      // Keep a live minute or venue typed in by hand unless the source has a final score.
      return { ...f, ...update, ...(update.status === "scheduled" && f.status === "live" ? { status: f.status, homeScore: f.homeScore, awayScore: f.awayScore, minute: f.minute } : {}) };
    });
  return [...kept, ...byKey.values()].sort((a, b) => a.date.localeCompare(b.date));
}
