import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { loginStatus, rememberSiteUrl, startLogin, hasBaleToken } from "@/lib/bale-login";
import { fanForPhone, signInFan } from "@/lib/fans";
import { secureCookies } from "@/lib/auth";

export const dynamic = "force-dynamic";
const COOKIE = "ns_fan_login";

// 10 new sign-ins per 10 minutes per address.
const starts = new Map<string, { n: number; until: number }>();

/** Starts a sign-in: returns the code and the bot link; the secret id goes in a cookie. */
export async function POST() {
  if (!hasBaleToken()) return NextResponse.json({ error: "ورود با بله هنوز راه‌اندازی نشده است." }, { status: 503 });
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) rememberSiteUrl(`${(h.get("x-forwarded-proto") ?? "http").split(",")[0]}://${host}`);
  const s = starts.get(ip);
  const fresh = !s || Date.now() > s.until;
  if (!fresh && s.n >= 10) return NextResponse.json({ error: "تعداد درخواست‌ها زیاد بود؛ چند دقیقهٔ دیگر دوباره امتحان کنید." }, { status: 429 });
  starts.set(ip, { n: fresh ? 1 : s.n + 1, until: fresh ? Date.now() + 600_000 : s.until });
  const { id, code, link } = await startLogin();
  (await cookies()).set(COOKIE, id, { httpOnly: true, sameSite: "lax", secure: secureCookies(), path: "/", maxAge: 900 });
  return NextResponse.json({ code, link });
}

/** Where the sign-in is; when the bot has the phone, signs the fan in. */
export async function GET() {
  const jar = await cookies();
  const id = jar.get(COOKIE)?.value;
  if (!id) return NextResponse.json({ status: "expired" });
  const r = await loginStatus(id);
  if (r.status === "done" && r.phone) {
    const fan = fanForPhone(r.phone, r.baleId, r.chatId);
    if (fan.blocked) return NextResponse.json({ status: "blocked" });
    await signInFan(fan);
    jar.delete(COOKIE);
    return NextResponse.json({ status: "done", named: !!fan.named });
  }
  return NextResponse.json({ status: r.status, error: r.error ? "اتصال سایت به بله فعلاً برقرار نیست؛ کمی بعد دوباره امتحان کنید." : undefined });
}
