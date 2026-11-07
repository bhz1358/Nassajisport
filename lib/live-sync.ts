import { getLeague, saveLeague } from "./league";
import { DEFAULT_LIVE, FOOTBALLI_URL, liveWindowOpen, mergeLive, readFeed, type LiveSettings } from "./live-scores.ts";

export const liveSettings = (): LiveSettings => ({ ...DEFAULT_LIVE, ...(getLeague().live ?? {}) });

/** Fetches Footballi's match list and updates this league's fixtures. */
export async function syncLive(): Promise<{ ok: true; changes: string[]; matches: number } | { ok: false; error: string }> {
  let json: unknown;
  try {
    const res = await fetch(process.env.FOOTBALLI_URL || FOOTBALLI_URL, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36", Accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
    if (!res.ok) return { ok: false, error: `فوتبالی جواب نداد (HTTP ${res.status}).` };
    json = await res.json();
  } catch (e) {
    return { ok: false, error: `اتصال به فوتبالی برقرار نشد (${(e as Error).message}).` };
  }
  const feed = readFeed(json);
  if (!feed.length) return { ok: false, error: "در پاسخ فوتبالی بازی‌ای پیدا نشد؛ شاید ساختار سایتشان عوض شده." };
  // Read the league again after the network wait, so edits made meanwhile are kept.
  const { league, changes } = mergeLive(getLeague(), feed);
  const live = { ...liveSettings(), lastSync: new Date().toISOString(), lastError: undefined, ...(changes.length ? { lastChanges: changes } : {}) };
  saveLeague({ ...league, live });
  return { ok: true, changes, matches: feed.length };
}

let running = false;

/** Called on page views: during match time, refreshes scores in the background. */
export function maybeLiveSync() {
  if (running) return;
  const league = getLeague();
  const settings = liveSettings();
  if (!liveWindowOpen(league, settings)) return;
  running = true;
  // Mark the attempt first so a slow or failing Footballi isn't asked on every request.
  saveLeague({ ...league, live: { ...settings, lastSync: new Date().toISOString() } });
  syncLive()
    .then((r) => {
      if (!r.ok) saveLeague({ ...getLeague(), live: { ...liveSettings(), lastError: r.error } });
    })
    .catch(() => {})
    .finally(() => {
      running = false;
    });
}
