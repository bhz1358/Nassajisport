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

test("submenus: depth-1 rows go under the row above; a parent may have no address", async () => {
  const { toRows } = await import("../lib/menus.ts");
  const rows = [
    { label: "خانه", href: "/", depth: 0 },
    { label: "تیم‌ها", href: "", depth: 0 },
    { label: "تیم اصلی", href: "/team", depth: 1 },
    { label: "تیم پایه", href: "/category/youth/", depth: 1 },
    { label: "جدول", href: "/league/", depth: 0 },
  ];
  const menu = parseMenu(JSON.stringify(rows), { nested: true });
  assert.deepEqual(menu, [
    { label: "خانه", href: "/" },
    { label: "تیم‌ها", href: "", children: [{ label: "تیم اصلی", href: "/team/" }, { label: "تیم پایه", href: "/category/youth/" }] },
    { label: "جدول", href: "/league/" },
  ]);
  assert.deepEqual(parseMenu(JSON.stringify(toRows(menu)), { nested: true }), menu, "round trip");
});

test("submenus: rules", () => {
  assert.throws(() => parseMenu(JSON.stringify([{ label: "الف", href: "/a/", depth: 1 }]), { nested: true }), /گزینه‌ی اول/);
  assert.throws(() => parseMenu(JSON.stringify([{ label: "بی‌آدرس", href: "", depth: 0 }]), { nested: true }), /درست نیست/, "no address and no submenu");
  // The footer menu is single-level: depth is ignored.
  assert.deepEqual(parseMenu(JSON.stringify([{ label: "الف", href: "/a/", depth: 0 }, { label: "ب", href: "/b/", depth: 1 }])), [{ label: "الف", href: "/a/" }, { label: "ب", href: "/b/" }]);
});
