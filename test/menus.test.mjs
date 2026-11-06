import test from "node:test";
import assert from "node:assert/strict";
import { normalizeHref, parseMenu } from "../lib/menus.ts";

test("normalizeHref keeps site paths in the site's URL style", () => {
  assert.equal(normalizeHref("league"), "/league/");
  assert.equal(normalizeHref("/category/news"), "/category/news/");
  assert.equal(normalizeHref("/"), "/");
  assert.equal(normalizeHref("/search/?q=x"), "/search/?q=x");
  assert.equal(normalizeHref("/team#staff"), "/team/#staff");
  assert.equal(normalizeHref("https://t.me/nassaji"), "https://t.me/nassaji");
});

test("normalizeHref refuses unsafe or broken links", () => {
  for (const bad of ["", "javascript:alert(1)", "//evil.com", "data:text/html,x", "https://", "/a b/"]) assert.equal(normalizeHref(bad), null, bad);
});

test("parseMenu skips empty rows and explains bad ones", () => {
  assert.deepEqual(parseMenu(JSON.stringify([{ label: " خانه ", href: "/" }, { label: "", href: "" }])), [{ label: "خانه", href: "/" }]);
  assert.throws(() => parseMenu(JSON.stringify([{ label: "", href: "/x/" }])), /عنوان/);
  assert.throws(() => parseMenu(JSON.stringify([{ label: "بد", href: "javascript:x" }])), /درست نیست/);
  assert.throws(() => parseMenu("nope"), /خوانده نشد/);
});
