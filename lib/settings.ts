import { readStore, seedFromContent, writeStore } from "./store";
import { DEFAULT_THEME } from "./themes";
import type { Settings } from "./types";

/** Shown under the site name, in the footer and in search results; editable in Settings. */
export const TAGLINE = "قدیمی‌ترین سایت فوتبال مازندران";
// The old WordPress tagline, "پایگاه خبری تحلیلی نساجی اسپرت", in any spacing.
const isOldTagline = (d = "") => !d.trim() || /^پایگاه\s*خبری/.test(d.replace(/\u200c/g, " ").trim());

export function getSettings(): Settings {
  const s = readStore<Settings>("settings", () => {
    let site: Partial<Settings> = {};
    try {
      site = seedFromContent("data/site.json", "sample/site.json");
    } catch {
      /* defaults below */
    }
    return {
      title: site.title || "نساجی اسپرت",
      description: TAGLINE,
      ticketsUrl: "",
      social: { instagram: "", telegram: "" },
      theme: { preset: DEFAULT_THEME.id, mode: "dark" },
      designVersion: 3,
      sourceUrl: site.sourceUrl,
      importedAt: site.importedAt,
    };
  });
  const version = s.designVersion ?? 1;
  if (version < 3) {
    let next: Settings = { ...s, designVersion: 3 };
    // Sites created before the luxury redesign still carry the old untouched default
    // theme; move them to the new look once. A theme someone picked is left alone.
    if (version < 2 && s.theme.preset === "blue-pomegranate" && s.theme.mode === "auto") {
      next = { ...next, theme: { ...s.theme, preset: DEFAULT_THEME.id, mode: "dark" } };
    }
    // The old generic tagline (from the WordPress import) becomes the new one; a
    // tagline someone wrote themselves is kept.
    if (isOldTagline(s.description)) next = { ...next, description: TAGLINE };
    writeStore("settings", next);
    return next;
  }
  return s;
}

export const DEFAULT_LOGO = "/logo.webp";

export const logoUrl = (s: Settings) => s.logo || DEFAULT_LOGO;

export function saveSettings(settings: Settings) {
  writeStore("settings", settings);
}
