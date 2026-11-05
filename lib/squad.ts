import fs from "node:fs";
import path from "node:path";
import { getNews } from "./content";
import type { Player, Position, Squad } from "./types";

export const POSITIONS: { key: Position; label: string; plural: string }[] = [
  { key: "GK", label: "دروازه‌بان", plural: "دروازه‌بان‌ها" },
  { key: "DF", label: "مدافع", plural: "مدافعان" },
  { key: "MF", label: "هافبک", plural: "هافبک‌ها" },
  { key: "FW", label: "مهاجم", plural: "مهاجمان" },
];

export const positionLabel = (p: Position) => POSITIONS.find((x) => x.key === p)!.label;

// Edited by hand for now; an admin panel will write this file later.
export function getSquad(): Squad {
  const file = path.join(process.cwd(), "content", "squad", "squad.json");
  return JSON.parse(fs.readFileSync(file, "utf8"));
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

/** Splits the starting XI into lines (goalkeeper, then each outfield line) using the formation string. */
export function lineupRows(squad: Squad): Player[][] {
  const lu = squad.lineup;
  if (!lu) return [];
  const bySlug = new Map(squad.players.map((p) => [p.slug, p]));
  const starters = lu.starters.map((s) => bySlug.get(s)).filter((p): p is Player => !!p);
  const sizes = [1, ...lu.formation.split("-").map(Number)];
  const rows: Player[][] = [];
  let i = 0;
  for (const n of sizes) {
    rows.push(starters.slice(i, i + n));
    i += n;
  }
  return rows;
}

export function newsAboutPlayer(player: Player) {
  return getNews().filter((p) => p.tags.includes(player.name) || p.title.includes(player.name));
}
