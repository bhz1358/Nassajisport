import type { Metadata } from "next";
import { saveLineup } from "../actions";
import { Field, Flash, PageHead } from "../../../ui";
import { SubmitButton } from "../../../ui-client";
import { MatchPitch } from "@/app/(site)/squad-ui";
import { isoToJalaliParts } from "@/lib/jalali";
import { FORMATIONS, getSquad, lineupToText } from "@/lib/squad";
import { HOME_TEAM } from "@/lib/site";
import type { TeamLineup } from "@/lib/types";

export const metadata: Metadata = { title: "ترکیب بازی" };

function TeamFields({ side, team, label }: { side: "home" | "away"; team?: TeamLineup; label: string }) {
  const known = team && FORMATIONS.includes(team.formation);
  return (
    <fieldset className="a-card a-team-fields">
      <legend>{label}</legend>
      <Field label="نام تیم">
        <input name={`${side}_team`} defaultValue={team?.team} required />
      </Field>
      <div className="a-row">
        <Field label="آرایش">
          <select name={`${side}_formation`} defaultValue={known ? team?.formation : "4-3-3"}>
            {FORMATIONS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </Field>
        <Field label="آرایش دیگر" hint="اگر در فهرست نیست">
          <input name={`${side}_formation_custom`} defaultValue={known ? "" : team?.formation} dir="ltr" placeholder="3-4-1-2" />
        </Field>
      </div>
      <Field label="سرمربی">
        <input name={`${side}_coach`} defaultValue={team?.coach} />
      </Field>
      <Field
        label="ترکیب اصلی (۱۱ نفر)"
        hint="هر خط یک بازیکن: «شماره نام». اول دروازه‌بان، بعد هر خط از راست به چپ (مدافعان، هافبک‌ها، مهاجمان). کاپیتان: (c) آخر نام."
      >
        <textarea name={`${side}_starters`} defaultValue={team ? lineupToText(team.starters) : ""} rows={11} className="a-lineup-text" />
      </Field>
      <Field label="ذخیره‌ها">
        <textarea name={`${side}_subs`} defaultValue={team ? lineupToText(team.substitutes) : ""} rows={6} className="a-lineup-text" />
      </Field>
    </fieldset>
  );
}

export default function LineupAdmin({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const squad = getSquad();
  const lu = squad.lineup;
  const when = isoToJalaliParts(lu?.date ?? new Date().toISOString());
  const clubAway = lu?.away.team === HOME_TEAM;

  return (
    <>
      <PageHead title="ترکیب بازی" back="/admin/squad/" />
      <Flash searchParams={searchParams} />
      <p className="a-hint">
        ترکیب هر دو تیم را وارد کنید تا در صفحه‌ی تیم روی زمین نمایش داده شود. بازیکنان نساجی که نامشان با فهرست بازیکنان یکی باشد، به صفحه‌ی خودشان لینک می‌شوند.
      </p>

      <form action={saveLineup}>
        <div className="a-card a-grid-fields">
          <Field label="عنوان بازی" hint="خالی بماند: «میزبان - میهمان»">
            <input name="match" defaultValue={lu?.match} />
          </Field>
          <Field label="رقابت">
            <input name="competition" defaultValue={lu?.competition ?? "لیگ برتر فوتبال ایران"} />
          </Field>
          <Field label="تاریخ" hint="شمسی">
            <input name="date" defaultValue={when.date} dir="ltr" required />
          </Field>
          <Field label="ساعت">
            <input name="time" defaultValue={when.time} dir="ltr" />
          </Field>
          <Field label="ورزشگاه">
            <input name="venue" defaultValue={lu?.venue} />
          </Field>
          <Field label="نساجی کدام تیم است؟">
            <select name="clubSide" defaultValue={clubAway ? "away" : "home"}>
              <option value="home">میزبان</option>
              <option value="away">میهمان</option>
            </select>
          </Field>
        </div>
        <div className="a-grid-2">
          <TeamFields side="home" team={lu?.home} label="میزبان" />
          <TeamFields side="away" team={lu?.away} label="میهمان" />
        </div>
        <SubmitButton>ذخیره ترکیب</SubmitButton>
      </form>

      {lu && (
        <section className="a-card a-preview">
          <h2>پیش‌نمایش (همان چیزی که در سایت دیده می‌شود)</h2>
          <div className="a-pitch-preview">
            <MatchPitch lineup={lu} />
          </div>
        </section>
      )}
    </>
  );
}
