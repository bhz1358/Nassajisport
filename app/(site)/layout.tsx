import Link from "next/link";
import { MainNav, TabBar } from "./client";
import { ScoreStrip } from "./components";
import { getLeague } from "@/lib/league";
import { getSettings } from "@/lib/settings";
import { NAV } from "@/lib/site";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  const settings = getSettings();
  const league = getLeague();
  // Live first, then upcoming, then latest results.
  const order = { live: 0, scheduled: 1, finished: 2 } as const;
  const strip = [...league.fixtures].sort((a, b) => order[a.status] - order[b.status] || a.date.localeCompare(b.date));
  const { ticketsUrl, social } = settings;

  return (
    <>
      <a href="#main" className="skip-link">
        رفتن به محتوا
      </a>
      <ScoreStrip fixtures={strip} />
      <header className="site-header">
        <div className="container header-inner">
          <Link href="/" className="logo" aria-label={settings.title}>
            <span className="logo-mark">{settings.title.charAt(0)}</span>
            <span className="logo-text">
              <strong>{settings.title}</strong>
              <small>پایگاه خبری تحلیلی</small>
            </span>
          </Link>
          <MainNav items={NAV} />
          {ticketsUrl && (
            <a className="btn btn-primary header-tickets" href={ticketsUrl} target="_blank" rel="noopener">
              خرید بلیت
            </a>
          )}
        </div>
      </header>
      <main id="main" className="container main">
        {children}
      </main>
      <footer className="site-footer">
        <div className="container footer-inner">
          <div>
            <strong>{settings.title}</strong>
            <p>{settings.description}</p>
          </div>
          <nav className="footer-links" aria-label="بخش‌ها">
            {NAV.slice(1).map((n) => (
              <Link key={n.href} href={n.href}>
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="footer-social">
            {social.instagram && <a href={social.instagram}>اینستاگرام</a>}
            {social.telegram && <a href={social.telegram}>تلگرام</a>}
          </div>
        </div>
      </footer>
      <TabBar ticketsUrl={ticketsUrl} />
    </>
  );
}
