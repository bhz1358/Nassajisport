// A cover for a news post without a photo, chosen from what the post is about: the two
// league teams it names (logos side by side), the one team it names, or the site's logo.

import { logoPath, makeCover } from "./cover.ts";
import { getLeague, teamLogo } from "./league";
import { saveUpload } from "./media";
import { findTags } from "./seo-auto.ts";
import { getSettings, logoUrl } from "./settings";
import { HOME_TEAM } from "./site";
import { slugify } from "./slug.ts";
import { UPLOADS_DIR } from "./store";
import { resolveTheme } from "./themes";

const norm = (s: string) => s.replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/[‌]/g, " ");

/** League teams named in the text, in the order they first appear (title first). */
export function teamsInOrder(text: string): string[] {
  const league = getLeague();
  const teams = [...new Set([HOME_TEAM, ...league.standings.map((r) => r.team)])];
  const found = findTags(text, teams, []);
  const t = norm(text);
  const at = (team: string) => {
    const full = t.indexOf(norm(team));
    return full >= 0 ? full : t.indexOf(norm(team).split(" ")[0]);
  };
  return found.sort((a, b) => at(a) - at(b));
}

/** Makes and saves the cover; returns its address. */
export async function autoCover(title: string, text: string): Promise<string> {
  const settings = getSettings();
  const league = getLeague();
  const { brand, accent } = resolveTheme(settings.theme);
  const logos = teamsInOrder(`${title} ${text}`)
    .map((t) => teamLogo(league, t))
    .filter((u): u is string => !!u)
    .slice(0, 2)
    .map((u) => logoPath(u, UPLOADS_DIR));
  const buf = await makeCover(title, logos.length ? logos : [logoPath(logoUrl(settings), UPLOADS_DIR)], brand, accent);
  return saveUpload(new File([new Uint8Array(buf)], `cover-${slugify(title).slice(0, 30) || "news"}.webp`, { type: "image/webp" }));
}
