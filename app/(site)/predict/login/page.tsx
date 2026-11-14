import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentFan } from "@/lib/fans";
import { hasBaleToken } from "@/lib/bale-login";
import { hasTelegramLogin } from "@/lib/telegram-login";
import { BaleLogin } from "./BaleLogin";

export const metadata: Metadata = { title: "ورود به مسابقهٔ پیش‌بینی", robots: { index: false } };

export default async function PredictLogin({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const raw = (await searchParams).next ?? "/predict/";
  const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/predict/";
  if (await currentFan()) redirect(next);
  const tg = hasTelegramLogin();
  // Bale stays the default; Telegram is added when its bot is set up.
  const via: ("bale" | "telegram")[] = tg && !hasBaleToken() ? ["telegram"] : tg ? ["bale", "telegram"] : ["bale"];
  const names = via.length > 1 ? "پیام‌رسان «بله» یا «تلگرام»" : via[0] === "telegram" ? "تلگرام" : "پیام‌رسان «بله»";
  return (
    <div className="predict-login panel">
      <h1>ورود به مسابقهٔ پیش‌بینی</h1>
      <p>با حساب {names} در چند ثانیه وارد شوید؛ بدون پیامک و بدون رمز عبور.</p>
      <BaleLogin next={next} via={via} />
    </div>
  );
}
