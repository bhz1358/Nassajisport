import test from "node:test";
import assert from "node:assert/strict";
import { currentWeek } from "../lib/weeks.ts";

// Week 12: Thu 6 Nov – Sat 8 Nov 2026 (Tehran evenings); week 13: Thu 13 Nov – Sat 15 Nov.
const at = (d, h = 18) => new Date(`2026-11-${String(d).padStart(2, "0")}T${String(h).padStart(2, "0")}:00:00+03:30`).toISOString();
const week = (round, days, status = "scheduled") => days.map((d) => ({ date: at(d), home: `a${round}${d}`, away: `b${round}${d}`, round, status }));
const fixtures = [...week(11, [30 - 30 + 1, 1, 2], "finished").map((f) => ({ ...f, date: at(1) })), ...week(12, [6, 7, 8]), ...week(13, [13, 14, 15])];
const now = (d, h) => Date.parse(at(d, h));

test("during a week, that week", () => {
  assert.equal(currentWeek(fixtures, now(6, 12)), 12, "before its first match on the first day");
  assert.equal(currentWeek(fixtures, now(7, 20)), 12);
  assert.equal(currentWeek(fixtures, now(8, 23)), 12, "evening of the last match");
});

test("results stay 24 hours after the last match ends; then the next week", () => {
  // last match: Sat 8 Nov 18:00, over by 20:00 → week 13 from Sun 9 Nov 20:00
  assert.equal(currentWeek(fixtures, now(9, 10)), 12, "next morning");
  assert.equal(currentWeek(fixtures, now(9, 19) + 59 * 60_000), 12, "a minute before 24 hours");
  assert.equal(currentWeek(fixtures, now(9, 20)), 13, "24 hours after the match ended");
  assert.equal(currentWeek(fixtures, now(9, 23)), 13);
  assert.equal(currentWeek(fixtures, now(12, 9)), 13, "before week 13 starts");
});

test("a postponed match doesn't hold its week", () => {
  const postponed = [...fixtures, { date: at(28), home: "x", away: "y", round: 12, status: "scheduled" }];
  assert.equal(currentWeek(postponed, now(10, 12)), 13);
});

test("an old unplayed match doesn't pull the week back (status is not used)", () => {
  const stale = fixtures.map((f) => (f.round === 11 ? { ...f, status: "scheduled" } : f));
  assert.equal(currentWeek(stale, now(7, 12)), 12);
});

test("before the season the first week; after it the last", () => {
  assert.equal(currentWeek(fixtures, Date.parse("2026-10-01T00:00:00Z")), 11);
  assert.equal(currentWeek(fixtures, Date.parse("2027-01-01T00:00:00Z")), 13);
  assert.equal(currentWeek([], Date.now()), undefined);
});
