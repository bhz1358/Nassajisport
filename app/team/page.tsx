import type { Metadata } from "next";
import Link from "next/link";
import { SampleNotice, SectionHeader } from "../components";
import { PlayerCard, Pitch, Shirt } from "../squad-ui";
import { faDate, faNum } from "@/lib/format";
import { getSquad, lineupRows, POSITIONS } from "@/lib/squad";

export const metadata: Metadata = { title: "تیم و بازیکنان" };

export default function TeamPage() {
  const squad = getSquad();
  const rows = lineupRows(squad);
  const bySlug = new Map(squad.players.map((p) => [p.slug, p]));
  const subs = (squad.lineup?.substitutes ?? []).map((s) => bySlug.get(s)).filter((p) => !!p);

  return (
    <>
      {squad.isSample && (
        <SampleNotice>بازیکنان، آمار و ترکیب این صفحه نمونه است. اطلاعات واقعی تیم بعداً از پنل مدیریت وارد می‌شود.</SampleNotice>
      )}
      <header className="team-header">
        <div>
          <h1 className="page-title">نساجی مازندران</h1>
          <p className="muted">
            فصل {squad.season} · {faNum(squad.players.length)} بازیکن
          </p>
        </div>
        <nav className="team-tabs" aria-label="بخش‌های تیم">
          {squad.lineup && <a href="#lineup">ترکیب</a>}
          <a href="#players">بازیکنان</a>
          <a href="#staff">کادر فنی</a>
        </nav>
      </header>

      {squad.lineup && (
        <section id="lineup" className="block lineup">
          <SectionHeader title="ترکیب آخرین بازی" />
          <div className="lineup-grid">
            <Pitch rows={rows} formation={squad.lineup.formation} />
            <div className="panel lineup-info">
              <dl className="facts">
                <div>
                  <dt>بازی</dt>
                  <dd>{squad.lineup.match}</dd>
                </div>
                <div>
                  <dt>تاریخ</dt>
                  <dd>{faDate(squad.lineup.date)}</dd>
                </div>
                <div>
                  <dt>آرایش</dt>
                  <dd dir="ltr">{squad.lineup.formation}</dd>
                </div>
              </dl>
              <h3>ذخیره‌ها</h3>
              <ul className="subs">
                {subs.map((p) => (
                  <li key={p.slug}>
                    <Link href={`/team/${p.slug}/`}>
                      <Shirt number={p.number} size={30} />
                      <span>{p.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      <section id="players" className="block">
        {POSITIONS.map((pos) => {
          const players = squad.players.filter((p) => p.position === pos.key).sort((a, b) => a.number - b.number);
          if (players.length === 0) return null;
          return (
            <div key={pos.key} className="position-group">
              <SectionHeader title={`${pos.plural} (${faNum(players.length)})`} />
              <div className="player-grid">
                {players.map((p) => (
                  <PlayerCard key={p.slug} player={p} />
                ))}
              </div>
            </div>
          );
        })}
      </section>

      <section id="staff" className="block">
        <SectionHeader title="کادر فنی" />
        <ul className="staff-grid">
          {squad.staff.map((s) => (
            <li key={s.name} className="panel">
              <span className="avatar" aria-hidden="true">
                {s.name.charAt(0)}
              </span>
              <div>
                <strong>{s.name}</strong>
                <span className="muted">{s.role}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
