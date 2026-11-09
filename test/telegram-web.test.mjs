import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { channelName, parseWebPage, webText } from "../lib/telegram-web.ts";

test("reads posts from a real t.me/s page (saved copy)", () => {
  const html = fs.readFileSync(new URL("./fixtures/tme-durov.html", import.meta.url), "utf8");
  const posts = parseWebPage(html);
  assert.equal(posts.length, 3);
  assert.ok(posts.every((p) => p.id > 0 && !Number.isNaN(Date.parse(p.date))));
  assert.ok(posts.some((p) => p.photos.length && p.photos[0].startsWith("https://")), "photo addresses");
  assert.ok(posts.some((p) => p.text.includes("Designers × AI")), "text with emoji and line breaks");
  assert.ok(!posts.some((p) => /<[a-z]/i.test(p.text)), "no tags left in text");
});

test("message HTML to text", () => {
  const html = `<i class="emoji" style="x"><b>🔸</b></i> تیتر خبر<br/><br/>متن &quot;اول&quot; &amp; دوم&#33;<br/><b>🌍</b>`;
  assert.equal(webText(html), "🔸 تیتر خبر\n\nمتن \"اول\" & دوم!\n🌍");
});

test("channel name from any form", () => {
  for (const c of ["@nassajisport", "nassajisport", "https://t.me/nassajisport", "https://t.me/s/nassajisport/123"]) assert.equal(channelName(c), "nassajisport");
});
