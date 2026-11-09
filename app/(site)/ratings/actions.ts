"use server";

import { redirect } from "next/navigation";
import { currentFan } from "@/lib/fans";
import { saveRatings } from "@/lib/ratings";

export async function submitRatings(fd: FormData) {
  const fan = await currentFan();
  if (!fan) redirect("/predict/login/?next=/ratings/");
  const key = String(fd.get("poll") ?? "");
  const raw: Record<string, unknown> = {};
  for (const [k, v] of fd.entries()) if (k.startsWith("s_")) raw[k.slice(2)] = v;
  const n = saveRatings(fan.id, key, raw);
  const msg =
    n < 0 ? "error=" + encodeURIComponent("نمره‌دهی این بازی بسته شده است.") : n === 0 ? "error=" + encodeURIComponent("دست‌کم به یک نفر نمره بدهید.") : "ok=" + encodeURIComponent(`نمرهٔ ${n} نفر ثبت شد. تا پایان نمره‌دهی می‌توانید تغییرش دهید.`);
  redirect(`/ratings/?${msg}#rate`);
}
