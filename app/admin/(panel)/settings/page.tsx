import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Field, Flash, PageHead } from "../../ui";
import { SubmitButton } from "../../ui-client";
import { requireAdmin } from "@/lib/auth";
import { str, withError } from "@/lib/form";
import { getSettings, saveSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "تنظیمات" };

const okUrl = (u: string) => !u || /^https?:\/\/\S+$/i.test(u);

async function save(fd: FormData) {
  "use server";
  await requireAdmin();
  const urls = { ticketsUrl: str(fd, "ticketsUrl"), instagram: str(fd, "instagram"), telegram: str(fd, "telegram") };
  if (!Object.values(urls).every(okUrl)) redirect(withError("/admin/settings/", "آدرس‌ها باید با https:// شروع شوند."));
  const s = getSettings();
  saveSettings({
    ...s,
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
