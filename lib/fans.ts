// Fans who sign in to take part in the prediction contest (phone verified through the Bale bot).

import crypto from "node:crypto";
import { cookies } from "next/headers";
import { readSigned, secureCookies, signValue } from "./auth";
import { readStore, writeStore } from "./store";

export type Fan = {
  id: string;
  /** 09xxxxxxxxx, verified by Bale; never shown on the site. */
  phone: string;
  baleId?: number;
  name: string;
  createdAt: string;
  /** Has chosen a display name (asked once after the first sign-in). */
  named?: boolean;
  blocked?: boolean;
};

const COOKIE = "ns_fan";
const DAYS = 365;

export const getFans = () => readStore<Fan[]>("fans", () => []);
export const saveFans = (fans: Fan[]) => writeStore("fans", fans);

/** The fan with this phone, created on first sign-in with a placeholder name. */
export function fanForPhone(phone: string, baleId?: number): Fan {
  const fans = getFans();
  const found = fans.find((f) => f.phone === phone);
  if (found) {
    if (baleId && found.baleId !== baleId) saveFans(fans.map((f) => (f.id === found.id ? { ...f, baleId } : f)));
    return found;
  }
  const fan: Fan = { id: crypto.randomBytes(8).toString("hex"), phone, baleId, name: `هوادار ${phone.slice(-4)}`, createdAt: new Date().toISOString() };
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
