// Players shipped with an update (content/squad-additions.json): a missing player is added (when
// their shirt number is known and free); an existing one only gets the fields still empty. Each
// entry is used once, so a player the admin deletes later doesn't come back.

import fs from "node:fs";
import path from "node:path";
import { getSquad, saveSquad } from "./squad";
import { readStore, writeStore } from "./store";
import type { Player, Position } from "./types";

type Addition = { name: string; number?: number; position?: Position; bio?: string };

const key = (s: string) => s.replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/[\s‌_-]+/g, "");

function additions(): Addition[] {
  try {
    return JSON.parse(fs.readFileSync(path.join(process.cwd(), "content", "squad-additions.json"), "utf8"));
  } catch {
    return [];
  }
}

export function applySquadAdditions(): number {
  const done = new Set(readStore<string[]>("squad-additions-applied", () => []));
  const todo = additions().filter((a) => !done.has(key(a.name)));
  if (!todo.length) return 0;
  const squad = getSquad();
  const players = [...squad.players];
  let changed = 0;
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
    // A new player needs a free shirt number and a position; otherwise wait for the panel.
    if (!a.number || !a.position || players.some((p) => p.number === a.number)) continue;
    let slug = `player-${a.number}`;
    if (players.some((p) => p.slug === slug)) slug = `${slug}-${Date.now().toString(36)}`;
    const player: Player = {
      slug,
      name: a.name,
      number: a.number,
      position: a.position,
      ...(a.bio ? { bio: a.bio } : {}),
      stats: { appearances: 0, minutes: 0, goals: 0, assists: 0, yellowCards: 0, redCards: 0, ...(a.position === "GK" ? { cleanSheets: 0 } : {}) },
    };
    players.push(player);
    done.add(key(a.name));
    changed++;
  }
  if (changed) saveSquad({ ...squad, players });
  writeStore("squad-additions-applied", [...done]);
  return changed;
}
