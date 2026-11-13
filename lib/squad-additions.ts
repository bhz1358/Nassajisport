// Players shipped with an update (content/squad-additions.json): a missing player is added (when
// their shirt number is known and free); an existing one only gets the fields still empty. Each
// entry is used once, so a player the admin deletes later doesn't come back.

import fs from "node:fs";
import path from "node:path";
import { getSquad, saveSquad } from "./squad";
import { readStore, writeStore } from "./store";
import type { Player, Position } from "./types";

/** fixFrom: a position given earlier as a guess; a player still on it is moved to `position`. */
type Addition = { name: string; number?: number; position?: Position; bio?: string; fixFrom?: Position };
type File = { players: Addition[]; staff?: { role: string; name: string }[]; replaceSample?: boolean };

/** Players of the sample squad the site starts with. */
export const isSample = (name: string) => /نمونه/.test(name);

const key = (s: string) => s.replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/[\s‌_-]+/g, "");

function load(): File {
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(process.cwd(), "content", "squad-additions.json"), "utf8"));
    return Array.isArray(raw) ? { players: raw } : raw;
  } catch {
    return { players: [] };
  }
}

export function applySquadAdditions(): number {
  const file = load();
  const done = new Set(readStore<string[]>("squad-additions-applied", () => []));
  const todo = file.players.filter((a) => !done.has(key(a.name)));
  const squad = getSquad();
  const players = [...squad.players];
  let staff = squad.staff;
  let changed = 0;
  // Corrections of earlier guesses, for players already added (only while still on the guess).
  for (const a of file.players) {
    if (!a.fixFrom || !a.position) continue;
    const i = players.findIndex((p) => key(p.name) === key(a.name));
    if (i >= 0 && players[i].position === a.fixFrom) {
      players[i] = { ...players[i], position: a.position, ...(a.bio && !players[i].bio ? { bio: a.bio } : {}) };
      changed++;
    }
  }
  for (const a of todo) {
    const i = players.findIndex((p) => key(p.name) === key(a.name));
    if (i >= 0) {
      const p = players[i];
      if (a.bio && !p.bio) {
        players[i] = { ...p, bio: a.bio };
        changed++;
      }
      done.add(key(a.name));
      continue;
    }
    // A new player needs a shirt number and a position. A sample player («… نمونه …», shipped with
    // the site) holding that number gives way; a real one means waiting for the panel.
    if (!a.number || !a.position) continue;
    const holder = players.findIndex((p) => p.number === a.number);
    if (holder >= 0) {
      if (!isSample(players[holder].name)) continue;
      players.splice(holder, 1);
    }
    let slug = `player-${a.number}`;
    if (players.some((p) => p.slug === slug)) slug = `${slug}-${Date.now().toString(36)}`;
    players.push({
      slug,
      name: a.name,
      number: a.number,
      position: a.position,
      ...(a.bio ? { bio: a.bio } : {}),
      stats: { appearances: 0, minutes: 0, goals: 0, assists: 0, yellowCards: 0, redCards: 0, ...(a.position === "GK" ? { cleanSheets: 0 } : {}) },
    });
    done.add(key(a.name));
    changed++;
  }
  // The real squad has arrived: the sample players and staff leave (once).
  const real = players.filter((p) => !isSample(p.name)).length;
  if (file.replaceSample && real >= 11 && (players.some((p) => isSample(p.name)) || squad.isSample)) {
    for (let i = players.length - 1; i >= 0; i--) if (isSample(players[i].name)) players.splice(i, 1);
    changed++;
  }
  if (file.staff?.length && staff.every((s) => isSample(s.name)) && !done.has("staff")) {
    staff = file.staff;
    done.add("staff");
    changed++;
  }
  // A line-up of sample players goes with them.
  const sampleLineup = squad.lineup && [...squad.lineup.home.starters, ...squad.lineup.away.starters].some((p) => isSample(p.name));
  const lineup = file.replaceSample && sampleLineup && !players.some((p) => isSample(p.name)) ? undefined : squad.lineup;
  if (lineup !== squad.lineup) changed++;
  if (changed) saveSquad({ ...squad, players, staff, lineup, isSample: players.some((p) => isSample(p.name)) });
  writeStore("squad-additions-applied", [...done]);
  return changed;
}
