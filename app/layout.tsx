import type { Metadata, Viewport } from "next";
import "vazirmatn/Vazirmatn-font-face.css";
import "./globals.css";
import { getSettings } from "@/lib/settings";
import { resolveTheme, themeCss } from "@/lib/themes";

// Content is edited live in the admin panel, so every request reads the current data.
export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  const s = getSettings();
  return {
    title: { default: s.title, template: `%s | ${s.title}` },
    description: s.description,
    icons: { icon: "/favicon.png", apple: "/apple-touch-icon.png" },
  };
}

export function generateViewport(): Viewport {
  return { themeColor: resolveTheme(getSettings().theme).brand };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { theme } = getSettings();
  const { brand, accent } = resolveTheme(theme);
  return (
    <html lang="fa" dir="rtl" data-mode={theme.mode === "auto" ? undefined : theme.mode}>
      <head>
        {/* html:root outranks the defaults in globals.css whatever order the styles load in. */}
        <style dangerouslySetInnerHTML={{ __html: themeCss(brand, accent).replace(":root", "html:root") }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
