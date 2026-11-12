// Sends a Nassaji result's story card to the admins' Bale chats (the backup recipients)
// once, when the match is over; and on demand from the panel.

import { backupState } from "./backup";
import { hasBaleToken, sendBalePhoto } from "./bale-login";
import { faNum } from "./format";
import { getLeague } from "./league";
import { fixtureKey } from "./predict-score.ts";
import { HOME_TEAM } from "./site";
import { readStore, writeStore } from "./store";
import { cachedStoryCard } from "./story-card";
import type { Fixture } from "./types";

const sentList = () => readStore<string[]>("stories-sent", () => []);
const stamp = (f: Fixture) => `${fixtureKey(f)}|${f.homeScore}-${f.awayScore}`;
const isClub = (f: Fixture) => f.home === HOME_TEAM || f.away === HOME_TEAM;

export async function sendStory(f: Fixture): Promise<{ ok: boolean; message: string }> {
  const chats = backupState().chats;
  if (!hasBaleToken()) return { ok: false, message: "توکن بازوی بله تنظیم نشده است." };
  if (!chats.length) return { ok: false, message: "گیرنده‌ای ثبت نشده؛ از «پشتیبان در بله» گفت‌وگوی خودتان را ثبت کنید." };
  const img = await cachedStoryCard(f);
  const score = f.homeScore != null ? ` ${faNum(f.homeScore)} - ${faNum(f.awayScore!)} ` : " - ";
  const caption = `📲 کارت استوری: ${f.home}${score}${f.away}${f.round ? ` (هفتهٔ ${faNum(f.round)})` : ""}\nبرای انتشار در اینستاگرام، تلگرام یا بله.`;
  let sent = 0;
  let error = "";
  for (const c of chats) {
    try {
      await sendBalePhoto(c.id, img, `nassajisport-story-${f.date.slice(0, 10)}.jpg`, caption);
      sent++;
    } catch (e) {
      error = (e as Error).message;
    }
  }
  return sent ? { ok: true, message: `کارت برای ${faNum(sent)} گیرنده در بله فرستاده شد.` } : { ok: false, message: error || "ارسال نشد." };
}

/** Each Nassaji match that ended in the last 12 hours: its card goes out once. */
export async function sendFinishedStories(now = Date.now()) {
  if (!hasBaleToken() || !backupState().chats.length) return;
  const done = new Set(sentList());
  const due = getLeague().fixtures.filter(
    (f) => isClub(f) && f.status === "finished" && f.homeScore != null && now - Date.parse(f.date) < 12 * 3_600_000 && !done.has(stamp(f)),
  );
  for (const f of due) {
    const r = await sendStory(f);
    if (r.ok) writeStore("stories-sent", [...sentList(), stamp(f)].slice(-100));
  }
}
