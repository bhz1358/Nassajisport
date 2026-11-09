import Link from "next/link";
import { Crest } from "../components";
import { faNum } from "@/lib/format";
import { kitColor, siteTeam, type SheetPlayer, type TeamSheet } from "@/lib/match-reports";
import { getSquad } from "@/lib/squad";

const light = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return ((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114 > 160;
};

/** A shirt in the team's colour with the number on it. */
export function Jersey({ number, color, size = 34 }: { number?: number; color: string; size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className="jersey" aria-hidden="true">
      <path d="M22 6l-13 6-7 15 10 5 3-6v32h34V26l3 6 10-5-7-15-13-6c-1.2 4.6-5.2 7.5-10 7.5S23.2 10.6 22 6z" fill={color} stroke="rgb(0 0 0 / 0.35)" strokeWidth="1.5" />
      {number !== undefined && (
        <text x="32" y="44" textAnchor="middle" fontSize={number > 9 ? 17 : 19} fontWeight="900" fill={light(color) ? "#1a1a1a" : "#fff"}>
          {faNum(number)}
        </text>
      )}
    </svg>
  );
}

const norm = (s: string) => s.replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/[\s‌]+/g, "");

function PlayerLine({ p, color, link }: { p: SheetPlayer; color: string; link?: string }) {
  const name = (
    <span className="sheet-name">
      {p.name}
      {p.captain && <span className="sheet-captain" title="کاپیتان">C</span>}
    </span>
  );
  return (
    <li>
      <Jersey number={p.number} color={color} />
      {link ? <Link href={link}>{name}</Link> : name}
    </li>
  );
}

/** One team's sheet: line-up, substitutes and staff, in the team's kit colour. */
export function TeamSheetCard({ sheet, side }: { sheet: TeamSheet; side: "میزبان" | "میهمان" }) {
  const team = siteTeam(sheet.team);
  const color = kitColor(sheet.kit?.shirt);
  // Players of the club link to their profile.
  const squad = team.includes("نساجی") ? getSquad().players : [];
  const link = (p: SheetPlayer) => {
    const s = squad.find((x) => norm(x.name) === norm(p.name));
    return s ? `/team/${s.slug}/` : undefined;
  };
  return (
    <section className="panel sheet">
      <header className="sheet-head">
        <Crest team={team} size={44} />
        <div>
          <small>{side}</small>
          <h2>{sheet.team}</h2>
        </div>
        {sheet.kit && (
          <ul className="sheet-kit" aria-label="رنگ لباس">
            {(["shirt", "shorts", "socks"] as const).map((k) =>
              sheet.kit?.[k] ? (
                <li key={k} title={`${{ shirt: "پیراهن", shorts: "شورت", socks: "جوراب" }[k]}: ${sheet.kit[k]}`}>
                  <span style={{ background: kitColor(sheet.kit[k]) }} />
                  {{ shirt: "پیراهن", shorts: "شورت", socks: "جوراب" }[k]}
                </li>
              ) : null,
            )}
          </ul>
        )}
      </header>
      <h3>ترکیب اصلی</h3>
      <ol className="sheet-list">
        {sheet.starters.map((p, i) => (
          <PlayerLine key={i} p={p} color={color} link={link(p)} />
        ))}
      </ol>
      {sheet.subs.length > 0 && (
        <>
          <h3>ذخیره‌ها</h3>
          <ol className="sheet-list is-subs">
            {sheet.subs.map((p, i) => (
              <PlayerLine key={i} p={p} color={color} link={link(p)} />
            ))}
          </ol>
        </>
      )}
      {sheet.staff.length > 0 && (
        <>
          <h3>کادر فنی</h3>
          <dl className="sheet-staff">
            {sheet.staff.map((s, i) => (
              <div key={i}>
                <dt>{s.role}</dt>
                <dd>{s.name}</dd>
              </div>
            ))}
          </dl>
        </>
      )}
    </section>
  );
}
