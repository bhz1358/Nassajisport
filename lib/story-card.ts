// A 1080×1920 story picture of a Nassaji result (Instagram / Telegram / Bale stories): both
// crests, the score, the scorers from the match report, the week, date and venue, and the
// site's address. Drawn with sharp; Persian text is set by Pango with the bundled Vazirmatn.

import fs from "node:fs";
import path from "node:path";
import { logoPath } from "./cover.ts";
import { faDate, faNum, faTime, faWeekday } from "./format";
import { getLeague, teamLogo } from "./league";
import { fixtureOf, getReports } from "./match-reports";
import { fixtureKey } from "./predict-score.ts";
import { bannerUrl, getSettings, logoUrl } from "./settings";
import { HOME_TEAM } from "./site";
import { UPLOADS_DIR } from "./store";
import type { Fixture } from "./types";

const W = 1080;
const H = 1920;
const FONT_DIR = path.join(process.cwd(), "node_modules", "vazirmatn", "fonts", "ttf");
const font = (weight: "Black" | "Bold" | "Medium" | "Regular") => path.join(FONT_DIR, `Vazirmatn-${weight}.ttf`);
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

type Sharp = typeof import("sharp").default;
type Layer = { input: Buffer; top: number; left: number };

async function text(sharp: Sharp, s: string, size: number, color: string, weight: "Black" | "Bold" | "Medium" | "Regular", maxWidth = W - 120) {
  const { data, info } = await sharp({
    text: { text: `<span foreground="${color}">${esc(s)}</span>`, font: `Vazirmatn ${weight} ${size}`, fontfile: font(weight), rgba: true, dpi: 72, width: maxWidth, align: "centre", wrap: "word" },
  })
    .png()
    .toBuffer({ resolveWithObject: true });
  return { input: data, w: info.width, h: info.height };
}

