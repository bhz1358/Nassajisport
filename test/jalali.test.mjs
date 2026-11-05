import { test } from "node:test";
import assert from "node:assert/strict";
import { isoToJalaliParts, jalaliPartsToIso, jalaliToGregorian } from "../lib/jalali.ts";

test("converts known Jalali dates", () => {
  assert.deepEqual(jalaliToGregorian(1376, 11, 22), [1998, 2, 11]);
  assert.deepEqual(jalaliToGregorian(1405, 8, 4), [2026, 10, 26]);
  assert.deepEqual(jalaliToGregorian(1403, 12, 30), [2025, 3, 20]); // leap year end
  assert.deepEqual(jalaliToGregorian(1404, 1, 1), [2025, 3, 21]);
});

test("Tehran local time round-trips through ISO", () => {
  const iso = jalaliPartsToIso("۱۴۰۵/۰۸/۰۴", "۱۷:۰۰");
  assert.equal(iso, "2026-10-26T13:30:00.000Z");
  assert.deepEqual(isoToJalaliParts(iso), { date: "1405/08/04", time: "17:00" });
});

test("rejects malformed input", () => {
  assert.equal(jalaliPartsToIso("1405-13-01"), undefined);
  assert.equal(jalaliPartsToIso("hello"), undefined);
  assert.equal(jalaliPartsToIso("1405/08/04", "25:00"), undefined);
});
