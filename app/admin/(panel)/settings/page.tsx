import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Field, Flash, PageHead } from "../../ui";
import { ImageField, SubmitButton } from "../../ui-client";
import { requireAdmin } from "@/lib/auth";
import { file, str, withError } from "@/lib/form";
import { saveUploadAsWebp } from "@/lib/media";
import { DEFAULT_LOGO, getSettings, logoUrl, saveSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "تنظیمات" };

const okUrl = (u: string) => !u || /^https?:\/\/\S+$/i.test(u);

async function save(fd: FormData) {
  "use server";
  await requireAdmin();
  const urls = { ticketsUrl: str(fd, "ticketsUrl"), instagram: str(fd, "instagram"), telegram: str(fd, "telegram") };
  if (!Object.values(urls).every(okUrl)) redirect(withError("/admin/settings/", "آدرس‌ها باید با https:// شروع شوند."));
  const s = getSettings();
  // New logos are converted to WebP; clearing the field brings back the default logo.
  let logo = str(fd, "logo") || undefined;
  const upload = file(fd, "logoFile");
  if (upload) {
    try {
      logo = await saveUploadAsWebp(upload, 512);
    } catch (e) {
      redirect(withError("/admin/settings/", (e as Error).message));
    }
  }
  saveSettings({
    ...s,
    logo: logo === DEFAULT_LOGO ? undefined : logo,
    title: str(fd, "title") || s.title,
    description: str(fd, "description"),
    ticketsUrl: urls.ticketsUrl,
    social: { instagram: urls.instagram, telegram: urls.telegram },
  });
  redirect("/admin/settings/?ok=saved");
}

export default function SettingsPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const s = getSettings();
  return (
    <>
      <PageHead title="تنظیمات سایت" />
      <Flash searchParams={searchParams} />
      <form action={save} className="a-card a-form-narrow">
        <ImageField name="logo" defaultValue={logoUrl(s)} label="لوگو" />
        <p className="a-hint">عکس بارگذاری‌شده خودکار به WebP تبدیل می‌شود. بهترین نتیجه: لوگوی مربعی با پس‌زمینه‌ی شفاف. برای برگشت به لوگوی پیش‌فرض، عکس را حذف و ذخیره کنید.</p>
        <Field label="نام سایت">
          <input name="title" defaultValue={s.title} required />
        </Field>
        <Field label="توضیح کوتاه" hint="زیر نام سایت، در پانویس و در نتایج گوگل">
          <input name="description" defaultValue={s.description} />
        </Field>
        <Field label="لینک خرید بلیت" hint="خالی بماند، دکمه‌ی خرید بلیت نمایش داده نمی‌شود">
          <input name="ticketsUrl" defaultValue={s.ticketsUrl} dir="ltr" placeholder="https://" />
        </Field>
        <Field label="اینستاگرام">
          <input name="instagram" defaultValue={s.social.instagram} dir="ltr" placeholder="https://instagram.com/..." />
        </Field>
        <Field label="تلگرام">
          <input name="telegram" defaultValue={s.social.telegram} dir="ltr" placeholder="https://t.me/..." />
        </Field>
        <SubmitButton>ذخیره</SubmitButton>
      </form>
    </>
  );
}
