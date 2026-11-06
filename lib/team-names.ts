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
