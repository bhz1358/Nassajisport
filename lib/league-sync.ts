import { getLeague, saveLeague, sortStandings } from "./league";
import { parseStandings } from "./standings-import.ts";
import type { StandingRow } from "./types";

const AUTO_EVERY_MS = 30 * 60_000;
const MIN_TEAMS = 8;

/** Replaces the table with imported rows, keeping each team's form guide and the old table for undo. */
export function applyStandings(rows: StandingRow[]) {
  const league = getLeague();
  const formByTeam = new Map(league.standings.map((r) => [r.team, r.form]));
  const merged = rows.map((r) => ({ ...r, ...(formByTeam.get(r.team) ? { form: formByTeam.get(r.team) } : {}) }));
  saveLeague({ ...league, previousStandings: league.standings, standings: sortStandings(merged), isSample: false });
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
