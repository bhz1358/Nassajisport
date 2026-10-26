"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export function ReadingProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return <div className="reading-progress" style={{ transform: `scaleX(${progress})` }} aria-hidden="true" />;
}

export function ShareBar({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState("");
  useEffect(() => setUrl(window.location.href), []);
  const text = encodeURIComponent(`${title}\n${url}`);
  return (
    <div className="share">
      <span>اشتراک‌گذاری</span>
      <a href={`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`} target="_blank" rel="noopener">
        تلگرام
      </a>
      <a href={`https://wa.me/?text=${text}`} target="_blank" rel="noopener">
        واتس‌اپ
      </a>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            /* clipboard blocked; nothing to do */
          }
        }}
      >
        {copied ? "کپی شد" : "کپی لینک"}
      </button>
    </div>
  );
}

type NavItem = { label: string; href: string };

export function MainNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="nav" aria-label="منوی اصلی">
      {items.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined}>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

const TABS = [
  { label: "خانه", href: "/", icon: "M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1z" },
  { label: "نتایج", href: "/league/", icon: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 4l3 2.2-1.2 3.6h-3.6L9 8.2z" },
  { label: "ویدیو", href: "/category/video/", icon: "M4 5h12a2 2 0 0 1 2 2v2.5l4-2.5v10l-4-2.5V17a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" },
  { label: "تحلیل", href: "/category/review/", icon: "M4 4h16v2H4zm0 5h16v2H4zm0 5h10v2H4zm0 5h10v2H4z" },
];

/** Thumb-reachable navigation on phones. */
export function TabBar({ ticketsUrl }: { ticketsUrl: string }) {
  const pathname = usePathname();
  return (
    <nav className="tabbar" aria-label="دسترسی سریع">
      {TABS.map((t) => {
        const active = t.href === "/" ? pathname === "/" : pathname.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} aria-current={active ? "page" : undefined}>
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <path d={t.icon} fill="currentColor" />
            </svg>
            {t.label}
          </Link>
        );
      })}
      <a href={ticketsUrl} target="_blank" rel="noopener" className="tab-tickets">
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4z" fill="currentColor" />
        </svg>
        بلیت
      </a>
    </nav>
  );
}
