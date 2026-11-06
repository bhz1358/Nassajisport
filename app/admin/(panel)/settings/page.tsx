import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Field, Flash, PageHead } from "../../ui";
import { ImageField, SubmitButton } from "../../ui-client";
import { requireAccess } from "@/lib/auth";
import { file, str, withError } from "@/lib/form";
import { saveUploadAsWebp } from "@/lib/media";
import { DEFAULT_LOGO, getSettings, logoUrl, saveSettings } from "@/lib/settings";
import { SOCIAL_NETWORKS, type SocialLinks } from "@/lib/social";

export const metadata: Metadata = { title: "تنظیمات" };

const okUrl = (u: string) => !u || /^https?:\/\/\S+$/i.test(u);

async function save(fd: FormData) {
  "use server";
  await requireAccess("settings");
  const ticketsUrl = str(fd, "ticketsUrl");
  const social: SocialLinks = {};
  for (const n of SOCIAL_NETWORKS) {
    const v = str(fd, `social_${n.key}`);
    if (v) social[n.key] = v;
  }
  const bad = [ticketsUrl, ...Object.values(social)].find((u) => !okUrl(u ?? ""));
  if (bad !== undefined) redirect(withError("/admin/settings/", `آدرس «${bad}» درست نیست؛ آدرس‌ها باید با https:// شروع شوند.`));
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
    ticketsUrl,
    social,
  });
  redirect("/admin/settings/?ok=saved");
}

export default async function SettingsPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireAccess("settings");
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
        <fieldset className="a-fieldset">
          <legend>شبکه‌های اجتماعی</legend>
          <p className="a-hint">آیکون هر شبکه‌ای که لینک داشته باشد در بالای سایت، پایین سایت و صفحه‌ی «ارتباط با ما» نمایش داده می‌شود. برای حذف، لینک را پاک کنید.</p>
          {SOCIAL_NETWORKS.map((n) => (
            <Field key={n.key} label={n.label}>
              <input name={`social_${n.key}`} defaultValue={s.social[n.key] ?? ""} dir="ltr" placeholder={n.placeholder} />
            </Field>
          ))}
        </fieldset>
        <SubmitButton>ذخیره</SubmitButton>
      </form>
    </>
  );
}
