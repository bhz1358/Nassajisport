import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deletePlayer, savePlayer } from "../actions";
import { Field, Flash, PageHead } from "../../../ui";
import { ImageField, SubmitButton } from "../../../ui-client";
import { isoToJalaliParts } from "@/lib/jalali";
import { getPlayer, POSITIONS } from "@/lib/squad";

export const metadata: Metadata = { title: "بازیکن" };

export default async function PlayerAdmin({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const { slug } = await params;
  const isNew = slug === "new";
  const p = isNew ? undefined : getPlayer(slug);
  if (!isNew && !p) notFound();
  const s = p?.stats;

  return (
    <>
      <PageHead title={p ? p.name : "بازیکن جدید"} back="/admin/squad/">
        {p && (
          <Link href={`/team/${p.slug}/`} target="_blank" className="a-btn">
            مشاهده در سایت ↗
          </Link>
        )}
      </PageHead>
      <Flash searchParams={searchParams} />

      <form action={savePlayer} className="a-editor-layout">
        <input type="hidden" name="original" value={p?.slug ?? ""} />
        <div className="a-editor-main">
          <div className="a-card a-grid-fields">
            <Field label="نام و نام خانوادگی">
              <input name="name" defaultValue={p?.name} required />
            </Field>
            <Field label="شماره پیراهن">
              <input name="number" defaultValue={p?.number} inputMode="numeric" required />
            </Field>
            <Field label="پست">
              <select name="position" defaultValue={p?.position ?? "MF"}>
                {POSITIONS.map((x) => (
                  <option key={x.key} value={x.key}>
                    {x.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="تاریخ تولد" hint="شمسی، مثلاً ۱۳۷۶/۱۱/۲۲">
              <input name="birthDate" defaultValue={p?.birthDate ? isoToJalaliParts(`${p.birthDate}T08:30:00Z`).date : ""} dir="ltr" />
            </Field>
            <Field label="قد (سانتی‌متر)">
              <input name="heightCm" defaultValue={p?.heightCm} inputMode="numeric" />
            </Field>
            <Field label="پای تخصصی">
              <select name="foot" defaultValue={p?.foot ?? ""}>
                <option value="">—</option>
                <option>راست</option>
                <option>چپ</option>
                <option>هر دو</option>
              </select>
            </Field>
            <Field label="ملیت">
              <input name="nationality" defaultValue={p?.nationality ?? "ایران"} />
            </Field>
            <Field label="نامک آدرس" hint="انگلیسی؛ آدرس صفحه: /team/نامک/">
              <input name="slug" defaultValue={p?.slug} dir="ltr" placeholder="player-9" />
            </Field>
            <Field label="درباره بازیکن" wide>
              <textarea name="bio" defaultValue={p?.bio} rows={4} />
            </Field>
          </div>

          <div className="a-card">
            <h2>آمار فصل</h2>
            <div className="a-grid-fields a-grid-stats">
              {(
                [
                  ["appearances", "بازی"],
                  ["minutes", "دقیقه"],
                  ["goals", "گل"],
                  ["assists", "پاس گل"],
                  ["yellowCards", "کارت زرد"],
                  ["redCards", "کارت قرمز"],
                  ["cleanSheets", "کلین‌شیت (دروازه‌بان)"],
                ] as const
              ).map(([k, label]) => (
                <Field key={k} label={label}>
                  <input name={k} defaultValue={s?.[k] ?? 0} inputMode="numeric" />
                </Field>
              ))}
            </div>
          </div>
        </div>

        <aside className="a-editor-side">
          <div className="a-card">
            <ImageField name="photo" defaultValue={p?.photo} label="عکس بازیکن" />
            <p className="a-hint">بهترین نتیجه: عکس عمودی یا مربعی با پس‌زمینه‌ی یکسان برای همه‌ی بازیکنان.</p>
          </div>
          <div className="a-card">
            <SubmitButton>{p ? "ذخیره تغییرات" : "افزودن بازیکن"}</SubmitButton>
          </div>
        </aside>
      </form>

      {p && (
        <form action={deletePlayer} className="a-danger-zone">
          <input type="hidden" name="slug" value={p.slug} />
          <SubmitButton className="a-btn a-btn-danger" confirm={`«${p.name}» از فهرست بازیکنان حذف شود؟`}>
            حذف بازیکن
          </SubmitButton>
        </form>
      )}
    </>
  );
}
