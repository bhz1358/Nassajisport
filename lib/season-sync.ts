import "./net-tuning.ts";
import { getLeague, saveLeague } from "./league";
import type { FeedMatch } from "./live-scores.ts";
import { mergeSeason, readFixturesPage } from "./season-import.ts";

const API = () => (process.env.FOOTBALLI_API || "https://api.footballi.net/api/v2/").replace(/\/?$/, "/");
const MAX_PAGES = 40; // 20 matches a page: far more than a season
const DAILY = 24 * 3_600_000;

async function getJson(path: string): Promise<unknown> {
  const res = await fetch(API() + path, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36", Accept: "application/json" },
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`فوتبالی جواب نداد (HTTP ${res.status}).`);
  return res.json();
}

/** Every match of the competition: the current page, then back to week 1 and forward to the last scheduled week. */
async function fetchSeason(competition: number): Promise<FeedMatch[]> {
  const base = `competitions/${competition}/fixtures`;
  const first = readFixturesPage(await getJson(base));
  const all = new Map(first.matches.map((m) => [m.id, m]));
  for (const dir of ["previous", "next"] as const) {
    let cursor = first[dir];
    for (let n = 0; cursor && n < MAX_PAGES; n++) {
      const page = readFixturesPage(await getJson(`${base}?cursor=${encodeURIComponent(cursor)}`));
      const before = all.size;
      page.matches.forEach((m) => all.set(m.id, m));
      // Stop when a page brings nothing new (a cursor that loops).
      if (all.size === before) break;
      cursor = page[dir];
    }
  }
  return [...all.values()];
}

export type SeasonSource = { competition: number; auto: boolean; lastSync?: string; lastError?: string; lastResult?: string };
export const seasonSource = (): SeasonSource => ({ competition: 14, auto: true, ...(getLeague().seasonSource ?? {}) });

/** Reads the whole season from Footballi and merges it into the fixtures. */
export async function syncSeason(competition = seasonSource().competition): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  let matches: FeedMatch[];
  try {
    matches = await fetchSeason(competition);
  } catch (e) {
    const msg = (e as Error).message;
    return { ok: false, error: msg.startsWith("فوتبالی") ? msg : `اتصال به فوتبالی برقرار نشد (${msg}).` };
  }
  if (!matches.length) return { ok: false, error: "فوتبالی برای این رقابت بازی‌ای برنگرداند؛ شماره‌ی رقابت را بررسی کنید." };
  // The league is read again after the network wait, so edits made meanwhile are kept.
  const r = mergeSeason(getLeague(), matches);
  const weeks = new Set(matches.map((m) => m.round).filter(Boolean)).size;
  const message = `${matches.length} بازی در ${weeks} هفته خوانده شد: ${r.added} بازی تازه، ${r.updated} بازی به‌روز شد.${r.skipped.length ? ` تیم ناشناخته (رد شد): ${r.skipped.join("، ")}` : ""}`;
  saveLeague({ ...r.league, seasonSource: { ...seasonSource(), competition, lastSync: new Date().toISOString(), lastError: undefined, lastResult: message } });
  return { ok: true, message };
}

let running = false;

/** Called on page views: once a day, refreshes the schedule (times, results, new weeks). */
export function maybeSeasonSync() {
  const src = seasonSource();
  if (!src.auto || running) return;
  if (src.lastSync && Date.now() - Date.parse(src.lastSync) < DAILY) return;
  running = true;
  saveLeague({ ...getLeague(), seasonSource: { ...src, lastSync: new Date().toISOString() } });
  syncSeason(src.competition)
    .then((r) => {
      if (!r.ok) saveLeague({ ...getLeague(), seasonSource: { ...seasonSource(), lastError: r.error } });
    })
    .catch(() => {})
    .finally(() => {
      running = false;
    });
}
