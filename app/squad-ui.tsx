import Link from "next/link";
import { faNum } from "@/lib/format";
import { positionLabel } from "@/lib/squad";
import type { Player } from "@/lib/types";

/** Club shirt with the squad number; stands in for a photo until real ones are added. */
export function Shirt({ number, size = 56 }: { number: number; size?: number }) {
  return (
    <svg className="shirt" viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
      <path d="M22 6l-14 7-6 14 9 4 3-6v33h36V25l3 6 9-4-6-14-14-7c-1 4-5 7-10 7s-9-3-10-7z" fill="var(--pom-600)" />
      <path d="M28 13h8v45h-8z" fill="var(--blue-700)" opacity="0.9" />
      <path d="M22 6c1 4 5 7 10 7s9-3 10-7" fill="none" stroke="#fff" strokeWidth="2" />
      <text x="32" y="44" textAnchor="middle" fontSize="17" fontWeight="900" fill="#fff" fontFamily="Vazirmatn, sans-serif">
        {faNum(number)}
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
    <Link href={`/team/${player.slug}/`} className="player-card">
      <span className="player-number" aria-hidden="true">
        {faNum(player.number)}
      </span>
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

/** Vertical pitch: attack at the top, goalkeeper at the bottom. */
export function Pitch({ rows, formation }: { rows: Player[][]; formation: string }) {
  return (
    <div className="pitch" role="img" aria-label={`ترکیب ${formation}`}>
      <div className="pitch-lines" aria-hidden="true">
        <span className="pitch-halfway" />
        <span className="pitch-circle" />
        <span className="pitch-box pitch-box-top" />
        <span className="pitch-box pitch-box-bottom" />
      </div>
      <div className="pitch-rows">
        {[...rows].reverse().map((row, i) => (
          <div key={i} className="pitch-row">
            {row.map((p) => (
              <Link key={p.slug} href={`/team/${p.slug}/`} className="pitch-player">
                <Shirt number={p.number} size={44} />
                <span>{p.name}</span>
              </Link>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
