import { readStore, seedFromContent, writeStore } from "./store";
import { DEFAULT_THEME } from "./themes";
import type { Settings } from "./types";

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
      description: site.description || "پایگاه خبری تحلیلی نساجی اسپرت",
      ticketsUrl: "",
      social: { instagram: "", telegram: "" },
      theme: { preset: DEFAULT_THEME.id, mode: "dark" },
      designVersion: 2,
      sourceUrl: site.sourceUrl,
      importedAt: site.importedAt,
    };
  });
  // Sites created before the luxury redesign still carry the old untouched default
  // theme; move them to the new look once. A theme someone picked is left alone.
  if (!s.designVersion) {
    const untouched = s.theme.preset === "blue-pomegranate" && s.theme.mode === "auto";
    const next: Settings = { ...s, designVersion: 2, ...(untouched ? { theme: { ...s.theme, preset: DEFAULT_THEME.id, mode: "dark" } } : {}) };
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
