import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Flash, PageHead } from "../../ui";
import { SubmitButton } from "../../ui-client";
import { requireAccess } from "@/lib/auth";
import { str, withError } from "@/lib/form";
import { faDate, faNum } from "@/lib/format";
import { getLeague } from "@/lib/league";
import { fixtureKey } from "@/lib/predict-score";
import { HOME_TEAM } from "@/lib/site";
import { sendStory } from "@/lib/story-send";

export const metadata: Metadata = { title: "کارت استوری" };
const BACK = "/admin/stories/";

async function send(fd: FormData) {
  "use server";
  await requireAccess("publish");
  const f = getLeague().fixtures.find((x) => fixtureKey(x) === str(fd, "key"));
  if (!f) redirect(withError(BACK, "بازی پیدا نشد."));
  const r = await sendStory(f);
  redirect(r.ok ? `${BACK}?ok=${encodeURIComponent(r.message)}` : withError(BACK, r.message));
}

export default async function StoriesPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireAccess("publish");
  const club = getLeague().fixtures.filter((f) => f.home === HOME_TEAM || f.away === HOME_TEAM);
  const past = club.filter((f) => f.status !== "scheduled").sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  const next = club.filter((f) => f.status === "scheduled").sort((a, b) => a.date.localeCompare(b.date)).slice(0, 2);
  const list = [...next.reverse(), ...past];
  return (
    <>
      <PageHead title="کارت استوری" />
      <Flash searchParams={searchParams} />
      <div className="a-card">
        <p className="a-hint">
          برای هر بازی نساجی یک عکس عمودی ۱۰۸۰ در ۱۹۲۰ (اندازهٔ استوری اینستاگرام، تلگرام و بله) ساخته می‌شود: لوگوی دو تیم، نتیجه، گلزن‌ها (از «گزارش بازی‌ها»)، هفته، تاریخ و
          ورزشگاه و آدرس سایت. بعد از پایان هر بازی نساجی، کارتش خودکار برای گیرنده‌های «پشتیبان در بله» فرستاده می‌شود. برای بازی‌های پیش رو هم کارت «پیش از بازی» با ساعت شروع
          ساخته می‌شود.
        </p>
      </div>
      {list.length === 0 && <p className="a-card a-hint">بازی‌ای از نساجی در برنامه نیست.</p>}
      <div className="a-story-grid">
        {list.map((f) => {
          const key = fixtureKey(f);
          const src = `/story/?m=${encodeURIComponent(key)}`;
          return (
            <div key={key} className="a-card a-story">
              <a href={src} target="_blank">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" loading="lazy" />
              </a>
              <b>
                {f.home} {f.homeScore != null ? `${faNum(f.homeScore)} - ${faNum(f.awayScore!)}` : "-"} {f.away}
              </b>
              <span className="a-hint">{f.round ? `هفتهٔ ${faNum(f.round)} · ` : ""}{faDate(f.date)}{f.status === "scheduled" ? " · پیش از بازی" : ""}</span>
              <div className="a-row" style={{ gap: 8, flexWrap: "wrap" }}>
                <a href={`${src}&download=1`} className="a-btn a-btn-small a-btn-primary">دانلود</a>
                <form action={send}>
                  <input type="hidden" name="key" value={key} />
                  <SubmitButton className="a-btn a-btn-small" pendingText="در حال ارسال…">ارسال به بلهٔ من</SubmitButton>
                </form>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
