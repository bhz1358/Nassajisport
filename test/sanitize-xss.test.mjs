import { test } from "node:test";
import assert from "node:assert/strict";
import { sanitizeHtml } from "../lib/sanitize.ts";

const bad = [
  '<p onclick="alert(1)">x</p>',
  '<img src=x onerror=alert(1)>',
  "<script>alert(1)</script>",
  '<a href="javascript:alert(1)">x</a>',
  '<a href=" jav&#x09;ascript:alert(1)">x</a>',
  '<a href="javas&#99;ript:alert(1)">x</a>',
  '<a href="javascript&colon;alert(1)">x</a>',
  '<a href="data:text/html;base64,PHNjcmlwdD4=">x</a>',
  '<svg onload=alert(1)></svg>',
  '<iframe src="https://evil.example/"></iframe>',
  '<iframe srcdoc="<script>alert(1)</script>"></iframe>',
];

test("active content is removed", () => {
  for (const h of bad) {
    const out = sanitizeHtml(h).toLowerCase();
    assert.ok(!/javascript|onerror|onclick|onload|<script|<svg|evil\.example|srcdoc|data:text/.test(out), `${h} → ${out}`);
  }
});

test("Aparat script embeds become the iframe player; normal content stays", () => {
  const out = sanitizeHtml('<script type="text/JavaScript" src="https://www.aparat.com/embed/Ab12?data[rnddiv]=d&data[responsive]=yes"></script>');
  assert.match(out, /<iframe src="https:\/\/www\.aparat\.com\/video\/video\/embed\/videohash\/Ab12\/vt\/frame"/);
  assert.equal(sanitizeHtml('<p><a href="https://nassajisport.com/x">لینک</a> <img src="/uploads/a.jpg" alt="ع"></p>'), '<p><a href="https://nassajisport.com/x">لینک</a> <img src="/uploads/a.jpg" alt="ع"></p>');
});
