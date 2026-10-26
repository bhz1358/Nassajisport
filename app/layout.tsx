import type { Metadata } from "next";
import Link from "next/link";
import "vazirmatn/Vazirmatn-font-face.css";
import "./globals.css";
import { getContent, getNews } from "@/lib/content";
import { NAV, SOCIAL, TICKETS_URL } from "@/lib/site";

export function generateMetadata(): Metadata {
  const { site } = getContent();
  return {
    title: { default: site.title, template: `%s | ${site.title}` },
    description: site.description,
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { site } = getContent();
  const breaking = getNews().slice(0, 5);
  return (
    <html lang="fa" dir="rtl">
      <body>
        <header className="site-header">
          <div className="topbar">
            <div className="container topbar-inner">
              <span>{site.description}</span>
              <div className="social">
                <a href={SOCIAL.instagram} aria-label="اینستاگرام">اینستاگرام</a>
                <a href={SOCIAL.telegram} aria-label="تلگرام">تلگرام</a>
              </div>
            </div>
          </div>
          <div className="mainbar">
            <div className="container mainbar-inner">
              <Link href="/" className="logo">
                <span className="logo-mark">N</span>
                <span>{site.title}</span>
              </Link>
              <a className="tickets" href={TICKETS_URL} target="_blank" rel="noopener">
                خرید بلیت بازی
              </a>
            </div>
          </div>
          <nav className="nav">
            <div className="container nav-inner">
              {NAV.map((item) => (
                <Link key={item.href} href={item.href}>
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>
          {breaking.length > 0 && (
            <div className="container">
              <div className="ticker">
                <span className="ticker-label">اخبار داغ</span>
                <div className="ticker-track">
                  {breaking.map((p) => (
                    <Link key={p.id} href={p.path}>
                      {p.title}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}
        </header>
        <main className="container main">{children}</main>
        <footer className="site-footer">
          <div className="container">
            <strong>{site.title}</strong>
            <p>{site.description}</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
