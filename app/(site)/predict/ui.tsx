import { getFans } from "@/lib/fans";
import { faNum } from "@/lib/format";
import type { LeaderRow } from "@/lib/predict-score";

/** A fan's photo, or the first letter of their name on a coloured circle. */
export function FanAvatar({ name, src, size = 32, className = "" }: { name: string; src?: string; size?: number; className?: string }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" width={size} height={size} className={`fan-avatar ${className}`} style={{ width: size, height: size }} loading="lazy" />;
  }
  const hue = [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
  return (
    <span className={`fan-avatar is-letter ${className}`} style={{ width: size, height: size, fontSize: size * 0.42, background: `hsl(${hue} 45% 32%)` }} aria-hidden="true">
      {[...name.replace(/^هوادار\s*/, "")][0] ?? "؟"}
    </span>
  );
}

const MEDALS = [
  { id: "gold", label: "اول", stops: ["#fff6c2", "#f0c24b", "#a8720f"] },
  { id: "silver", label: "دوم", stops: ["#ffffff", "#c9ced6", "#7c8490"] },
  { id: "bronze", label: "سوم", stops: ["#ffe0c2", "#cd8a52", "#7a4520"] },
];

/** A cup in gold, silver or bronze with its place on it. */
export function Trophy({ place, size = 44 }: { place: 1 | 2 | 3; size?: number }) {
  const m = MEDALS[place - 1];
  const g = `cup-${m.id}`;
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={`trophy trophy-${m.id}`} role="img" aria-label={`کاپ ${m.label}`}>
      <defs>
        <linearGradient id={g} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={m.stops[0]} />
          <stop offset="0.45" stopColor={m.stops[1]} />
          <stop offset="1" stopColor={m.stops[2]} />
        </linearGradient>
      </defs>
      <path d="M18 12h-7c0 9 4 14 10 15M46 12h7c0 9-4 14-10 15" fill="none" stroke={`url(#${g})`} strokeWidth="4" strokeLinecap="round" />
      <path d="M17 7h30v15c0 9.4-6.7 17-15 17s-15-7.6-15-17z" fill={`url(#${g})`} />
      <path d="M22 10h6v12c0 5 1.5 8.5 4 10.5-5.5-.5-10-5.5-10-12.5z" fill="#fff" opacity="0.35" />
      <rect x="28.5" y="38" width="7" height="8" fill={`url(#${g})`} />
      <rect x="21" y="45" width="22" height="5" rx="1.5" fill={`url(#${g})`} />
      <rect x="17" y="50" width="30" height="7" rx="2" fill={m.stops[2]} />
      <text x="32" y="26" textAnchor="middle" fontSize="15" fontWeight="900" fill={m.stops[2]}>{faNum(place)}</text>
    </svg>
  );
}

/** The first three, on a podium: second, first, third (first in the middle). */
export function Podium({ rows }: { rows: LeaderRow[] }) {
  const fans = new Map(getFans().map((f) => [f.id, f]));
  const top = rows.slice(0, 3);
  const order = [1, 0, 2].filter((i) => top[i]);
  return (
    <ol className="podium">
      {order.map((i) => {
        const r = top[i];
        const place = (i + 1) as 1 | 2 | 3;
        return (
          <li key={r.fanId} className={`podium-col place-${place}`}>
            <span className="podium-photo">
              <FanAvatar name={r.name} src={fans.get(r.fanId)?.avatar} size={place === 1 ? 76 : 62} />
            </span>
            <span className="podium-name" title={r.name}>{r.name}</span>
            <span className="podium-step">
              <Trophy place={place} size={place === 1 ? 50 : 42} />
              <b>{faNum(r.points)}</b>
              <small>امتیاز</small>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** ?ok= / ?error= message after a form. */
export function Notice({ sp }: { sp: Record<string, string> }) {
  if (sp.error) return <p className="predict-notice is-error" role="alert">{sp.error}</p>;
  if (sp.ok) return <p className="predict-notice" role="status">{sp.ok}</p>;
  return null;
}

export function Leaders({ rows, me, limit, empty }: { rows: LeaderRow[]; me?: string; limit?: number; empty: string }) {
  const fans = new Map(getFans().map((f) => [f.id, f]));
  const shown = limit ? rows.slice(0, limit) : rows;
  const mine = me ? rows.findIndex((r) => r.fanId === me) : -1;
  if (!rows.length) return <p className="muted predict-empty">{empty}</p>;
  return (
    <ol className="leaders">
      {shown.map((r, i) => (
        <li key={r.fanId} className={r.fanId === me ? "is-me" : ""}>
          <span className={`leaders-rank${i < 3 ? ` top-${i + 1}` : ""}`}>{faNum(i + 1)}</span>
          <span className="leaders-name"><FanAvatar name={r.name} src={fans.get(r.fanId)?.avatar} size={28} /> <span>{r.name}</span></span>
          <span className="leaders-exact" title="نتیجهٔ دقیق">{faNum(r.exact)} دقیق</span>
          <strong className="leaders-pts">{faNum(r.points)}</strong>
        </li>
      ))}
      {limit && mine >= limit && (
        <li className="is-me">
          <span className="leaders-rank">{faNum(mine + 1)}</span>
          <span className="leaders-name"><FanAvatar name={rows[mine].name} src={fans.get(rows[mine].fanId)?.avatar} size={28} /> <span>{rows[mine].name}</span></span>
          <span className="leaders-exact">{faNum(rows[mine].exact)} دقیق</span>
          <strong className="leaders-pts">{faNum(rows[mine].points)}</strong>
        </li>
      )}
    </ol>
  );
}

export function Rules() {
  return (
    <ul className="predict-rules">
      <li><b>۵ امتیاز</b> نتیجهٔ دقیق</li>
      <li><b>۳ امتیاز</b> برنده (یا مساوی) و تفاضل گل درست</li>
      <li><b>۲ امتیاز</b> فقط برنده یا مساوی درست</li>
      <li>پیش‌بینی هر بازی تا لحظهٔ شروع همان بازی باز است و تا آن موقع می‌توانید تغییرش دهید.</li>
      <li>در تساوی امتیاز، تعداد نتیجه‌های دقیق و بعد زودتر ثبت کردن تعیین‌کننده است.</li>
    </ul>
  );
}
