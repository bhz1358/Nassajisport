import { getNews } from "./content";
import { readStore, seedFromContent, writeStore } from "./store";
import type { LineupPlayer, Player, Position, Squad, TeamLineup } from "./types";

export const POSITIONS: { key: Position; label: string; plural: string }[] = [
  { key: "GK", label: "دروازه‌بان", plural: "دروازه‌بان‌ها" },
  { key: "DF", label: "مدافع", plural: "مدافعان" },
  { key: "MF", label: "هافبک", plural: "هافبک‌ها" },
  { key: "FW", label: "مهاجم", plural: "مهاجمان" },
];

export const FORMATIONS = ["4-3-3", "4-4-2", "4-2-3-1", "4-1-4-1", "4-5-1", "3-5-2", "3-4-3", "5-3-2", "5-4-1", "4-3-2-1", "4-4-1-1"];

export const positionLabel = (p: Position) => POSITIONS.find((x) => x.key === p)!.label;

export function getSquad(): Squad {
  return readStore<Squad>("squad", () => seedFromContent("squad/squad.json"));
}

export function saveSquad(squad: Squad) {
  writeStore("squad", squad);
}

export function getPlayer(slug: string): Player | undefined {
  return getSquad().players.find((p) => p.slug === slug);
}

export function ageOn(birthDate: string, at = new Date()): number {
  const b = new Date(birthDate);
  let age = at.getFullYear() - b.getFullYear();
  if (at.getMonth() < b.getMonth() || (at.getMonth() === b.getMonth() && at.getDate() < b.getDate())) age--;
  return age;
}

/** Splits a team's starting XI into lines (goalkeeper, then each outfield line) using its formation. */
export function lineupRows(team: TeamLineup): LineupPlayer[][] {
  const sizes = [1, ...team.formation.split("-").map(Number).filter((n) => n > 0)];
  const rows: LineupPlayer[][] = [];
  let i = 0;
  for (const n of sizes) {
    rows.push(team.starters.slice(i, i + n));
    i += n;
  }
  // Anyone beyond the formation's 11 (bad data) still shows up in the last line.
  if (i < team.starters.length) rows[rows.length - 1].push(...team.starters.slice(i));
  return rows.filter((r) => r.length > 0);
}

/**
 * Parses one player per line: "number name", optionally ending in "(c)" or "(ک)" for the captain.
 * This is the format the admin lineup editor uses.
 */
export function parseLineupText(text: string, players: Player[] = []): LineupPlayer[] {
  const toLatin = (s: string) => s.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const m = toLatin(line).match(/^(\d{1,3})[\s\-–.:]+(.+)$/);
      let number = m ? Number(m[1]) : 0;
      let name = (m ? m[2] : line).trim();
      const captain = /\((c|C|ک|کاپیتان)\)\s*$/.test(name);
      name = name.replace(/\((c|C|ک|کاپیتان)\)\s*$/, "").trim();
      const match = players.find((p) => p.name === name) ?? (number ? players.find((p) => p.number === number) : undefined);
      if (!number && match) number = match.number;
      return { number, name, ...(match && match.name === name ? { slug: match.slug } : {}), ...(captain ? { captain } : {}) };
    });
}

export function lineupToText(list: LineupPlayer[]): string {
  return list.map((p) => `${p.number} ${p.name}${p.captain ? " (c)" : ""}`).join("\n");
}

export function newsAboutPlayer(player: Player) {
  return getNews().filter((p) => p.tags.includes(player.name) || p.title.includes(player.name));
}
