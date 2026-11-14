// Fans who sign in to take part in the prediction contest (phone verified through the Bale or
// Telegram bot; the same number is the same fan in both).

import crypto from "node:crypto";
import { cookies } from "next/headers";
import { readSigned, secureCookies, signValue } from "./auth";
import { readStore, writeStore } from "./store";

export type Fan = {
  id: string;
  /** 09xxxxxxxxx, verified by Bale or Telegram; never shown on the site. */
  phone: string;
  baleId?: number;
  /** The fan's private chat with the bot (reminders go there). */
  baleChat?: number;
  /** Telegram account and private chat with the login bot, when the fan signed in with Telegram. */
  tgId?: number;
  tgChat?: number;
  /** Reminders in Bale; on unless the fan turned them off. */
  remind?: boolean;
  name: string;
  createdAt: string;
  /** Has chosen a display name (asked once after the first sign-in). */
  named?: boolean;
  /** Profile photo (/uploads/fans/…webp). */
  avatar?: string;
  blocked?: boolean;
};

const COOKIE = "ns_fan";
const DAYS = 365;

export const getFans = () => readStore<Fan[]>("fans", () => []);
export const saveFans = (fans: Fan[]) => writeStore("fans", fans);

/** The fan with this phone, created on first sign-in with a placeholder name. */
export function fanForPhone(phone: string, baleId?: number, baleChat?: number, tg?: { tgId?: number; tgChat?: number }): Fan {
  const fans = getFans();
  const ids = {
    ...(baleId ? { baleId } : {}),
    ...(baleChat ? { baleChat } : {}),
    ...(tg?.tgId ? { tgId: tg.tgId } : {}),
    ...(tg?.tgChat ? { tgChat: tg.tgChat } : {}),
  };
  const found = fans.find((f) => f.phone === phone);
  if (found) {
    const next = { ...found, ...ids };
    if (JSON.stringify(next) !== JSON.stringify(found)) saveFans(fans.map((f) => (f.id === found.id ? next : f)));
    return next;
  }
  const fan: Fan = { id: crypto.randomBytes(8).toString("hex"), phone, ...ids, name: `هوادار ${phone.slice(-4)}`, createdAt: new Date().toISOString() };
  saveFans([...fans, fan]);
  return fan;
}

export async function signInFan(fan: Fan) {
  (await cookies()).set(COOKIE, signValue({ f: fan.id, exp: Date.now() + DAYS * 86_400_000 }), {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookies(),
    path: "/",
    maxAge: DAYS * 86_400,
  });
}

export async function signOutFan() {
  (await cookies()).delete(COOKIE);
}

/** The signed-in fan, or null (also for a blocked or deleted fan). */
export async function currentFan(): Promise<Fan | null> {
  const data = readSigned<{ f: string; exp: number }>((await cookies()).get(COOKIE)?.value);
  if (!data || Date.now() > data.exp) return null;
  const fan = getFans().find((f) => f.id === data.f);
  return fan && !fan.blocked ? fan : null;
}

/** Checks a display name; returns the reason it can't be used, or undefined. */
export function nameProblem(name: string, fanId: string): string | undefined {
  if (name.length < 2 || name.length > 20) return "نام نمایشی باید بین ۲ تا ۲۰ حرف باشد.";
  if (/[<>"'`]|https?:|www\.|@/i.test(name)) return "نام نمایشی نمی‌تواند لینک، آیدی یا این نشانه‌ها را داشته باشد.";
  if (/[\d۰-۹]{6,}/.test(name)) return "شماره تلفن یا عدد طولانی در نام نمایشی نگذارید.";
  const key = (s: string) => s.replace(/[\s‌_]+/g, "").replace(/ي/g, "ی").replace(/ك/g, "ک").toLowerCase();
  if (getFans().some((f) => f.id !== fanId && key(f.name) === key(name))) return "این نام را هوادار دیگری انتخاب کرده؛ نام دیگری بنویسید.";
}

/** Where the bot can reach the fan (in Bale a private chat's id is the user's id). */
export const fanChat = (f: Fan) => f.baleChat ?? f.baleId;
/** Where reminders reach the fan: Bale first, else Telegram. */
export const fanReach = (f: Fan): { via: "bale" | "telegram"; chat: number } | undefined => {
  const bale = fanChat(f);
  if (bale) return { via: "bale", chat: bale };
  const tg = f.tgChat ?? f.tgId;
  return tg ? { via: "telegram", chat: tg } : undefined;
};
