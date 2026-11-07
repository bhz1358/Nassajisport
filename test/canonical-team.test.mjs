import test from "node:test";
import assert from "node:assert/strict";
import { canonicalTeam } from "../lib/team-names.ts";

const known = ["پرسپولیس", "استقلال", "استقلال خوزستان", "نساجی مازندران", "ملوان", "آلومینیوم اراک", "چادرملو اردکان", "فجر سپاسی", "صنعت نفت آبادان", "شمس آذر قزوین", "فولاد", "مس شهر بابک", "گل گهر", "ذوب آهن"];

test("iranleague short names map to the site's names", () => {
  const cases = {
    "استقلال خ": "استقلال خوزستان",
    "استقلال": "استقلال",
    "نساجی م": "نساجی مازندران",
    "ملوان بندر انزلی": "ملوان",
    "آلومینیوم": "آلومینیوم اراک",
    "چادرملو": "چادرملو اردکان",
    "فجر سپاسی ش": "فجر سپاسی",
    "صنعت نفت": "صنعت نفت آبادان",
    "شمس آذر": "شمس آذر قزوین",
    "فولاد خوزستان": "فولاد",
    "مس شهر بابک": "مس شهر بابک",
    "ذوب‌آهن": "ذوب آهن",
    "گل‌گهر سیرجان": "گل گهر",
  };
  for (const [raw, want] of Object.entries(cases)) assert.equal(canonicalTeam(raw, known), want, raw);
});

test("unknown or unclear names are kept", () => {
  assert.equal(canonicalTeam("هوادار", known), "هوادار");
  assert.equal(canonicalTeam("استقلال", ["استقلال خوزستان", "استقلال ملاثانی"]), "استقلال");
  assert.equal(canonicalTeam("پرس", known), "پرس");
});

test("a short name saved by an older import is corrected", () => {
  assert.equal(canonicalTeam("استقلال خ", ["استقلال خ", "استقلال خوزستان", "استقلال"]), "استقلال خوزستان");
  assert.equal(canonicalTeam("استقلال خ", ["استقلال خ", "استقلال"]), "استقلال خ");
});

test("spaces don't matter", () => {
  assert.equal(canonicalTeam("مس شهربابک", known), "مس شهر بابک");
  assert.equal(canonicalTeam("گلگهر", known), "گل گهر");
});
