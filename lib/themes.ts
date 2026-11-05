import type { ColorMode, Settings } from "./types";

export type ThemePreset = { id: string; name: string; brand: string; accent: string };

// Each theme is two colours: brand (header, headings, dark sections) and accent
// (badges, buttons, live states). Every other shade is derived from them in CSS.
export const THEME_PRESETS: ThemePreset[] = [
  { id: "blue-pomegranate", name: "آبی اناری", brand: "#1a4fa3", accent: "#c0163a" },
  { id: "classic-red", name: "قرمز کلاسیک", brand: "#7a1222", accent: "#e3a008" },
  { id: "navy-gold", name: "سرمه‌ای طلایی", brand: "#1e3a5f", accent: "#c8961e" },
  { id: "forest", name: "سبز جنگلی", brand: "#14532d", accent: "#dc2626" },
  { id: "royal-purple", name: "بنفش سلطنتی", brand: "#4c1d95", accent: "#f59e0b" },
  { id: "teal", name: "فیروزه‌ای", brand: "#0f5e6e", accent: "#f97316" },
  { id: "charcoal", name: "زغالی", brand: "#2b2f3a", accent: "#e11d48" },
  { id: "sky", name: "آسمانی", brand: "#0369a1", accent: "#ea580c" },
];

export const DEFAULT_THEME = THEME_PRESETS[0];

const HEX = /^#[0-9a-fA-F]{6}$/;
export const isHex = (s: unknown): s is string => typeof s === "string" && HEX.test(s);

export function resolveTheme(theme: Settings["theme"]): { brand: string; accent: string } {
  if (theme.preset === "custom" && isHex(theme.brand) && isHex(theme.accent)) {
    return { brand: theme.brand, accent: theme.accent };
  }
  const p = THEME_PRESETS.find((t) => t.id === theme.preset) ?? DEFAULT_THEME;
  return { brand: p.brand, accent: p.accent };
}

/** The palette as CSS custom properties; every shade is mixed from the two theme colours. */
export function themeVars(brand: string, accent: string): Record<string, string> {
  if (!isHex(brand) || !isHex(accent)) ({ brand, accent } = DEFAULT_THEME);
  const shade = (c: string, pct: number) => `color-mix(in srgb, ${c} ${pct}%, #000)`;
  const tint = (c: string, pct: number) => `color-mix(in srgb, ${c} ${pct}%, #fff)`;
  return {
    "--brand-600": brand,
    "--brand-700": shade(brand, 82),
    "--brand-800": shade(brand, 62),
    "--brand-900": shade(brand, 44),
    "--brand-950": shade(brand, 28),
    "--acc-500": tint(accent, 85),
    "--acc-600": accent,
    "--acc-700": shade(accent, 82),
  };
}

/** CSS rule for a theme; only validated hex values ever reach this string. */
export function themeCss(brand: string, accent: string): string {
  const vars = themeVars(brand, accent);
  return `:root{${Object.entries(vars)
    .map(([k, v]) => `${k}:${v};`)
    .join("")}}`;
}

export const COLOR_MODES: { id: ColorMode; label: string }[] = [
  { id: "auto", label: "خودکار (مطابق دستگاه کاربر)" },
  { id: "light", label: "همیشه روشن" },
  { id: "dark", label: "همیشه تیره" },
];
