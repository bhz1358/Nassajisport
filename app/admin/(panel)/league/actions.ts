"use server";

import { redirect } from "next/navigation";
import { requireAccess } from "@/lib/auth";
import { file, num, str, withError } from "@/lib/form";
import { saveUploadAsWebp } from "@/lib/media";
import { jalaliPartsToIso, toLatinDigits } from "@/lib/jalali";
import { getLeague, saveLeague, sortStandings } from "@/lib/league";
import { applyStandings, syncFromUrl } from "@/lib/league-sync";
import { mergeFixtures, parseFixtures } from "@/lib/fixtures-import";
import { parseStandings } from "@/lib/standings-import";
import type { Fixture, StandingRow } from "@/lib/types";

const BACK = "/admin/league/";

export async function saveLeagueInfo(fd: FormData) {
  await requireAccess("league");
  const league = getLeague();
  saveLeague({ ...league, competition: str(fd, "competition") || league.competition, season: str(fd, "season") || league.season });
  redirect(`${BACK}?ok=saved`);
}

/** Played and points are computed, and the table is re-sorted, so they can never disagree. */
export async function saveStandings(fd: FormData) {
  await requireAccess("league");
  const count = num(fd, "count");
  const rows: StandingRow[] = [];
  for (let i = 0; i < count; i++) {
    const team = str(fd, `team_${i}`);
    if (!team || fd.get(`delete_${i}`) === "on") continue;
    const won = num(fd, `won_${i}`);
    const drawn = num(fd, `drawn_${i}`);
    const lost = num(fd, `lost_${i}`);
    // Form guide: letters W/D/L or Persian ب/م/ش, oldest first.
    const form = toLatinDigits(str(fd, `form_${i}`))
      .toUpperCase()
      .replace(/ب/g, "W")
      .replace(/م/g, "D")
      .replace(/ش/g, "L")
      .replace(/[^WDL]/g, "")
      .slice(-5)
      .split("") as StandingRow["form"];
    // With no W/D/L entered, the row keeps the played/points typed in (a short table).
    const partial = won + drawn + lost === 0 && num(fd, `played_${i}`) > 0;
    const deducted = Math.max(0, num(fd, `deducted_${i}`));
    rows.push({
      team,
      played: partial ? num(fd, `played_${i}`) : won + drawn + lost,
      won,
      drawn,
      lost,
      goalsFor: num(fd, `gf_${i}`),
      goalsAgainst: num(fd, `ga_${i}`),
      points: partial ? num(fd, `points_${i}`) : won * 3 + drawn - deducted,
      ...(partial ? { partial: true } : {}),
      ...(!partial && deducted > 0 ? { deducted } : {}),
      ...(form && form.length ? { form } : {}),
    });
  }
  saveLeague({ ...getLeague(), standings: sortStandings(rows), isSample: false });
  redirect(`${BACK}?ok=saved#standings`);
}

const fixtureKey = (f: Fixture) => `${f.home}|${f.away}|${f.date}`;

export async function saveFixture(fd: FormData) {
  await requireAccess("league");
  const league = getLeague();
  const index = str(fd, "index");
  const home = str(fd, "home");
  const away = str(fd, "away");
  if (!home || !away) redirect(withError(BACK, "نام هر دو تیم لازم است."));
  const date = jalaliPartsToIso(str(fd, "date"), str(fd, "time"));
  if (!date) redirect(withError(BACK, "تاریخ را به شکل ۱۴۰۵/۰۸/۱۵ و ساعت را به شکل ۱۸:۳۰ وارد کنید."));
  const status = (["scheduled", "live", "finished"] as const).find((s) => s === str(fd, "status")) ?? "scheduled";

  const fixture: Fixture = {
    date,
    home,
    away,
    status,
    ...(status !== "scheduled" ? { homeScore: num(fd, "homeScore"), awayScore: num(fd, "awayScore") } : {}),
    ...(status === "live" ? { minute: num(fd, "minute") } : {}),
    ...(str(fd, "venue") ? { venue: str(fd, "venue") } : {}),
    ...(num(fd, "round") > 0 ? { round: num(fd, "round") } : {}),
  };

  let fixtures = [...league.fixtures];
  if (index === "new") {
    fixtures.push(fixture);
  } else {
    const i = Number(index);
    // Guard against editing a row that moved because someone else changed the list meanwhile.
    if (!fixtures[i] || fixtureKey(fixtures[i]) !== str(fd, "key")) {
      redirect(withError(BACK, "فهرست بازی‌ها در این فاصله تغییر کرده. صفحه را دوباره باز کنید و دوباره ذخیره کنید."));
    }
    fixtures[i] = fixture;
  }
  fixtures = fixtures.sort((a, b) => a.date.localeCompare(b.date));
  saveLeague({ ...league, fixtures, isSample: false });
  redirect(`${BACK}?ok=saved#fixtures`);
}

