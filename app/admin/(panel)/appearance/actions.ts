"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { str, withError } from "@/lib/form";
import { getSettings, saveSettings } from "@/lib/settings";
import { isHex, THEME_PRESETS } from "@/lib/themes";
import type { ColorMode } from "@/lib/types";

export async function saveTheme(fd: FormData) {
  await requireAdmin();
  const preset = str(fd, "preset");
  if (preset !== "custom" && !THEME_PRESETS.some((t) => t.id === preset)) redirect(withError("/admin/appearance/", "تم انتخاب‌شده معتبر نیست."));
  const brand = str(fd, "brand");
  const accent = str(fd, "accent");
  if (preset === "custom" && (!isHex(brand) || !isHex(accent))) redirect(withError("/admin/appearance/", "رنگ‌ها باید به شکل #1a4fa3 باشند."));
  const mode = (["auto", "light", "dark"] as ColorMode[]).find((m) => m === str(fd, "mode")) ?? "auto";

  const settings = getSettings();
  saveSettings({
    ...settings,
    theme: {
      preset,
      mode,
      // Keep the last custom colours even when a preset is chosen, so switching back is easy.
      brand: isHex(brand) ? brand : settings.theme.brand,
      accent: isHex(accent) ? accent : settings.theme.accent,
    },
  });
  redirect("/admin/appearance/?ok=saved");
}
