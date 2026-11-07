import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "vazirmatn/Vazirmatn-font-face.css";
import "./globals.css";
import { getSettings } from "@/lib/settings";
import { resolveTheme, themeCss } from "@/lib/themes";

// Content is edited live in the admin panel, so every request reads the current data.
export const dynamic = "force-dynamic";

/**
 * Absolute base for image and canonical links in metadata: SITE_URL when set (the
 * domain, once the site is public), otherwise the address the visitor used.
 */
async function siteBase(): Promise<URL | undefined> {
  try {
    if (process.env.SITE_URL) return new URL(process.env.SITE_URL);
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (!host || !/^[a-z0-9.:-]+$/i.test(host)) return undefined;
    return new URL(`${h.get("x-forwarded-proto") === "https" ? "https" : "http"}://${host}`);
  } catch {
    return undefined;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const s = getSettings();
  return {
    metadataBase: await siteBase(),
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
