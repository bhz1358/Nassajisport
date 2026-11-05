#!/usr/bin/env node
// Downloads the old WordPress site's images over HTTP into the new site's uploads
// folder, so wp-content/uploads never has to be copied out of cPanel by hand.
//
//   node scripts/fetch-wp-media.mjs https://nassajisport.com [--dest DIR] [--data DIR] [--xml export.xml]
//
// Where the list of files comes from (all are combined):
//   - the WordPress REST API (/wp-json/wp/v2/media), every size of every image
//   - --data: images referenced by posts already imported into the new site
//   - --xml:  attachment URLs and images inside posts of a WordPress export file
// Files that already exist are skipped, so it is safe to run again.

import fs from "node:fs";
import path from "node:path";

const EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".mp4"]);
const CONCURRENCY = 6;
const TIMEOUT_MS = 60_000;
const UA = "Mozilla/5.0 (compatible; NassajiSportMigration/1.0)";

function args(argv) {
  const out = { site: "", dest: "", data: "", xml: "" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dest") out.dest = argv[++i];
    else if (a === "--data") out.data = argv[++i];
    else if (a === "--xml") out.xml = argv[++i];
    else if (!a.startsWith("--")) out.site = a;
  }
  return out;
}

/** "https://site/wp-content/uploads/2024/05/a.jpg" → "2024/05/a.jpg", or null if it is not an upload. */
export function uploadPath(url) {
  let p;
  try {
    p = decodeURIComponent(new URL(url, "https://x/").pathname);
  } catch {
    return null;
  }
  const m = p.match(/\/(?:wp-content\/)?uploads\/(.+)$/);
  if (!m) return null;
  const rel = path.posix.normalize(m[1]);
  if (rel.startsWith("..") || rel.includes("/../") || path.posix.isAbsolute(rel)) return null;
  return EXTENSIONS.has(path.posix.extname(rel).toLowerCase()) ? rel : null;
}

async function get(url, asJson = false) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, signal: ctl.signal, redirect: "follow" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return asJson ? { body: await res.json(), headers: res.headers } : Buffer.from(await res.arrayBuffer());
  } finally {
    clearTimeout(timer);
  }
}

async function fromRestApi(site) {
  const found = [];
  for (let page = 1; ; page++) {
    let r;
    try {
      r = await get(`${site}/wp-json/wp/v2/media?per_page=100&page=${page}&_fields=source_url,media_details`, true);
    } catch (e) {
      if (page === 1) console.log(`  REST API not available (${e.message}); using the other sources.`);
      break;
    }
    if (!Array.isArray(r.body) || r.body.length === 0) break;
    for (const m of r.body) {
      if (m.source_url) found.push(m.source_url);
      for (const s of Object.values(m.media_details?.sizes ?? {})) if (s?.source_url) found.push(s.source_url);
    }
    const total = Number(r.headers.get("x-wp-totalpages") || 0);
    process.stdout.write(`\r  REST API: page ${page}${total ? `/${total}` : ""}, ${found.length} files`);
    if (total && page >= total) break;
  }
  if (found.length) process.stdout.write("\n");
  return found;
}

const UPLOAD_REF = /(?:https?:)?\/\/[^\s"'()<>]+?\/wp-content\/uploads\/[^\s"'()<>?#]+|\/uploads\/[^\s"'()<>?#]+/g;

function fromText(text) {
  return text.match(UPLOAD_REF) ?? [];
}

function fromData(dir) {
  const f = path.join(dir, "posts.json");
  if (!fs.existsSync(f)) return [];
  const posts = JSON.parse(fs.readFileSync(f, "utf8"));
  return posts.flatMap((p) => [...fromText(p.content ?? ""), ...(p.featuredImage ? [p.featuredImage] : [])]);
}

async function download(site, rel, dest) {
  const target = path.join(dest, ...rel.split("/"));
  if (fs.existsSync(target) && fs.statSync(target).size > 0) return "skipped";
  const url = `${site}/wp-content/uploads/${rel.split("/").map(encodeURIComponent).join("/")}`;
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const buf = await get(url);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      const tmp = `${target}.part`;
      fs.writeFileSync(tmp, buf);
      fs.renameSync(tmp, target);
      return "downloaded";
    } catch (e) {
      lastError = e;
      if (/HTTP 404/.test(e.message)) break;
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
  throw lastError;
}

async function main() {
  const a = args(process.argv.slice(2));
  if (!a.site) {
    console.error("Usage: node scripts/fetch-wp-media.mjs https://old-site.com [--dest DIR] [--data DIR] [--xml export.xml]");
    process.exit(1);
  }
  const site = a.site.replace(/\/+$/, "");
  const dataDir = a.data || process.env.DATA_DIR || "";
  const dest = a.dest || (dataDir ? path.join(dataDir, "uploads") : "data/uploads");

  console.log(`Collecting the list of images from ${site} ...`);
  const urls = [...(await fromRestApi(site))];
  if (dataDir) urls.push(...fromData(dataDir));
  if (a.xml) urls.push(...fromText(fs.readFileSync(a.xml, "utf8")));
  const rels = [...new Set(urls.map(uploadPath).filter(Boolean))];
  if (rels.length === 0) {
    console.log("No images found. Import the WordPress XML in the admin panel first, or pass --xml export.xml.");
    process.exit(1);
  }
  console.log(`${rels.length} files to check; saving into ${dest}`);

  const stats = { downloaded: 0, skipped: 0, failed: 0 };
  const failed = [];
  let next = 0;
  const worker = async () => {
    while (next < rels.length) {
      const rel = rels[next++];
      try {
        stats[await download(site, rel, dest)]++;
      } catch (e) {
        stats.failed++;
        failed.push(`${rel}  (${e.message})`);
      }
      const done = stats.downloaded + stats.skipped + stats.failed;
      process.stdout.write(`\r  ${done}/${rels.length}  new: ${stats.downloaded}  already there: ${stats.skipped}  failed: ${stats.failed}`);
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  process.stdout.write("\n");

  if (failed.length) {
    const log = path.join(dest, "fetch-failed.txt");
    fs.writeFileSync(log, failed.join("\n") + "\n");
    console.log(`${failed.length} files could not be downloaded; list in ${log}. Running the script again retries them.`);
  }
  console.log("Done.");
}

if (import.meta.url === `file://${process.argv[1]}`) main();
