import test from "node:test";
import assert from "node:assert/strict";
import { fixtureKey, isOpen, leaderboard, normalizePhone, pointsFor } from "../lib/predict-score.ts";

const fin = (h, a, extra = {}) => ({ date: "2026-11-08T14:30:00Z", home: "نساجی مازندران", away: "ملوان", round: 12, status: "finished", homeScore: h, awayScore: a, ...extra });

test("points: exact 5, winner and difference 3, outcome 2, wrong 0", () => {
  assert.equal(pointsFor({ home: 2, away: 1 }, fin(2, 1)), 5);
  assert.equal(pointsFor({ home: 3, away: 2 }, fin(2, 1)), 3);
  assert.equal(pointsFor({ home: 3, away: 0 }, fin(2, 1)), 2);
  assert.equal(pointsFor({ home: 0, away: 1 }, fin(2, 1)), 0);
  assert.equal(pointsFor({ home: 1, away: 1 }, fin(0, 0)), 3, "draw with another score");
  assert.equal(pointsFor({ home: 1, away: 1 }, fin(2, 1)), 0);
  assert.equal(pointsFor({ home: 1, away: 0 }, fin(0, 1)), 0);
});

test("no points before the match is over", () => {
  assert.equal(pointsFor({ home: 1, away: 0 }, fin(1, 0, { status: "live" })), undefined);
  assert.equal(pointsFor({ home: 1, away: 0 }, { ...fin(0, 0), status: "scheduled", homeScore: undefined, awayScore: undefined }), undefined);
});

test("open until kick-off", () => {
  const f = { date: "2026-11-08T14:30:00Z", home: "a", away: "b", status: "scheduled" };
  assert.equal(isOpen(f, Date.parse("2026-11-08T14:29:00Z")), true);
  assert.equal(isOpen(f, Date.parse("2026-11-08T14:30:00Z")), false);
  assert.equal(isOpen({ ...f, status: "live" }, Date.parse("2026-11-08T10:00:00Z")), false, "started early");
});

test("key survives a new date", () => {
  assert.equal(fixtureKey(fin(0, 0)), fixtureKey({ ...fin(0, 0), date: "2026-12-01T10:00:00Z" }));
});

test("leaderboard: points, then exact scores, then who predicted first; blocked fans left out", () => {
  const f1 = fin(2, 1), f2 = fin(0, 0, { home: "پرسپولیس", away: "سپاهان" });
  const k1 = fixtureKey(f1), k2 = fixtureKey(f2);
  const preds = [
    { fanId: "a", key: k1, home: 2, away: 1, at: "2026-11-01T10:00:00Z" }, // 5
    { fanId: "a", key: k2, home: 1, away: 0, at: "2026-11-01T10:00:00Z" }, // 0
    { fanId: "b", key: k1, home: 3, away: 2, at: "2026-11-01T09:00:00Z" }, // 3
    { fanId: "b", key: k2, home: 1, away: 1, at: "2026-11-01T09:00:00Z" }, // 3 → 6
    { fanId: "c", key: k1, home: 2, away: 1, at: "2026-11-01T08:00:00Z" }, // 5
    { fanId: "d", key: k1, home: 2, away: 1, at: "2026-11-01T07:00:00Z" },
  ];
  const fans = [{ id: "a", name: "A" }, { id: "b", name: "B" }, { id: "c", name: "C" }, { id: "d", name: "D", blocked: true }];
  const rows = leaderboard(preds, [f1, f2], fans);
  assert.deepEqual(rows.map((r) => `${r.name}:${r.points}:${r.exact}`), ["B:6:0", "C:5:1", "A:5:1"]);
});

test("phone numbers", () => {
  assert.equal(normalizePhone("+98 912 123 4567"), "09121234567");
  assert.equal(normalizePhone("989121234567"), "09121234567");
  assert.equal(normalizePhone("۰۹۱۲۱۲۳۴۵۶۷"), "09121234567");
  assert.equal(normalizePhone("02112345678"), undefined);
});
