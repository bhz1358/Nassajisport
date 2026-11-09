import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Field, Flash, PageHead } from "../../ui";
import { AutoRefresh, SubmitButton } from "../../ui-client";
import { requireAccess } from "@/lib/auth";
import { str, withError } from "@/lib/form";
import { faDate } from "@/lib/format";
import { isoToJalaliParts } from "@/lib/jalali";
import { backfillRunning, backfillState, botInfo, hasToken, previewBackfill, startBackfill, syncTelegram, telegramState } from "@/lib/telegram-sync";
import { jalaliPartsToIso } from "@/lib/jalali";
import { faNum } from "@/lib/format";
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

async function previewPast(fd: FormData) {
  "use server";
  await requireAccess("publish");
  const from = jalaliPartsToIso(str(fd, "from"), "00:00");
  const to = jalaliPartsToIso(str(fd, "to"), "23:59");
  if (!from || !to) redirect(withError(BACK, "تاریخ شروع و پایان را به شکل ۱۴۰۵/۰۷/۰۱ وارد کنید.") + "#past");
  if (Date.parse(from) > Date.parse(to)) redirect(withError(BACK, "تاریخ شروع بعد از تاریخ پایان است.") + "#past");
  const r = await previewBackfill(from, to);
  if (!r.ok) redirect(withError(BACK, r.error) + "#past");
  redirect(`${BACK}?ok=${encodeURIComponent(`${r.scanned} پست کانال بررسی شد؛ ${r.found} پست با 🌍 در این بازه پیدا شد. فهرست را ببینید و «ساخت خبرها» را بزنید.`)}#past`);
}

async function runPast() {
  "use server";
  await requireAccess("publish");
  const r = startBackfill();
  if (!r.ok) redirect(withError(BACK, r.error) + "#past");
  redirect(`${BACK}#past`);
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

      <PastPosts />

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

/** First import: past channel posts in a date range, previewed and then made in the background. */
function PastPosts() {
  const b = backfillState();
  const running = backfillRunning();
  const pending = b.items.filter((i) => !i.postId && !i.error).length;
  const made = b.items.filter((i) => i.postId).length;
  const existed = b.items.filter((i) => i.existed).length;
  const failed = b.items.filter((i) => i.error).length;
  const jal = (iso?: string) => (iso ? isoToJalaliParts(iso).date : "");
  return (
    <section className="a-card" id="past">
      {running && <AutoRefresh every={3} />}
      <h2>خواندن پست‌های قبلی کانال</h2>
      <p className="a-hint">
        ربات فقط پست‌های تازه را می‌بیند. برای پست‌هایی که قبلاً در کانال منتشر شده‌اند، بازه‌ی تاریخ را بدهید: سایت صفحه‌ی عمومی کانال (t.me/s/…) را می‌خواند و پست‌های
        آن بازه را که 🌍 دارند فهرست می‌کند. اول فهرست را ببینید، بعد «ساخت خبرها» را بزنید؛ خبرها با تاریخ اصلی پستشان ساخته می‌شوند و پستی که قبلاً خبر شده تکراری
        نمی‌شود. کانال باید عمومی باشد.
      </p>
      <form action={previewPast} className="a-grid-fields">
        <Field label="از تاریخ" hint="شمسی">
          <input name="from" defaultValue={jal(b.from)} dir="ltr" placeholder="1405/07/01" required />
        </Field>
        <Field label="تا تاریخ" hint="شمسی">
          <input name="to" defaultValue={jal(b.to)} dir="ltr" placeholder="1405/08/18" required />
        </Field>
        <div>
          <SubmitButton className="a-btn" pendingText="در حال گشتن در کانال…">
            پیش‌نمایش
          </SubmitButton>
        </div>
      </form>

      {b.items.length > 0 && (
        <>
          <p className="a-section-gap">
            {faNum(b.scanned ?? 0)} پست بررسی شد؛ <b>{faNum(b.items.length)}</b> پست با 🌍 از {faDate(b.from!)} تا {faDate(b.to!)}
            {made ? ` · ${faNum(made)} خبر شده` : ""}
            {failed ? ` · ${faNum(failed)} خطا` : ""}
          </p>
          {running ? (
            <p className="a-flash">
              در حال ساخت خبرها… {faNum(made)} از {faNum(b.items.length)} (این صفحه خودش به‌روز می‌شود؛ می‌توانید ببندیدش، کار ادامه دارد)
            </p>
          ) : pending > 0 ? (
            <form action={runPast}>
              <SubmitButton pendingText="شروع…">ساخت {faNum(pending)} خبر</SubmitButton>
            </form>
          ) : (
            b.status === "done" && (
              <p className="a-flash">
                تمام شد: {faNum(made - existed)} خبر تازه ساخته شد{existed ? `؛ ${faNum(existed)} پست از قبل خبر شده بود` : ""}
                {failed ? `؛ ${faNum(failed)} پست خطا داشت (روی «خطا» نگه دارید تا علتش را ببینید)` : ""}.
              </p>
            )
          )}
          <div className="a-table-wrap">
            <table className="a-table">
              <thead>
                <tr>
                  <th>تاریخ</th>
                  <th>تیتر</th>
                  <th>رسانه</th>
                  <th>وضعیت</th>
                </tr>
              </thead>
              <tbody>
                {b.items.map((i) => (
                  <tr key={i.id}>
                    <td className="muted a-nowrap">{faDate(i.date)}</td>
                    <td>{i.title}</td>
                    <td className="muted a-nowrap">
                      {i.photos.length ? `${faNum(i.photos.length)} عکس` : "بدون عکس (کاور)"}
                      {i.videos.length ? ` · ${faNum(i.videos.length)} ویدیو` : ""}
                    </td>
                    <td className="a-nowrap">
                      {i.postId ? (
                        <Link href={`/admin/posts/${i.postId}/`} className="a-tag is-ok">
                          {i.existed ? "از قبل خبر شده" : "خبر شد"}
                        </Link>
                      ) : i.error ? (
                        <span className="a-tag is-warn" title={i.error}>
                          خطا
                        </span>
                      ) : (
                        <span className="a-tag">آماده</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {b.status === "preview" && b.items.length === 0 && b.from && <p className="muted">در این بازه پستی با 🌍 پیدا نشد.</p>}
    </section>
  );
}
