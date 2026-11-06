import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Flash, PageHead } from "../../ui";
import { SubmitButton } from "../../ui-client";
import { requireAccess } from "@/lib/auth";
import { ADMIN_ID_START, getAllPosts, saveCategories, savePosts } from "@/lib/content";
import { file, withError } from "@/lib/form";
import { faDate, faNum } from "@/lib/format";
import { getSettings, saveSettings } from "@/lib/settings";
import { readStore, writeStore } from "@/lib/store";
import { convert, parseWxr, type ConvertResult } from "@/scripts/import-wordpress.mjs";

export const metadata: Metadata = { title: "درون‌ریزی وردپرس" };

type Report = {
  at: string;
  imported: { post: number; page: number };
  comments: number;
  categories: number;
  skipped: Record<string, number>;
  missingMedia: number;
  kept: number;
};

async function runImport(fd: FormData) {
  "use server";
  await requireAccess("import");
  const xml = file(fd, "xml");
  if (!xml) redirect(withError("/admin/import/", "فایل XML انتخاب نشده."));
  let result: ConvertResult;
  try {
    result = convert(parseWxr(await xml.text()));
  } catch (e) {
    redirect(withError("/admin/import/", `فایل خوانده نشد: ${(e as Error).message}`));
  }

  // Posts written in this panel survive a re-import; earlier imported/sample posts are replaced.
  const kept = getAllPosts().filter((p) => p.id >= ADMIN_ID_START);
  savePosts([...result.posts, ...kept]);
  saveCategories(result.categories);
  writeStore("comments", result.comments);
  const s = getSettings();
  saveSettings({
    ...s,
    title: s.title === "نساجی اسپرت" && result.site.title ? result.site.title : s.title,
    sourceUrl: result.site.sourceUrl,
    importedAt: result.site.importedAt,
  });

  const { resolveUpload } = await import("@/lib/media");
  const fs = await import("node:fs");
  const missing = result.attachmentUrls.filter((u: string) => {
    const f = u.startsWith("/uploads/") ? resolveUpload(u) : null;
    return f !== null && !fs.existsSync(f);
  });
  writeStore<Report>("import-report", {
    at: new Date().toISOString(),
    imported: result.report.imported,
    comments: result.report.comments,
    categories: result.categories.length,
    skipped: result.report.skipped,
    missingMedia: missing.length,
    kept: kept.length,
  });
  redirect("/admin/import/?ok=imported");
}

export default async function ImportPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireAccess("import");
  const last = readStore<Report | null>("import-report", () => null);
  return (
    <>
      <PageHead title="درون‌ریزی از وردپرس" />
      <Flash searchParams={searchParams} />

      <div className="a-grid-2">
        <form action={runImport} className="a-card">
          <h2>۱. فایل خروجی وردپرس</h2>
          <p className="a-hint">در پیشخوان وردپرس: ابزارها ← برون‌بری ← همه‌ی محتوا ← دانلود. فایل XML را اینجا بدهید.</p>
          <label className="a-dropzone">
            <input type="file" name="xml" accept=".xml,text/xml,application/xml" required />
            <span>فایل .xml (حداکثر ۶۴ مگابایت)</span>
          </label>
          <ul className="a-hint">
            <li>همه‌ی خبرها، برگه‌ها، دسته‌ها، برچسب‌ها و نظرهای تأییدشده با همان آدرس‌های قبلی وارد می‌شوند.</li>
            <li>خبرهایی که در همین پنل نوشته‌اید حفظ می‌شوند.</li>
            <li>اگر خبر منتقل‌شده‌ای را اینجا ویرایش کرده باشید، درون‌ریزی دوباره آن تغییر را با نسخه‌ی وردپرس جایگزین می‌کند.</li>
          </ul>
          <SubmitButton confirm="خبرهای قبلاً منتقل‌شده با محتوای این فایل جایگزین شوند؟">شروع درون‌ریزی</SubmitButton>
        </form>

        <div className="a-card">
          <h2>۲. عکس‌ها</h2>
          <p className="a-hint">
            پوشه‌ی <code dir="ltr">wp-content/uploads</code> سایت قدیم را (با همان پوشه‌های سال و ماه) در پوشه‌ی <code dir="ltr">data/uploads</code> روی سرور سایت جدید کپی
            کنید. این کار یک بار و از طریق مدیریت فایل هاست انجام می‌شود. بعد از کپی، دوباره درون‌ریزی را بزنید تا شمارش عکس‌های جاافتاده به‌روز شود.
          </p>
        </div>
      </div>

      {last && (
        <section className="a-card">
          <h2>آخرین درون‌ریزی · {faDate(last.at)}</h2>
          <div className="a-stats">
            <div className="a-stat">
              <strong>{faNum(last.imported.post)}</strong>
              <span>خبر</span>
            </div>
            <div className="a-stat">
              <strong>{faNum(last.imported.page)}</strong>
              <span>برگه</span>
            </div>
            <div className="a-stat">
              <strong>{faNum(last.categories)}</strong>
              <span>دسته</span>
            </div>
            <div className="a-stat">
              <strong>{faNum(last.comments)}</strong>
              <span>نظر</span>
            </div>
            <div className="a-stat">
              <strong>{faNum(last.kept)}</strong>
              <span>خبر پنل (حفظ شد)</span>
            </div>
            <div className={`a-stat ${last.missingMedia ? "is-warn" : ""}`}>
              <strong>{faNum(last.missingMedia)}</strong>
              <span>عکس جاافتاده</span>
            </div>
          </div>
          {Object.keys(last.skipped).length > 0 && (
            <p className="a-hint">
              وارد نشد (منتشرنشده):{" "}
              {Object.entries(last.skipped)
                .map(([k, v]) => `${k}: ${faNum(v)}`)
                .join("، ")}
            </p>
          )}
        </section>
      )}
    </>
  );
}
