// Admin login protection beyond the per-address brake in lib/auth.ts:
// - an account is locked for 15 minutes after 6 wrong passwords (from any address);
// - every attempt is logged (last 100) and shown in the panel («امنیت ورود»);
// - a successful login, and a lock, are reported to the admin's Bale chat (the backup chat).

import { hasBaleToken, sendBale } from "./bale-login";
import { backupState } from "./backup";
import { faDate } from "./format";
import { readStore, writeStore } from "./store";

const LOCK_AFTER = 6;
const LOCK_MS = 15 * 60_000;

export type LoginEvent = { at: string; user: string; ip: string; ok: boolean; why?: string; ua?: string };
type Guard = { fails: Record<string, { n: number; until: number }>; log: LoginEvent[]; knownIps: Record<string, string[]> };

const state = () => readStore<Guard>("login-guard", () => ({ fails: {}, log: [], knownIps: {} }));
const save = (g: Guard) => writeStore("login-guard", g);
const key = (u: string) => u.trim().toLowerCase();

export const loginLog = () => state().log;

/** Minutes left on this account's lock, or 0. */
export function accountLocked(user: string): number {
  const f = state().fails[key(user)];
  return f && f.n >= LOCK_AFTER && f.until > Date.now() ? Math.ceil((f.until - Date.now()) / 60_000) : 0;
}

function log(g: Guard, e: LoginEvent) {
  g.log = [e, ...g.log].slice(0, 100);
}

async function tellAdmin(text: string) {
  if (!hasBaleToken()) return;
  for (const c of backupState().chats) await sendBale(c.id, text).catch(() => undefined);
}

/** A failed attempt (wrong password, captcha or a locked account). */
export async function recordFailure(user: string, ip: string, why: string, ua?: string, countsForLock = true) {
  const g = state();
  const k = key(user);
  if (countsForLock && k) {
    const f = g.fails[k];
    const fresh = !f || f.until < Date.now();
    g.fails[k] = { n: fresh ? 1 : f.n + 1, until: Date.now() + LOCK_MS };
    if (g.fails[k].n === LOCK_AFTER) {
      log(g, { at: new Date().toISOString(), user, ip, ok: false, why: "حساب ۱۵ دقیقه قفل شد", ua });
      save(g);
      await tellAdmin(`⚠️ پنل نساجی اسپرت: حساب «${user}» بعد از ${LOCK_AFTER} رمز اشتباه، ۱۵ دقیقه قفل شد.\nآخرین تلاش از: ${ip}`);
      return;
    }
  }
  log(g, { at: new Date().toISOString(), user, ip, ok: false, why, ua });
  save(g);
}

/** A successful login: clears the account's failures; a login from a new address is reported. */
export async function recordSuccess(user: string, ip: string, ua?: string) {
  const g = state();
  const k = key(user);
  delete g.fails[k];
  const known = g.knownIps[k] ?? [];
  const isNew = !known.includes(ip);
  g.knownIps[k] = [ip, ...known.filter((x) => x !== ip)].slice(0, 20);
  log(g, { at: new Date().toISOString(), user, ip, ok: true, ua });
  save(g);
  if (isNew) await tellAdmin(`🔐 ورود به پنل نساجی اسپرت\nکاربر: ${user}\nنشانی: ${ip}\nزمان: ${faDate(new Date().toISOString())}\n\nاگر این ورود از طرف شما نبود، فوراً رمز را عوض کنید و «خروج از همهٔ دستگاه‌ها» را بزنید.`);
}
