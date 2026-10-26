import fs from "node:fs";
import path from "node:path";
import type { LeagueData } from "./types";

// For now league data comes from a JSON file that can be edited by hand.
// A live provider (football API, polled server-side and cached) will replace this.
export function getLeague(): LeagueData {
  const file = path.join(process.cwd(), "content", "league", "pro-league.json");
  return JSON.parse(fs.readFileSync(file, "utf8"));
}
