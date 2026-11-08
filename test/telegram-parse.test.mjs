import test from "node:test";
import assert from "node:assert/strict";
import { isForSite, paragraphsToHtml, parsePost } from "../lib/telegram-parse.ts";

const post = `🔸 پیروزی ارزشمند نساجی مقابل پرسپولیس در قائمشهر

نساجی مازندران امشب در ورزشگاه وطنی با گل دیرهنگام پرسپولیس را شکست داد.
هواداران تا پایان بازی تیمشان را تشویق کردند.

#نساجی_مازندران #لیگ_برتر
🌍
🆔 @nassajisport_ir`;

test("only posts ending with 🌍 go to the site", () => {
  assert.equal(isForSite(post), true, "🌍 before hashtags and the channel id");
  assert.equal(isForSite("🔸 تیتر\nمتن 🌍"), true, "on the last line");
  assert.equal(isForSite("🔸 تیتر\nمتن بدون علامت\n@nassajisport_ir"), false);
  assert.equal(isForSite("🌍 در اول پست\nولی آخرش نیست"), false);
});

test("headline, body, hashtags and sign-off", () => {
  const p = parsePost(post);
  assert.equal(p.title, "پیروزی ارزشمند نساجی مقابل پرسپولیس در قائمشهر");
  assert.deepEqual(p.paragraphs, ["نساجی مازندران امشب در ورزشگاه وطنی با گل دیرهنگام پرسپولیس را شکست داد.", "هواداران تا پایان بازی تیمشان را تشویق کردند."]);
  assert.deepEqual(p.tags, ["نساجی مازندران", "لیگ برتر"]);
});

test("the headline line may sit lower; without 🔸 the first line is the headline", () => {
  assert.equal(parsePost("فوری\n🔸 تیتر اصلی خبر\nمتن 🌍").title, "تیتر اصلی خبر");
  assert.equal(parsePost("⚽️ تیتر بدون الماس\nمتن 🌍").title, "تیتر بدون الماس");
});

test("paragraphs become safe HTML with links", () => {
  assert.equal(paragraphsToHtml(["الف <b>ب</b>", "لینک https://iranleague.ir/x"]), `<p>الف &lt;b&gt;ب&lt;/b&gt;</p><p>لینک <a href="https://iranleague.ir/x" target="_blank" rel="noopener">https://iranleague.ir/x</a></p>`);
});
