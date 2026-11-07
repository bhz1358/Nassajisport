import { readStore, writeStore } from "./store.ts";
import { FOOTER_NAV, NAV } from "./site.ts";

export type MenuItem = {
  label: string;
  /** Empty only for a parent that just opens its submenu. */
  href: string;
  /** Submenu (header menu only, one level). */
  children?: MenuItem[];
};
/** A row of the admin editor: the menu flattened, depth 1 = submenu item of the row above. */
export type MenuRow = { label: string; href: string; depth?: number };

export const SUBMENU_LIMIT = 15;
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

/** Menu → editor rows (each submenu item right after its parent, at depth 1). */
export function toRows(items: MenuItem[]): MenuRow[] {
  return items.flatMap((i) => [{ label: i.label, href: i.href, depth: 0 }, ...(i.children ?? []).map((c) => ({ label: c.label, href: c.href, depth: 1 }))]);
}

/**
 * Validates a menu sent from the editor (rows in order, depth 1 = submenu of the row
 * above) and builds it. Throws a message for the admin on bad input.
 */
export function parseMenu(json: string, { nested = false } = {}): MenuItem[] {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new Error("اطلاعات منو خوانده نشد؛ دوباره تلاش کنید.");
  }
  if (!Array.isArray(raw)) throw new Error("اطلاعات منو خوانده نشد؛ دوباره تلاش کنید.");
  const rows: (MenuRow & { depth: number })[] = [];
  for (const r of raw) {
    const label = String((r as MenuRow)?.label ?? "").trim().slice(0, 40);
    const href = String((r as MenuRow)?.href ?? "").trim();
    if (!label && !href) continue; // empty row
    rows.push({ label, href, depth: nested && Number((r as MenuRow)?.depth) === 1 ? 1 : 0 });
  }
  const items: MenuItem[] = [];
  rows.forEach((r, i) => {
    if (!r.label) throw new Error(`برای لینک «${r.href}» عنوان بنویسید.`);
    const isParent = r.depth === 0 && rows[i + 1]?.depth === 1;
    // A parent may have no address of its own: it only opens its submenu.
    const href = !r.href && isParent ? "" : normalizeHref(r.href);
    if (href === null) throw new Error(`آدرس «${r.label}» درست نیست. آدرس صفحه‌ی سایت (مثل ‎/league/‎) یا آدرس کامل با https:// بنویسید.`);
    if (r.depth === 1) {
      const parent = items.at(-1);
      if (!parent) throw new Error(`«${r.label}» زیرمنوی گزینه‌ای نیست؛ گزینه‌ی اول منو نمی‌تواند زیرمنو باشد.`);
      parent.children = [...(parent.children ?? []), { label: r.label, href }];
      if (parent.children.length > SUBMENU_LIMIT) throw new Error(`هر زیرمنو حداکثر ${SUBMENU_LIMIT} گزینه می‌تواند داشته باشد.`);
    } else {
      items.push({ label: r.label, href });
    }
  });
  if (items.length > MENU_LIMIT) throw new Error(`هر منو حداکثر ${MENU_LIMIT} گزینه می‌تواند داشته باشد.`);
  return items;
}
