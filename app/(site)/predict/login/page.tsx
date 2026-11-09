import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentFan } from "@/lib/fans";
import { BaleLogin } from "./BaleLogin";

export const metadata: Metadata = { title: "ورود به مسابقهٔ پیش‌بینی", robots: { index: false } };

export default async function PredictLogin({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const raw = (await searchParams).next ?? "/predict/";
  const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/predict/";
  if (await currentFan()) redirect(next);
  return (
    <div className="predict-login panel">
      <h1>ورود به مسابقهٔ پیش‌بینی</h1>
      <p>با حساب پیام‌رسان «بله» در چند ثانیه وارد شوید؛ بدون پیامک و بدون رمز عبور.</p>
      <BaleLogin next={next} />
    </div>
  );
}
