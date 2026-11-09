import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Flash, PageHead } from "../../ui";
import { SubmitButton } from "../../ui-client";
import { requireAccess } from "@/lib/auth";
import { baleBotInfo, baleState, hasBaleToken } from "@/lib/bale-login";
import { getFans, saveFans } from "@/lib/fans";
import { removeAvatar } from "@/lib/fan-avatar";
import { str, withError } from "@/lib/form";
import { faDate, faNum } from "@/lib/format";
import { getLeague } from "@/lib/league";
import { contestWeek, getPredictions, seasonTable, weekTable } from "@/lib/predictions";

export const metadata: Metadata = { title: "مسابقهٔ پیش‌بینی" };
const BACK = "/admin/predict/";

async function testBale() {
  "use server";
  await requireAccess("users");
  let msg = "";
  try {
    const me = await baleBotInfo();
    msg = `اتصال برقرار است؛ بازو: @${me.username}${me.name ? ` (${me.name})` : ""}`;
  } catch (e) {
    redirect(withError(BACK, (e as Error).message));
  }
  redirect(`${BACK}?ok=${encodeURIComponent(msg)}`);
}

async function toggleBlock(fd: FormData) {
  "use server";
  await requireAccess("users");
  const id = str(fd, "id");
  saveFans(getFans().map((f) => (f.id === id ? { ...f, blocked: !f.blocked } : f)));
  redirect(`${BACK}?ok=saved#fans`);
}

async function clearAvatar(fd: FormData) {
  "use server";
  await requireAccess("users");
  removeAvatar(str(fd, "id"));
  redirect(`${BACK}?ok=${encodeURIComponent("عکس حذف شد.")}#fans`);
}

export default async function PredictAdmin({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireAccess("users");
  const sp = await searchParams;
  const fans = getFans();
  const byId = new Map(fans.map((f) => [f.id, f]));
  const preds = getPredictions();
  const counts = new Map<string, number>();
  for (const p of preds) counts.set(p.fanId, (counts.get(p.fanId) ?? 0) + 1);
  const week = Number(sp.week) || contestWeek(getLeague().fixtures);
  const bale = baleState();
  const token = hasBaleToken();
  const table = (rows: ReturnType<typeof seasonTable>) =>
    rows.length ? (
      <div className="a-table-wrap">
        <table className="a-table">
          <thead>
            <tr><th>رتبه</th><th>نام نمایشی</th><th>شماره</th><th>امتیاز</th><th>دقیق</th><th>بازی</th></tr>
          </thead>
          <tbody>
            {rows.slice(0, 20).map((r, i) => (
              <tr key={r.fanId}>
                <td>{faNum(i + 1)}</td>
                <td>{r.name}</td>
                <td dir="ltr">{byId.get(r.fanId)?.phone}</td>
                <td><b>{faNum(r.points)}</b></td>
                <td>{faNum(r.exact)}</td>
                <td>{faNum(r.played)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <p className="a-hint">هنوز امتیازی ثبت نشده است.</p>
    );

  return (
    <>
      <PageHead title="مسابقهٔ پیش‌بینی" />
      <Flash searchParams={searchParams} />
      {!token && (
        <div className="a-flash is-error">
          توکن بازوی بله روی سرور تنظیم نشده و ورود هواداران کار نمی‌کند. در فایل <code dir="ltr">/etc/nassaji.env</code> یک خط{" "}
          <code dir="ltr">BALE_BOT_TOKEN=…</code> اضافه کنید و سرویس را دوباره راه‌اندازی کنید (<code dir="ltr">sudo systemctl restart nassaji</code>). توکن را در پنل یا چت ننویسید.
        </div>
      )}
      <div className="a-grid-2">
        <div className="a-card">
          <h2>ورود با بله</h2>
          <p>
            توکن بازو: {token ? <span className="a-tag is-ok">تنظیم شده</span> : <span className="a-tag">تنظیم نشده</span>}
            {bale.botUsername && <> · بازو: <span dir="ltr">@{bale.botUsername}</span></>}
          </p>
          {bale.lastError && <p className="a-flash is-error">آخرین خطا: {bale.lastError}</p>}
          {bale.lastPoll && <p className="a-hint">آخرین بررسی پیام‌های بازو: {faDate(bale.lastPoll)}</p>}
          <form action={testBale}>
            <SubmitButton className="a-btn" pendingText="در حال تست…">تست اتصال به بله</SubmitButton>
          </form>
          <p className="a-hint">صفحهٔ مسابقه در سایت: <a href="/predict/" target="_blank">/predict/</a> — برای نمایش در منوی سایت، از بخش «منوها» یک پیوند به همین آدرس اضافه کنید.</p>
        </div>
        <div className="a-card">
          <h2>آمار</h2>
          <p>هواداران ثبت‌نام‌کرده: <b>{faNum(fans.length)}</b></p>
          <p>پیش‌بینی‌های ثبت‌شده: <b>{faNum(preds.length)}</b></p>
          <p className="a-hint">شماره‌ها فقط در همین صفحه و فقط برای مدیر کل نمایش داده می‌شود (برای تماس با برندگان).</p>
        </div>
      </div>

      <section className="a-card">
        <h2>برترین‌های هفتهٔ {week ? faNum(week) : "—"}</h2>
        <form method="get" className="a-row" style={{ marginBottom: 12 }}>
          <input name="week" defaultValue={week} inputMode="numeric" style={{ width: 90 }} />
          <button className="a-btn a-btn-small">نمایش هفته</button>
        </form>
        {week ? table(weekTable(week)) : null}
      </section>
      <section className="a-card">
        <h2>برترین‌های فصل</h2>
        {table(seasonTable())}
      </section>

      <section className="a-card" id="fans">
        <h2>هواداران ({faNum(fans.length)})</h2>
        {fans.length ? (
          <div className="a-table-wrap">
            <table className="a-table">
              <thead>
                <tr><th>عکس</th><th>نام نمایشی</th><th>شماره</th><th>عضویت</th><th>پیش‌بینی</th><th></th></tr>
              </thead>
              <tbody>
                {[...fans].reverse().map((f) => (
                  <tr key={f.id}>
                    <td>
                      {f.avatar ? (
                        <form action={clearAvatar} className="a-row" style={{ alignItems: "center", gap: 6 }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={f.avatar} alt="" width={36} height={36} style={{ borderRadius: "50%" }} />
                          <input type="hidden" name="id" value={f.id} />
                          <SubmitButton className="a-btn a-btn-small a-btn-danger" pendingText="…" confirm="عکس این هوادار حذف شود؟">حذف عکس</SubmitButton>
                        </form>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>{f.name} {f.blocked && <span className="a-tag">غیرفعال</span>}</td>
                    <td dir="ltr">{f.phone}</td>
                    <td>{faDate(f.createdAt)}</td>
                    <td>{faNum(counts.get(f.id) ?? 0)}</td>
                    <td>
                      <form action={toggleBlock}>
                        <input type="hidden" name="id" value={f.id} />
                        <SubmitButton className={`a-btn a-btn-small${f.blocked ? "" : " a-btn-danger"}`} pendingText="…" confirm={f.blocked ? undefined : `«${f.name}» از مسابقه کنار گذاشته شود؟`}>
                          {f.blocked ? "فعال کردن" : "غیرفعال کردن"}
                        </SubmitButton>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="a-hint">هنوز هواداری ثبت‌نام نکرده است.</p>
        )}
      </section>
    </>
  );
}
