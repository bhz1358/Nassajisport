// Bale reminders for the prediction contest: before matches a fan hasn't predicted, and a
// summary when a week is over. Run by the scheduler (instrumentation.ts) every few minutes.

import { hasBaleToken, pollBale, sendBale, siteUrl } from "./bale-login";
import { fanChat, getFans } from "./fans";
import { faNum, faTime } from "./format";
import { getLeague } from "./league";
import { getPredictions } from "./predictions";
import { dueReminders, tehranDay, weekOver, weekSummaries, type ReminderFan } from "./reminder-plan.ts";
import { readStore, writeStore } from "./store";
import { currentWeek } from "./weeks";
import { getPolls, isOpenPoll, openDuePolls, savePolls } from "./ratings";

export type ReminderState = {
  /** Reminders on for the whole site (the admin's switch). */
  enabled: boolean;
  /** `${fanId}|${tehranDay}` → when sent. */
  days: Record<string, string>;
  /** Weeks whose summary went out (or were over before reminders started). */
  weeks: number[];
  log: { at: string; text: string }[];
  lastRun?: string;
};

export const reminderState = () =>
  readStore<ReminderState>("reminders", () => {
    // Weeks already over when reminders start get no summary.
    const fixtures = getLeague().fixtures;
    const current = currentWeek(fixtures);
    const weeks = [...new Set(fixtures.map((f) => f.round).filter((r): r is number => !!r))].filter((w) => weekOver(fixtures, w, current));
    return { enabled: true, days: {}, weeks, log: [] };
  });
const saveState = (s: ReminderState) => writeStore("reminders", s);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const footer = "\n\nبرای خاموش کردن یادآوری‌ها «توقف» را بفرستید.";

let running = false;

/** One round: read the bot's messages, then send what is due. Returns how many messages went out. */
export async function runReminders(now = Date.now()): Promise<number> {
  if (running || !hasBaleToken()) return 0;
  running = true;
  try {
    await pollBale(true);
    const state = reminderState();
    state.lastRun = new Date(now).toISOString();
    if (!state.enabled) {
      saveState(state);
      return 0;
    }
    const league = getLeague();
    const fans = getFans();
    const rfans: ReminderFan[] = fans.map((f) => ({ id: f.id, name: f.name, blocked: f.blocked, chat: fanChat(f), remind: f.remind }));
    const preds = getPredictions();
    const site = siteUrl();
    let sent = 0;

    // Before matches
    for (const r of dueReminders(league.fixtures, rfans, preds, new Set(Object.keys(state.days)), now)) {
      const lines = r.matches.map((f) => `• ${f.home} – ${f.away} (ساعت ${faTime(f.date)})`).join("\n");
      const text = `⏰ یادآوری مسابقهٔ پیش‌بینی نساجی اسپرت\n\nاین بازی‌ها را هنوز پیش‌بینی نکرده‌اید:\n${lines}\n\nپیش‌بینی هر بازی تا لحظهٔ شروعش باز است${site ? `:\n${site}/predict/` : "."}${footer}`;
      try {
        await sendBale(r.fan.chat!, text);
        sent++;
      } catch {
        /* blocked the bot, or Bale is unreachable: don't retry this day */
      }
      state.days[`${r.fan.id}|${r.day}`] = new Date(now).toISOString();
      await sleep(80);
    }
    if (sent) state.log.unshift({ at: new Date(now).toISOString(), text: `یادآوری پیش از بازی برای ${faNum(sent)} نفر` });

    // Player ratings: a poll opens when a Nassaji match is over; tell the fans once.
    openDuePolls(now);
    const polls = getPolls();
    const fresh = polls.filter((p) => !p.notified && isOpenPoll(p, now));
    for (const p of fresh) {
      let n = 0;
      const text =
        `⭐ بازی ${p.score ?? p.match} تمام شد!\n\nبه بازیکنان و سرمربی نساجی از ۱ تا ۱۰ نمره بدهید؛ بازیکن برتر به انتخاب هواداران در صفحهٔ اول سایت معرفی می‌شود.` +
        (site ? `\n${site}/ratings/` : "") +
        `\n\nنمره‌دهی تا ۲۴ ساعت باز است.${footer}`;
      for (const f of rfans.filter((x) => x.chat && x.remind !== false && !x.blocked)) {
        try {
          await sendBale(f.chat!, text);
          n++;
        } catch {
          /* skip */
        }
        await sleep(80);
      }
      sent += n;
      state.log.unshift({ at: new Date(now).toISOString(), text: `دعوت به نمره‌دهی (${p.opponent}) برای ${faNum(n)} نفر` });
    }
    if (fresh.length) savePolls(polls.map((p) => (fresh.some((x) => x.key === p.key) ? { ...p, notified: true } : p)));

    // After a week
    const current = currentWeek(league.fixtures);
    const weeks = [...new Set(league.fixtures.map((f) => f.round).filter((r): r is number => !!r))];
    for (const week of weeks) {
      if (state.weeks.includes(week) || !weekOver(league.fixtures, week, current)) continue;
      let n = 0;
      for (const s of weekSummaries(league.fixtures, week, rfans, preds)) {
        const best = s.best.fanId === s.fan.id ? "🥇 شما برترین پیش‌بینی‌کنندهٔ این هفته شدید!" : `🥇 برترین هفته: ${s.best.name} با ${faNum(s.best.points)} امتیاز`;
        const text =
          `🏁 هفتهٔ ${faNum(week)} لیگ برتر تمام شد!\n\n` +
          `امتیاز شما در این هفته: ${faNum(s.points)}${s.exact ? ` (${faNum(s.exact)} نتیجهٔ دقیق)` : ""}\n` +
          `رتبهٔ شما در هفته: ${faNum(s.weekRank)} از ${faNum(s.weekPlayers)} نفر\n` +
          `رتبهٔ شما در فصل: ${faNum(s.seasonRank)} با ${faNum(s.seasonPoints)} امتیاز\n` +
          `${best}` +
          (site ? `\n\nجدول کامل هفته:\n${site}/predict/table/?week=${week}\nپیش‌بینی هفتهٔ بعد:\n${site}/predict/` : "") +
          footer;
        try {
          await sendBale(s.fan.chat!, text);
          n++;
        } catch {
          /* skip this fan */
        }
        await sleep(80);
      }
      state.weeks.push(week);
      sent += n;
      state.log.unshift({ at: new Date(now).toISOString(), text: `خلاصهٔ هفتهٔ ${faNum(week)} برای ${faNum(n)} نفر` });
    }

    // Forget days older than a week; keep the log short.
    const cutoff = tehranDay(now - 7 * 86_400_000);
    state.days = Object.fromEntries(Object.entries(state.days).filter(([k]) => k.split("|")[1] >= cutoff));
    state.log = state.log.slice(0, 20);
    saveState(state);
    return sent;
  } finally {
    running = false;
  }
}
