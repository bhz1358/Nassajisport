#!/usr/bin/env node
// Copies the league data shipped in the repository (content/league/pro-league.json)
// into the live site's data, so a table or schedule prepared in the code can be put
// on the server with one command. A backup of the current data is made first.
//
//   node scripts/apply-league.mjs DATA_DIR [--standings] [--fixtures]
// With neither flag, only the standings are copied.

import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const dataDir = args.find((a) => !a.startsWith("--")) || process.env.DATA_DIR || "data";
const wantFixtures = args.includes("--fixtures");
const wantStandings = args.includes("--standings") || !wantFixtures;

const source = JSON.parse(fs.readFileSync(new URL("../content/league/pro-league.json", import.meta.url), "utf8"));
const target = path.join(dataDir, "league.json");
const current = fs.existsSync(target) ? JSON.parse(fs.readFileSync(target, "utf8")) : source;

if (fs.existsSync(target)) {
  const backup = `${target}.before-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  fs.copyFileSync(target, backup);
  console.log(`Backup: ${backup}`);
}

const next = { ...current, updatedAt: new Date().toISOString(), isSample: false };
if (wantStandings) {
  next.previousStandings = current.standings;
  next.standings = source.standings;
  console.log(`Standings: ${source.standings.length} teams`);
}
if (wantFixtures) {
  next.fixtures = source.fixtures;
  console.log(`Fixtures: ${source.fixtures.length} matches`);
}
const tmp = `${target}.tmp`;
fs.writeFileSync(tmp, JSON.stringify(next, null, 2) + "\n");
fs.renameSync(tmp, target);
console.log("Done. The site shows the new data right away.");
