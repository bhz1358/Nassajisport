import type { Metadata } from "next";
import { saveTheme } from "./actions";
import { ThemePicker } from "./ThemePicker";
import { Flash, PageHead } from "../../ui";
import { getSettings, logoUrl } from "@/lib/settings";

export const metadata: Metadata = { title: "ظاهر و تم رنگی" };

export default function AppearancePage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const s = getSettings();
  return (
    <>
      <PageHead title="ظاهر و تم رنگی" />
      <Flash searchParams={searchParams} />
      <p className="a-hint">تم انتخاب‌شده روی همه‌ی صفحه‌های سایت و همین پنل اعمال می‌شود. پیش‌نمایش سمت چپ همزمان با انتخاب شما تغییر می‌کند.</p>
      <form action={saveTheme}>
        <ThemePicker theme={s.theme} siteTitle={s.title} logo={logoUrl(s)} />
      </form>
    </>
  );
}
