import "./net-tuning.ts";
import { getLeague, saveLeague, sortStandings } from "./league";
import { parseStandings } from "./standings-import.ts";
import { canonicalTeam } from "./team-names.ts";
import type { StandingRow } from "./types";

const AUTO_EVERY_MS = 30 * 60_000;
const MIN_TEAMS = 8;

/** Replaces the table with imported rows, keeping each team's form guide and the old table for undo. */
export function applyStandings(rows: StandingRow[]): string[] {
  const league = getLeague();
  // Other sites shorten names ("استقلال خ", "نساجی م"): use the names this site already
  // has, so logos, fixtures and the club's highlighted row keep matching.
  // Names in the fixtures and logos come first: a short name that slipped into an older
  // table must not keep itself alive by matching exactly.
  const primary = [...league.fixtures.flatMap((f) => [f.home, f.away]), ...Object.keys(league.teamLogos ?? {})];
  const all = [...primary, ...league.standings.map((r) => r.team), ...(league.previousStandings ?? []).map((r) => r.team)];
  const renamed: string[] = [];
  const used = new Set<string>();
  rows = rows.map((r) => {
    let team = primary.length ? canonicalTeam(r.team, primary) : r.team;
    if (team === r.team) team = canonicalTeam(r.team, all);
    if (used.has(team)) return r; // two rows can't become one team; keep the source's name
    used.add(team);
    if (team !== r.team) renamed.push(`${r.team} ← ${team}`);
    return team === r.team ? r : { ...r, team };
  });
  // A form guide kept from an older table goes stale; without the source's own, the
  // «last five» symbols come from the match results when the page is shown (lib/results-table.ts).
  saveLeague({ ...league, previousStandings: league.standings, standings: sortStandings(rows), isSample: false });
  return renamed;
}

export async function syncFromUrl(url: string): Promise<{ ok: true; count: number; warnings: string[] } | { ok: false; error: string }> {
  let html: string;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36", "Accept-Language": "fa" },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return { ok: false, error: `سایت جواب نداد (HTTP ${res.status}).` };
    html = await res.text();
  } catch (e) {
    return { ok: false, error: `اتصال به سایت برقرار نشد (${(e as Error).message}).` };
  }
  const { rows, warnings } = parseStandings(html);
  if (rows.length < MIN_TEAMS) {
    return {
      ok: false,
      error:
        rows.length === 0
          ? "جدولی در این صفحه پیدا نشد. احتمالاً سایت جدول را با جاوااسکریپت می‌سازد؛ از روش «کپی و چسباندن» استفاده کنید."
          : `فقط ${rows.length} تیم خوانده شد؛ برای اطمینان جدول ذخیره نشد.`,
    };
  }
  applyStandings(rows);
  return { ok: true, count: rows.length, warnings };
}

let running = false;

/** Called on page views: refreshes in the background when auto-sync is on and the table is stale. */
export function maybeAutoSync() {
  const src = getLeague().standingsSource;
  if (!src?.auto || !src.url || running) return;
  const last = src.lastSync ? Date.parse(src.lastSync) : 0;
  if (Date.now() - last < AUTO_EVERY_MS) return;
  running = true;
  // Mark the attempt first so a slow or failing site is not hit on every request.
  saveLeague({ ...getLeague(), standingsSource: { ...src, lastSync: new Date().toISOString() } });
  syncFromUrl(src.url)
    .then((r) => {
      const league = getLeague();
      saveLeague({
        ...league,
        standingsSource: { ...src, lastSync: new Date().toISOString(), lastError: r.ok ? undefined : r.error },
      });
    })
    .catch(() => {})
    .finally(() => {
      running = false;
    });
}
