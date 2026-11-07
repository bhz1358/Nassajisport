"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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

/**
 * Main menu as a glass track: a frosted "glider" sits under the current page and
 * slides to whatever link the pointer or keyboard is on.
 */
export function MainNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const nav = useRef<HTMLElement>(null);
  const [glide, setGlide] = useState<{ x: number; w: number } | null>(null);
  // The longest matching link wins (so /category/news/ beats /), external links never match.
  const activeIndex = items.reduce((best, item, i) => {
    if (/^https?:/i.test(item.href)) return best;
    const path = item.href.split(/[?#]/)[0];
    const hit = path === "/" ? pathname === "/" : pathname.startsWith(path);
    return hit && (best < 0 || path.length > items[best].href.split(/[?#]/)[0].length) ? i : best;
  }, -1);

  const moveTo = useCallback((el: HTMLElement | null | undefined) => {
    setGlide(el ? { x: el.offsetLeft, w: el.offsetWidth } : null);
  }, []);
  const toActive = useCallback(() => {
    const links = nav.current?.querySelectorAll<HTMLElement>("a");
    moveTo(activeIndex >= 0 ? links?.[activeIndex] : null);
  }, [activeIndex, moveTo]);

  useEffect(() => {
    toActive();
    const el = nav.current;
    if (!el) return;
    // Fonts loading or the window resizing change link widths.
    const ro = new ResizeObserver(() => toActive());
    ro.observe(el);
    return () => ro.disconnect();
  }, [toActive]);

  return (
    <nav ref={nav} className="nav has-glider" aria-label="منوی اصلی" onMouseLeave={toActive} onBlur={toActive}>
      <span className="nav-glider" aria-hidden="true" style={glide ? { width: glide.w, transform: `translateX(${glide.x}px)` } : { opacity: 0 }} />
      {items.map((item, i) => {
        const props = {
          "aria-current": i === activeIndex ? ("page" as const) : undefined,
          onMouseEnter: (e: React.MouseEvent<HTMLAnchorElement>) => moveTo(e.currentTarget),
          onFocus: (e: React.FocusEvent<HTMLAnchorElement>) => moveTo(e.currentTarget),
        };
        // Links to other sites open in a new tab.
        return /^https?:\/\//i.test(item.href) ? (
          <a key={i} href={item.href} target="_blank" rel="noopener" {...props}>
            {item.label}
          </a>
        ) : (
          <Link key={i} href={item.href} {...props}>
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

/** Splits a headline into words so they can rise one after another; the part before ":" is gold. */
function HeroTitle({ title }: { title: string }) {
  const [gold, rest] = splitTitle(title);
  const words = [...(gold ? gold.split(/\s+/).map((w) => ({ w, gold: true })) : []), ...rest.split(/\s+/).map((w) => ({ w, gold: false }))].filter((x) => x.w);
  return (
    <h2 className="hero-title">
      {words.map((x, i) => (
        <span key={i} className={`hero-word ${x.gold ? "gold-text" : ""}`} style={{ animationDelay: `${0.18 + i * 0.05}s` }}>
          {x.w}{" "}
        </span>
      ))}
    </h2>
  );
}

/**
 * Featured stories, magazine style: the current story large, the whole list beside it.
 * A gold line under the current headline shows when the next story comes. Advances on
 * its own unless the reader is pointing at it, focused in it, or it is off screen.
 */
export function HeroSlider({ slides, logo }: { slides: HeroSlide[]; logo: string }) {
  const [index, setIndex] = useState(0);
  const [prev, setPrev] = useState(-1);
  const count = slides.length;
  const root = useRef<HTMLElement>(null);
  const list = useRef<HTMLOListElement>(null);
  const bars = useRef<(HTMLSpanElement | null)[]>([]);
  const state = useRef({ elapsed: 0, paused: false, visible: true });

  const go = useCallback(
    (i: number) => {
      setIndex((cur) => {
        const next = ((i % count) + count) % count;
        if (next !== cur) setPrev(cur);
        return next;
      });
      state.current.elapsed = 0;
    },
    [count],
  );

  // Progress line and auto-advance, without re-rendering on every frame.
  useEffect(() => {
    if (count < 2) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const el = root.current;
    const io = el ? new IntersectionObserver(([e]) => (state.current.visible = e.isIntersecting)) : undefined;
    if (el) io?.observe(el);
    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const s = state.current;
      const dt = Math.min(100, now - last);
      last = now;
      if (!reduce && !s.paused && s.visible && !document.hidden) s.elapsed += dt;
      const bar = bars.current[index];
      if (bar) bar.style.transform = `scaleX(${Math.min(1, s.elapsed / SLIDE_MS)})`;
      if (s.elapsed >= SLIDE_MS) {
        go(index + 1);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      io?.disconnect();
    };
  }, [index, count, go]);

  // On phones the list is a horizontal strip: keep the current story in view.
  useEffect(() => {
    const ul = list.current;
    const item = ul?.children[index] as HTMLElement | undefined;
    if (!ul || !item || ul.scrollWidth <= ul.clientWidth + 4) return;
    const target = item.offsetLeft - (ul.clientWidth - item.offsetWidth) / 2;
    ul.scrollTo({ left: target, behavior: "smooth" });
  }, [index]);

  if (count === 0) return null;
  const pause = (v: boolean) => (state.current.paused = v);
  return (
    <section
      ref={root}
      className="hero"
      aria-roledescription="carousel"
      aria-label="خبرهای ویژه"
      onPointerEnter={(e) => e.pointerType === "mouse" && pause(true)}
      onPointerLeave={() => pause(false)}
      onFocusCapture={() => pause(true)}
      onBlurCapture={() => pause(false)}
    >
      <div className="hero-main">
        {slides.map((s, i) => (
          <Link
            key={s.id}
            href={s.path}
            className={`hero-slide ${i === index ? "is-active" : ""} ${i === prev ? "was-active" : ""}`}
            aria-hidden={i !== index}
            tabIndex={i === index ? 0 : -1}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} از ${count}: ${s.title}`}
          >
            <span className="hero-media">
              {s.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.image} alt="" loading={i === 0 ? "eager" : "lazy"} fetchPriority={i === 0 ? "high" : undefined} />
              ) : (
                <span className="hero-empty">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logo} alt="" />
                </span>
              )}
            </span>
            <span className="hero-cap">
              <span className="hero-kicker">
                {s.isVideo && <span className="hero-play" aria-hidden="true" />}
                {s.kicker}
              </span>
              <HeroTitle title={s.title} />
              {s.excerpt && <span className="hero-excerpt">{s.excerpt}</span>}
            </span>
          </Link>
        ))}
        {count > 1 && (
          <span className="hero-count" aria-hidden="true">
            <b>{faDigits(String(index + 1).padStart(2, "0"))}</b> / {faDigits(String(count).padStart(2, "0"))}
          </span>
        )}
      </div>
      {count > 1 && (
        <ol className="hero-list" ref={list} aria-label="انتخاب خبر">
          {slides.map((s, i) => (
            <li key={s.id}>
              <button type="button" className={`hero-item ${i === index ? "is-active" : ""}`} aria-current={i === index} onClick={() => go(i)}>
                {s.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="hero-thumb" src={s.image} alt="" loading="lazy" />
                ) : (
                  <span className="hero-thumb is-empty">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={logo} alt="" />
                  </span>
                )}
                <span className="hero-item-text">
                  <span className="hero-kicker">{s.kicker}</span>
                  <span className="hero-item-title">{s.title}</span>
                </span>
                <span className="hero-bar" ref={(el) => void (bars.current[i] = el)} />
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

const faDigits = (s: string) => s.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);

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

/**
 * While a match of the league is being played, reloads the page's data every minute
 * (scores, minute, table) without a full page reload. Paused while the tab is hidden.
 */
export function LiveRefresher({ every = 60 }: { every?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, every * 1000);
    return () => clearInterval(t);
  }, [router, every]);
  return null;
}

/** Scrolls a horizontal strip so its active item is in view (e.g. the selected week). */
export function ActiveChip({ selector }: { selector: string }) {
  useEffect(() => {
    // Scroll only the strip itself; scrollIntoView would also move the whole page sideways.
    const el = document.querySelector<HTMLElement>(selector);
    const strip = el?.parentElement;
    if (!el || !strip) return;
    const s = strip.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    strip.scrollLeft += r.left + r.width / 2 - (s.left + s.width / 2);
  });
  return null;
}
