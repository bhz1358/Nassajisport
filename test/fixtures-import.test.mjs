import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { mergeFixtures, parseFixtures } from "../lib/fixtures-import.ts";

const text = fs.readFileSync(new URL("./fixtures/varzesh3-fixtures.txt", import.meta.url), "utf8");

test("reads a Varzesh3 schedule as copied from the browser", () => {
  const { fixtures, warnings, rounds } = parseFixtures(text);
  assert.deepEqual(warnings, []);
  assert.deepEqual(rounds, [12]);
  assert.equal(fixtures.length, 5);
  assert.deepEqual(fixtures[0], {
    date: "2026-11-05T13:00:00.000Z", // 1405/08/14 16:30 Tehran
    home: "شمس آذر قزوین",
    away: "صنعت نفت آبادان",
    status: "finished",
    homeScore: 0,
    awayScore: 1,
    round: 12,
  });
  assert.deepEqual(
    fixtures.slice(1).map((f) => [f.home, f.away, f.status]),
    [
      ["سپاهان", "ملوان", "scheduled"],
      ["آلومینیوم اراک", "مس شهر بابک", "scheduled"],
      ["پرسپولیس", "فجر سپاسی", "scheduled"],
      ["چادرملو اردکان", "فولاد", "scheduled"],
    ],
  );
  assert.equal(fixtures[4].date, "2026-11-06T14:00:00.000Z"); // 1405/08/15 17:30
});

test("merging updates the same match and drops unnumbered sample matches", () => {
  const old = [
    { date: "2026-10-01T10:00:00.000Z", home: "الف", away: "ب", status: "finished", homeScore: 1, awayScore: 0 },
    { date: "2026-11-06T12:00:00.000Z", home: "سپاهان", away: "ملوان", status: "scheduled", round: 12, venue: "نقش جهان" },
  ];
  const merged = mergeFixtures(old, parseFixtures(text).fixtures, true);
  assert.equal(merged.length, 5);
  const sep = merged.find((f) => f.home === "سپاهان");
  assert.equal(sep.venue, "نقش جهان");
  assert.equal(sep.date, "2026-11-06T12:00:00.000Z");
  assert.equal(mergeFixtures(old, [], false).length, 2);
});
