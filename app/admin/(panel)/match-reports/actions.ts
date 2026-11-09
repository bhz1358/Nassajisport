"use server";

import { redirect } from "next/navigation";
import { requireAccess } from "@/lib/auth";
import { file, num, str, withError } from "@/lib/form";
import { getLeague } from "@/lib/league";
import { forgetReport, getReports, reportId, saveReports, type MatchReport, type SheetPlayer } from "@/lib/match-reports";
import { saveUploadAsWebp } from "@/lib/media";
import { fixtureKey } from "@/lib/predict-score";
import { parseLineupText } from "@/lib/squad";

const fa2en = (s: string) => s.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
/** One player per line: "9 جواد آقایی پور (گل)", "(2 گل)" for two, "(c)" for the captain. */
const players = (text: string): SheetPlayer[] =>
  text
    .split("\n")
    .map((line) => {
      const m = fa2en(line).match(/\((\d+)?\s*گل\)/);
      const goals = m ? Number(m[1] ?? 1) : 0;
      const [p] = parseLineupText(line.replace(/\(([\d۰-۹]+)?\s*گل\)/, "").trim());
      return p ? { ...(p.number ? { number: p.number } : {}), name: p.name, ...(p.captain ? { captain: true } : {}), ...(goals ? { goals } : {}) } : undefined;
    })
    .filter((p): p is SheetPlayer => !!p && !!p.name);

/** "سرمربی: سعید دقیقی" per line. */
const pairs = (text: string) =>
  text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const m = l.match(/^([^:：]+)[:：]\s*(.+)$/);
      return m ? { role: m[1].trim(), name: m[2].trim() } : { role: "", name: l };
    });

export async function saveReport(fd: FormData) {
  await requireAccess("squad");
  const old = str(fd, "old");
  const back = `/admin/match-reports/${old ? encodeURIComponent(old) : "new"}/`;
  const f = getLeague().fixtures.find((x) => fixtureKey(x) === str(fd, "fixture"));
  if (!f) redirect(withError(back, "بازی را از فهرست انتخاب کنید."));
  const side = (s: "home" | "away") => ({
    team: str(fd, `${s}_team`) || f[s],
    kit: { shirt: str(fd, `${s}_shirt`) || undefined, shorts: str(fd, `${s}_shorts`) || undefined, socks: str(fd, `${s}_socks`) || undefined },
    starters: players(str(fd, `${s}_starters`)),
    subs: players(str(fd, `${s}_subs`)),
    staff: pairs(str(fd, `${s}_staff`)),
  });
  const home = side("home");
  const away = side("away");
  if (!home.starters.length && !away.starters.length) redirect(withError(back, "دست‌کم ترکیب اصلی یکی از تیم‌ها را وارد کنید."));
  const reports = getReports();
  const existing = reports.find((r) => r.id === old);
  let sheetImage = existing?.sheetImage;
  const upload = file(fd, "sheet");
  if (upload) {
    try {
      sheetImage = await saveUploadAsWebp(upload, 2000);
    } catch (e) {
      redirect(withError(back, (e as Error).message));
    }
  }
  if (fd.get("remove_sheet") === "on") sheetImage = undefined;
  const report: MatchReport = {
    id: existing?.id ?? reportId(f.round, f.home, f.away, f.date),
    round: f.round,
    matchNo: num(fd, "matchNo") || undefined,
    competition: str(fd, "competition") || undefined,
    date: f.date,
    city: str(fd, "city") || undefined,
    venue: str(fd, "venue") || f.venue || undefined,
    weather: str(fd, "weather") || undefined,
    home,
    away,
    officials: pairs(str(fd, "officials")),
    sheetImage,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  };
  if (!existing && reports.some((r) => r.id === report.id)) redirect(withError(back, "برای این بازی گزارش ثبت شده است؛ همان را ویرایش کنید."));
  saveReports(existing ? reports.map((r) => (r.id === existing.id ? report : r)) : [report, ...reports]);
  redirect(`/admin/match-reports/${encodeURIComponent(report.id)}/?ok=saved`);
}

export async function deleteReport(fd: FormData) {
  await requireAccess("squad");
  saveReports(getReports().filter((r) => r.id !== str(fd, "id")));
  forgetReport(str(fd, "id"));
  redirect("/admin/match-reports/?ok=deleted");
}
