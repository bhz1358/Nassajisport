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

type NavItem = { label: string; href: string; children?: NavItem[] };

const isExternal = (href: string) => /^https?:\/\//i.test(href);
const pathOf = (href: string) => href.split(/[?#]/)[0];

/** One menu link: other sites open in a new tab. */
function NavLink({ item, className, ...rest }: { item: NavItem; className?: string } & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return isExternal(item.href) ? (
    <a href={item.href} target="_blank" rel="noopener" className={className} {...rest}>
      {item.label}
    </a>
  ) : (
    <Link href={item.href} className={className} {...rest}>
      {item.label}
    </Link>
  );
}

/**
 * Main menu as a glass track: a frosted "glider" sits under the current page and
 * slides to whatever item the pointer or keyboard is on. Items with a submenu open a
 * glass panel on hover (desktop) or with the arrow beside them (touch, keyboard).
 */
export function MainNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const nav = useRef<HTMLElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [glide, setGlide] = useState<{ x: number; w: number } | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // The longest matching address wins (so /category/news/ beats /); a parent is
  // current when one of its submenu items is. External links never match.
  const activeIndex = items.reduce(
    (best, item, i) => {
      const paths = [item.href, ...(item.children ?? []).map((c) => c.href)].filter((h) => h && !isExternal(h)).map(pathOf);
      const hit = paths.filter((p) => (p === "/" ? pathname === "/" : pathname.startsWith(p))).sort((x, y) => y.length - x.length)[0];
      return hit !== undefined && (best.len < 0 || hit.length > best.len) ? { i, len: hit.length } : best;
    },
    { i: -1, len: -1 },
  ).i;

  const itemEl = (i: number) => nav.current?.querySelectorAll<HTMLElement>(":scope > .nav-item")[i];
  const moveTo = useCallback((el: HTMLElement | null | undefined) => {
    setGlide(el ? { x: el.offsetLeft, w: el.offsetWidth } : null);
  }, []);
  const toActive = useCallback(() => {
    moveTo(activeIndex >= 0 ? nav.current?.querySelectorAll<HTMLElement>(":scope > .nav-item")[activeIndex] : null);
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

  // Close on navigation.
  useEffect(() => setOpen(null), [pathname]);

  // Place the panel under its item. The panel is position: fixed so the menu's
  // horizontal scrolling can't clip it; its containing block may be the header
  // (backdrop-filter), so the offset is measured rather than assumed.
  useEffect(() => {
    if (open === null) return;
    const place = () => {
      const trigger = itemEl(open);
      const el = panel.current;
      if (!trigger || !el) return;
      el.style.left = "0px";
      el.style.top = "0px";
      const origin = el.getBoundingClientRect();
      const r = trigger.getBoundingClientRect();
      const w = el.offsetWidth;
      // RTL: line the panel up with the item's right edge, kept on screen.
      const right = Math.min(window.innerWidth - 8, r.right);
      const left = Math.max(8, right - w);
      setPos({ left: left - origin.left, top: r.bottom + 6 - origin.top });
    };
    place();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!panel.current?.contains(t) && !itemEl(open)?.contains(t)) setOpen(null);
    };
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, { passive: true });
    nav.current?.addEventListener("scroll", place, { passive: true });
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    const navEl = nav.current;
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place);
      navEl?.removeEventListener("scroll", place);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  const hoverOpen = (i: number) => {
    clearTimeout(closeTimer.current);
    setOpen(i);
  };
  const hoverClose = () => {
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(null), 180);
  };
  const isMouse = (e: React.PointerEvent) => e.pointerType === "mouse";
  const openItem = open !== null ? items[open] : undefined;

  return (
    <nav
      ref={nav}
      className="nav has-glider"
      aria-label="منوی اصلی"
      onMouseLeave={toActive}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) toActive();
      }}
    >
      <span className="nav-glider" aria-hidden="true" style={glide ? { width: glide.w, transform: `translateX(${glide.x}px)` } : { opacity: 0 }} />
      {items.map((item, i) => {
        const sub = item.children?.length ? item.children : undefined;
        const current = i === activeIndex ? ("page" as const) : undefined;
        return (
          <span
            key={i}
            className={`nav-item ${sub ? "has-sub" : ""} ${open === i ? "is-open" : ""}`}
            onMouseEnter={(e) => moveTo(e.currentTarget)}
            onPointerEnter={(e) => sub && isMouse(e) && hoverOpen(i)}
            onPointerLeave={(e) => sub && isMouse(e) && hoverClose()}
            onFocus={(e) => moveTo(e.currentTarget)}
          >
            {item.href ? (
              <NavLink item={item} aria-current={current} />
            ) : (
              // A parent without an address of its own just opens its submenu.
              <button type="button" className="nav-parent" aria-current={current} aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}>
                {item.label}
              </button>
            )}
            {sub && (
              <button
                type="button"
                className="nav-caret"
                aria-label={`زیرمنوی ${item.label}`}
                aria-expanded={open === i}
                aria-controls="nav-sub-panel"
                onClick={() => setOpen(open === i ? null : i)}
              >
                <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                  <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
          </span>
        );
      })}
      {openItem?.children?.length ? (
        <div
          ref={panel}
          id="nav-sub-panel"
          className="nav-sub"
          role="menu"
          aria-label={`زیرمنوی ${openItem.label}`}
          style={pos ? { left: pos.left, top: pos.top } : { visibility: "hidden" }}
          onPointerEnter={(e) => isMouse(e) && clearTimeout(closeTimer.current)}
          onPointerLeave={(e) => isMouse(e) && hoverClose()}
        >
          {openItem.children.map((c, j) => (
            <NavLink
              key={j}
              item={c}
              role="menuitem"
              className={!isExternal(c.href) && (pathOf(c.href) === "/" ? pathname === "/" : pathname.startsWith(pathOf(c.href))) ? "is-current" : ""}
              onClick={() => setOpen(null)}
            />
          ))}
        </div>
      ) : null}
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

/**
 * Week dropdown for the league schedule. Picking a week opens it right away; without
 * JavaScript the form's «نمایش» button does the same.
 */
export function WeekSelect({ basePath, anchor = "schedule", value, options }: { basePath: string; anchor?: string; value: number; options: { week: number; label: string }[] }) {
  const router = useRouter();
  const [js, setJs] = useState(false);
  useEffect(() => setJs(true), []);
  return (
    <form action={basePath} method="get" className="week-select">
      <label className="sr-only" htmlFor={`week-select-${anchor}`}>
        انتخاب هفته
      </label>
      <select
        id={`week-select-${anchor}`}
        name="week"
        defaultValue={value}
        key={value}
        onChange={(e) => router.push(`${basePath}?week=${e.target.value}#${anchor}`, { scroll: false })}
      >
        {options.map((o) => (
          <option key={o.week} value={o.week}>
            {o.label}
          </option>
        ))}
      </select>
      {!js && <button type="submit">نمایش</button>}
    </form>
  );
}
