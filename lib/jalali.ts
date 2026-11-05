// Admin forms take dates in the Persian (Jalali) calendar and Tehran time;
// everything is stored as ISO/UTC.

const TZ = "Asia/Tehran";
const TEHRAN_OFFSET_MIN = 210; // +03:30; Iran has not observed DST since 2022.

export function toLatinDigits(s: string): string {
  return s
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

/** Jalali → Gregorian (algorithm from jalaali-js). */
export function jalaliToGregorian(jy: number, jm: number, jd: number): [number, number, number] {
  jy += 1595;
  let days = -355668 + 365 * jy + Math.floor(jy / 33) * 8 + Math.floor(((jy % 33) + 3) / 4) + jd + (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);
  let gy = 400 * Math.floor(days / 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let gd = days + 1;
  const leap = (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0;
  const monthDays = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0;
  while (gm < 12 && gd > monthDays[gm]) gd -= monthDays[gm++];
  return [gy, gm + 1, gd];
}

const partsFmt = new Intl.DateTimeFormat("en-US-u-ca-persian-nu-latn", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: TZ,
});

/** ISO → { date: "1405/08/04", time: "17:00" } in Tehran time. */
export function isoToJalaliParts(iso: string | undefined): { date: string; time: string } {
  if (!iso) return { date: "", time: "" };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: "", time: "" };
  const get = (t: string) => partsFmt.formatToParts(d).find((p) => p.type === t)?.value ?? "";
  return { date: `${get("year")}/${get("month")}/${get("day")}`, time: `${get("hour")}:${get("minute")}` };
}

/** "1405/08/04" + "17:00" (Tehran) → ISO. Returns undefined for unparseable input. */
export function jalaliPartsToIso(date: string, time = "00:00"): string | undefined {
  const dm = toLatinDigits(date).trim().match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/);
  if (!dm) return undefined;
  const [jy, jm, jd] = dm.slice(1).map(Number);
  if (jm < 1 || jm > 12 || jd < 1 || jd > 31) return undefined;
  const tm = toLatinDigits(time || "00:00").trim().match(/^(\d{1,2}):(\d{2})$/);
  const [h, min] = tm ? [Number(tm[1]), Number(tm[2])] : [0, 0];
  if (h > 23 || min > 59) return undefined;
  const [gy, gm, gd] = jalaliToGregorian(jy, jm, jd);
  return new Date(Date.UTC(gy, gm - 1, gd, h, min) - TEHRAN_OFFSET_MIN * 60_000).toISOString();
}
