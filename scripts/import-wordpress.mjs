#!/usr/bin/env node
// Converts a WordPress export (Tools → Export → All content, a WXR .xml file)
// into the JSON files the site reads from content/data/.
//
//   npm run import:wp -- path/to/export.xml [--out content/data] [--uploads public/uploads]
//
// Only published posts and pages are imported. Everything that is skipped is
// counted in import-report.json so nothing disappears silently.

import fs from "node:fs";
import path from "node:path";
import { XMLParser } from "fast-xml-parser";

const ARRAY_TAGS = new Set(["item", "category", "wp:postmeta", "wp:category", "wp:tag", "wp:comment", "wp:author"]);

export function parseWxr(xml) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    parseTagValue: false,
    trimValues: true,
    isArray: (name) => ARRAY_TAGS.has(name),
  });
  const channel = parser.parse(xml)?.rss?.channel;
  if (!channel) throw new Error("Not a WordPress export: <rss><channel> not found");
  return channel;
}

const text = (v) => {
  if (v == null) return "";
  if (typeof v === "object") return String(v["#text"] ?? "");
  return String(v);
};

function toIso(gmt, fallback) {
  const s = text(gmt);
  if (s && !s.startsWith("0000")) return new Date(s.replace(" ", "T") + "Z").toISOString();
  const f = text(fallback);
  return f ? new Date(f).toISOString() : new Date(0).toISOString();
}

function pathFromLink(link) {
  try {
    const u = new URL(link);
    return decodeURIComponent(u.pathname);
  } catch {
    return "";
  }
}

function meta(item, key) {
  const m = (item["wp:postmeta"] ?? []).find((pm) => text(pm["wp:meta_key"]) === key);
  return m ? text(m["wp:meta_value"]) : undefined;
}

