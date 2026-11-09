import test from "node:test";
import assert from "node:assert/strict";
import { tableDifferences, tableFromResults, withResultForm } from "../lib/results-table.ts";

const F = (d, home, away, hs, as, status = "finished") => ({ date: `2026-10-${String(d).padStart(2, "0")}T14:00:00Z`, home, away, homeScore: hs, awayScore: as, status });
const fx = [
  F(1, "نساجی مازندران", "ملوان", 2, 0),
  F(8, "پرسپولیس", "نساجی مازندران", 1, 1),
  F(15, "نساجی مازندران", "سپاهان", 0, 1),
  F(22, "فولاد", "نساجی مازندران", 0, 3),
  F(29, "نساجی مازندران", "تراکتور", 2, 2),
  F(30, "ملوان", "نساجی مازندران", 1, 0),
  { date: "2026-11-05T14:00:00Z", home: "نساجی مازندران", away: "پیکان", status: "scheduled" },
];

test("table and last five from results, oldest first", () => {
  const n = tableFromResults(fx).get("نساجی مازندران");
  assert.deepEqual([n.played, n.won, n.drawn, n.lost, n.goalsFor, n.goalsAgainst, n.points], [6, 2, 2, 2, 8, 5, 8]);
  assert.deepEqual(n.form, ["D", "L", "W", "D", "L"], "the first match (a win) has dropped off");
});

test("stale symbols replaced only when the results cover every match", () => {
  const rows = [
    { team: "نساجی مازندران", played: 6, won: 2, drawn: 2, lost: 2, goalsFor: 8, goalsAgainst: 5, points: 8, form: ["W", "W", "W", "W", "W"] },
    { team: "ملوان", played: 3, won: 1, drawn: 0, lost: 2, goalsFor: 1, goalsAgainst: 2, points: 3, form: ["L"] },
  ];
  const out = withResultForm(rows, fx);
  assert.deepEqual(out[0].form, ["D", "L", "W", "D", "L"]);
  assert.deepEqual(out[1].form, ["L"], "ملوان: table says 3 matches, results have 2 — kept");
});

test("differences in plain words", () => {
  const rows = [
    { team: "نساجی مازندران", played: 6, won: 3, drawn: 1, lost: 2, goalsFor: 8, goalsAgainst: 5, points: 10 },
    { team: "تراکتور", played: 1, won: 0, drawn: 1, lost: 0, goalsFor: 2, goalsAgainst: 2, points: 1 },
    { team: "گل گهر", played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 },
  ];
  const d = tableDifferences(rows, fx);
  assert.equal(d.length, 2);
  assert.match(d[0].notes.join(" "), /2-2-2/);
  assert.match(d[1].notes[0], /هیچ نتیجه‌ای/);
});
