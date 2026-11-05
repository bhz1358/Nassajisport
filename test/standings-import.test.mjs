import { test } from "node:test";
import assert from "node:assert/strict";
import { parseStandings } from "../lib/standings-import.ts";

test("reads a table copied from the browser (tabs, Persian digits, rank first)", () => {
  const text = [
    "رتبه\tتیم\tبازی\tبرد\tمساوی\tباخت\tزده\tخورده\tتفاضل\tامتیاز",
    "۱\tاستقلال\t۱۰\t۷\t۲\t۱\t۱۸\t۶\t۱۲\t۲۳",
    "۲\tپرسپولیس\t۱۰\t۶\t۳\t۱\t۱۵\t۷\t۸\t۲۱",
    "۵\tنساجی\t۱۰\t۴\t۴\t۲\t۱۲\t۹\t۳\t۱۶",
    "۱۶\tهوادار\t۱۰\t۰\t۳\t۷\t۵\t۱۹\t-۱۴\t۳",
  ].join("\n");
  const { rows, warnings } = parseStandings(text);
  assert.equal(warnings.length, 0);
  assert.equal(rows.length, 4);
  assert.deepEqual(rows[0], { team: "استقلال", played: 10, won: 7, drawn: 2, lost: 1, goalsFor: 18, goalsAgainst: 6, points: 23 });
  assert.equal(rows[2].team, "نساجی مازندران");
  assert.equal(rows[3].goalsAgainst, 19);
});

test("reads an HTML table and finds the column order from its header", () => {
  const html = `<html><body><table><tr><td>تبلیغ</td></tr></table>
  <table class="league"><thead><tr><th>#</th><th>تیم</th><th>امتیاز</th><th>تفاضل</th><th>باخت</th><th>مساوی</th><th>برد</th><th>بازی</th></tr></thead>
  <tbody><tr><td>1</td><td><a href="/t/1"><img src="x.png">سپاهان</a></td><td>22</td><td>9</td><td>1</td><td>4</td><td>6</td><td>11</td></tr>
  <tr><td>2</td><td>نساجی مازندران</td><td>16</td><td>3</td><td>2</td><td>4</td><td>4</td><td>10</td></tr></tbody></table></body></html>`;
  const { rows } = parseStandings(html);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].team, "سپاهان");
  assert.equal(rows[0].points, 22);
  assert.equal(rows[0].played, 11);
  assert.equal(rows[1].team, "نساجی مازندران");
});

test("reads space-separated text without a header by checking the numbers add up", () => {
  const { rows } = parseStandings("1 تراکتور 9 5 2 2 14 8 6 17\n2 گل گهر سیرجان 9 4 4 1 11 6 5 16");
  assert.equal(rows.length, 2);
  assert.equal(rows[1].team, "گل گهر سیرجان");
  assert.equal(rows[1].points, 16);
});

test("reports rows whose numbers don't fit any layout", () => {
  const { rows, warnings } = parseStandings("فولاد 9 9 9 9 9 9");
  assert.equal(rows.length, 0);
  assert.equal(warnings.length, 1);
});
