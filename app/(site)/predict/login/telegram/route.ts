import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { hasTelegramLogin, startTelegramLogin, telegramLoginStatus } from "@/lib/telegram-login";
import { fanForPhone, signInFan } from "@/lib/fans";
import { secureCookies } from "@/lib/auth";
import { clientIp } from "@/lib/client-ip";

export const dynamic = "force-dynamic";
const COOKIE = "ns_fan_tg_login";

// 10 new sign-ins per 10 minutes per address.
const starts = new Map<string, { n: number; until: number }>();

/** Starts a Telegram sign-in: returns the code and the bot link; the secret id goes in a cookie. */
export async function POST() {
  if (!hasTelegramLogin()) return NextResponse.json({ error: "ورود با تلگرام هنوز راه‌اندازی نشده است." }, { status: 503 });
  const ip = clientIp(await headers());
  const s = starts.get(ip);
  const fresh = !s || Date.now() > s.until;
  if (!fresh && s.n >= 10) return NextResponse.json({ error: "تعداد درخواست‌ها زیاد بود؛ چند دقیقهٔ دیگر دوباره امتحان کنید." }, { status: 429 });
  starts.set(ip, { n: fresh ? 1 : s.n + 1, until: fresh ? Date.now() + 600_000 : s.until });
  const { id, code, link } = await startTelegramLogin();
  (await cookies()).set(COOKIE, id, { httpOnly: true, sameSite: "lax", secure: secureCookies(), path: "/", maxAge: 900 });
  return NextResponse.json({ code, link });
}

/** Where the sign-in is; when the bot has the phone, signs the fan in. */
export async function GET() {
  const jar = await cookies();
  const id = jar.get(COOKIE)?.value;
  if (!id) return NextResponse.json({ status: "expired" });
  const r = await telegramLoginStatus(id);
  if (r.status === "done" && r.phone) {
    const fan = fanForPhone(r.phone, undefined, undefined, { tgId: r.tgId, tgChat: r.chatId });
    if (fan.blocked) return NextResponse.json({ status: "blocked" });
    await signInFan(fan);
    jar.delete(COOKIE);
    return NextResponse.json({ status: "done", named: !!fan.named });
  }
  // The client treats «in the bot» the same for both messengers.
  return NextResponse.json({
    status: r.status === "telegram" ? "bale" : r.status,
    error: r.error ? "اتصال سایت به تلگرام فعلاً برقرار نیست؛ کمی بعد دوباره امتحان کنید." : undefined,
  });
}
