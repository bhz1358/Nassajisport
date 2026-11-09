import test from "node:test";
import assert from "node:assert/strict";
import { bestPlayer, cleanScores, faScore, results } from "../lib/ratings-calc.ts";

const C = [
  { id: "p1", name: "حامد شیری", role: "player" },
  { id: "p2", name: "مهدی", role: "player" },
  { id: "p3", name: "تعویضی", role: "player" },
  { id: "c", name: "سرمربی", role: "coach" },
];
const V = (fanId, scores) => ({ poll: "x", fanId, scores, at: "t" });

test("averages, one decimal, best first", () => {
  const r = results(C, [V("a", { p1: 8, p2: 6, c: 10 }), V("b", { p1: 9, p2: 7, c: 10 }), V("c", { p1: 7 })]);
  assert.deepEqual(r.map((x) => `${x.id}:${x.avg}:${x.count}`), ["c:10:2", "p1:8:3", "p2:6.5:2", "p3:0:0"]);
});

test("best player: not the coach, and not a player only one fan rated", () => {
  const votes = [V("a", { p1: 8, p3: 10, c: 10 }), V("b", { p1: 9, c: 10 }), V("c", { p1: 7, c: 10 })];
  assert.equal(bestPlayer(C, votes).id, "p1");
  assert.equal(bestPlayer(C, []), undefined);
  assert.equal(bestPlayer(C, [V("a", { p1: 9, p3: 10 }), V("b", { p1: 7 })]).id, "p1", "1 vote of 10 vs 2 votes averaging 8");
  assert.equal(bestPlayer(C, [V("a", { p3: 10, p1: 6 })]).id, "p3", "one voter: their top pick");
});

test("scores cleaned", () => {
  assert.deepEqual(cleanScores({ p1: "8", p2: "11", p3: "0", zz: "5", c: "7.5" }, C), { p1: 8 });
});

test("Persian score", () => assert.equal(faScore(7.8), "۷٫۸"));
