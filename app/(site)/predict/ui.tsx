import { faNum } from "@/lib/format";
import type { LeaderRow } from "@/lib/predict-score";

/** ?ok= / ?error= message after a form. */
export function Notice({ sp }: { sp: Record<string, string> }) {
  if (sp.error) return <p className="predict-notice is-error" role="alert">{sp.error}</p>;
  if (sp.ok) return <p className="predict-notice" role="status">{sp.ok}</p>;
  return null;
}

export function Leaders({ rows, me, limit, empty }: { rows: LeaderRow[]; me?: string; limit?: number; empty: string }) {
  const shown = limit ? rows.slice(0, limit) : rows;
  const mine = me ? rows.findIndex((r) => r.fanId === me) : -1;
  if (!rows.length) return <p className="muted predict-empty">{empty}</p>;
  return (
    <ol className="leaders">
      {shown.map((r, i) => (
        <li key={r.fanId} className={r.fanId === me ? "is-me" : ""}>
          <span className={`leaders-rank${i < 3 ? ` top-${i + 1}` : ""}`}>{faNum(i + 1)}</span>
          <span className="leaders-name">{r.name}</span>
          <span className="leaders-exact" title="نتیجهٔ دقیق">{faNum(r.exact)} دقیق</span>
          <strong className="leaders-pts">{faNum(r.points)}</strong>
        </li>
      ))}
      {limit && mine >= limit && (
        <li className="is-me">
          <span className="leaders-rank">{faNum(mine + 1)}</span>
          <span className="leaders-name">{rows[mine].name}</span>
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
