import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentFan } from "@/lib/fans";
import { deleteAvatar, logoutFan, saveName, toggleRemind, uploadAvatar } from "../actions";
import { FanAvatar, Notice } from "../ui";
import { PhotoPicker } from "../PhotoPicker";

export const metadata: Metadata = { title: "پروفایل من", robots: { index: false } };

export default async function PredictMe({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const fan = await currentFan();
  if (!fan) redirect("/predict/login/?next=/predict/me/");
  return (
    <div className="predict-login panel">
      <h1>{sp.welcome ? "خوش آمدید! 🎉" : "پروفایل من"}</h1>
      <p>{sp.welcome ? "یک نام نمایشی انتخاب کنید؛ در جدول مسابقه همین نام دیده می‌شود (شمارهٔ شما هیچ‌جا نمایش داده نمی‌شود)." : "عکس و نامی که در جدول‌های مسابقه دیده می‌شود."}</p>
      <Notice sp={sp} />
      <div className="predict-photo">
        <FanAvatar name={fan.name} src={fan.avatar} size={96} />
        <div>
          <form action={uploadAvatar} className="predict-photo-form">
            <label htmlFor="photo">عکس پروفایل</label>
            <PhotoPicker label={fan.avatar ? "عوض کردن عکس" : "انتخاب عکس"} />
          </form>
          {fan.avatar && (
            <form action={deleteAvatar}>
              <button type="submit" className="predict-link-btn">حذف عکس</button>
            </form>
          )}
          <p className="muted predict-photo-hint">عکس مربعی بریده می‌شود و کنار نام شما در جدول‌ها و صفحهٔ اول نمایش داده می‌شود. عکس نامناسب حذف و حساب غیرفعال می‌شود.</p>
        </div>
      </div>
      <form action={saveName} className="predict-name">
        <input type="hidden" name="next" value={sp.next ?? ""} />
        <label htmlFor="name">نام نمایشی</label>
        <input id="name" name="name" defaultValue={fan.named ? fan.name : ""} placeholder="مثلاً علی قائمشهری" maxLength={20} minLength={2} required autoFocus />
        <button type="submit" className="btn btn-primary">ذخیره</button>
      </form>
      <form action={toggleRemind} className="predict-remind">
        <label>
          <input type="checkbox" name="remind" defaultChecked={fan.remind !== false} />
          <span>
            <b>یادآوری در بله</b>
            <small>۲ ساعت پیش از بازی‌هایی که پیش‌بینی نکرده‌اید، و امتیاز و رتبه‌تان بعد از هر هفته.</small>
          </span>
        </label>
        <button type="submit" className="btn btn-sm btn-outline">ذخیره</button>
      </form>
      <div className="predict-me-links">
        <Link href="/predict/">بازگشت به مسابقه</Link>
        <form action={logoutFan}><button type="submit">خروج از حساب</button></form>
      </div>
    </div>
  );
}
