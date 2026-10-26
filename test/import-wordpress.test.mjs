import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { convert, parseWxr } from "../scripts/import-wordpress.mjs";

const xml = fs.readFileSync(new URL("./fixtures/sample-export.xml", import.meta.url), "utf8");
const result = convert(parseWxr(xml));

test("imports published posts and pages, skips drafts", () => {
  assert.deepEqual(result.report.imported, { post: 1, page: 1 });
  assert.deepEqual(result.report.skipped, { "post:draft": 1 });
});

test("keeps the original Persian URL path", () => {
  const post = result.posts.find((p) => p.id === 11);
  assert.equal(post.path, "/news/خبر-اول/");
  assert.equal(post.slug, "خبر-اول");
});

test("maps featured image, categories, tags, sticky and SEO", () => {
  const post = result.posts.find((p) => p.id === 11);
  assert.equal(post.featuredImage, "/uploads/2026/10/photo.jpg");
  assert.deepEqual(post.categories, ["news"]);
  assert.deepEqual(post.tags, ["نساجی"]);
  assert.equal(post.sticky, true);
  assert.equal(post.seo.description, "توضیح سئو");
  assert.equal(post.date, "2026-10-25T10:00:00.000Z");
});

test("rewrites upload URLs in content to local paths", () => {
  const post = result.posts.find((p) => p.id === 11);
  assert.match(post.content, /src="\/uploads\/2026\/10\/photo\.jpg"/);
  assert.equal(post.excerpt, "متن");
});

test("decodes category slugs and keeps parents", () => {
  assert.deepEqual(result.categories[1], { slug: "ویدیو", name: "ویدیو", parent: "news" });
});

test("imports approved comments without email or IP", () => {
  assert.equal(result.comments.length, 1);
  assert.equal(result.comments[0].author, "هوادار");
  assert.ok(!JSON.stringify(result.comments).includes("fan@example.com"));
  assert.ok(!JSON.stringify(result.comments).includes("1.2.3.4"));
});
