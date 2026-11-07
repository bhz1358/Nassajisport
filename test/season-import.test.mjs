import test from "node:test";
import assert from "node:assert/strict";
import { competitionId, mergeSeason, readFixturesPage } from "../lib/season-import.ts";

const t = (name_fa) => ({ team_id: 1, name_fa, name_en: "x", logo: "" });
const m = (id, week, home, away, ts, o = {}) => ({ match_id: id, match_started: false, match_ended: false, home_team_score: -1, away_team_score: -1, status: "", timestamp: ts, week: `هفته ${week}`, competition: { competition_id: 14 }, home_team: t(home), away_team: t(away), ...o });
const page = {
  success: true,
  data: [
    m(1, 1, "چادرملو اردکان", "پرسپولیس", 1786000000, { match_started: true, match_ended: true, home_team_score: 1, away_team_score: 1, status: "پایان" }),
    m(2, 12, "نساجی مازندران", "استقلال خ", 1794000000),
    m(3, 12, "ملوان بندرانزلی", "هوادار", 1794000000),
  ],
  meta: { next: "NEXT", previous: "PREV", count: 3 },
};
const league = {
  standings: ["چادرملو اردکان", "پرسپولیس", "نساجی مازندران", "استقلال خوزستان", "ملوان"].map((team) => ({ team, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 })),
  fixtures: [{ date: "2026-11-09T12:00:00.000Z", home: "نساجی مازندران", away: "استقلال خوزستان", status: "scheduled", round: 12, venue: "ورزشگاه وطنی" }],
};

test("competition id from a Footballi address or a number", () => {
  assert.equal(competitionId("https://footballi.net/competition/14/لیگ-برتر-خلیج-فارس"), 14);
  assert.equal(competitionId("14"), 14);
  assert.equal(competitionId("abc"), undefined);
});

test("a page gives its matches with week and the cursors", () => {
  const p = readFixturesPage(page);
  assert.equal(p.matches.length, 3);
  assert.equal(p.previous, "PREV");
  assert.equal(p.next, "NEXT");
  assert.deepEqual(p.matches.map((x) => x.round), [1, 12, 12]);
});

test("season merge adds new matches, updates known ones, skips unknown teams", () => {
  const r = mergeSeason(league, readFixturesPage(page).matches);
  assert.equal(r.added, 1);
  assert.equal(r.updated, 1);
  assert.deepEqual(r.skipped, ["هوادار"]);
  const w1 = r.league.fixtures.find((f) => f.round === 1);
  assert.deepEqual([w1.home, w1.away, w1.status, w1.homeScore, w1.awayScore], ["چادرملو اردکان", "پرسپولیس", "finished", 1, 1]);
  const nas = r.league.fixtures.find((f) => f.home === "نساجی مازندران");
  assert.equal(nas.date, new Date(1794000000 * 1000).toISOString(), "kick-off time taken from Footballi");
  assert.equal(nas.venue, "ورزشگاه وطنی", "venue kept");
  assert.ok(Date.parse(r.league.fixtures[0].date) <= Date.parse(r.league.fixtures[1].date), "sorted by date");
  const again = mergeSeason(r.league, readFixturesPage(page).matches);
  assert.deepEqual([again.added, again.updated], [0, 0]);
});
