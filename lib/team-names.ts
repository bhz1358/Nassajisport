import { HOME_TEAM } from "./site.ts";
import type { LeagueData, StandingRow } from "./types";

// A form guide copied letter by letter ("W W D W W") can end up glued to a team name.
const TRAILING_FORM = /^(.*?\S)\s+((?:[WDLبمش]\s*){2,10})$/i;
const LETTER: Record<string, "W" | "D" | "L"> = { W: "W", D: "D", L: "L", ب: "W", م: "D", ش: "L" };

export const isFormLetter = (t: string) => /^[WDLبمش]$/i.test(t);

export function formFromLetters(s: string): StandingRow["form"] {
  return [...s.replace(/\s+/g, "").toUpperCase()].map((ch) => LETTER[ch]).filter(Boolean);
}

/** "فولاد W W D W W" → { name: "فولاد", form: ["W","W","D","W","W"] }. */
export function splitNameAndForm(raw: string): { name: string; form?: StandingRow["form"] } {
  const m = raw.trim().match(TRAILING_FORM);
  if (!m) return { name: raw.trim() };
  return { name: m[1].trim(), form: formFromLetters(m[2]) };
}

/**
 * Repairs tables saved before the importer understood form letters copied one by one:
 * "فولاد W W D W W" becomes team "فولاد" with that form. Returns the same object when clean.
 */
export function cleanTeamNames(league: LeagueData): LeagueData {
  let changed = false;
  const fix = (team: string) => {
    const { name, form } = splitNameAndForm(team);
    const canonical = name.includes("نساجی") ? HOME_TEAM : name;
    if (canonical !== team) changed = true;
    return { name: canonical, form };
  };
  const standings = league.standings.map((r) => {
    const { name, form } = fix(r.team);
    return name === r.team ? r : { ...r, team: name, ...(form?.length ? { form } : {}) };
  });
  const fixtures = league.fixtures.map((f) => {
    const home = fix(f.home).name;
    const away = fix(f.away).name;
    return home === f.home && away === f.away ? f : { ...f, home, away };
  });
  return changed ? { ...league, standings, fixtures } : league;
}

const cmpNorm = (s: string) => s.replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/[‌‏‎]/g, " ").replace(/\s+/g, " ").trim();

/**
 * Maps a team name as another site writes it to the name already used on this site:
 * "استقلال خ" → "استقلال خوزستان", "ملوان بندر انزلی" → "ملوان", "آلومینیوم" → "آلومینیوم اراک".
 * A short form that is the start of a known name wins over a known name that is the start
 * of it, so "استقلال خ" is not taken for "استقلال". Unclear or unknown names are kept.
 */
export function canonicalTeam(raw: string, known: string[]): string {
  const n = cmpNorm(raw);
  if (n.includes("نساجی")) return HOME_TEAM;
  const names = [...new Set(known)];
  const lastWord = n.split(" ").pop() ?? "";
  // "استقلال خ" is short for a longer name even if an older table saved it as-is.
  const abbreviated = n.includes(" ") && lastWord.length <= 2;
  const exact = names.find((k) => cmpNorm(k) === n);
  if (exact && !abbreviated) return exact;
  // n is an abbreviation of k: "استقلال خ" of "استقلال خوزستان", "صنعت نفت" of "صنعت نفت آبادان".
  const longer = names.filter((k) => {
    const kn = cmpNorm(k);
    if (kn === n) return false;
    return kn.startsWith(`${n} `) || (lastWord.length <= 2 && n.includes(" ") && kn.startsWith(n));
  });
  if (longer.length === 1) return longer[0];
  if (longer.length > 1) return exact ?? raw;
  if (exact) return exact;
  // k is the short name used here: "ملوان" for "ملوان بندر انزلی", "فجر سپاسی" for "فجر سپاسی ش".
  const shorter = names.filter((k) => n.startsWith(`${cmpNorm(k)} `)).sort((a, b) => b.length - a.length);
  return shorter[0] ?? raw;
}
