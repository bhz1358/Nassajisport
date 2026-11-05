import { readStore, seedFromContent, writeStore } from "./store";
import { DEFAULT_THEME } from "./themes";
import type { Settings } from "./types";

export function getSettings(): Settings {
  return readStore<Settings>("settings", () => {
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
      theme: { preset: DEFAULT_THEME.id, mode: "auto" },
      sourceUrl: site.sourceUrl,
      importedAt: site.importedAt,
    };
  });
}

export function saveSettings(settings: Settings) {
  writeStore("settings", settings);
}
