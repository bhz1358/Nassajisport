// When the nightly Bale backup is due. Pure, so it is tested directly.

export const BACKUP_HOUR = 3; // Tehran time

export const tehranDay = (t: number) => new Date(t).toLocaleDateString("en-CA", { timeZone: "Asia/Tehran" });
const tehranHour = (t: number) => Number(new Date(t).toLocaleString("en-US", { timeZone: "Asia/Tehran", hour: "numeric", hourCycle: "h23" }));

/** From 3 a.m. Tehran, once a day; a failed attempt is retried after an hour. */
export function nightlyDue(s: { enabled: boolean; chats: unknown[]; lastDay?: string; lastTry?: string }, now: number, hasToken: boolean): boolean {
  if (!s.enabled || !s.chats.length || !hasToken) return false;
  if (tehranHour(now) < BACKUP_HOUR || s.lastDay === tehranDay(now)) return false;
  return !(s.lastTry && now - Date.parse(s.lastTry) < 3_600_000);
}