function stripTags(html) {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export function convert(channel) {
  const siteUrl = text(channel.link).replace(/\/$/, "");
  const host = siteUrl ? new URL(siteUrl).host.replace(/^www\./, "") : "";
  // Matches http(s)://(www.)host/wp-content/uploads/ and protocol-relative variants.
  const uploadsRe = host
    ? new RegExp(`(?:https?:)?//(?:www\\.)?${host.replace(/\./g, "\\.")}/wp-content/uploads/`, "g")
    : /$^/;
  const localize = (s) => s.replace(uploadsRe, "/uploads/");

  const categories = (channel["wp:category"] ?? []).map((c) => ({
    slug: decodeURIComponent(text(c["wp:category_nicename"])),
    name: text(c["wp:cat_name"]),
    ...(text(c["wp:category_parent"]) ? { parent: decodeURIComponent(text(c["wp:category_parent"])) } : {}),
  }));

  const items = channel.item ?? [];
  const attachments = new Map();
  for (const it of items) {
    if (text(it["wp:post_type"]) === "attachment") {
      attachments.set(text(it["wp:post_id"]), text(it["wp:attachment_url"]) || text(it.guid));
    }
  }

  const report = {
    sourceUrl: siteUrl,
    totals: { items: items.length, attachments: attachments.size },
    imported: { post: 0, page: 0 },
    skipped: {},
    comments: 0,
    postsWithoutPath: [],
  };

  const posts = [];
  const comments = [];
  for (const it of items) {
    const type = text(it["wp:post_type"]);
    const status = text(it["wp:status"]);
    if (type === "attachment") continue;
    if ((type !== "post" && type !== "page") || status !== "publish") {
      const key = `${type}:${status}`;
      report.skipped[key] = (report.skipped[key] ?? 0) + 1;
      continue;
    }
    const id = Number(text(it["wp:post_id"]));
    const slug = decodeURIComponent(text(it["wp:post_name"]));
    let p = pathFromLink(text(it.link));
    if (!p || p === "/") {
      report.postsWithoutPath.push(id);
      p = `/${slug || id}/`;
    }
    const cats = (it.category ?? []).filter((c) => c["@_domain"] === "category");
    const tags = (it.category ?? []).filter((c) => c["@_domain"] === "post_tag");
    const content = localize(text(it["content:encoded"]));
    const excerpt = text(it["excerpt:encoded"]) || stripTags(content).slice(0, 220);
    const thumbId = meta(it, "_thumbnail_id");
    const thumb = thumbId ? attachments.get(thumbId) : undefined;

    posts.push({
      id,
      type,
      title: text(it.title),
      slug,
      path: p,
      date: toIso(it["wp:post_date_gmt"], it.pubDate),
      modified: toIso(it["wp:post_modified_gmt"], it.pubDate),
      author: text(it["dc:creator"]) || undefined,
      excerpt: stripTags(excerpt),
      content,
      categories: cats.map((c) => decodeURIComponent(c["@_nicename"] ?? "")),
      tags: tags.map((c) => text(c)),
      featuredImage: thumb ? localize(thumb) : undefined,
      sticky: text(it["wp:is_sticky"]) === "1" || undefined,
      seo: {
        title: meta(it, "_yoast_wpseo_title") ?? meta(it, "rank_math_title"),
        description: meta(it, "_yoast_wpseo_metadesc") ?? meta(it, "rank_math_description"),
      },
    });
    report.imported[type]++;

    // Approved comments only; email and IP are left out on purpose.
    for (const c of it["wp:comment"] ?? []) {
      if (text(c["wp:comment_approved"]) !== "1") continue;
      comments.push({
        postId: id,
        id: Number(text(c["wp:comment_id"])),
        parent: Number(text(c["wp:comment_parent"])) || undefined,
        author: text(c["wp:comment_author"]),
        date: toIso(c["wp:comment_date_gmt"], c["wp:comment_date"]),
        content: text(c["wp:comment_content"]),
      });
      report.comments++;
    }
  }

  return {
    site: {
      title: text(channel.title),
      description: text(channel.description),
      sourceUrl: siteUrl,
      importedAt: new Date().toISOString(),
    },
    posts,
    categories,
    comments,
    attachmentUrls: [...attachments.values()].map(localize),
    report,
  };
}

function main(argv) {
  const args = argv.slice(2);
  const input = args.find((a) => !a.startsWith("--"));
  const opt = (name, def) => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 ? args[i + 1] : def;
  };
  if (!input) {
    console.error("Usage: npm run import:wp -- <export.xml> [--out content/data] [--uploads public/uploads]");
    process.exit(1);
  }
  const outDir = opt("out", "content/data");
  const uploadsDir = opt("uploads", "public/uploads");

  const result = convert(parseWxr(fs.readFileSync(input, "utf8")));

  // Check that every media file referenced by the export exists locally.
  const missing = result.attachmentUrls.filter(
    (u) => u.startsWith("/uploads/") && !fs.existsSync(path.join(uploadsDir, u.slice("/uploads/".length))),
  );
  result.report.media = { referenced: result.attachmentUrls.length, missingLocally: missing.length };

  fs.mkdirSync(outDir, { recursive: true });
  const write = (name, data) => fs.writeFileSync(path.join(outDir, name), JSON.stringify(data, null, 2) + "\n");
  write("site.json", result.site);
  write("posts.json", result.posts);
  write("categories.json", result.categories);
  write("comments.json", result.comments);
  write("import-report.json", { ...result.report, missingMedia: missing });

  const r = result.report;
  console.log(`Source: ${r.sourceUrl}`);
  console.log(`Imported: ${r.imported.post} posts, ${r.imported.page} pages, ${r.comments} comments, ${result.categories.length} categories`);
  console.log(`Media: ${r.media.referenced} referenced, ${r.media.missingLocally} missing in ${uploadsDir}`);
  if (Object.keys(r.skipped).length) console.log("Skipped (not published):", r.skipped);
  console.log(`Written to ${outDir}/`);
}

if (import.meta.url === `file://${process.argv[1]}`) main(process.argv);
