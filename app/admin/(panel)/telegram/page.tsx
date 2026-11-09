import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Field, Flash, PageHead } from "../../ui";
import { SubmitButton } from "../../ui-client";
import { requireAccess } from "@/lib/auth";
import { str, withError } from "@/lib/form";
import { faDate } from "@/lib/format";
import { isoToJalaliParts } from "@/lib/jalali";
import { botInfo, hasToken, syncTelegram, telegramState } from "@/lib/telegram-sync";
import { writeStore } from "@/lib/store";

export const metadata: Metadata = { title: "تلگرام" };

const BACK = "/admin/telegram/";

/** What the bot saw in plain words: posts read, posts skipped for lacking 🌍, other chats. */
function seenText(seen: number, withoutMark: number, otherChats: string[], created = 0, updated = 0) {
  const parts = [
    seen ? `ربات ${seen} پست تازه از کانال دید` : "ربات از آخرین بررسی پست تازه‌ای در کانال ندیده",
    withoutMark ? `${withoutMark} پست 🌍 نداشت و خبر نشد` : "",
    created || updated ? `${created} خبر تازه ساخته شد${updated ? ` و ${updated} خبر به‌روز شد` : ""}` : "",
    otherChats.length ? `پست‌هایی هم از ${otherChats.join("، ")} آمد که چون کانال تنظیم‌شده نیست نادیده گرفته شد` : "",
  ];
  return parts.filter(Boolean).join("؛ ") + ".";
}

async function saveSettings(fd: FormData) {
  "use server";
  await requireAccess("publish");
  const channel = str(fd, "channel").replace(/^https?:\/\/t\.me\//i, "").replace(/^@/, "").trim();
  if (channel && !/^(-?\d{5,}|[A-Za-z][A-Za-z0-9_]{3,31})$/.test(channel)) redirect(withError(BACK, "آیدی کانال را مثل @nassajisport یا لینک t.me/nassajisport وارد کنید."));
  const every = [15, 30, 60].includes(Number(str(fd, "every"))) ? Number(str(fd, "every")) : 30;
  writeStore("telegram", { ...telegramState(), channel, every, enabled: fd.get("enabled") === "on", mode: str(fd, "mode") === "draft" ? "draft" : "publish" });
  redirect(`${BACK}?ok=saved`);
}

async function testConnection() {
  "use server";
  await requireAccess("publish");
  let name = "";
  try {
    name = (await botInfo()).username;
  } catch (e) {
    redirect(withError(BACK, (e as Error).message));
  }
  redirect(`${BACK}?ok=${encodeURIComponent(`اتصال برقرار است. ربات: @${name}`)}`);
}

async function checkNow() {
  "use server";
  await requireAccess("publish");
  const r = await syncTelegram();
  if (!r.ok) redirect(withError(BACK, r.error));
  redirect(`${BACK}?ok=${encodeURIComponent(seenText(r.seen, r.withoutMark, r.otherChats, r.created, r.updated))}`);
}

export default async function TelegramPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireAccess("publish");
  const s = telegramState();
  const token = hasToken();
  return (
    <>
      <PageHead title="تلگرام" />
      <Flash searchParams={searchParams} />
      <p className="a-hint">
        پست‌های کانال که <b>در انتهایشان 🌍</b> دارند خودکار خبر سایت می‌شوند: خطی که با 🔸 شروع می‌شود تیتر است و بقیه متن خبر. عکس پست (یا اولین عکس آلبوم) در کادر
        سایت قرار می‌گیرد و تصویر شاخص می‌شود؛ پست بدون عکس یک کاور با رنگ و لوگوی نساجی می‌گیرد. سئو، برچسب‌ها و دسته خودکار است. اگر پستی بعداً در کانال ویرایش
        شود، خبر سایت هم به‌روز می‌شود.
      </p>

      {!token && (
        <div className="a-flash is-error">
          توکن ربات روی سرور تنظیم نشده. در فایل <code dir="ltr">/etc/nassaji.env</code> یک خط <code dir="ltr">TELEGRAM_BOT_TOKEN=…</code> اضافه کنید و سرویس را
          دوباره راه‌اندازی کنید (<code dir="ltr">sudo systemctl restart nassaji</code>). توکن را در پنل یا چت ننویسید.
        </div>
      )}

      <div className="a-grid-2">
        <form action={saveSettings} className="a-card">
          <h2>تنظیمات</h2>
          <label className="a-check">
            <input type="checkbox" name="enabled" defaultChecked={s.enabled} /> خواندن خودکار کانال روشن باشد
          </label>
          <Field label="کانال" hint="فقط پست‌های این کانال خوانده می‌شود">
            <input name="channel" defaultValue={s.channel ? `@${s.channel}` : ""} dir="ltr" placeholder="@nassajisport" />
          </Field>
          <Field label="خبرهای ساخته‌شده">
            <select name="mode" defaultValue={s.mode}>
              <option value="publish">مستقیم منتشر شوند</option>
              <option value="draft">پیش‌نویس بمانند تا سردبیر منتشر کند</option>
            </select>
          </Field>
          <Field label="هر چند وقت بررسی شود">
            <select name="every" defaultValue={String(s.every)}>
              <option value="15">هر ۱۵ دقیقه</option>
              <option value="30">هر ۳۰ دقیقه</option>
              <option value="60">هر ۱ ساعت</option>
            </select>
          </Field>
          <SubmitButton>ذخیره</SubmitButton>
        </form>

        <div className="a-card">
          <h2>وضعیت</h2>
          <p>
            توکن ربات: {token ? <span className="a-tag is-ok">تنظیم شده</span> : <span className="a-tag">تنظیم نشده</span>}
          </p>
          {s.lastSync && (
            <p className="a-hint">
              آخرین بررسی: {faDate(s.lastSync)} ساعت {isoToJalaliParts(s.lastSync).time}
              {s.lastError ? ` — خطا: ${s.lastError}` : " — موفق"}
            </p>
          )}
          {s.lastSeen && !s.lastError && <p className="a-hint">{seenText(s.lastSeen.posts, s.lastSeen.withoutMark, s.lastSeen.otherChats)}</p>}
          <p className="a-hint">ربات فقط پست‌هایی را می‌بیند که بعد از ادمین شدنش در کانال منتشر شده‌اند.</p>
          <div className="a-row">
            <form action={testConnection}>
              <SubmitButton className="a-btn" pendingText="در حال اتصال…">
                تست اتصال
              </SubmitButton>
            </form>
            <form action={checkNow}>
              <SubmitButton className="a-btn a-btn-primary" pendingText="در حال خواندن کانال…">
                بررسی همین الان
              </SubmitButton>
            </form>
          </div>
        </div>
      </div>

      <section className="a-card">
        <h2>خبرهای ساخته‌شده از کانال</h2>
        {s.log.length === 0 ? (
          <p className="muted">هنوز خبری از کانال ساخته نشده.</p>
        ) : (
          <ul className="a-list">
            {s.log.map((l, i) => (
              <li key={i}>
                <Link href={`/admin/posts/${l.postId}/`}>{l.title}</Link>
                <span className="muted">
                  {l.action === "created" ? "ساخته شد" : "به‌روز شد"} · {faDate(l.at)} {isoToJalaliParts(l.at).time}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
