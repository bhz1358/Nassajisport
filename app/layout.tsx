import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "vazirmatn/Vazirmatn-font-face.css";
import "./globals.css";
import { MainNav, TabBar } from "./client";
import { ScoreStrip } from "./components";
import { getContent } from "@/lib/content";
import { getLeague } from "@/lib/league";
import { NAV, SOCIAL, TICKETS_URL } from "@/lib/site";

export function generateMetadata(): Metadata {
  const { site } = getContent();
  return {
    title: { default: site.title, template: `%s | ${site.title}` },
    description: site.description,
  };
}

export const viewport: Viewport = {
  themeColor: "#0d2b5e",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { site } = getContent();
  const league = getLeague();
  // Live first, then upcoming, then latest results.
  const order = { live: 0, scheduled: 1, finished: 2 } as const;
  const strip = [...league.fixtures].sort((a, b) => order[a.status] - order[b.status] || a.date.localeCompare(b.date));

  return (
    <html lang="fa" dir="rtl">
      <body>
        <a href="#main" className="skip-link">
          رفتن به محتوا
        </a>
        <ScoreStrip fixtures={strip} />
        <header className="site-header">
          <div className="container header-inner">
            <Link href="/" className="logo" aria-label={site.title}>
              <span className="logo-mark">N</span>
              <span className="logo-text">
                <strong>{site.title}</strong>
                <small>پایگاه خبری تحلیلی</small>
              </span>
            </Link>
            <MainNav items={NAV} />
            <a className="btn btn-primary header-tickets" href={TICKETS_URL} target="_blank" rel="noopener">
              خرید بلیت
            </a>
          </div>
        </header>
        <main id="main" className="container main">
          {children}
        </main>
        <footer className="site-footer">
          <div className="container footer-inner">
            <div>
              <strong>{site.title}</strong>
              <p>{site.description}</p>
            </div>
            <nav className="footer-links" aria-label="بخش‌ها">
              {NAV.slice(1).map((n) => (
                <Link key={n.href} href={n.href}>
                  {n.label}
                </Link>
              ))}
            </nav>
            <div className="footer-social">
              <a href={SOCIAL.instagram}>اینستاگرام</a>
              <a href={SOCIAL.telegram}>تلگرام</a>
            </div>
          </div>
        </footer>
        <TabBar ticketsUrl={TICKETS_URL} />
      </body>
    </html>
  );
}
