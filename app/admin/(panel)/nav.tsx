"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { can, sectionOfPath, type Role } from "@/lib/roles";

const GROUPS: { title: string; items: { href: string; label: string }[] }[] = [
  { title: "", items: [{ href: "/admin/", label: "داشبورد" }, { href: "/admin/account/", label: "حساب من" }] },
  {
    title: "محتوا",
    items: [
      { href: "/admin/posts/", label: "خبرها و برگه‌ها" },
      { href: "/admin/comments/", label: "نظرها" },
      { href: "/admin/categories/", label: "دسته‌ها" },
      { href: "/admin/media/", label: "رسانه" },
      { href: "/admin/telegram/", label: "تلگرام" },
    ],
  },
  {
    title: "فوتبال",
    items: [
      { href: "/admin/league/", label: "جدول و بازی‌ها" },
      { href: "/admin/squad/", label: "بازیکنان و کادر" },
      { href: "/admin/squad/lineup/", label: "ترکیب بازی" },
      { href: "/admin/match-reports/", label: "گزارش بازی‌ها" },
      { href: "/admin/ratings/", label: "نمرهٔ هواداران" },
      { href: "/admin/predict/", label: "مسابقهٔ پیش‌بینی" },
    ],
  },
  {
    title: "سایت",
    items: [
      { href: "/admin/menus/", label: "منوها" },
      { href: "/admin/ads/", label: "تبلیغات" },
      { href: "/admin/appearance/", label: "ظاهر و تم رنگی" },
      { href: "/admin/settings/", label: "تنظیمات" },
      { href: "/admin/backup/", label: "پشتیبان در بله" },
      { href: "/admin/users/", label: "کاربران" },
      { href: "/admin/import/", label: "درون‌ریزی وردپرس" },
    ],
  },
];

/** Panel menu; sections the user's role cannot open are left out. */
export function AdminNav({ role, pendingComments = 0 }: { role: Role; pendingComments?: number }) {
  const pathname = usePathname();
  const allowed = (href: string) => {
    const section = sectionOfPath(href);
    return !section || can(role, section);
  };
  const groups = GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => allowed(i.href)) })).filter((g) => g.items.length);
  // The longest matching link wins, so /admin/squad/lineup/ doesn't also light up /admin/squad/.
  const all = groups.flatMap((g) => g.items.map((i) => i.href));
  const active = all
    .filter((h) => (h === "/admin/" ? pathname === "/admin/" || pathname === "/admin" : pathname.startsWith(h)))
    .sort((a, b) => b.length - a.length)[0];
  return (
    <nav className="a-nav" aria-label="منوی مدیریت">
      {groups.map((g) => (
        <div key={g.title} className="a-nav-group">
          {g.title && <span className="a-nav-title">{g.title}</span>}
          {g.items.map((i) => (
            <Link key={i.href} href={i.href} aria-current={i.href === active ? "page" : undefined}>
              {i.label}
              {i.href === "/admin/comments/" && pendingComments > 0 && <span className="a-badge">{pendingComments.toLocaleString("fa-IR")}</span>}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}
