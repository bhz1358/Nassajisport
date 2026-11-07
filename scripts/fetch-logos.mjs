#!/usr/bin/env node
// Downloads club logos from a web page (e.g. an article listing Iranian club logos)
// and assigns them to the teams in the league table.
//
//   node scripts/fetch-logos.mjs DATA_DIR https://example.com/logos-article/ [--force] [--reset] [--list]
// --reset first removes the logos this tool added before (uploads made in the admin stay).
//
// Each image on the page is matched to a team by its alt/title text, its file name,
// and the heading above it. Logos are saved as WebP in DATA_DIR/uploads/teams/.
// Teams that already have a logo keep it unless --force is given.

import fs from "node:fs";
import path from "node:path";

// Persian team name (as in the table) → words that identify it in Persian or in file names.
// Longer, more specific names come first so "استقلال خوزستان" is not taken for "استقلال".
export const TEAM_ALIASES = [
  // Foolad's full name is "فولاد خوزستان": checked before Esteghlal Khuzestan, and
  // "khuzestan" alone is not used, because it appears in both clubs' names.
  ["فولاد", ["فولاد خوزستان", "khuzestan-steel", "foolad", "fulad", "فولاد"]],
  ["استقلال خوزستان", ["استقلال خوزستان", "esteghlal-khuzestan", "esteghlal_khuzestan", "esteghlalkhuzestan"]],
  ["صنعت نفت آبادان", ["صنعت نفت", "sanat-naft", "sanat_naft", "sanatnaft", "naft-abadan"]],
  ["مس شهر بابک", ["مس شهر بابک", "مس شهربابک", "shahr-babak", "shahrbabak", "mes-shahr"]],
  ["شمس آذر قزوین", ["شمس آذر", "shams-azar", "shams_azar", "shamsazar"]],
  ["چادرملو اردکان", ["چادرملو", "chadormalu", "chadormellu", "chadormelo"]],
  ["آلومینیوم اراک", ["آلومینیوم", "aluminium", "aluminum"]],
  ["خیبر خرم آباد", ["خیبر", "kheybar", "khaybar"]],
  ["فجر سپاسی", ["فجر سپاسی", "fajr-sepasi", "fajr_sepasi", "fajrsepasi"]],
  ["نساجی مازندران", ["نساجی", "nassaji", "nasaji"]],
  ["ذوب آهن", ["ذوب آهن", "ذوب‌آهن", "zob-ahan", "zobahan", "zob_ahan"]],
  ["گل گهر", ["گل گهر", "گل‌گهر", "gol-gohar", "golgohar", "gol_gohar"]],
  ["پرسپولیس", ["پرسپولیس", "persepolis", "perspolis"]],
  ["سپاهان", ["سپاهان", "sepahan"]],
  ["تراکتور", ["تراکتور", "tractor", "teraktor"]],
  ["پیکان", ["پیکان", "paykan", "peykan"]],
  ["ملوان", ["ملوان", "malavan"]],
  ["استقلال", ["استقلال", "esteghlal", "esteqlal"]],
];

const norm = (s) =>
  (s ?? "")
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/‌/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase();

const attr = (tag, name) => tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`, "i"))?.[1];

/** Every <img> in page order, with the text that describes it. */
export function findImages(html, base) {
  const out = [];
  let heading = "";
  // WordPress puts the caption after the image inside <figure>: copy it onto the image first.
  html = html.replace(/<figure\b[\s\S]*?<\/figure>/gi, (fig) => {
    const cap = fig.match(/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/i)?.[1]?.replace(/<[^>]+>/g, " ") ?? "";
    return cap ? fig.replace(/<img\b/gi, `<img data-caption="${cap.replace(/"/g, " ")}"`) : fig;
  });
  // Logos set as CSS backgrounds (common in league tables) become ordinary images.
  html = html.replace(/<([a-z][a-z0-9]*)\b([^>]*?\bstyle\s*=\s*["'][^"']*?background(?:-image)?\s*:[^"']*?url\(\s*(?:&quot;|['"])?([^'")&]+)(?:&quot;|['"])?\s*\)[^>]*)>/gi,
    (m, _tag, _attrs, url) => `${m}<img src="${url}">`);
  // The nearest text before an image (heading, paragraph, list item) also names it.
  const re = /<(h[1-6]|p|li|strong|b)\b[^>]*>([\s\S]*?)<\/\1>|<img\b[^>]*>/gi;
  for (const m of html.matchAll(re)) {
    if (m[1]) {
      const text = m[2].replace(/<img\b[^>]*>/gi, "").replace(/<[^>]+>/g, " ").trim();
      // An image inside this block (e.g. <p><img></p>) is handled with the text before it.
      const inner = m[0].indexOf(m[2]);
      for (const img of m[2].matchAll(/<img\b[^>]*>/gi)) pushImage(img[0], m.index + inner + img.index);
      if (text) heading = text;
      continue;
    }
    pushImage(m[0], m.index);
  }
  return out;

  /** Text right after the image in the same table row / list item / box, e.g. the team name in a league table. */
  function textAfter(at, tag) {
    const rest = html.slice(at + tag.length, at + tag.length + 1500);
    const stop = rest.search(/<img\b|<\/tr>|<\/li>|<\/figure>|<\/a>\s*<\/(?:td|div)>\s*<(?:td|div)\b[^>]*>\s*<a\b/i);
    return (stop >= 0 ? rest.slice(0, stop) : rest).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 120);
  }

  function pushImage(tag, at) {
    // Lazy-loading themes keep the real file in data-* attributes; srcset's largest wins.
    const srcset = attr(tag, "data-srcset") || attr(tag, "srcset");
    const largest = srcset
      ?.split(",")
      .map((s) => s.trim().split(/\s+/))
      .sort((a, b) => parseInt(b[1] || "0") - parseInt(a[1] || "0"))[0]?.[0];
    const src = attr(tag, "data-lazy-src") || attr(tag, "data-src") || largest || attr(tag, "src");
    if (!src || src.startsWith("data:")) return;
    let url;
    try {
      url = new URL(src, base).href;
    } catch {
      return;
    }
    const file = decodeURIComponent(new URL(url).pathname.split("/").pop() ?? "");
    out.push({
      url,
      text: norm(`${attr(tag, "alt") ?? ""} ${attr(tag, "title") ?? ""} ${attr(tag, "data-caption") ?? ""} ${file}`),
      after: norm(textAfter(at, tag)),
      heading: norm(heading),
      // Files named like logos are tried before other pictures that mention a team.
      logoish: /logo|team|club|badge|crest|emblem|لوگو|آرم/i.test(decodeURIComponent(url)),
    });
  }
}