/** A crest on a soft white disc; the site logo when the team has none. */
async function crest(sharp: Sharp, team: string, size: number): Promise<Buffer> {
  const url = teamLogo(getLeague(), team) ?? logoUrl(getSettings());
  const file = logoPath(url, UPLOADS_DIR);
  const inner = Math.round(size * 0.78);
  let logo: Buffer;
  try {
    logo = await sharp(fs.readFileSync(file)).resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  } catch {
    logo = await sharp({ create: { width: inner, height: inner, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer();
  }
  const disc = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><defs><radialGradient id="g" cx="50%" cy="40%" r="60%"><stop offset="0" stop-color="#ffffff" stop-opacity="0.22"/><stop offset="1" stop-color="#ffffff" stop-opacity="0.06"/></radialGradient></defs><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 3}" fill="url(#g)" stroke="#ffffff" stroke-opacity="0.25" stroke-width="3"/></svg>`,
  );
  const off = Math.round((size - inner) / 2);
  return sharp(disc).composite([{ input: logo, top: off, left: off }]).png().toBuffer();
}

/** Scorers per side from the match report (players marked «(گل)» in the panel). */
function scorers(f: Fixture): { home: string[]; away: string[] } {
  const key = fixtureKey(f);
  const r = getReports().find((x) => {
    const rf = fixtureOf(x);
    return rf && fixtureKey(rf) === key;
  });
  const list = (sheet?: { starters: { name: string; goals?: number }[]; subs: { name: string; goals?: number }[] }) =>
    (sheet ? [...sheet.starters, ...sheet.subs] : []).filter((p) => p.goals).map((p) => (p.goals! > 1 ? `${p.name} (${faNum(p.goals!)})` : p.name));
  return { home: list(r?.home), away: list(r?.away) };
}

export async function storyCard(f: Fixture): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  const settings = getSettings();
  const league = getLeague();
  const layers: Layer[] = [];
  const center = (t: { input: Buffer; w: number }, top: number, cx = W / 2) => layers.push({ input: t.input, top: Math.round(top), left: Math.round(cx - t.w / 2) });

  // Background: deep club red to near-black, with the home banner fading in at the top.
  const bg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs>
      <linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a0a12"/><stop offset="0.55" stop-color="#16080b"/><stop offset="1" stop-color="#07070a"/></linearGradient>
      <radialGradient id="glow" cx="50%" cy="52%" r="45%"><stop offset="0" stop-color="#c81e32" stop-opacity="0.35"/><stop offset="1" stop-color="#c81e32" stop-opacity="0"/></radialGradient>
    </defs><rect width="${W}" height="${H}" fill="url(#b)"/><rect width="${W}" height="${H}" fill="url(#glow)"/>
    <path d="M0 1640 C 300 1560 700 1720 1080 1600 L1080 1920 L0 1920 Z" fill="#c81e32" fill-opacity="0.18"/>
    <path d="M0 1700 C 360 1630 720 1780 1080 1680" stroke="#e6b450" stroke-opacity="0.35" stroke-width="3" fill="none"/></svg>`,
  );
  try {
    const bannerFile = logoPath(bannerUrl(settings), UPLOADS_DIR);
    const banner = await sharp(fs.readFileSync(bannerFile)).resize(W, 560, { fit: "cover", position: "attention" }).modulate({ brightness: 0.8 }).png().toBuffer();
    const fade = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="560"><defs><linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.9"/><stop offset="0.6" stop-color="#fff" stop-opacity="0.5"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs><rect width="${W}" height="560" fill="url(#f)"/></svg>`);
    const faded = await sharp(banner).composite([{ input: fade, blend: "dest-in" }]).png().toBuffer();
    layers.push({ input: faded, top: 0, left: 0 });
  } catch {
    /* no banner: plain background */
  }

  // Site logo and name.
  try {
    const logo = await sharp(fs.readFileSync(logoPath(logoUrl(settings), UPLOADS_DIR))).resize(150, 150, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
    layers.push({ input: logo, top: 470, left: (W - 150) / 2 });
  } catch {
    /* no logo */
  }
  center(await text(sharp, settings.title || "نساجی اسپرت", 54, "#ffffff", "Black"), 630);

  // Competition and week.
  center(await text(sharp, `${league.competition || "لیگ برتر"}${f.round ? ` · هفتهٔ ${faNum(f.round)}` : ""}`, 38, "#e6b450", "Bold"), 760);

  // Crests (home on the right), names, score.
  const homeX = W - 240;
  const awayX = 240;
  const size = 270;
  const crestTop = 900;
  layers.push({ input: await crest(sharp, f.home, size), top: crestTop, left: homeX - size / 2 });
  layers.push({ input: await crest(sharp, f.away, size), top: crestTop, left: awayX - size / 2 });
  const nameH = await text(sharp, f.home, 44, f.home === HOME_TEAM ? "#ffffff" : "#e8e2d6", "Bold", 420);
  const nameA = await text(sharp, f.away, 44, f.away === HOME_TEAM ? "#ffffff" : "#e8e2d6", "Bold", 420);
  center(nameH, 1195, homeX);
  center(nameA, 1195, awayX);

  const played = f.homeScore != null && f.awayScore != null && f.status !== "scheduled";
  if (played) {
    const sh = await text(sharp, faNum(f.homeScore!), 190, "#ffffff", "Black");
    const sa = await text(sharp, faNum(f.awayScore!), 190, "#ffffff", "Black");
    const dash = await text(sharp, "-", 120, "#e6b450", "Black");
    center(sh, 930, W / 2 + 90);
    center(sa, 930, W / 2 - 90);
    center(dash, 975, W / 2);
    const pill = f.status === "live" ? `زنده${f.minute ? ` · دقیقهٔ ${faNum(f.minute)}` : ""}` : "پایان بازی";
    center(await text(sharp, pill, 34, f.status === "live" ? "#ff6b6b" : "#bdb5a6", "Medium"), 1165);
  } else {
    center(await text(sharp, "شروع بازی", 34, "#bdb5a6", "Medium"), 950);
    center(await text(sharp, faTime(f.date), 96, "#ffffff", "Black"), 995);
  }

  // Scorers under each side.
  const goals = scorers(f);
  let lowest = 1275;
  for (const [list, x] of [[goals.home, homeX], [goals.away, awayX]] as const) {
    if (!list.length) continue;
    const t = await text(sharp, `گل: ${list.join("، ")}`, 32, "#e6b450", "Medium", 440);
    center(t, 1280, x);
    lowest = Math.max(lowest, 1280 + t.h);
  }

  // Date and venue.
  const when = `${faWeekday(f.date)} ${faDate(f.date).split(" ").pop()}${f.venue ? ` · ${f.venue}` : ""}`;
  center(await text(sharp, when, 34, "#d8d1c4", "Regular"), Math.max(1430, lowest + 40));
  center(
    await text(sharp, played && f.status === "finished" ? "گزارش کامل، ترکیب دو تیم و نمرهٔ هواداران در سایت" : "پیش‌بینی این بازی را در سایت ثبت کنید", 32, "#e6b450", "Medium"),
    1560,
  );

  // Footer: the site's address and channels.
  const site = (process.env.SITE_URL || "").replace(/^https?:\/\//, "").replace(/\/$/, "");
  const handles = Object.values(settings.social ?? {})
    .map((u) => String(u).match(/(?:t\.me|instagram\.com)\/([A-Za-z0-9_.]+)/)?.[1])
    .filter(Boolean);
  const footer = [site, ...new Set(handles.map((h) => `@${h}`))].filter(Boolean).join("   ·   ") || settings.title;
  center(await text(sharp, footer, 36, "#ffffff", "Bold"), 1770);

  return sharp(bg).composite(layers).jpeg({ quality: 90, mozjpeg: true }).toBuffer();
}

// Cards by fixture and its score, so a page view doesn't redraw them.
const cache = new Map<string, Buffer>();
export async function cachedStoryCard(f: Fixture): Promise<Buffer> {
  const id = JSON.stringify([fixtureKey(f), f.homeScore, f.awayScore, f.status, f.minute, getSettings().title, scorers(f)]);
  const hit = cache.get(id);
  if (hit) return hit;
  const buf = await storyCard(f);
  if (cache.size > 40) cache.clear();
  cache.set(id, buf);
  return buf;
}
