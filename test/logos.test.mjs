import test from "node:test";
import assert from "node:assert/strict";
import { findImages, matchTeam } from "../scripts/fetch-logos.mjs";

const teams = ["پرسپولیس", "استقلال", "استقلال خوزستان", "نساجی مازندران", "فولاد", "ملوان"];

test("league table: team name in the next cell names the logo", () => {
  const html = `<h2>جدول لیگ برتر</h2><table>
    <tr><td>1</td><td><img src="/Content/teams/12.png"></td><td><a href="/t/12">پرسپولیس تهران</a></td><td>30</td></tr>
    <tr><td>2</td><td><img src="/Content/teams/7.png"></td><td><a href="/t/7">استقلال خوزستان</a></td><td>28</td></tr>
    <tr><td>3</td><td><img src="/Content/teams/9.png"></td><td>نساجی</td><td>20</td></tr></table>`;
  const imgs = findImages(html, "https://www.iranleague.ir/fa/x");
  assert.deepEqual(imgs.map((i) => matchTeam(i, teams)), ["پرسپولیس", "استقلال خوزستان", "نساجی مازندران"]);
  assert.equal(imgs[0].url, "https://www.iranleague.ir/Content/teams/12.png");
  assert.ok(imgs.every((i) => i.logoish));
});

test("logos set as CSS backgrounds are found", () => {
  const html = `<div class="team"><span class="logo" style="background-image: url('/img/club-malavan.svg')"></span><span>ملوان بندرانزلی</span></div>`;
  const [img] = findImages(html, "https://example.com/");
  assert.equal(img.url, "https://example.com/img/club-malavan.svg");
  assert.equal(matchTeam(img, teams), "ملوان");
});

test("text after an image does not leak into the next row", () => {
  const html = `<table><tr><td><img src="/a.png"></td><td></td></tr><tr><td>فولاد</td></tr></table>`;
  const [img] = findImages(html, "https://example.com/");
  assert.equal(matchTeam(img, teams), undefined);
});

test("a news photo is not marked as a logo file", () => {
  const html = `<p><img src="/news/2026/persepolis-training.jpg" alt="تمرین پرسپولیس"></p>`;
  const [img] = findImages(html, "https://example.com/");
  assert.equal(img.logoish, false);
  assert.equal(matchTeam(img, teams), "پرسپولیس");
});

test("league table short names: «استقلال خ» is Esteghlal Khuzestan, not Esteghlal", () => {
  const html = `<table><tr><td><img src="/u/09201.png"></td><td>استقلال خ</td><td>11</td></tr><tr><td><img src="/u/1.png"></td><td>استقلال</td></tr><tr><td><img src="/u/2.png"></td><td>نساجی م</td></tr></table>`;
  const imgs = findImages(html, "https://example.com/");
  assert.deepEqual(imgs.map((i) => matchTeam(i, teams)), ["استقلال خوزستان", "استقلال", "نساجی مازندران"]);
});

test("news thumbnails are marked as photos", () => {
  const [img] = findImages(`<p><img src="/thumbnailhandler.ashx?id=5" alt="نساجی"></p>`, "https://www.iranleague.ir/fa/لیگ-برتر-ایران");
  assert.equal(img.photoish, true);
  assert.ok(/^[\x20-\x7e]+$/.test(new URL("https://www.iranleague.ir/fa/لیگ-برتر-ایران").href), "page address becomes ASCII for the Referer header");
});
