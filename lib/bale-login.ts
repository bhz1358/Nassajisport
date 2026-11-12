// Sign-in through the site's bot on the Bale messenger (free; Bale verified the phone when the
// account was made). The login page shows a 6-digit code and opens ble.ir/<bot>?start=<code>;
// in the bot the fan taps «ارسال شمارهٔ من» (a contact button that only sends their own
// number); the page, polling, then signs them in. Updates are read with getUpdates only while
// someone is on the login page, so the bot needs no webhook and no HTTPS.
//
// BALE_BOT_TOKEN (in /etc/nassaji.env) is the bot's token; BALE_API can point elsewhere (tests).

import crypto from "node:crypto";
import { fetchRetry, networkReason } from "./net-tuning";
import { normalizePhone } from "./predict-score.ts";
import { readStore, writeStore } from "./store";
import { getFans, saveFans } from "./fans";
import { registerBackupChat } from "./backup";

const token = () => (process.env.BALE_BOT_TOKEN || "").trim();
const api = () => (process.env.BALE_API || "https://tapi.bale.ai").replace(/\/$/, "");
export const hasBaleToken = () => !!token();
const hide = (s: string) => (token() ? s.split(token()).join("***") : s);

const LOGIN_MS = 10 * 60_000;

export type LoginStatus = "pending" | "bale" | "done" | "expired";
type Login = { id: string; code: string; created: number; status: LoginStatus; chatId?: number; phone?: string; baleId?: number };
type BaleState = { offset?: number; botUsername?: string; logins: Login[]; lastError?: string; lastPoll?: string; siteUrl?: string };

const state = () => readStore<BaleState>("bale", () => ({ logins: [] }));
const save = (patch: Partial<BaleState>) => writeStore("bale", { ...state(), ...patch });
const live = (logins: Login[]) => logins.filter((l) => Date.now() - l.created < LOGIN_MS && l.status !== "expired");

async function call<T>(method: string, params: Record<string, unknown> = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetchRetry(`${api()}/bot${token()}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
      cache: "no-store",
      timeoutMs: 15_000,
    }, 2);
  } catch (e) {
    throw new Error(hide(`اتصال به بله برقرار نشد (${networkReason(e)}).`));
  }
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; result?: T; description?: string };
  if (!data.ok) {
    if (res.status === 401 || res.status === 403) throw new Error("توکن بازوی بله درست نیست (BALE_BOT_TOKEN را بررسی کنید).");
    throw new Error(hide(`بله خطا داد: ${data.description ?? `HTTP ${res.status}`}`));
  }
  return data.result as T;
}

/** The bot's name and username (connection test). */
export async function baleBotInfo(): Promise<{ username: string; name: string }> {
  const me = await call<{ username?: string; first_name?: string }>("getMe");
  const username = (me.username ?? "").replace(/^@/, "");
  if (username) save({ botUsername: username });
  return { username, name: me.first_name ?? "" };
}

async function botUsername(): Promise<string | undefined> {
  if (process.env.BALE_BOT_USERNAME) return process.env.BALE_BOT_USERNAME.replace(/^@/, "");
  const known = state().botUsername;
  if (known) return known;
  try {
    return (await baleBotInfo()).username || undefined;
  } catch {
    return undefined;
  }
}

/** Starts a sign-in: a secret id (kept in the browser's cookie) and the code shown on the page. */
export async function startLogin(): Promise<{ id: string; code: string; link?: string }> {
  const s = state();
  const logins = live(s.logins);
  let code = "";
  do code = String(crypto.randomInt(100000, 1000000));
  while (logins.some((l) => l.code === code));
  const id = crypto.randomBytes(18).toString("base64url");
  save({ logins: [...logins, { id, code, created: Date.now(), status: "pending" }] });
  const user = await botUsername();
  return { id, code, link: user ? `https://ble.ir/${user}?start=${code}` : undefined };
}

const faDigits = (s: string) => s.replace(/[۰-۹]/g, (c) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(c))).replace(/[٠-٩]/g, (c) => String("٠١٢٣٤٥٦٧٨٩".indexOf(c)));

type Msg = {
  message_id: number;
  date: number;
  chat: { id: number; type?: string };
  from?: { id: number };
  text?: string;
  contact?: { phone_number: string; user_id?: number };
};

const CONTACT_KEYBOARD = { keyboard: [[{ text: "📱 ارسال شمارهٔ من", request_contact: true }]], resize_keyboard: true, one_time_keyboard: true };
const HOW =
  "برای ورود، در سایت نساجی اسپرت دکمهٔ «ورود با بله» را بزنید؛ یا کد ۶ رقمی‌ای را که صفحهٔ ورود سایت نشان می‌دهد همین‌جا بفرستید.\n\nیادآوری‌های مسابقهٔ پیش‌بینی: برای خاموش کردن «توقف» و برای روشن کردن «یادآوری» را بفرستید.";