export async function deleteFixture(fd: FormData) {
  await requireAccess("league");
  const league = getLeague();
  const i = num(fd, "index", -1);
  if (!league.fixtures[i] || fixtureKey(league.fixtures[i]) !== str(fd, "key")) {
    redirect(withError(BACK, "فهرست بازی‌ها در این فاصله تغییر کرده. صفحه را دوباره باز کنید."));
  }
  saveLeague({ ...league, fixtures: league.fixtures.filter((_, j) => j !== i) });
  redirect(`${BACK}?ok=deleted#fixtures`);
}

/** Saves the source page (e.g. Varzesh3) and reads the table from it right away. */
export async function syncStandings(fd: FormData) {
  await requireAccess("league");
  const url = str(fd, "url");
  if (!/^https?:\/\/\S+$/i.test(url)) redirect(withError(BACK, "آدرس صفحه‌ی جدول را کامل وارد کنید (با https://)."));
  const auto = fd.get("auto") === "on";
  const result = await syncFromUrl(url);
  const league = getLeague();
  saveLeague({
    ...league,
    standingsSource: { url, auto, lastSync: new Date().toISOString(), lastError: result.ok ? undefined : result.error },
  });
  if (!result.ok) redirect(withError(BACK, result.error) + "#sync");
  const note = result.warnings.length ? ` (${result.warnings.length} ردیف خوانده نشد)` : "";
  redirect(`${BACK}?ok=${encodeURIComponent(`جدول با ${result.count} تیم به‌روز شد${note}.`)}#standings`);
}

/** Table copied from the browser and pasted into the panel. */
export async function pasteStandings(fd: FormData) {
  await requireAccess("league");
  const { rows, warnings } = parseStandings(String(fd.get("table") ?? ""));
  if (rows.length < 2) {
    redirect(withError(BACK, "جدولی در متن چسبانده‌شده پیدا نشد. کل جدول را (از ردیف عنوان تا آخرین تیم) انتخاب و کپی کنید.") + "#sync");
  }
  applyStandings(rows);
  const note = warnings.length ? ` — خوانده نشد: ${warnings.join(" ")}` : "";
  redirect(`${BACK}?ok=${encodeURIComponent(`جدول با ${rows.length} تیم به‌روز شد${note}`)}#standings`);
}

export async function undoStandings() {
  await requireAccess("league");
  const league = getLeague();
  if (!league.previousStandings?.length) redirect(withError(BACK, "جدول قبلی‌ای برای برگرداندن نیست."));
  saveLeague({ ...league, standings: league.previousStandings, previousStandings: league.standings });
  redirect(`${BACK}?ok=${encodeURIComponent("جدول قبلی برگردانده شد.")}#standings`);
}

/** Uploads (as WebP) or clears one team's logo; shown wherever the team appears. */
export async function saveTeamLogo(fd: FormData) {
  await requireAccess("league");
  const team = str(fd, "team");
  if (!team) redirect(withError(BACK, "نام تیم مشخص نیست."));
  const league = getLeague();
  const logos = { ...(league.teamLogos ?? {}) };
  const upload = file(fd, "logoFile");
  if (upload) {
    try {
      logos[team] = await saveUploadAsWebp(upload, 256);
    } catch (e) {
      redirect(withError(BACK, (e as Error).message) + "#logos");
    }
  } else if (str(fd, "logo")) {
    logos[team] = str(fd, "logo");
  } else {
    delete logos[team];
  }
  saveLeague({ ...league, teamLogos: logos });
  redirect(`${BACK}?ok=saved#logos`);
}

/** Schedule copied from a sports site (e.g. Varzesh3) and pasted into the panel. */
export async function pasteFixtures(fd: FormData) {
  await requireAccess("league");
  const { fixtures, warnings, rounds } = parseFixtures(String(fd.get("schedule") ?? ""));
  if (fixtures.length === 0) {
    redirect(withError(BACK, "بازی‌ای در متن پیدا نشد. فهرست را از سطر «هفته» تا آخرین بازی انتخاب و کپی کنید.") + "#fixtures");
  }
  const league = getLeague();
  saveLeague({ ...league, fixtures: mergeFixtures(league.fixtures, fixtures, fd.get("dropUnnumbered") === "on"), isSample: false });
  const what = rounds.length ? `هفته ${rounds.join("، ")}` : "بدون شماره‌ی هفته";
  const note = warnings.length ? ` — خوانده نشد: ${warnings.join(" ")}` : "";
  redirect(`${BACK}?ok=${encodeURIComponent(`${fixtures.length} بازی (${what}) ذخیره شد${note}`)}#fixtures`);
}
