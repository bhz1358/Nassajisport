/** A player's (or the coach's) photo, or a shirt with the number when there is none yet. */
export function PlayerPhoto({ src, name, number, size = 56, className = "" }: { src?: string; name: string; number?: number; size?: number; className?: string }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name} width={size} height={size} className={`player-photo ${className}`} style={{ width: size, height: size }} loading="lazy" />;
  }
  return (
    <span className={`player-photo is-empty ${className}`} style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 64 64" width={size * 0.7} height={size * 0.7}>
        <path d="M22 8l-12 6-6 14 9 4 3-7v31h32V25l3 7 9-4-6-14-12-6c-1 4-5 7-10 7s-9-3-10-7z" fill="currentColor" opacity="0.9" />
        {number ? (
          <text x="32" y="44" textAnchor="middle" fontSize="16" fontWeight="900" fill="var(--surface)">
            {String(number).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)])}
          </text>
        ) : null}
      </svg>
    </span>
  );
}
