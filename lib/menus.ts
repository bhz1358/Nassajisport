import { readStore, writeStore } from "./store.ts";
import { FOOTER_NAV, NAV } from "./site.ts";

export type MenuItem = { label: string; href: string };
export type Menus = { header: MenuItem[]; footer: MenuItem[] };
export type MenuKey = keyof Menus;

export const MENU_LIMIT = 30;

export const DEFAULT_MENUS: Menus = { header: NAV, footer: FOOTER_NAV };

/** Menus edited in the admin panel; the built-in ones until someone saves. */
export function getMenus(): Menus {
  const saved = readStore<Partial<Menus>>("menus", () => ({}));
  return { header: saved.header ?? DEFAULT_MENUS.header, footer: saved.footer ?? DEFAULT_MENUS.footer };
}

export function saveMenu(key: MenuKey, items: MenuItem[] | null) {
  const saved = readStore<Partial<Menus>>("menus", () => ({}));
  const next = { ...saved };
  if (items) next[key] = items;
  else delete next[key];
  writeStore("menus", next);
}

export const isExternal = (href: string) => /^https?:\/\//i.test(href);

/**
 * Cleans one link: site paths get a leading and trailing "/" (the site's URL style),
 * full addresses must be http(s). Returns null when the address can't be used.
 */
export function normalizeHref(raw: string): string | null {
  const h = raw.trim();
  if (!h) return null;
  if (isExternal(h)) return /^https?:\/\/[^\s/$.?#][^\s]*$/i.test(h) ? h : null;
  if (/^(javascript|data|vbscript):/i.test(h) || h.startsWith("//") || /\s/.test(h)) return null;
  const [path, hash = ""] = h.split("#");
  let p = path.startsWith("/") ? path : `/${path}`;
  if (!p.includes("?") && !p.endsWith("/")) p += "/";
  return hash ? `${p}#${hash}` : p;
}

/** Validates a menu sent from the editor; throws a message for the admin on bad input. */
export function parseMenu(json: string): MenuItem[] {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new Error("اطلاعات منو خوانده نشد؛ دوباره تلاش کنید.");
  }
  if (!Array.isArray(raw)) throw new Error("اطلاعات منو خوانده نشد؛ دوباره تلاش کنید.");
  const items: MenuItem[] = [];
  for (const r of raw) {
    const label = String((r as MenuItem)?.label ?? "").trim().slice(0, 40);
    const rawHref = String((r as MenuItem)?.href ?? "");
    if (!label && !rawHref.trim()) continue; // empty row
    if (!label) throw new Error(`برای لینک «${rawHref}» عنوان بنویسید.`);
    const href = normalizeHref(rawHref);
    if (!href) throw new Error(`آدرس «${label}» درست نیست. آدرس صفحه‌ی سایت (مثل ‎/league/‎) یا آدرس کامل با https:// بنویسید.`);
    items.push({ label, href });
  }
  if (items.length > MENU_LIMIT) throw new Error(`هر منو حداکثر ${MENU_LIMIT} گزینه می‌تواند داشته باشد.`);
  return items;
}
