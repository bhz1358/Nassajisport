import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeHtml } from "../lib/sanitize.ts";
import { clip, fillImageAlts, findTags, firstImage, plainText, seoFor } from "../lib/seo-auto.ts";

test("sanitizer removes anything that runs code", () => {
  const dirty = `<p onclick="steal()">سلام<script>alert(1)</script></p><img src=x onerror="alert(1)"><a href="javascript:alert(1)">x</a><a href="https://nassajisport.com/" target="_blank">ok</a><iframe src="https://evil.com/x"></iframe><iframe src="https://www.aparat.com/video/video/embed/videohash/abc"></iframe><svg onload=alert(1)></svg><style>body{}</style><form action="/x"><input name=a></form>`;
  const clean = sanitizeHtml(dirty);
  assert.ok(!/script|onclick|onerror|javascript:|evil\.com|<svg|<style|<form|<input/i.test(clean), clean);
  assert.ok(clean.includes("<p>سلام</p>"));
  assert.ok(clean.includes('<img src="x">'));
  assert.ok(clean.includes('<a href="https://nassajisport.com/" target="_blank">ok</a>'));
  assert.ok(clean.includes('<iframe src="https://www.aparat.com/video/video/embed/videohash/abc" allowfullscreen loading="lazy"></iframe>'));
});

test("sanitizer keeps normal content, pictures and videos", () => {
  const html = `<h2>گزارش</h2><p><strong>نساجی</strong> برد.</p><p><img src="/uploads/admin/2026/11/a.webp" alt="شادی"></p><video src="/uploads/admin/2026/11/g.mp4" controls playsinline preload="metadata"></video><blockquote>نقل</blockquote>`;
  assert.equal(sanitizeHtml(html), html);
});

test("description and title come from the post when not given", () => {
  const post = { title: "پیروزی شیرین نساجی مقابل پرسپولیس در ورزشگاه وطنی قائمشهر با گل دقیقه نود", content: "<p>نساجی امروز در هفته دوازدهم لیگ برتر با یک گل پرسپولیس را برد.</p><p>هواداران تا پایان بازی تیمشان را تشویق کردند و این برد مهم را جشن گرفتند و ...</p>" };
  const s = seoFor(post);
  assert.ok(s.title.length <= 65 && s.title.endsWith("…"), s.title);
  assert.ok(s.description.startsWith("نساجی امروز") && s.description.length <= 158, s.description);
  assert.equal(seoFor({ ...post, seo: { title: "عنوان خودم", description: "توضیح خودم" } }).title, "عنوان خودم");
  assert.equal(plainText("<p>الف</p><p>ب</p>"), "الف. ب.");
  assert.equal(clip("یک دو سه چهار", 9), "یک دو سه…");
  assert.equal(clip("یک دو سه چهار", 30), "یک دو سه چهار");
});

test("tags: teams and players named in the text", () => {
  const teams = ["نساجی مازندران", "پرسپولیس", "استقلال", "استقلال خوزستان", "مس شهر بابک", "فولاد"];
  const players = ["مهدی تیکدری", "علی", "حامد شیری"];
  const text = "پیروزی نساجی مقابل پرسپولیس؛ حامد شیری بهترین بازیکن شد. استقلال خوزستان هم مساوی کرد. بازی فولادین بود.";
  assert.deepEqual(findTags(text, teams, players), ["نساجی مازندران", "پرسپولیس", "استقلال خوزستان", "حامد شیری"]);
  assert.deepEqual(findTags("استقلال و استقلال خوزستان", teams, players), ["استقلال", "استقلال خوزستان"], "both named");
});

test("featured image and alt text from the content", () => {
  const html = `<p>متن</p><img src="/a.webp"><img src="/b.webp" alt=""><img src="/c.webp" alt="عکس خودم">`;
  assert.equal(firstImage(html), "/a.webp");
  assert.equal(fillImageAlts(html, 'برد "نساجی"'), `<p>متن</p><img src="/a.webp" alt="برد &quot;نساجی&quot;"><img src="/b.webp" alt="برد &quot;نساجی&quot;"><img src="/c.webp" alt="عکس خودم">`);
});
