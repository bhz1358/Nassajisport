import Link from "next/link";
import { faNum } from "@/lib/format";
import { lineupRows, positionLabel } from "@/lib/squad";
import type { LineupPlayer, MatchLineup, Player } from "@/lib/types";

/** Club shirt with the squad number; stands in for a photo until real ones are added. */
export function Shirt({ number, size = 56, away = false }: { number: number; size?: number; away?: boolean }) {
  return (
    <svg className="shirt" viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
      <path
        d="M22 6l-14 7-6 14 9 4 3-6v33h36V25l3 6 9-4-6-14-14-7c-1 4-5 7-10 7s-9-3-10-7z"
        fill={away ? "#f4f6fb" : "var(--acc-600)"}
      />
      {!away && <path d="M28 13h8v45h-8z" fill="var(--brand-700)" opacity="0.9" />}
      <path d="M22 6c1 4 5 7 10 7s9-3 10-7" fill="none" stroke={away ? "#1f2937" : "#fff"} strokeWidth="2" />
      <text
        x="32"
        y="44"
        textAnchor="middle"
        fontSize="17"
        fontWeight="900"
        fill={away ? "#1f2937" : "#fff"}
        fontFamily="Vazirmatn, sans-serif"
      >
        {number ? faNum(number) : ""}
      </text>
    </svg>
  );
}

export function PlayerPhoto({ player, className = "" }: { player: Player; className?: string }) {
  return (
    <div className={`player-photo ${className}`}>
      {player.photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={player.photo} alt={player.name} loading="lazy" />
      ) : (
        <Shirt number={player.number} size={88} />
      )}
    </div>
  );
}

export function PlayerCard({ player }: { player: Player }) {
  return (
    <Link href={`/team/${player.slug}/`} className={`player-card${player.photo ? " has-photo" : ""}`}>
      {/* A styled photo carries the shirt number itself. */}
      {!player.photo && (
        <span className="player-number" aria-hidden="true">
          {faNum(player.number)}
        </span>
      )}
      <PlayerPhoto player={player} />
      <div className="player-card-body">
        <strong>{player.name}</strong>
        <span>{positionLabel(player.position)}</span>
      </div>
      <dl className="player-card-stats">
        <div>
          <dt>بازی</dt>
          <dd>{faNum(player.stats.appearances)}</dd>
        </div>
        <div>
          <dt>{player.position === "GK" ? "کلین‌شیت" : "گل"}</dt>
          <dd>{faNum(player.position === "GK" ? (player.stats.cleanSheets ?? 0) : player.stats.goals)}</dd>
        </div>
      </dl>
    </Link>
  );
}

function PitchPlayer({ p, away }: { p: LineupPlayer; away?: boolean }) {
  const inner = (
    <>
      <Shirt number={p.number} size={42} away={away} />
      <span>
        {p.name}
        {p.captain && <b className="captain" title="کاپیتان">C</b>}
      </span>
    </>
  );
  return p.slug ? (
    <Link href={`/team/${p.slug}/`} className="pitch-player">
      {inner}
    </Link>
  ) : (
    <div className="pitch-player">{inner}</div>
  );
}

/**
 * Both teams on one vertical pitch: away team in the top half (goalkeeper at the top),
 * home team in the bottom half (goalkeeper at the bottom).
 */
export function MatchPitch({ lineup }: { lineup: MatchLineup }) {
  const home = lineupRows(lineup.home);
  const away = lineupRows(lineup.away);
  return (
    <div className="pitch pitch-full" role="img" aria-label={`ترکیب ${lineup.home.team} و ${lineup.away.team}`}>
      <div className="pitch-lines" aria-hidden="true">
        <span className="pitch-halfway" />
        <span className="pitch-circle" />
        <span className="pitch-box pitch-box-top" />
        <span className="pitch-box pitch-box-bottom" />
      </div>
      <div className="pitch-half pitch-half-top">
        <span className="pitch-team">
          {lineup.away.team} <small dir="ltr">{lineup.away.formation}</small>
        </span>
        {away.map((row, i) => (
          // Mirrored: the away side faces the other way, so its right is our left.
          <div key={i} className="pitch-row">
            {[...row].reverse().map((p, j) => (
              <PitchPlayer key={j} p={p} away />
            ))}
          </div>
        ))}
      </div>
      <div className="pitch-half pitch-half-bottom">
        {[...home].reverse().map((row, i) => (
          <div key={i} className="pitch-row">
            {row.map((p, j) => (
              <PitchPlayer key={j} p={p} />
            ))}
          </div>
        ))}
        <span className="pitch-team">
          {lineup.home.team} <small dir="ltr">{lineup.home.formation}</small>
        </span>
      </div>
    </div>
  );
}

export function BenchList({ players, away }: { players: LineupPlayer[]; away?: boolean }) {
  return (
    <ul className="subs">
      {players.map((p, i) => {
        const inner = (
          <>
            <Shirt number={p.number} size={28} away={away} />
            <span>{p.name}</span>
          </>
        );
        return <li key={i}>{p.slug ? <Link href={`/team/${p.slug}/`}>{inner}</Link> : <span className="sub">{inner}</span>}</li>;
      })}
    </ul>
  );
}
