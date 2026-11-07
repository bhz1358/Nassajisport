#!/usr/bin/env node
// Reads a league-table page the way the admin panel's "دریافت جدول" does, and prints
// what it found, without saving anything. For checking a new source on the server.
//
//   node scripts/check-standings.mjs URL [--text]
// --text also prints the page as the reader sees it (to send for troubleshooting).

import { htmlToText, parseStandings } from "../lib/standings-import.ts";

const [url] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
if (!url) {
  console.error("Usage: node scripts/check-standings.mjs URL [--text]");
  process.exit(1);
}
const res = await fetch(new URL(url).href, {
  headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36", "Accept-Language": "fa" },
  signal: AbortSignal.timeout(30_000),
});
console.log(`HTTP ${res.status}`);
const html = await res.text();
const { rows, warnings } = parseStandings(html);
console.log(`${rows.length} teams read:`);
for (const r of rows) console.log(`  ${r.team}: بازی ${r.played} | ${r.won}-${r.drawn}-${r.lost} | گل ${r.goalsFor}-${r.goalsAgainst} | امتیاز ${r.points}${r.form?.length ? ` | فرم ${r.form.join("")}` : ""}`);
for (const w of warnings) console.log(`  ! ${w}`);
if (process.argv.includes("--text")) console.log("\n--- page text from the table header on (first 60 lines):\n" + htmlToText(html).split("\n").slice(0, 60).join("\n"));
