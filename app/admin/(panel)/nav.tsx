"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const GROUPS: { title: string; items: { href: string; label: string }[] }[] = [
  { title: "", items: [{ href: "/admin/", label: "داشبورد" }] },
  {
    title: "محتوا",
    items: [
      { href: "/admin/posts/", label: "خبرها و برگه‌ها" },
      { href: "/admin/categories/", label: "دسته‌ها" },
      { href: "/admin/media/", label: "رسانه" },
    ],
  },
  {
    title: "فوتبال",
    items: [
      { href: "/admin/league/", label: "جدول و بازی‌ها" },
      { href: "/admin/squad/", label: "بازیکنان و کادر" },
      { href: "/admin/squad/lineup/", label: "ترکیب بازی" },
    ],
  },
  {
    title: "سایت",
    items: [
      { href: "/admin/appearance/", label: "ظاهر و تم رنگی" },
      { href: "/admin/settings/", label: "تنظیمات" },
      { href: "/admin/users/", label: "مدیران" },
      { href: "/admin/import/", label: "درون‌ریزی وردپرس" },
    ],
  },
];

export function AdminNav() {
  const pathname = usePathname();
  // The longest matching link wins, so /admin/squad/lineup/ doesn't also light up /admin/squad/.
  const all = GROUPS.flatMap((g) => g.items.map((i) => i.href));
  const active = all
    .filter((h) => (h === "/admin/" ? pathname === "/admin/" || pathname === "/admin" : pathname.startsWith(h)))
    .sort((a, b) => b.length - a.length)[0];
  return (
    <nav className="a-nav" aria-label="منوی مدیریت">
      {GROUPS.map((g) => (
        <div key={g.title} className="a-nav-group">
          {g.title && <span className="a-nav-title">{g.title}</span>}
          {g.items.map((i) => (
            <Link key={i.href} href={i.href} aria-current={i.href === active ? "page" : undefined}>
              {i.label}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}
