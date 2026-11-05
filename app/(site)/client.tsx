"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { splitTitle } from "@/lib/title";

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
  { label: "تیم", href: "/team/", icon: "M8 3L2 6l2 6 3-1v10h10V11l3 1 2-6-6-3c-.5 1.7-2 3-4 3S8.5 4.7 8 3z" },
  { label: "ویدیو", href: "/category/video/", icon: "M4 5h12a2 2 0 0 1 2 2v2.5l4-2.5v10l-4-2.5V17a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" },
];

/** Thumb-reachable navigation on phones. */
export function TabBar({ ticketsUrl }: { ticketsUrl: string }) {
  const pathname = usePathname();
  return (
    <nav className={`tabbar ${ticketsUrl ? "" : "no-tickets"}`} aria-label="دسترسی سریع">
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
      {ticketsUrl && (
      <a href={ticketsUrl} target="_blank" rel="noopener" className="tab-tickets">
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4z" fill="currentColor" />
        </svg>
        بلیت
      </a>
      )}
    </nav>
  );
}

export type HeroSlide = {
  id: number;
  path: string;
  title: string;
  excerpt: string;
  kicker: string;
  image?: string;
  isVideo: boolean;
};

const SLIDE_MS = 7000;

/** Featured stories: one big image at a time, auto-advancing unless the reader is interacting. */
export function HeroSlider({ slides, logo }: { slides: HeroSlide[]; logo: string }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides.length;
  const go = useCallback((i: number) => setIndex(((i % count) + count) % count), [count]);

  useEffect(() => {
    if (paused || count < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setTimeout(() => go(index + 1), SLIDE_MS);
    return () => clearTimeout(t);
  }, [index, paused, count, go]);

  if (count === 0) return null;
  return (
    <section
      className="hero"
      aria-roledescription="carousel"
      aria-label="خبرهای ویژه"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {slides.map((s, i) => {
        const [gold, rest] = splitTitle(s.title);
        return (
          <div
            key={s.id}
            className={`hero-slide ${i === index ? "is-active" : ""}`}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} از ${count}`}
            aria-hidden={i !== index}
          >
            <div className="hero-media">
              {s.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.image} alt="" loading={i === 0 ? "eager" : "lazy"} />
              ) : (
                <div className="hero-empty">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logo} alt="" />
                </div>
              )}
            </div>
            <div className="container hero-content">
              <span className="hero-kicker">{s.kicker}</span>
              <h2 className="hero-title">
                {gold && <span className="gold-text">{gold}</span>}
                {rest}
              </h2>
              {s.excerpt && <p className="hero-excerpt">{s.excerpt}</p>}
              <Link href={s.path} className="btn-outline" tabIndex={i === index ? 0 : -1}>
                {s.isVideo ? "مشاهده ویدیو" : "ادامه مطلب"}
              </Link>
            </div>
          </div>
        );
      })}
      {count > 1 && (
        <div className="container hero-controls">
          <div className="hero-dots" role="tablist" aria-label="انتخاب خبر">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`خبر ${i + 1}`}
                className={i === index ? "is-active" : ""}
                onClick={() => go(i)}
              />
            ))}
          </div>
          <div className="hero-arrows">
            <button type="button" aria-label="خبر قبلی" onClick={() => go(index - 1)}>
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" />
              </svg>
            </button>
            <button type="button" aria-label="خبر بعدی" onClick={() => go(index + 1)}>
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="2" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

/** Results widget: a filter pill switches between pre-rendered lists. */
export function ResultsTabs({ panels }: { panels: { key: string; label: string; content: React.ReactNode }[] }) {
  const [active, setActive] = useState(panels[0]?.key);
  const current = panels.find((p) => p.key === active) ?? panels[0];
  return (
    <div className="results">
      <div className="section-header">
        <h2>نتایج و بازی‌ها</h2>
        <label className="pill-select">
          <span className="sr-only">نمایش</span>
          <select value={active} onChange={(e) => setActive(e.target.value)}>
            {panels.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {current?.content}
    </div>
  );
}

/** Horizontal rail with arrow buttons (swipe on touch screens). */
export function MediaRail({ children, label }: { children: React.ReactNode; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    // RTL: moving "forward" means scrolling toward negative scrollLeft.
    el.scrollBy({ left: -dir * el.clientWidth * 0.8, behavior: "smooth" });
  };
  return (
    <div className="media-rail">
      <div className="media-rail-track" ref={ref} role="region" aria-label={label} tabIndex={0}>
        {children}
      </div>
      <button type="button" className="rail-arrow rail-prev" aria-label="قبلی" onClick={() => scroll(-1)}>
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      </button>
      <button type="button" className="rail-arrow rail-next" aria-label="بعدی" onClick={() => scroll(1)}>
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      </button>
    </div>
  );
}

/**
 * Shows as many of its children as fit above the bottom of `target` (the sidebar),
 * so the main column ends level with it. When the columns stack (narrow screens)
 * the first `mobileCount` are shown instead. Everything is in the HTML for search
 * engines and no-JS readers; only the visible count changes.
 */
export function FitToColumn({
  target,
  mobileCount,
  className,
  children,
}: {
  target: string;
  mobileCount: number;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const box = ref.current;
    const side = document.querySelector<HTMLElement>(target);
    if (!box || !side) return;
    const fit = () => {
      const items = [...box.children] as HTMLElement[];
      items.forEach((el) => (el.hidden = false));
      const stacked = side.getBoundingClientRect().top >= box.getBoundingClientRect().top;
      if (stacked) {
        items.forEach((el, i) => (el.hidden = i >= mobileCount));
        return;
      }
      const limit = side.getBoundingClientRect().bottom;
      let hiding = false;
      for (const el of items) {
        if (!hiding && el.getBoundingClientRect().bottom > limit + 1) hiding = true;
        el.hidden = hiding;
      }
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(side);
    window.addEventListener("resize", fit);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", fit);
    };
  }, [target, mobileCount]);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
