import type { Metadata } from "next";
import { deleteAd, saveAd } from "./actions";
import { Field, Flash, PageHead } from "../../ui";
import { ImageField, SubmitButton } from "../../ui-client";
import { AD_SLOTS, getAds, getAdStats, isRunning, type Ad } from "@/lib/ads";
import { faNum } from "@/lib/format";
import { isoToJalaliParts } from "@/lib/jalali";

export const metadata: Metadata = { title: "تبلیغات" };

function status(ad: Ad): { label: string; tone: string } {
  if (!ad.enabled) return { label: "خاموش", tone: "" };
  const now = new Date();
  if (ad.start && new Date(ad.start) > now) return { label: "زمان‌بندی‌شده", tone: "is-warn" };
  if (ad.end && new Date(ad.end) < now) return { label: "تمام‌شده", tone: "" };
  return { label: "در حال نمایش", tone: "is-ok" };
}

function AdForm({ ad }: { ad?: Ad }) {
  return (
    <form action={saveAd} className="a-ad-form" id={ad ? `ad-${ad.id}` : "new"}>
      <input type="hidden" name="id" value={ad?.id ?? ""} />
      <div className="a-ad-images">
        <ImageField name="image" defaultValue={ad?.image} label="بنر (دسکتاپ)" />
        <ImageField name="mobileImage" defaultValue={ad?.mobileImage} label="بنر موبایل (اختیاری)" />
      </div>
      <div className="a-grid-fields">
        <Field label="جایگاه">
          <select name="slot" defaultValue={ad?.slot ?? 1}>
            {AD_SLOTS.map((s) => (
              <option key={s.id} value={s.id}>
                {faNum(s.id)}. {s.name} ({s.size})
              </option>
            ))}
          </select>
        </Field>
        <Field label="نام آگهی‌دهنده / کمپین">
          <input name="title" defaultValue={ad?.title} required />
        </Field>
        <Field label="لینک مقصد" wide>
          <input name="url" defaultValue={ad?.url} dir="ltr" placeholder="https://" required />
        </Field>
        <Field label="تاریخ شروع" hint="شمسی، اختیاری">
          <input name="start" defaultValue={isoToJalaliParts(ad?.start).date} dir="ltr" placeholder="1405/08/20" />
        </Field>
        <Field label="تاریخ پایان" hint="شمسی، اختیاری">
          <input name="end" defaultValue={isoToJalaliParts(ad?.end).date} dir="ltr" placeholder="1405/09/20" />
        </Field>
      </div>
      <label className="a-check">
        <input type="checkbox" name="enabled" defaultChecked={ad?.enabled ?? true} /> نمایش داده شود
      </label>
      <div className="a-ad-actions">
        <SubmitButton>{ad ? "ذخیره تغییرات" : "افزودن تبلیغ"}</SubmitButton>
      </div>
    </form>
  );
}

export default function AdsPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const ads = getAds();
  const stats = getAdStats();
  return (
    <>
      <PageHead title="تبلیغات" />
      <Flash searchParams={searchParams} />
      <p className="a-hint">
        هر جایگاه می‌تواند چند تبلیغ داشته باشد؛ با هر بار باز شدن صفحه یکی از تبلیغ‌های فعال آن جایگاه به نوبت نمایش داده می‌شود. جایگاهی که تبلیغ فعال
        ندارد در سایت دیده نمی‌شود. فرمت‌ها: JPG، PNG، WebP و GIF متحرک.
      </p>

      <div className="a-slot-guide">
        {AD_SLOTS.map((s) => {
          const running = ads.filter((a) => a.slot === s.id && isRunning(a)).length;
          return (
            <div key={s.id} className="a-card a-slot-card">
              <span className="a-slot-num">{faNum(s.id)}</span>
              <strong>{s.name}</strong>
              <span className="muted" dir="ltr">
                {s.size}
                {s.mobileSize ? ` · موبایل ${s.mobileSize}` : ""}
              </span>
              <span className={`a-tag ${running ? "is-ok" : ""}`}>{running ? `${faNum(running)} تبلیغ فعال` : "خالی"}</span>
            </div>
          );
        })}
      </div>

      {AD_SLOTS.map((s) => {
        const list = ads.filter((a) => a.slot === s.id);
        if (!list.length) return null;
        return (
          <section key={s.id} className="a-card">
            <h2>
              جایگاه {faNum(s.id)} — {s.name}
            </h2>
            {list.map((ad) => {
              const st = stats[ad.id] ?? { impressions: 0, clicks: 0 };
              const ctr = st.impressions ? ((st.clicks / st.impressions) * 100).toFixed(2) : "0";
              const sts = status(ad);
              return (
                <details key={ad.id} className="a-ad-item">
                  <summary>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={ad.image} alt="" className="a-ad-thumb" />
                    <span className="a-strong">{ad.title}</span>
                    <span className={`a-tag ${sts.tone}`}>{sts.label}</span>
                    <span className="muted small">
                      نمایش {faNum(st.impressions)} · کلیک {faNum(st.clicks)} · نرخ کلیک {faNum(Number(ctr))}٪
                    </span>
                  </summary>
                  <AdForm ad={ad} />
                  <form action={deleteAd} className="a-danger-zone">
                    <input type="hidden" name="id" value={ad.id} />
                    <SubmitButton className="a-btn a-btn-small a-btn-danger" confirm={`تبلیغ «${ad.title}» حذف شود؟`}>
                      حذف تبلیغ
                    </SubmitButton>
                  </form>
                </details>
              );
            })}
          </section>
        );
      })}

      <section className="a-card">
        <h2>تبلیغ جدید</h2>
        <AdForm />
      </section>
    </>
  );
}
