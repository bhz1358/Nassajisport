#!/usr/bin/env node
// Reports which published posts have a usable image, and why the others don't.
//   node scripts/check-images.mjs [DATA_DIR]
import fs from "node:fs";
import path from "node:path";

const dataDir = process.argv[2] || process.env.DATA_DIR || "data";
const uploads = path.join(dataDir, "uploads");
const posts = JSON.parse(fs.readFileSync(path.join(dataDir, "posts.json"), "utf8")).filter(
  (p) => p.type === "post" && p.status !== "draft",
);
const local = (u) => u?.startsWith("/uploads/") && fs.existsSync(path.join(uploads, decodeURIComponent(u.slice(9).split("?")[0])));
const firstImg = (html) =>
  [...(html ?? "").matchAll(/<img\b[^>]*?\bsrc=["']([^"']+)["']/gi)].map((m) => m[1]).find((s) => !/(wp-includes|gravatar|emoji|\.svg|^data:)/i.test(s));

const c = { featuredOk: 0, featuredMissingFile: 0, featuredExternal: 0, contentOnly: 0, none: 0 };
const missing = [];
const none = [];
for (const p of posts.sort((a, b) => b.date.localeCompare(a.date))) {
  if (p.featuredImage) {
    if (!p.featuredImage.startsWith("/uploads/")) c.featuredExternal++;
    else if (local(p.featuredImage)) c.featuredOk++;
    else {
      c.featuredMissingFile++;
      missing.push(`${p.featuredImage}   ← ${p.title}`);
    }
  } else if (firstImg(p.content)) c.contentOnly++;
  else {
    c.none++;
    none.push(`${p.path}   ${p.title}`);
  }
}
console.log(`Published posts: ${posts.length}`);
console.log(`  featured image, file on this server:     ${c.featuredOk}`);
console.log(`  featured image, file NOT downloaded yet: ${c.featuredMissingFile}  (shown from the old site for now)`);
console.log(`  featured image on another address:       ${c.featuredExternal}`);
console.log(`  no featured image, photo inside text:    ${c.contentOnly}  (first photo is used)`);
console.log(`  no image at all:                         ${c.none}`);
if (missing.length) console.log(`\nNewest posts whose image file is missing:\n  ${missing.slice(0, 10).join("\n  ")}`);
if (none.length) console.log(`\nNewest posts with no image at all:\n  ${none.slice(0, 10).join("\n  ")}`);
