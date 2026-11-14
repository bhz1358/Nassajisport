// Sign-in through a Telegram bot, the same way as with Bale (lib/bale-login.ts): the login page
// shows a 6-digit code and opens t.me/<bot>?start=<code>; in the bot the fan taps «ارسال شمارهٔ
// من» (a contact button that only sends their own number); the page, polling, signs them in. A fan
// with the same number in Bale and Telegram has one account.
//
// TELEGRAM_LOGIN_BOT_TOKEN (in /etc/nassaji.env) is the bot's token. It must be a different bot
// from the channel bot (TELEGRAM_BOT_TOKEN): that one reads only channel posts. TELEGRAM_API can
// point at a relay when api.telegram.org can't be reached from the server.

import crypto from "node:crypto";
import { fetchRetry, networkReason } from "./net-tuning";
import { normalizePhone } from "./predict-score.ts";
import { readStore, writeStore } from "./store";
import { getFans, saveFans } from "./fans";

const token = () => (process.env.TELEGRAM_LOGIN_BOT_TOKEN || "").trim();
const api = () => (process.env.TELEGRAM_API || "https://api.telegram.org").replace(/\/$/, "");
const web = () => (process.env.TELEGRAM_WEB || "https://t.me").replace(/\/$/, "");
export const hasTelegramLogin = () => !!token();
const hide = (s: string) => (token() ? s.split(token()).join("***") : s);

const LOGIN_MS = 10 * 60_000;

export type TgLoginStatus = "pending" | "telegram" | "done" | "expired";
type Login = { id: string; code: string; created: number; status: TgLoginStatus; chatId?: number; phone?: string; tgId?: number };
type TgState = { offset?: number; botUsername?: string; logins: Login[]; lastError?: string; lastPoll?: string };

const state = () => readStore<TgState>("telegram-login", () => ({ logins: [] }));
const save = (patch: Partial<TgState>) => writeStore("telegram-login", { ...state(), ...patch });
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
    throw new Error(hide(`اتصال به تلگرام برقرار نشد (${networkReason(e)}).`));
  }
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; result?: T; description?: string };
  if (!data.ok) {
    if (res.status === 401 || res.status === 404) throw new Error("توکن ربات تلگرام درست نیست (TELEGRAM_LOGIN_BOT_TOKEN را بررسی کنید).");
    if (res.status === 409) throw new Error("این ربات وبهوک دارد یا جای دیگری پیام‌هایش را می‌خواند؛ برای ورود یک ربات جدا بسازید.");
    throw new Error(hide(`تلگرام خطا داد: ${data.description ?? `HTTP ${res.status}`}`));
  }
  return data.result as T;
}

/** The bot's name and username (connection test). */
export async function telegramLoginBotInfo(): Promise<{ username: string; name: string }> {
  const me = await call<{ username?: string; first_name?: string }>("getMe");
  const username = (me.username ?? "").replace(/^@/, "");
  if (username) save({ botUsername: username });
  return { username, name: me.first_name ?? "" };
}

async function botUsername(): Promise<string | undefined> {
  if (process.env.TELEGRAM_LOGIN_BOT_USERNAME) return process.env.TELEGRAM_LOGIN_BOT_USERNAME.replace(/^@/, "");
  const known = state().botUsername;
  if (known) return known;
  try {
    return (await telegramLoginBotInfo()).username || undefined;
  } catch {
    return undefined;
  }
}

/** Starts a sign-in: a secret id (kept in the browser's cookie) and the code shown on the page. */
export async function startTelegramLogin(): Promise<{ id: string; code: string; link?: string; app?: string; bot?: string }> {
  const logins = live(state().logins);
  let code = "";
  do code = String(crypto.randomInt(100000, 1000000));
  while (logins.some((l) => l.code === code));
  const id = crypto.randomBytes(18).toString("base64url");
  save({ logins: [...logins, { id, code, created: Date.now(), status: "pending" }] });
  const user = await botUsername();
  if (!user) return { id, code };
  // tg:// opens the Telegram app itself (t.me is filtered in Iran); t.me is the fallback.
  return { id, code, bot: user, app: `tg://resolve?domain=${user}&start=${code}`, link: `${web()}/${user}?start=${code}` };
}

const faDigits = (s: string) => s.replace(/[۰-۹]/g, (c) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(c))).replace(/[٠-٩]/g, (c) => String("٠١٢٣٤٥٦٧٨٩".indexOf(c)));

type Msg = {
  date: number;
  chat: { id: number; type?: string };
  from?: { id: number; is_bot?: boolean };
  text?: string;
  contact?: { phone_number: string; user_id?: number };
};

const CONTACT_KEYBOARD = { keyboard: [[{ text: "📱 ارسال شمارهٔ من", request_contact: true }]], resize_keyboard: true, one_time_keyboard: true };
const HOW =
  "برای ورود، در سایت نساجی اسپرت دکمهٔ «ورود با تلگرام» را بزنید؛ یا کد ۶ رقمی‌ای را که صفحهٔ ورود سایت نشان می‌دهد همین‌جا بفرستید.\n\nیادآوری‌های مسابقهٔ پیش‌بینی: برای خاموش کردن «توقف» و برای روشن کردن «یادآوری» را بفرستید.";
