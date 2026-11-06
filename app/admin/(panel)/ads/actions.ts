"use server";

import crypto from "node:crypto";
import path from "node:path";
import { redirect } from "next/navigation";
import { getAds, safeAdUrl, saveAds, type Ad, type AdSlotId } from "@/lib/ads";
import { requireAccess } from "@/lib/auth";
import { file, str, withError } from "@/lib/form";
import { jalaliPartsToIso } from "@/lib/jalali";
import { saveUpload } from "@/lib/media";
import { readStore, writeStore } from "@/lib/store";

const BACK = "/admin/ads/";

// Banners keep their original file (no WebP conversion) so animated GIFs stay animated.
async function imageFrom(fd: FormData, name: string, current?: string): Promise<string | undefined> {
  const upload = file(fd, `${name}File`);
  // Saved under a neutral name: ad blockers hide files named like "728x90.gif".
  if (upload) return saveUpload(new File([upload], `media${path.extname(upload.name).toLowerCase()}`, { type: upload.type }));
  return str(fd, name) || (fd.has(name) ? undefined : current);
}

export async function saveAd(fd: FormData) {
  await requireAccess("ads");
  const id = str(fd, "id");
  const ads = getAds();
  const existing = ads.find((a) => a.id === id);
  const back = `${BACK}${existing ? `#ad-${id}` : "#new"}`;

  const slot = Number(str(fd, "slot")) as AdSlotId;
  if (![1, 2, 3, 4].includes(slot)) redirect(withError(BACK, "جایگاه تبلیغ را انتخاب کنید."));
  const url = str(fd, "url");
  if (!safeAdUrl(url)) redirect(withError(BACK, "لینک تبلیغ باید کامل و با https:// باشد.") + back);

  const dates: Record<"start" | "end", string | undefined> = { start: undefined, end: undefined };
  for (const k of ["start", "end"] as const) {
    const v = str(fd, k);
    if (!v) continue;
    // Start counts from the beginning of its day, end until the end of its day (Tehran time).
    const iso = jalaliPartsToIso(v, k === "start" ? "00:00" : "23:59");
    if (!iso) redirect(withError(BACK, `تاریخ ${k === "start" ? "شروع" : "پایان"} را شمسی و به شکل ۱۴۰۵/۰۸/۲۰ وارد کنید.`) + back);
    dates[k] = iso;
  }
  if (dates.start && dates.end && dates.start > dates.end) redirect(withError(BACK, "تاریخ پایان قبل از تاریخ شروع است.") + back);

  let image: string | undefined;
  let mobileImage: string | undefined;
  try {
    image = await imageFrom(fd, "image", existing?.image);
    mobileImage = await imageFrom(fd, "mobileImage", existing?.mobileImage);
  } catch (e) {
    redirect(withError(BACK, (e as Error).message) + back);
  }
  if (!image) redirect(withError(BACK, "عکس یا ویدیوی بنر را بارگذاری کنید.") + back);

  const ad: Ad = {
    id: existing?.id ?? crypto.randomBytes(5).toString("hex"),
    slot,
    title: str(fd, "title") || "تبلیغ",
    image,
    ...(mobileImage ? { mobileImage } : {}),
    url,
    ...(dates.start ? { start: dates.start } : {}),
    ...(dates.end ? { end: dates.end } : {}),
    enabled: fd.get("enabled") === "on",
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  };
  saveAds(existing ? ads.map((a) => (a.id === id ? ad : a)) : [...ads, ad]);
  redirect(`${BACK}?ok=${existing ? "saved" : "created"}#ad-${ad.id}`);
}

export async function deleteAd(fd: FormData) {
  await requireAccess("ads");
  const id = str(fd, "id");
  saveAds(getAds().filter((a) => a.id !== id));
  // Its counts go too, so a later ad can never inherit them.
  const stats = readStore<Record<string, unknown>>("ad-stats", () => ({}));
  if (id in stats) {
    const { [id]: _gone, ...rest } = stats;
    writeStore("ad-stats", rest);
  }
  redirect(`${BACK}?ok=deleted`);
}
