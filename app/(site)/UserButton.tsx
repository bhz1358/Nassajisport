"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Header corner: «ورود» for visitors, the fan's photo and name once signed in. */
export function UserButton({ fan }: { fan: { name: string; avatar?: string } | null }) {
  const pathname = usePathname();
  if (!fan) {
    const next = pathname.startsWith("/predict/login") ? "/predict/" : pathname;
    return (
      <Link href={`/predict/login/?next=${encodeURIComponent(next)}`} className="user-btn" aria-label="ورود یا ثبت‌نام">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <circle cx="12" cy="8.5" r="4" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M4.5 20c1.4-3.6 4.2-5.4 7.5-5.4s6.1 1.8 7.5 5.4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <span className="user-btn-label">ورود</span>
      </Link>
    );
  }
  return (
    <Link href="/predict/me/" className="user-btn is-in" title={`حساب کاربری: ${fan.name}`}>
      {fan.avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={fan.avatar} alt="" width={28} height={28} />
      ) : (
        <span className="user-btn-letter" aria-hidden="true">{fan.name.replace(/^هوادار\s*/, "").charAt(0) || "؟"}</span>
      )}
      <span className="user-btn-label">{fan.name}</span>
    </Link>
  );
}