const STOP_WORDS = new Set(["توقف", "/stop", "stop", "خاموش", "لغو"]);
const ON_WORDS = new Set(["یادآوری", "/remind", "روشن"]);

/** Turns a fan's reminders on or off from the bot; false when this chat isn't a fan's. */
function setRemindByChat(chatId: number, fromId: number | undefined, on: boolean): boolean {
  const fans = getFans();
  const fan = fans.find((f) => f.tgChat === chatId || (fromId !== undefined && f.tgId === fromId));
  if (!fan) return false;
  saveFans(fans.map((f) => (f.id === fan.id ? { ...f, remind: on, tgChat: chatId } : f)));
  return true;
}

// Wrong codes typed in the bot: 5 per chat per 10 minutes.
const wrong = new Map<number, { n: number; until: number }>();

async function reply(chatId: number, text: string, markup?: object) {
  await call("sendMessage", { chat_id: chatId, text, ...(markup ? { reply_markup: markup } : {}) }).catch(() => undefined);
}

async function handle(m: Msg, logins: Login[]): Promise<void> {
  if (m.chat.type && m.chat.type !== "private") return;
  if (Date.now() / 1000 - m.date > 30 * 60) return;
  const chatId = m.chat.id;
  const word = (m.text ?? "").trim().toLowerCase();
  if (STOP_WORDS.has(word) || ON_WORDS.has(word)) {
    const on = ON_WORDS.has(word);
    if (!setRemindByChat(chatId, m.from?.id, on)) return reply(chatId, "اول با «ورود با تلگرام» در سایت نساجی اسپرت وارد شوید.");
    return reply(
      chatId,
      on ? "🔔 یادآوری‌ها روشن شد: پیش از بازی‌هایی که پیش‌بینی نکرده‌اید و بعد از پایان هر هفته پیام می‌گیرید." : "🔕 یادآوری‌ها خاموش شد. هر وقت خواستید «یادآوری» را بفرستید.",
      { remove_keyboard: true },
    );
  }

  if (m.contact) {
    const login = logins.find((l) => l.chatId === chatId && l.status === "telegram");
    if (!login) return reply(chatId, HOW, { remove_keyboard: true });
    // Telegram fills user_id only for the sender's own contact card; a forwarded contact is refused.
    if (!m.from || m.contact.user_id !== m.from.id) {
      return reply(chatId, "فقط شمارهٔ خود همین حساب تلگرام پذیرفته می‌شود؛ دکمهٔ «📱 ارسال شمارهٔ من» را در پایین صفحه بزنید.", CONTACT_KEYBOARD);
    }
    const phone = normalizePhone(m.contact.phone_number);
    if (!phone) return reply(chatId, "فعلاً فقط شماره‌های موبایل ایران (۰۹…) پذیرفته می‌شود.", { remove_keyboard: true });
    login.status = "done";
    login.phone = phone;
    login.tgId = m.from.id;
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
  login.status = "telegram";
  login.chatId = chatId;
  return reply(
    chatId,
    "سلام! 👋 برای ورود به سایت نساجی اسپرت، دکمهٔ «📱 ارسال شمارهٔ من» را در پایین صفحه بزنید.\nشمارهٔ شما در سایت نمایش داده نمی‌شود.\n\nاگر این درخواست را شما نداده‌اید، کاری نکنید.",
    CONTACT_KEYBOARD,
  );
}

let polling: Promise<void> | null = null;
let lastPoll = 0;

/**
 * Reads the bot's new messages (at most every 1.5 s, one reader at a time): while someone is
 * signing in, or when `always` (the scheduler, for «توقف» and other commands).
 */
export async function pollTelegramLogin(always = false): Promise<void> {
  if (!token() || (!always && !live(state().logins).length)) return;
  if (polling) return polling;
  if (Date.now() - lastPoll < 1500) return;
  lastPoll = Date.now();
  polling = (async () => {
    try {
      const s = state();
      const updates = await call<{ update_id: number; message?: Msg }[]>("getUpdates", { offset: s.offset, timeout: 0, limit: 100, allowed_updates: ["message"] });
      const logins = live(s.logins);
      for (const u of updates) if (u.message) await handle(u.message, logins);
      const offset = updates.length ? Math.max(...updates.map((u) => u.update_id)) + 1 : s.offset;
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
export async function telegramLoginStatus(id: string): Promise<{ status: TgLoginStatus; phone?: string; tgId?: number; chatId?: number; error?: string }> {
  await pollTelegramLogin();
  const s = state();
  const login = s.logins.find((l) => l.id === id);
  if (!login || Date.now() - login.created > LOGIN_MS) return { status: "expired" };
  if (login.status === "done") {
    save({ logins: s.logins.filter((l) => l.id !== id) });
    return { status: "done", phone: login.phone, tgId: login.tgId, chatId: login.chatId };
  }
  return { status: login.status, error: s.lastError };
}

export const telegramLoginState = () => state();

/** Sends a message to a fan's chat with the bot; throws when Telegram refuses it. */
export async function sendTelegram(chatId: number, text: string): Promise<void> {
  await call("sendMessage", { chat_id: chatId, text });
}
