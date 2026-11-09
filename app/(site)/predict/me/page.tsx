import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentFan } from "@/lib/fans";
import { logoutFan, saveName } from "../actions";
import { Notice } from "../ui";

export const metadata: Metadata = { title: "نام نمایشی", robots: { index: false } };

export default async function PredictMe({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const fan = await currentFan();
  if (!fan) redirect("/predict/login/?next=/predict/me/");
  return (
    <div className="predict-login panel">
      <h1>{sp.welcome ? "خوش آمدید! 🎉" : "نام نمایشی"}</h1>
      <p>{sp.welcome ? "یک نام نمایشی انتخاب کنید؛ در جدول مسابقه همین نام دیده می‌شود (شمارهٔ شما هیچ‌جا نمایش داده نمی‌شود)." : "نامی که در جدول مسابقه دیده می‌شود."}</p>
      <Notice sp={sp} />
      <form action={saveName} className="predict-name">
        <input type="hidden" name="next" value={sp.next ?? ""} />
        <label htmlFor="name">نام نمایشی</label>
        <input id="name" name="name" defaultValue={fan.named ? fan.name : ""} placeholder="مثلاً علی قائمشهری" maxLength={20} minLength={2} required autoFocus />
        <button type="submit" className="btn btn-primary">ذخیره</button>
      </form>
      <div className="predict-me-links">
        <Link href="/predict/">بازگشت به مسابقه</Link>
        <form action={logoutFan}><button type="submit">خروج از حساب</button></form>
      </div>
    </div>
  );
}
