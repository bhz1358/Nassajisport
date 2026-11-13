import type { Metadata } from "next";
import { requireAccess } from "@/lib/auth";
import Link from "next/link";
import { saveSeason, saveStaff } from "./actions";
import { Field, Flash, PageHead } from "../../ui";
import { SubmitButton } from "../../ui-client";
import { faNum } from "@/lib/format";
import { getSquad, POSITIONS } from "@/lib/squad";
import { redirect } from "next/navigation";
import { photoLookOn, restoreOriginalPhotos, setPhotoLook, styleSquadPhotos } from "@/lib/player-photos";
import { bundledPhoto, PHOTO_STYLE } from "@/lib/player-photo";

async function restyleAll() {
  "use server";
  await requireAccess("squad");
  setPhotoLook(true);
  const n = await styleSquadPhotos(true);
  redirect(`/admin/squad/?ok=${encodeURIComponent(`${n} عکس با ظاهر یکدست ساخته شد.`)}#photo-look`);
}

async function restoreAll() {
  "use server";
  await requireAccess("squad");
  setPhotoLook(false);
  const n = restoreOriginalPhotos();
  redirect(`/admin/squad/?ok=${encodeURIComponent(`عکس اصلی ${n} بازیکن برگردانده شد.`)}#photo-look`);
}

export const metadata: Metadata = { title: "بازیکنان و کادر" };

export default async function SquadAdmin({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireAccess("squad");
  const squad = getSquad();
  const staffRows = [...squad.staff, undefined, undefined];
  return (
    <>
      <PageHead title="بازیکنان و کادر فنی">
        <Link href="/admin/squad/lineup/" className="a-btn">
          ترکیب بازی
        </Link>
        <Link href="/admin/squad/new/" className="a-btn a-btn-primary">
          + بازیکن جدید
        </Link>
      </PageHead>
      <Flash searchParams={searchParams} />

      <section className="a-card" id="photo-look">
        <h2>ظاهر یکدست عکس بازیکنان</h2>
        {(() => {
          const withPhoto = squad.players.filter((p) => p.photo || bundledPhoto(p.name));
          const styled = squad.players.filter((p) => p.photoStyle === PHOTO_STYLE).length;
          const on = photoLookOn();
          return (
            <>
              <p className="a-hint">
                عکس هر بازیکن خودکار به WebP تبدیل می‌شود و یک ظاهر یکدست می‌گیرد: اگر پس‌زمینهٔ عکس سفید یا ساده باشد (عکس آتلیه‌ای) حذف می‌شود و بازیکن روی زمینهٔ زرشکی
                نساجی با شمارهٔ پیراهنش قرار می‌گیرد؛ عکس‌های دیگر با همان قاب و رنگ یکدست می‌شوند. عکس اصلی هر بازیکن نگه داشته می‌شود. بهترین نتیجه: عکس از کمر به بالا، رو به
                دوربین، با پس‌زمینهٔ سفید.
              </p>
              <p>
                {on ? <span className="a-tag is-ok">روشن</span> : <span className="a-tag">خاموش (عکس‌های اصلی)</span>} {faNum(styled)} از {faNum(withPhoto.length)} عکس یکدست شده است.
              </p>
              <div className="a-row" style={{ gap: 8, flexWrap: "wrap" }}>
                <form action={restyleAll}>
                  <SubmitButton className="a-btn a-btn-primary" pendingText="در حال ساخت عکس‌ها…">{on ? "ساخت دوبارهٔ همه" : "روشن کردن و ساخت همه"}</SubmitButton>
                </form>
                {on && (
                  <form action={restoreAll}>
                    <SubmitButton className="a-btn" confirm="ظاهر یکدست خاموش و عکس‌های اصلی همهٔ بازیکنان برگردانده شود؟">برگرداندن عکس‌های اصلی</SubmitButton>
                  </form>
                )}
              </div>
            </>
          );
        })()}
      </section>

      <form action={saveSeason} className="a-card a-form-row">
        <Field label="فصل">
          <input name="season" defaultValue={squad.season} />
        </Field>
        <SubmitButton className="a-btn">ذخیره</SubmitButton>
      </form>

      {POSITIONS.map((pos) => {
        const players = squad.players.filter((p) => p.position === pos.key).sort((a, b) => a.number - b.number);
        return (
          <section key={pos.key} className="a-card">
            <h2>
              {pos.plural} <span className="muted">({faNum(players.length)})</span>
            </h2>
            <div className="a-table-wrap">
              <table className="a-table">
                <thead>
                  <tr>
                    <th>شماره</th>
                    <th>نام</th>
                    <th>بازی</th>
                    <th>{pos.key === "GK" ? "کلین‌شیت" : "گل"}</th>
                    <th>پاس گل</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {players.map((p) => (
                    <tr key={p.slug}>
                      <td className="a-strong">{faNum(p.number)}</td>
                      <td>
                        <Link href={`/admin/squad/${p.slug}/`} className="a-strong">
                          {p.name}
                        </Link>
                        {!p.photo && <span className="a-tag">بدون عکس</span>}
                      </td>
                      <td>{faNum(p.stats.appearances)}</td>
                      <td>{faNum(pos.key === "GK" ? (p.stats.cleanSheets ?? 0) : p.stats.goals)}</td>
                      <td>{faNum(p.stats.assists)}</td>
                      <td>
                        <Link href={`/admin/squad/${p.slug}/`} className="a-btn a-btn-small">
                          ویرایش
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {players.length === 0 && (
                    <tr>
                      <td colSpan={6} className="a-empty">
                        بازیکنی در این پست نیست.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}

      <section id="staff" className="a-card">
        <h2>کادر فنی</h2>
        <form action={saveStaff}>
          <input type="hidden" name="count" value={staffRows.length} />
          <table className="a-table a-table-form">
            <thead>
              <tr>
                <th>سمت</th>
                <th>نام</th>
                <th>حذف</th>
              </tr>
            </thead>
            <tbody>
              {staffRows.map((s, i) => (
                <tr key={i}>
                  <td>
                    <input name={`role_${i}`} defaultValue={s?.role} placeholder={s ? "" : "مثلاً: مربی"} aria-label="سمت" />
                  </td>
                  <td>
                    <input name={`name_${i}`} defaultValue={s?.name} placeholder={s ? "" : "نام"} aria-label="نام" />
                  </td>
                  <td>{s && <input type="checkbox" name={`delete_${i}`} aria-label={`حذف ${s.name}`} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <SubmitButton>ذخیره کادر فنی</SubmitButton>
        </form>
      </section>
    </>
  );
}
