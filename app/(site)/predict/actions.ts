"use server";

import { redirect } from "next/navigation";
import { currentFan, getFans, nameProblem, saveFans, signOutFan } from "@/lib/fans";
import { savePredictions } from "@/lib/predictions";

const toInt = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").replace(/[۰-۹]/g, (c) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(c))).replace(/[٠-٩]/g, (c) => String("٠١٢٣٤٥٦٧٨٩".indexOf(c))).trim();
  return /^\d{1,2}$/.test(s) && Number(s) <= 20 ? Number(s) : undefined;
};
const back = (week: string, q: string) => `/predict/?${week ? `week=${week}&` : ""}${q}#matches`;

export async function submitPredictions(fd: FormData) {
  const fan = await currentFan();
  if (!fan) redirect("/predict/login/");
  const week = String(fd.get("week") ?? "").replace(/\D/g, "");
  const keys = fd.getAll("key").map(String);
  const entries: { key: string; home: number; away: number }[] = [];
  let half = 0;
  keys.forEach((key, i) => {
    const h = toInt(fd.get(`h${i}`));
    const a = toInt(fd.get(`a${i}`));
    if (h !== undefined && a !== undefined) entries.push({ key, home: h, away: a });
    else if (h !== undefined || a !== undefined) half++;
  });
  if (!entries.length) redirect(back(week, `error=${encodeURIComponent(half ? "برای هر بازی گل هر دو تیم را بنویسید." : "هنوز نتیجه‌ای ننوشته‌اید.")}`));
  const saved = savePredictions(fan.id, entries);
  const note = half ? ` (${half} بازی که فقط گل یک تیم را داشت ذخیره نشد)` : "";
  redirect(back(week, saved ? `ok=${encodeURIComponent(`پیش‌بینی ${saved} بازی ثبت شد${note}. تا شروع هر بازی می‌توانید تغییرش دهید.`)}` : `error=${encodeURIComponent("این بازی‌ها شروع شده‌اند و پیش‌بینی‌شان بسته است.")}`));
}

export async function saveName(fd: FormData) {
  const fan = await currentFan();
  if (!fan) redirect("/predict/login/");
  const name = String(fd.get("name") ?? "").replace(/\s+/g, " ").trim();
  const problem = nameProblem(name, fan.id);
  if (problem) redirect(`/predict/me/?error=${encodeURIComponent(problem)}`);
  saveFans(getFans().map((f) => (f.id === fan.id ? { ...f, name, named: true } : f)));
  const next = String(fd.get("next") ?? "");
  const to = next.startsWith("/predict/") && !next.includes("//") ? next : "/predict/";
  redirect(`${to}${to.includes("?") ? "&" : "?"}ok=${encodeURIComponent(`نام نمایشی شما «${name}» شد.`)}`);
}

export async function logoutFan() {
  await signOutFan();
  redirect("/predict/");
}
