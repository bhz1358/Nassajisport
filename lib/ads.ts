import { readStore, writeStore } from "./store";

// Four ad slots (see the approved layout):
//   1 top banner · 2 sidebar box · 3 in-content · 4 tall sidebar
export type AdSlotId = 1 | 2 | 3 | 4;

export const AD_SLOTS: { id: AdSlotId; name: string; size: string; mobileSize?: string }[] = [
  { id: 1, name: "بنر سرصفحه", size: "1200×120", mobileSize: "320×100" },
  { id: 2, name: "ستون کناری", size: "300×250" },
  { id: 3, name: "میان محتوا / داخل متن خبر", size: "970×150", mobileSize: "320×100" },
  { id: 4, name: "ستون کناری بلند", size: "300×600" },
];

export type Ad = {
  id: string;
  slot: AdSlotId;
  /** Advertiser or campaign name; also the image's alt text. */
  title: string;
  image: string;
  mobileImage?: string;
  url: string;
  /** ISO dates; outside this window the ad is not shown. */
  start?: string;
  end?: string;
  enabled: boolean;
  createdAt: string;
};

type Stats = Record<string, { impressions: number; clicks: number }>;

export function getAds(): Ad[] {
  return readStore<Ad[]>("ads", () => []);
}

export function saveAds(ads: Ad[]) {
  writeStore("ads", ads);
}

export function isRunning(ad: Ad, now = new Date()): boolean {
  if (!ad.enabled) return false;
  if (ad.start && new Date(ad.start) > now) return false;
  if (ad.end && new Date(ad.end) < now) return false;
  return true;
}

/** One running ad for the slot; several in the same slot take turns at random. */
export function pickAd(slot: AdSlotId): Ad | undefined {
  const running = getAds().filter((a) => a.slot === slot && isRunning(a));
  return running.length ? running[Math.floor(Math.random() * running.length)] : undefined;
}

// Counting every page view straight to disk would mean a file write per visit, so
// counts are kept in memory and written out at most once a minute.
const pending: Stats = {};
let timer: NodeJS.Timeout | undefined;

function bump(id: string, field: "impressions" | "clicks") {
  pending[id] ??= { impressions: 0, clicks: 0 };
  pending[id][field]++;
  if (!timer) {
    timer = setTimeout(flushAdStats, 60_000);
    timer.unref?.();
  }
}

export function flushAdStats() {
  timer = undefined;
  const ids = Object.keys(pending);
  if (!ids.length) return;
  const stats = readStore<Stats>("ad-stats", () => ({}));
  const next: Stats = { ...stats };
  for (const id of ids) {
    const cur = next[id] ?? { impressions: 0, clicks: 0 };
    next[id] = { impressions: cur.impressions + pending[id].impressions, clicks: cur.clicks + pending[id].clicks };
    delete pending[id];
  }
  writeStore("ad-stats", next);
}

export const countImpression = (id: string) => bump(id, "impressions");
/**
 * Clicks are few, and the click route may run in a different server worker than the
 * pages, so each click is written to disk right away instead of waiting in memory.
 */
export function countClick(id: string) {
  const stats = readStore<Stats>("ad-stats", () => ({}));
  const cur = stats[id] ?? { impressions: 0, clicks: 0 };
  writeStore("ad-stats", { ...stats, [id]: { ...cur, clicks: cur.clicks + 1 } });
}

/** Saved counts plus what has not been written out yet. */
export function getAdStats(): Stats {
  const stats = { ...readStore<Stats>("ad-stats", () => ({})) };
  for (const [id, p] of Object.entries(pending)) {
    const cur = stats[id] ?? { impressions: 0, clicks: 0 };
    stats[id] = { impressions: cur.impressions + p.impressions, clicks: cur.clicks + p.clicks };
  }
  return stats;
}

export const safeAdUrl = (u: string) => /^https?:\/\/[^\s]+$/i.test(u);