/** Team name for an image: its own text, then the text next to it, then the heading above it. */
export function matchTeam(img, teams) {
  for (const source of [img.text, img.after ?? "", img.heading]) {
    for (const [team, aliases] of TEAM_ALIASES) {
      if (!teams.includes(team)) continue;
      if (aliases.some((a) => source.includes(norm(a)))) return team;
    }
  }
  return undefined;
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const [dataDir, pageUrl] = args.filter((a) => !a.startsWith("--"));
  if (!dataDir || !pageUrl) {
    console.error("Usage: node scripts/fetch-logos.mjs DATA_DIR PAGE_URL [--force]");
    process.exit(1);
  }
  const leagueFile = path.join(dataDir, "league.json");
  const league = JSON.parse(fs.readFileSync(leagueFile, "utf8"));
  // Same repair the site applies: "فولاد W W D W W" is the team "فولاد".
  const clean = (t) => {
    const name = t.replace(/\s+(?:[WDLبمش]\s*){2,10}$/i, "").trim();
    return name.includes("نساجی") ? "نساجی مازندران" : name;
  };
  const teams = [...new Set([...league.standings.map((r) => clean(r.team)), ...league.fixtures.flatMap((f) => [clean(f.home), clean(f.away)])])];
  const logos = { ...(league.teamLogos ?? {}) };
  if (args.includes("--reset")) {
    for (const [team, url] of Object.entries(logos)) if (url.startsWith("/uploads/teams/")) delete logos[team];
    console.log("Removed the logos added by this tool earlier.");
  }

  const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36" };
  console.log(`Reading ${pageUrl} ...`);
  const res = await fetch(pageUrl, { headers: UA, signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`The page answered HTTP ${res.status}`);
  const images = findImages(await res.text(), pageUrl);
  console.log(`${images.length} images on the page`);
  if (args.includes("--list")) {
    // Shows what each image was matched to, to see why a team was missed.
    for (const img of images) console.log(`${matchTeam(img, teams) ?? "—"}  ⟵  ${img.text.slice(0, 50)} | ${img.after.slice(0, 40)} | ${img.heading.slice(0, 40)}`);
    return;
  }

  const sharp = (await import("sharp")).default;
  const dir = path.join(dataDir, "uploads", "teams");
  fs.mkdirSync(dir, { recursive: true });
  const done = new Set();
  // Logo-named files first; a news photo that mentions a team is only a fallback.
  const ordered = [...images.filter((i) => i.logoish), ...images.filter((i) => !i.logoish)];
  for (const img of ordered) {
    const team = matchTeam(img, teams);
    if (!team || done.has(team) || (logos[team] && !force)) continue;
    try {
      const r = await fetch(img.url, { headers: { ...UA, Referer: pageUrl }, signal: AbortSignal.timeout(30_000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const buf = Buffer.from(await r.arrayBuffer());
      // Logos are roughly square; a wide or tall picture is a photo, so keep looking.
      const { width = 0, height = 0 } = await sharp(buf).metadata();
      if (!width || !height || width / height > 1.6 || height / width > 1.6) {
        console.log(`  · ${team}: skipped a ${width}×${height} picture (not a logo)`);
        continue;
      }
      const webp = await sharp(buf).resize(256, 256, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 90 }).toBuffer();
      const slug = TEAM_ALIASES.find(([t]) => t === team)[1].find((a) => /^[a-z]/.test(a)) ?? `team-${done.size}`;
      fs.writeFileSync(path.join(dir, `${slug}.webp`), webp);
      logos[team] = `/uploads/teams/${slug}.webp?v=${Date.now().toString(36)}`;
      done.add(team);
      console.log(`  ✓ ${team}`);
    } catch (e) {
      console.log(`  ✗ ${team}: ${e.message}`);
    }
  }

  fs.copyFileSync(leagueFile, `${leagueFile}.before-logos`);
  const tmp = `${leagueFile}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify({ ...league, teamLogos: logos }, null, 2) + "\n");
  fs.renameSync(tmp, leagueFile);

  const missing = teams.filter((t) => !logos[t]);
  console.log(`\n${done.size} logos added. Teams with a logo: ${teams.length - missing.length} of ${teams.length}.`);
  if (missing.length) console.log(`No logo found for: ${missing.join("، ")}\nUpload these in Admin > جدول و بازی‌ها > لوگوی تیم‌ها.`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(`Failed: ${e.message}`);
    process.exit(1);
  });
}
