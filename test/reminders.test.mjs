import test from "node:test";
import assert from "node:assert/strict";
import { dueReminders, weekOver, weekSummaries } from "../lib/reminder-plan.ts";
import { fixtureKey } from "../lib/predict-score.ts";

// Thu 12 Nov 2026: 16:00 and 18:00 Tehran (12:30Z, 14:30Z); Fri 13 Nov 16:30 Tehran.
const fx = [
  { date: "2026-11-12T12:30:00Z", home: "ملوان", away: "نساجی مازندران", round: 13, status: "scheduled" },
  { date: "2026-11-12T14:30:00Z", home: "تراکتور", away: "فولاد", round: 13, status: "scheduled" },
  { date: "2026-11-13T13:00:00Z", home: "پرسپولیس", away: "گل گهر", round: 13, status: "scheduled" },
];
const fans = [
  { id: "a", name: "A", chat: 1 },
  { id: "b", name: "B", chat: 2 },
  { id: "c", name: "C", chat: 3, remind: false },
  { id: "d", name: "D" }, // never used the bot
];
const at = (iso) => Date.parse(iso);

test("2 hours before the first unpredicted match of the day, once a day", () => {
  const preds = [{ fanId: "b", key: fixtureKey(fx[0]), home: 1, away: 0, at: "x" }];
  assert.deepEqual(dueReminders(fx, fans, preds, new Set(), at("2026-11-12T10:00:00Z")), [], "2.5 h before: too early");
  const due = dueReminders(fx, fans, preds, new Set(), at("2026-11-12T10:45:00Z"));
  assert.deepEqual(due.map((d) => `${d.fan.id}:${d.matches.length}`), ["a:2"], "a gets both of today's matches; b's first is predicted, second is 3.75 h away");
  assert.equal(due[0].day, "2026-11-12");
  const later = dueReminders(fx, fans, preds, new Set(["a|2026-11-12"]), at("2026-11-12T12:45:00Z"));
  assert.deepEqual(later.map((d) => `${d.fan.id}:${d.matches.length}`), ["b:1"], "a already reminded today; b now 1:45 before its first unpredicted match");
});

test("no reminders for fans who turned them off, for matches already predicted, or after kick-off", () => {
  const all = fans.flatMap((f) => fx.map((m) => ({ fanId: f.id, key: fixtureKey(m), home: 0, away: 0, at: "x" })));
  assert.deepEqual(dueReminders(fx, fans, all, new Set(), at("2026-11-12T11:00:00Z")), []);
  assert.deepEqual(dueReminders(fx.slice(0, 1), fans, [], new Set(), at("2026-11-12T12:31:00Z")), [], "started");
});

test("week over: all finished, or the contest moved on", () => {
  const done = fx.map((f) => ({ ...f, status: "finished", homeScore: 1, awayScore: 0 }));
  assert.equal(weekOver(done, 13, 13), true);
  assert.equal(weekOver([done[0], done[1], fx[2]], 13, 13), false);
  assert.equal(weekOver([done[0], done[1], fx[2]], 13, 14), true, "a postponed match doesn't hold the summary");
  assert.equal(weekOver(fx, 13, 14), false, "nothing played");
});

test("week summary for fans who predicted", () => {
  const done = fx.map((f, i) => ({ ...f, status: "finished", homeScore: i, awayScore: 0 }));
  const preds = [
    { fanId: "a", key: fixtureKey(done[1]), home: 1, away: 0, at: "1" }, // 5
    { fanId: "b", key: fixtureKey(done[1]), home: 2, away: 0, at: "2" }, // 2
    { fanId: "c", key: fixtureKey(done[1]), home: 1, away: 0, at: "0" }, // reminders off
  ];
  const s = weekSummaries(done, 13, fans, preds);
  assert.deepEqual(s.map((x) => `${x.fan.id}:${x.points}:${x.weekRank}/${x.weekPlayers}:${x.best.name}`), ["a:5:2/3:C", "b:2:3/3:C"]);
});
