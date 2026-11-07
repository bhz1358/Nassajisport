import test from "node:test";
import assert from "node:assert/strict";
import { liveWindowOpen, mergeLive, readFeed } from "../lib/live-scores.ts";

const team = (name_fa) => ({ team_id: 1, name_fa, name_en: "x", logo: "" });
const match = (o) => ({ match_id: 1, timestamp: 1794013200, home_team_score: -1, away_team_score: -1, match_started: false, competition: { name_fa: "لیگ برتر" }, ...o });
// Shape as seen on the server (nested in competition_matches → calendar).
const feed = {
  success: true,
  data: {
    competition_matches: [
      { competition_id: 268, name_fa: "لیگ حرفه ای آرژانتین", calendar: { items: [match({ match_id: 173069, match_started: true, match_ended: true, home_team_score: 1, away_team_score: 0, status: "پایان", home_team: team("اتلتیکو تایگر"), away_team: team("اتلتیکو سارمینتو") })] } },
      {
        competition_id: 1,
        name_fa: "لیگ برتر ایران",
        calendar: {
          items: [
            match({ match_id: 10, timestamp: Date.parse("2026-11-07T14:30:00Z") / 1000, match_started: true, home_team_score: 2, away_team_score: 1, status: "۶۷'", home_team: team("پرسپولیس"), away_team: team("فجر سپاسی ش") }),
            match({ match_id: 11, timestamp: Date.parse("2026-11-07T15:00:00Z") / 1000, match_started: true, home_team_score: 0, away_team_score: 0, status: "بین دو نیمه", home_team: team("نساجی مازندران"), away_team: team("استقلال خ") }),
            match({ match_id: 12, timestamp: Date.parse("2026-11-06T13:00:00Z") / 1000, match_started: true, match_ended: true, home_team_score: 3, away_team_score: 3, status: "پایان", home_team: team("ملوان بندر انزلی"), away_team: team("سپاهان") }),
            match({ match_id: 13, timestamp: Date.parse("2026-11-08T16:00:00Z") / 1000, home_team: team("تراکتور"), away_team: team("گل گهر") }),
          ],
        },
      },
    ],
    live_box: null,
  },
};

const league = {
  season: "1405", competition: "لیگ برتر",
  standings: ["پرسپولیس", "فجر سپاسی", "نساجی مازندران", "استقلال خوزستان", "استقلال", "ملوان", "سپاهان", "تراکتور", "گل گهر"].map((t) => ({ team: t, played: 1, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 })),
  fixtures: [
    { date: "2026-11-07T14:30:00.000Z", home: "پرسپولیس", away: "فجر سپاسی", status: "scheduled", round: 12 },
    { date: "2026-11-07T15:00:00.000Z", home: "نساجی مازندران", away: "استقلال خوزستان", status: "scheduled", round: 12 },
    { date: "2026-11-06T13:00:00.000Z", home: "ملوان", away: "سپاهان", status: "scheduled", round: 12 },
    { date: "2026-11-08T15:00:00.000Z", home: "تراکتور", away: "گل گهر", status: "scheduled", round: 12 },
  ],
};

test("reads every match in the feed with score, minute and status", () => {
  const m = readFeed(feed);
  assert.equal(m.length, 5);
  const fin = m.find((x) => x.id === 173069);
  assert.deepEqual([fin.started, fin.ended, fin.homeScore, fin.awayScore, fin.statusText], [true, true, 1, 0, "پایان"]);
  assert.equal(m.find((x) => x.id === 10).minute, 67);
  assert.equal(m.find((x) => x.id === 11).minute, undefined);
  assert.equal(m.find((x) => x.id === 13).homeScore, undefined);
});

test("merges into this league's fixtures only, mapping short names", () => {
  const { league: next, changes } = mergeLive(league, readFeed(feed));
  const [per, nas, mal, tra] = next.fixtures;
  assert.deepEqual([per.status, per.homeScore, per.awayScore, per.minute], ["live", 2, 1, 67]);
  assert.deepEqual([nas.status, nas.homeScore, nas.awayScore, nas.liveLabel], ["live", 0, 0, "بین دو نیمه"]);
  assert.deepEqual([mal.status, mal.homeScore, mal.awayScore], ["finished", 3, 3]);
  assert.equal(tra.date, "2026-11-08T16:00:00.000Z", "moved kick-off is taken");
  assert.equal(changes.length, 4);
  assert.ok(!JSON.stringify(next).includes("تایگر"), "foreign league ignored");
});

test("finishing clears the live minute; a second run changes nothing", () => {
  const once = mergeLive(league, readFeed(feed)).league;
  const again = mergeLive(once, readFeed(feed));
  assert.equal(again.changes.length, 0);
  assert.equal(again.league, once);
  const ended = JSON.parse(JSON.stringify(feed));
  ended.data.competition_matches[1].calendar.items[0] = { ...ended.data.competition_matches[1].calendar.items[0], match_ended: true, status: "پایان", home_team_score: 3 };
  const fin = mergeLive(once, readFeed(ended)).league.fixtures[0];
  assert.deepEqual([fin.status, fin.homeScore, fin.minute, fin.liveLabel], ["finished", 3, undefined, undefined]);
});

test("checks only around match times, and not more often than set", () => {
  const s = { enabled: true, mode: "matches", every: 60 };
  const kick = Date.parse("2026-11-08T15:00:00Z");
  assert.equal(liveWindowOpen(league, s, kick - 60 * 60_000), false, "an hour before");
  assert.equal(liveWindowOpen(league, s, kick - 10 * 60_000), true, "10 minutes before");
  assert.equal(liveWindowOpen(league, s, kick + 100 * 60_000), true, "during");
  assert.equal(liveWindowOpen(league, s, kick + 200 * 60_000), false, "long after");
  assert.equal(liveWindowOpen(league, { ...s, lastSync: new Date(kick - 30_000).toISOString() }, kick), false, "checked 30s ago");
  assert.equal(liveWindowOpen(league, { ...s, enabled: false }, kick), false, "off");
  assert.equal(liveWindowOpen(league, { ...s, mode: "always" }, kick - 5 * 86_400_000), true, "always");
});
