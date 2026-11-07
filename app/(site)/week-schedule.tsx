import Link from "next/link";
import { Crest } from "./components";
import { WeekSelect } from "./client";
import { faNum, faTime, faWeekday } from "@/lib/format";
import { currentWeek } from "@/lib/weeks";
import { HOME_TEAM } from "@/lib/site";
import type { Fixture } from "@/lib/types";

/** Tehran calendar day of a match, for grouping a week's matches by date. */
const dayKey = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Tehran" });

/**
 * League schedule, week by week: a strip of week numbers, then that week's matches
 * grouped by day, each with the score (or kick-off time) and its status.
 */
export function WeekSchedule({
  fixtures,
  week,
  totalWeeks,
  basePath,
  anchor = "schedule",
  compact = false,
}: {
  fixtures: Fixture[];
  week?: number;
  totalWeeks: number;
  basePath: string;
  /** Element id the page returns to after choosing a week. */
  anchor?: string;
  /** Narrow sidebar version (home page). */
  compact?: boolean;
}) {
  const known = new Set(fixtures.map((f) => f.round).filter(Boolean));
  const current = currentWeek(fixtures);
  const shown = week ?? current;
  const maxWeek = Math.max(totalWeeks, ...[...known].map((w) => w!));
  const matches = fixtures.filter((f) => f.round === shown).sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  const days = [...new Set(matches.map((m) => dayKey(m.date)))];
  const href = (w: number) => `${basePath}?week=${w}#${anchor}`;

  return (
    <div className={`weeks ${compact ? "is-compact" : ""}`}>
      <nav className="weeks-nav" aria-label="انتخاب هفته">
        {shown && shown > 1 ? (
          <Link href={href(shown - 1)} scroll={false} className="weeks-arrow" aria-label="هفته‌ی قبل">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </Link>
        ) : (
          <span className="weeks-arrow is-off" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
        )}
        <WeekSelect
          basePath={basePath}
          anchor={anchor}
          value={shown ?? 1}
          options={Array.from({ length: maxWeek }, (_, i) => i + 1).map((w) => ({
            week: w,
            label: `هفته‌ی ${faNum(w)}${w === current ? " (هفته‌ی جاری)" : known.has(w) ? "" : " — برنامه ثبت نشده"}`,
          }))}
        />
        {shown && shown < maxWeek ? (
          <Link href={href(shown + 1)} scroll={false} className="weeks-arrow" aria-label="هفته‌ی بعد">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </Link>
        ) : (
          <span className="weeks-arrow is-off" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
        )}
      </nav>

      {/* The dropdown already names the week in the sidebar; the badge still marks the current one. */}
      <h3 className={`weeks-title ${compact ? "sr-only" : ""}`}>
        هفته‌ی {faNum(shown ?? 0)}
        {shown === current && <span className="weeks-badge">هفته‌ی جاری</span>}
      </h3>

      {matches.length === 0 ? (
        <p className="weeks-empty">برنامه‌ی این هفته هنوز ثبت نشده است.</p>
      ) : (
        days.map((d) => {
          const dayMatches = matches.filter((m) => dayKey(m.date) === d);
          return (
            <section key={d} className="weeks-day">
              <h4>
                {faWeekday(dayMatches[0].date)}
              </h4>
              <ul>
                {dayMatches.map((m, i) => {
                  const club = m.home === HOME_TEAM || m.away === HOME_TEAM;
                  const played = m.status !== "scheduled";
                  const winner = m.status === "finished" && m.homeScore !== m.awayScore ? ((m.homeScore ?? 0) > (m.awayScore ?? 0) ? "home" : "away") : undefined;
                  return (
                    <li key={i} className={`wk-match ${club ? "is-club" : ""} ${m.status === "live" ? "is-live" : ""}`}>
                      <span className={`wk-team wk-home ${winner === "home" ? "is-win" : ""}`}>
                        <span className="wk-name">{m.home}</span>
                        <Crest team={m.home} size={compact ? 22 : 26} />
                      </span>
                      <span className="wk-mid">
                        {played ? (
                          <span className="wk-score">
                            {/* In RTL the home score sits on the home team's side. */}
                            <b>{faNum(m.homeScore ?? 0)}</b>
                            <i>-</i>
                            <b>{faNum(m.awayScore ?? 0)}</b>
                          </span>
                        ) : (
                          <span className="wk-time">{faTime(m.date)}</span>
                        )}
                        <span className="wk-status">
                          {m.status === "live" ? (
                            <>
                              <span className="live-dot" /> {m.minute ? `دقیقه ${faNum(m.minute)}` : m.liveLabel || "زنده"}
                            </>
                          ) : m.status === "finished" ? (
                            "پایان"
                          ) : (
                            m.venue || ""
                          )}
                        </span>
                      </span>
                      <span className={`wk-team wk-away ${winner === "away" ? "is-win" : ""}`}>
                        <Crest team={m.away} size={compact ? 22 : 26} />
                        <span className="wk-name">{m.away}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}
