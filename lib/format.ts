const TZ = "Asia/Tehran";

const dateFmt = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: TZ,
});
const shortDateFmt = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { month: "long", day: "numeric", timeZone: TZ });
const weekdayFmt = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { weekday: "long", month: "long", day: "numeric", timeZone: TZ });
const timeFmt = new Intl.DateTimeFormat("fa-IR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TZ });

export function faDate(iso: string): string {
  return dateFmt.format(new Date(iso));
}

export function faShortDate(iso: string): string {
  return shortDateFmt.format(new Date(iso));
}

export function faWeekday(iso: string): string {
  return weekdayFmt.format(new Date(iso));
}

export function faTime(iso: string): string {
  return timeFmt.format(new Date(iso));
}

export function faNum(n: number): string {
  return n.toLocaleString("fa-IR");
}

export function readingMinutes(html: string): number {
  const words = html.replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
