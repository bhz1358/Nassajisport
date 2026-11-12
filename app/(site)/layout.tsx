import Link from "next/link";
import { LiveRefresher, MainNav, TabBar } from "./client";
import { LiveButton } from "./components";
import { getLeague } from "@/lib/league";
import { maybeAutoSync } from "@/lib/league-sync";
import { liveSettings, maybeLiveSync } from "@/lib/live-sync";
import { maybeSeasonSync } from "@/lib/season-sync";
import { maybeTelegramSync } from "@/lib/telegram-sync";
import { liveWindowOpen } from "@/lib/live-scores";
import { getSettings, logoUrl } from "@/lib/settings";
import { getMenus, isExternal } from "@/lib/menus";
import { FOUNDED } from "@/lib/site";
import { SocialIcons } from "./social";
import { UserButton } from "./UserButton";
import { currentFan } from "@/lib/fans";

/** The header shows just the name: «پایگاه خبری تحلیلی نساجی اسپرت» → «نساجی اسپرت» (the full title stays for Google and tabs). */
const shortName = (title: string) => title.replace(/^\s*(پایگاه|سایت)\s+(خبری|تحلیلی|ورزشی|و|\s)+/, "").trim() || title;

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  maybeAutoSync();
  maybeLiveSync();
  maybeSeasonSync();
  maybeTelegramSync();
  // Match time: visitors' pages pick up new scores on their own.
  const liveSet = liveSettings();
  const matchTime = liveSet.enabled && liveWindowOpen(getLeague(), { ...liveSet, lastSync: undefined });
  const settings = getSettings();
  const { ticketsUrl, social } = settings;
  const menus = getMenus();
  const logo = logoUrl(settings);
  const fan = await currentFan();

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
              <span className="logo-mark">
                <img src={logo} alt="" className="logo-img" width={60} height={60} />
                <span className="logo-est">تأسیس {FOUNDED}</span>
              </span>
              <span className="logo-text">
                <strong>{shortName(settings.title)}</strong>
              </span>
            </Link>
            <MainNav items={menus.header} />
            <div className="header-actions">
              <LiveButton live={getLeague().fixtures.filter((f) => f.status === "live").length} />
              {ticketsUrl && (
                <a className="btn-outline btn-sm header-tickets" href={ticketsUrl} target="_blank" rel="noopener">
                  خرید بلیت
                </a>
              )}
              <SocialIcons links={social} className="header-social" max={4} />
              <UserButton fan={fan ? { name: fan.name, avatar: fan.avatar } : null} />
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
              {menus.footer.map((n, i) =>
                isExternal(n.href) ? (
                  <a key={i} href={n.href} target="_blank" rel="noopener">
                    {n.label}
                  </a>
                ) : (
                  <Link key={i} href={n.href}>
                    {n.label}
                  </Link>
                ),
              )}
            </nav>
            <SocialIcons links={social} className="footer-social" />
          </div>
          <div className="footer-copy">
            <p>© {settings.title}. تمامی حقوق محفوظ است.</p>
            <p className="footer-credit">
              تیم طراحی و پشتیبانی{" "}
              <a href="https://behzadghodsi.ir" target="_blank" rel="noopener" dir="ltr">
                BehzadGhodsi.ir
              </a>
            </p>
          </div>
        </div>
      </footer>
      <TabBar ticketsUrl={ticketsUrl} />
      {matchTime && <LiveRefresher every={Math.max(30, liveSet.every)} />}
    </>
  );
}
