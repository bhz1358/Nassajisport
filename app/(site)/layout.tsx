import Link from "next/link";
import { MainNav, TabBar } from "./client";
import { NextMatchPill } from "./components";
import { getClubMatch, getLeague } from "@/lib/league";
import { maybeAutoSync } from "@/lib/league-sync";
import { getSettings, logoUrl } from "@/lib/settings";
import { FOOTER_NAV, NAV } from "@/lib/site";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  maybeAutoSync();
  const settings = getSettings();
  const clubMatch = getClubMatch(getLeague());
  const { ticketsUrl, social } = settings;
  const logo = logoUrl(settings);

  return (
    <>
      <a href="#main" className="skip-link">
        رفتن به محتوا
      </a>
      <header className="site-header">
        <div className="container">
          <div className="header-bar">
            <Link href="/" className="logo" aria-label={settings.title}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logo} alt="" className="logo-img" width={46} height={46} />
              <span className="logo-text">
                <strong>{settings.title}</strong>
                <small>{settings.description}</small>
              </span>
            </Link>
            <MainNav items={NAV} />
            <div className="header-actions">
              <NextMatchPill f={clubMatch} />
              {ticketsUrl && (
                <a className="btn-outline btn-sm header-tickets" href={ticketsUrl} target="_blank" rel="noopener">
                  خرید بلیت
                </a>
              )}
              <Link href="/search/" className="icon-btn" aria-label="جست‌وجو">
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                  <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M16 16l4.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </header>
      <main id="main" className="container main">
        {children}
      </main>
      <footer className="site-footer">
        <div className="container">
          <div className="footer-top">
            <div className="footer-brand">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logo} alt="" width={64} height={64} loading="lazy" />
              <div>
                <strong>{settings.title}</strong>
                <p>{settings.description}</p>
              </div>
            </div>
            <nav className="footer-links" aria-label="بخش‌ها">
              {FOOTER_NAV.map((n) => (
                <Link key={n.href} href={n.href}>
                  {n.label}
                </Link>
              ))}
            </nav>
            {(social.instagram || social.telegram) && (
              <div className="footer-social">
                {social.instagram && <a href={social.instagram}>اینستاگرام</a>}
                {social.telegram && <a href={social.telegram}>تلگرام</a>}
              </div>
            )}
          </div>
          <p className="footer-copy">© {settings.title}. تمامی حقوق محفوظ است.</p>
        </div>
      </footer>
      <TabBar ticketsUrl={ticketsUrl} />
    </>
  );
}
