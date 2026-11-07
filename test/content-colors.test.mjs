import test from "node:test";
import assert from "node:assert/strict";
import { fixInlineColors } from "../lib/content-colors.ts";

test("neutral and dark text colours from WordPress are removed", () => {
  assert.equal(fixInlineColors(`<span style="color: #000000;">x</span>`), `<span>x</span>`);
  assert.equal(fixInlineColors(`<p style="text-align: justify; color:rgb(51, 51, 51); font-size:16px">x</p>`), `<p style="text-align: justify; font-size: 16px">x</p>`);
  assert.equal(fixInlineColors(`<font color="#222222" face="Tahoma">x</font>`), `<font face="Tahoma">x</font>`);
  assert.equal(fixInlineColors(`<h3 style="color:#000">t</h3>`), `<h3>t</h3>`);
  assert.equal(fixInlineColors(`<span style="color:#00008b">navy</span>`), `<span>navy</span>`, "too dark to read on dark");
});

test("plain backgrounds go; real colours stay readable", () => {
  assert.equal(fixInlineColors(`<td style="background-color:#ffffff">a</td><td bgcolor="#f5f5f5">b</td>`), `<td>a</td><td>b</td>`);
  assert.equal(fixInlineColors(`<span style="color: #ff0000;">red</span>`), `<span style="color: #ff0000">red</span>`);
  assert.equal(fixInlineColors(`<span style="background-color: #ffff00;">hl</span>`), `<span style="background-color: #ffff00; color: #1a1a1a">hl</span>`);
  assert.equal(fixInlineColors(`<p style="text-align:center">c</p>`), `<p style="text-align:center">c</p>`, "untouched without colours");
});
