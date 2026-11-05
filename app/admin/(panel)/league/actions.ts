"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { num, str, withError } from "@/lib/form";
import { jalaliPartsToIso, toLatinDigits } from "@/lib/jalali";
import { getLeague, saveLeague, sortStandings } from "@/lib/league";
import type { Fixture, StandingRow } from "@/lib/types";

const BACK = "/admin/league/";

export async function saveLeagueInfo(fd: FormData) {
  await requireAdmin();
  const league = getLeague();
  saveLeague({ ...league, competition: str(fd, "competition") || league.competition, season: str(fd, "season") || league.season });
  redirect(`${BACK}?ok=saved`);
}

/** Played and points are computed, and the table is re-sorted, so they can never disagree. */
export async function saveStandings(fd: FormData) {
  await requireAdmin();
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
    rows.push({
      team,
      played: won + drawn + lost,
      won,
      drawn,
      lost,
      goalsFor: num(fd, `gf_${i}`),
      goalsAgainst: num(fd, `ga_${i}`),
      points: won * 3 + drawn,
      ...(form && form.length ? { form } : {}),
    });
  }
  saveLeague({ ...getLeague(), standings: sortStandings(rows), isSample: false });
  redirect(`${BACK}?ok=saved#standings`);
}

const fixtureKey = (f: Fixture) => `${f.home}|${f.away}|${f.date}`;

export async function saveFixture(fd: FormData) {
  await requireAdmin();
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
  await requireAdmin();
  const league = getLeague();
  const i = num(fd, "index", -1);
  if (!league.fixtures[i] || fixtureKey(league.fixtures[i]) !== str(fd, "key")) {
    redirect(withError(BACK, "فهرست بازی‌ها در این فاصله تغییر کرده. صفحه را دوباره باز کنید."));
  }
  saveLeague({ ...league, fixtures: league.fixtures.filter((_, j) => j !== i) });
  redirect(`${BACK}?ok=deleted#fixtures`);
}
