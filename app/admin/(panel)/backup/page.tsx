import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Flash, PageHead } from "../../ui";
import { SubmitButton } from "../../ui-client";
import { requireAccess } from "@/lib/auth";
import { BACKUP_HOUR, backupState, newBackupCode, saveBackupState, sendBackup } from "@/lib/backup";
import { baleState, hasBaleToken, pollBale } from "@/lib/bale-login";
import { num, withError } from "@/lib/form";
import { faDate, faNum } from "@/lib/format";

export const metadata: Metadata = { title: "پشتیبان در بله" };
const BACK = "/admin/backup/";

async function makeCode() {
  "use server";
  await requireAccess("settings");
  newBackupCode();
  redirect(`${BACK}?step=code#register`);
}

async function checkBot() {
  "use server";
  await requireAccess("settings");
  await pollBale(true);
  redirect(`${BACK}?ok=${encodeURIComponent("پیام‌های بازو بررسی شد.")}#register`);
}

async function sendNow() {
  "use server";
  await requireAccess("settings");
  const r = await sendBackup();
  redirect(r.ok ? `${BACK}?ok=${encodeURIComponent(r.message)}` : withError(BACK, r.message));
}

async function setEnabled(fd: FormData) {
  "use server";
  await requireAccess("settings");
  saveBackupState({ enabled: fd.get("enabled") === "on" });
  redirect(`${BACK}?ok=saved`);
}

async function removeChat(fd: FormData) {
  "use server";
  await requireAccess("settings");
  const id = num(fd, "id");
  saveBackupState({ chats: backupState().chats.filter((c) => c.id !== id) });
  redirect(`${BACK}?ok=saved`);
}

export default async function BackupPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireAccess("settings");
  const s = backupState();
  const bot = baleState().botUsername;
  const code = s.code && Date.now() < s.code.until ? s.code.value : undefined;
  return (
    <>
      <PageHead title="پشتیبان در بله" />
      <Flash searchParams={searchParams} />
      {!hasBaleToken() && <div className="a-flash is-error">توکن بازوی بله روی سرور تنظیم نشده است (BALE_BOT_TOKEN در /etc/nassaji.env).</div>}
      <div className="a-card">
        <p className="a-hint">
          هر شب از ساعت {faNum(BACKUP_HOUR)} بامداد، بازوی بله یک فایل فشرده از داده‌های سایت (خبرها، جدول و بازی‌ها، بازیکنان، گزارش‌ها، کاربران پنل، هواداران و پیش‌بینی‌ها،
          تنظیمات) برای گیرنده‌های ثبت‌شده می‌فرستد؛ تا اگر برای سرور اتفاقی افتاد، نسخه‌ای بیرون از آن داشته باشید. عکس‌ها به‌خاطر حجم زیاد در این فایل نیستند
          (نسخهٔ پشتیبان‌شان روی سرور در <code dir="ltr">/var/backups/nassaji/uploads-mirror</code> است).
        </p>
        <p className="a-hint">
          ⚠️ این فایل شمارهٔ موبایل هواداران و اطلاعات ورود کاربران پنل (رمزها به شکل رمزنگاری‌شده) را دارد: فقط گفت‌وگوی خودتان با بازو را ثبت کنید و فایل را برای کسی نفرستید.
        </p>
        <form action={setEnabled} className="a-row" style={{ alignItems: "center", gap: 12 }}>
          <label className="a-check">
            <input type="checkbox" name="enabled" defaultChecked={s.enabled} /> ارسال شبانه روشن باشد
          </label>
          <SubmitButton className="a-btn a-btn-small">ذخیره</SubmitButton>
        </form>
        {s.lastSent && (
          <p>
            آخرین ارسال: {faDate(s.lastSent)}
            {s.lastSize ? ` · ${faNum(Math.max(1, Math.round(s.lastSize / 1024)))} کیلوبایت` : ""}
          </p>
        )}
        {s.lastError && <p className="a-flash is-error">آخرین خطا: {s.lastError}</p>}
        <form action={sendNow}>
          <SubmitButton className="a-btn a-btn-primary" pendingText="در حال ساخت و ارسال…">ارسال پشتیبان همین الان</SubmitButton>
        </form>
      </div>

      <section className="a-card" id="register">
        <h2>گیرنده‌ها</h2>
        {s.chats.length ? (
          <ul>
            {s.chats.map((c) => (
              <li key={c.id} className="a-row" style={{ alignItems: "center", gap: 10 }}>
                <span>گفت‌وگوی بله شمارهٔ <span dir="ltr">{c.id}</span> · ثبت: {faDate(c.addedAt)}</span>
                <form action={removeChat}>
                  <input type="hidden" name="id" value={c.id} />
                  <SubmitButton className="a-btn a-btn-small a-btn-danger" confirm="این گیرنده حذف شود؟">حذف</SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="a-hint">هنوز گیرنده‌ای ثبت نشده است.</p>
        )}
        <h3>افزودن گیرنده (گفت‌وگوی خودتان در بله)</h3>
        {code ? (
          <>
            <p>
              در بله، به بازو{bot ? <> <b dir="ltr">@{bot}</b></> : ""} این پیام را بفرستید (تا ۱۵ دقیقه معتبر است):
            </p>
            <p style={{ fontSize: "1.6rem", fontWeight: 900, letterSpacing: "0.1em" }}>پشتیبان {code.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)])}</p>
            <p className="a-hint">بعد از فرستادن، دکمهٔ زیر را بزنید (یا حداکثر ۵ دقیقه صبر کنید) تا بازو جواب بدهد و گیرنده اینجا اضافه شود.</p>
            <form action={checkBot}>
              <SubmitButton className="a-btn" pendingText="در حال بررسی…">فرستادم؛ بررسی کن</SubmitButton>
            </form>
          </>
        ) : (
          <form action={makeCode}>
            <SubmitButton className="a-btn">گرفتن کد ثبت</SubmitButton>
          </form>
        )}
      </section>
    </>
  );
}
