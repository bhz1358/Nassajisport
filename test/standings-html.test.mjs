import test from "node:test";
import assert from "node:assert/strict";
import { parseStandings } from "../lib/standings-import.ts";

const DATA = [
  ["استقلال", 10, 7, 2, 1, 18, 6, 23],
  ["پرسپولیس", 11, 6, 4, 1, 15, 7, 22],
  ["تراکتور", 10, 6, 2, 2, 17, 10, 20],
  ["سپاهان", 11, 5, 4, 2, 14, 9, 19],
  ["آلومینیوم", 12, 4, 5, 3, 12, 9, 17],
  ["فجر سپاسی ش", 11, 4, 5, 2, 10, 11, 17],
  ["چادرملو", 12, 4, 4, 4, 11, 14, 16],
  ["نساجی م", 11, 2, 5, 4, 8, 11, 11],
  ["استقلال خ", 11, 2, 4, 5, 7, 14, 10],
];
const NEWS = `<div class="news"><h3>نشست هماهنگی دیدار پیکان و نساجی</h3><p>۱۲ آبان ۱۴۰۵ ساعت 18:30</p></div>`;
const form = `<td><img src="/assets/img/table/win2.png"><img src="/assets/img/table/lost2.png"></td>`;
const cells = ([t, p, w, d, l, gf, ga, pts]) => `<td>${p}</td><td>${w}</td><td>${d}</td><td>${l}</td><td>${gf}</td><td>${ga}</td><td>${gf - ga}</td><td>${pts}</td>`;

function check(html) {
  const { rows } = parseStandings(html);
  assert.equal(rows.length, DATA.length, JSON.stringify(rows.map((r) => r.team)));
  for (const [t, p, w, d, l, gf, ga, pts] of DATA) {
    const want = t.startsWith("نساجی") ? "نساجی مازندران" : t === "فجر سپاسی ش" ? "فجر سپاسی" : t;
    // "فجر سپاسی ش" may keep its "ش" here; the import maps it to the site's name later.
    const r = rows.find((x) => x.team === want || x.team === t);
    assert.ok(r, `row for ${t}`);
    assert.deepEqual([r.played, r.won, r.drawn, r.lost, r.goalsFor, r.goalsAgainst, r.points], [p, w, d, l, gf, ga, pts], t);
  }
}

test("header made of <div>s and one <table> per team row", () => {
  const header = `<div class="row"><div>رتبه</div><div>تیم</div><div>بازی</div><div>برد</div><div>مساوی</div><div>باخت</div><div>زده</div><div>خورده</div><div>تفاضل</div><div>امتیاز</div></div>`;
  const rows = DATA.map((r, i) => `<table class="t"><tr><td>${i + 1}</td><td><img src="/u/${i}.png"><a href='/fa/League/ClubProfile/${i}'>${r[0]}</a></td>${cells(r)}${form}</tr></table>`).join("");
  check(NEWS + header + rows);
});

test("team cell is a nested table inside the main table", () => {
  const rows = DATA.map((r, i) => `<tr><td>${i + 1}</td><td><table><tr><td><img src="/u/${i}.png"></td><td><a href='/fa/League/ClubProfile/${i}'>${r[0]}</a></td></tr></table></td>${cells(r)}${form}</tr>`).join("");
  check(`${NEWS}<table><tr><th>رتبه</th><th>تیم</th><th>بازی</th><th>برد</th><th>مساوی</th><th>باخت</th><th>زده</th><th>خورده</th><th>تفاضل</th><th>امتیاز</th></tr>${rows}</table>`);
});

test("a plain single table still works", () => {
  const rows = DATA.map((r, i) => `<tr><td>${i + 1}</td><td>${r[0]}</td>${cells(r)}</tr>`).join("");
  check(`<table><tr><th>رتبه</th><th>تیم</th><th>بازی</th><th>برد</th><th>مساوی</th><th>باخت</th><th>زده</th><th>خورده</th><th>تفاضل</th><th>امتیاز</th></tr>${rows}</table>`);
});

test("text copied from the browser still works", () => {
  const text = "رتبه\tتیم\tبازی\tبرد\tمساوی\tباخت\tزده\tخورده\tتفاضل\tامتیاز\n" + DATA.map((r, i) => `${i + 1}\t${r[0]}\t${r.slice(1, 6).join("\t")}\t${r[6]}\t${r[5] - r[6]}\t${r[7]}`).join("\n");
  check(text);
});