const STOP_WORDS = new Set(["توقف", "/stop", "stop", "خاموش", "لغو"]);
const ON_WORDS = new Set(["یادآوری", "/remind", "روشن"]);

/** Turns a fan's reminders on or off from the bot; false when this chat isn't a fan's. */
function setRemindByChat(chatId: number, fromId: number | undefined, on: boolean): boolean {
  const fans = getFans();
  const fan = fans.find((f) => f.baleChat === chatId || (fromId !== undefined && f.baleId === fromId));
  if (!fan) return false;
  saveFans(fans.map((f) => (f.id === fan.id ? { ...f, remind: on, baleChat: chatId } : f)));
  return true;
}

// Wrong codes typed in the bot: 5 per chat per 10 minutes.
const wrong = new Map<number, { n: number; until: number }>();

async function reply(chatId: number, text: string, markup?: object) {
  await call("sendMessage", { chat_id: chatId, text, ...(markup ? { reply_markup: markup } : {}) }).catch(() => undefined);
}

async function handle(m: Msg, logins: Login[]): Promise<void> {
  if (m.chat.type && m.chat.type !== "private") return;
  if (Date.now() / 1000 - m.date > 30 * 60) return; // old message: whatever it was for is over
  const chatId = m.chat.id;
  // «پشتیبان 123456»: an admin registering this chat for the nightly backup.
  const backup = faDigits(m.text ?? "").trim().match(/^(?:\/backup|پشتیبان)\s+(\d{6})$/i);
  if (backup) {
    const r = registerBackupChat(chatId, backup[1]);
    return reply(
      chatId,
      r === "bad"
        ? "این کد درست نیست یا منقضی شده؛ در پنل سایت، بخش «پشتیبان در بله»، کد تازه بگیرید."
        : r === "known"
          ? "این گفت‌وگو قبلاً برای دریافت پشتیبان ثبت شده است."
          : "✅ ثبت شد. از امشب حدود ساعت ۳ بامداد، فایل پشتیبان داده‌های سایت همین‌جا فرستاده می‌شود.",
    );
  }
  const word = (m.text ?? "").trim().toLowerCase();
  if (STOP_WORDS.has(word) || ON_WORDS.has(word)) {
    const on = ON_WORDS.has(word);
    if (!setRemindByChat(chatId, m.from?.id, on)) return reply(chatId, "اول با «ورود با بله» در سایت نساجی اسپرت وارد مسابقهٔ پیش‌بینی شوید.");
    return reply(
      chatId,
      on ? "🔔 یادآوری‌ها روشن شد: پیش از بازی‌هایی که پیش‌بینی نکرده‌اید و بعد از پایان هر هفته پیام می‌گیرید." : "🔕 یادآوری‌ها خاموش شد. هر وقت خواستید «یادآوری» را بفرستید.",
      { remove_keyboard: true },
    );
  }

  if (m.contact) {
    const login = logins.find((l) => l.chatId === chatId && l.status === "bale");
    if (!login) return reply(chatId, HOW, { remove_keyboard: true });
    if (m.contact.user_id !== undefined && m.from && m.contact.user_id !== m.from.id) {
      return reply(chatId, "فقط شمارهٔ خود همین حساب بله پذیرفته می‌شود؛ دکمهٔ «📱 ارسال شمارهٔ من» را در پایین صفحه بزنید.", CONTACT_KEYBOARD);
    }
    const phone = normalizePhone(m.contact.phone_number);
    if (!phone) return reply(chatId, "فعلاً فقط شماره‌های موبایل ایران پذیرفته می‌شود.", { remove_keyboard: true });
    login.status = "done";
    login.phone = phone;
    login.baleId = m.from?.id;
    login.chatId = chatId;
    return reply(chatId, "✅ شمارهٔ شما تأیید شد و در سایت وارد شدید. به صفحهٔ سایت برگردید.", { remove_keyboard: true });
  }

  const text = faDigits(m.text ?? "").trim();
  const code = text.match(/^\/start\s+(\d{6})$/)?.[1] ?? text.match(/^(\d{6})$/)?.[1];
  if (!code) return reply(chatId, HOW);
  const w = wrong.get(chatId);
  if (w && w.n >= 5 && Date.now() < w.until) return reply(chatId, "چند بار کد اشتباه فرستادید؛ ۱۰ دقیقهٔ دیگر دوباره امتحان کنید.");
  const login = logins.find((l) => l.code === code && l.status === "pending");
  if (!login) {
    const fresh = !w || Date.now() > w.until;
    wrong.set(chatId, { n: fresh ? 1 : w.n + 1, until: Date.now() + LOGIN_MS });
    return reply(chatId, "این کد درست نیست یا منقضی شده؛ صفحهٔ ورود سایت را دوباره باز کنید و کد تازه را بفرستید.");
  }
  login.status = "bale";
  login.chatId = chatId;
  return reply(
    chatId,
    "سلام! 👋 برای ورود به مسابقهٔ پیش‌بینی نساجی اسپرت، دکمهٔ «📱 ارسال شمارهٔ من» را در پایین صفحه بزنید.\nشمارهٔ شما در سایت نمایش داده نمی‌شود.\n\nاگر این درخواست را شما نداده‌اید، کاری نکنید.",
    CONTACT_KEYBOARD,
  );
}

let polling: Promise<void> | null = null;
let lastPoll = 0;

/**
 * Reads the bot's new messages (at most every 1.5 s, one reader at a time): while someone is
 * signing in, or when `always` (the scheduler, for «توقف» and other commands).
 */
export async function pollBale(always = false): Promise<void> {
  if (!token() || (!always && !live(state().logins).length)) return;
  if (polling) return polling;
  if (Date.now() - lastPoll < 1500) return;
  lastPoll = Date.now();
  polling = (async () => {
    try {
      const s = state();
      const updates = await call<{ update_id: number; message?: Msg }[]>("getUpdates", { offset: s.offset, timeout: 0, limit: 100 });
      const logins = live(s.logins);
      for (const u of updates) if (u.message) await handle(u.message, logins);
      const offset = updates.length ? Math.max(...updates.map((u) => u.update_id)) + 1 : s.offset;
      // Logins may have been added while this ran: keep them, with what this run changed.
      const changed = new Map(logins.map((l) => [l.id, l]));
      save({ offset, logins: live(state().logins).map((l) => changed.get(l.id) ?? l), lastError: undefined, lastPoll: new Date().toISOString() });
    } catch (e) {
      save({ lastError: (e as Error).message, lastPoll: new Date().toISOString() });
    } finally {
      polling = null;
    }
  })();
  return polling;
}

/** Where a sign-in is; once done, it is removed and its phone returned (once). */
export async function loginStatus(id: string): Promise<{ status: LoginStatus; phone?: string; baleId?: number; chatId?: number; error?: string }> {
  await pollBale();
  const s = state();
  const login = s.logins.find((l) => l.id === id);
  if (!login || Date.now() - login.created > LOGIN_MS) return { status: "expired" };
  if (login.status === "done") {
    save({ logins: s.logins.filter((l) => l.id !== id) });
    return { status: "done", phone: login.phone, baleId: login.baleId, chatId: login.chatId };
  }
  return { status: login.status, error: s.lastError };
}

export const baleState = () => state();

/** The site's address as fans reach it (kept from sign-ins), for links in bot messages. */
export const siteUrl = () => (process.env.SITE_URL || state().siteUrl || "").replace(/\/$/, "");
export function rememberSiteUrl(url: string) {
  if (url && url !== state().siteUrl) save({ siteUrl: url });
}

/** Sends a file to a chat; throws when Bale refuses it. */
export async function sendBaleDocument(chatId: number, data: Buffer, filename: string, caption?: string): Promise<void> {
  const fd = new FormData();
  fd.set("chat_id", String(chatId));
  if (caption) fd.set("caption", caption);
  fd.set("document", new Blob([new Uint8Array(data)], { type: "application/gzip" }), filename);
  let res: Response;
  try {
    res = await fetchRetry(`${api()}/bot${token()}/sendDocument`, { method: "POST", body: fd, cache: "no-store", timeoutMs: 120_000 }, 2);
  } catch (e) {
    throw new Error(hide(`اتصال به بله برقرار نشد (${networkReason(e)}).`));
  }
  const out = (await res.json().catch(() => ({}))) as { ok?: boolean; description?: string };
  if (!out.ok) throw new Error(hide(`بله فایل را نپذیرفت: ${out.description ?? `HTTP ${res.status}`}`));
}

/** Sends a picture to a chat (shown in the chat, not as a file); throws when Bale refuses it. */
export async function sendBalePhoto(chatId: number, data: Buffer, filename: string, caption?: string): Promise<void> {
  const fd = new FormData();
  fd.set("chat_id", String(chatId));
  if (caption) fd.set("caption", caption);
  fd.set("photo", new Blob([new Uint8Array(data)], { type: "image/jpeg" }), filename);
  let res: Response;
  try {
    res = await fetchRetry(`${api()}/bot${token()}/sendPhoto`, { method: "POST", body: fd, cache: "no-store", timeoutMs: 120_000 }, 2);
  } catch (e) {
    throw new Error(hide(`اتصال به بله برقرار نشد (${networkReason(e)}).`));
  }
  const out = (await res.json().catch(() => ({}))) as { ok?: boolean; description?: string };
  if (!out.ok) throw new Error(hide(`بله عکس را نپذیرفت: ${out.description ?? `HTTP ${res.status}`}`));
}

/** Sends a message to a chat; throws when Bale refuses it. */
export async function sendBale(chatId: number, text: string): Promise<void> {
  await call("sendMessage", { chat_id: chatId, text });
}
