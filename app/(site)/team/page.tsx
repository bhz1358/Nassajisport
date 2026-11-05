import type { Metadata } from "next";
import { SampleNotice, SectionHeader } from "../components";
import { BenchList, MatchPitch, PlayerCard } from "../squad-ui";
import { faDate, faNum } from "@/lib/format";
import { getSquad, POSITIONS } from "@/lib/squad";

export const metadata: Metadata = { title: "تیم و بازیکنان" };

export default function TeamPage() {
  const squad = getSquad();
  const lu = squad.lineup;

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

      {lu && (
        <section id="lineup" className="block lineup">
          <SectionHeader title="ترکیب آخرین بازی" />
          <p className="lineup-meta">
            <strong>{lu.match}</strong>
            <span>
              {faDate(lu.date)}
              {lu.competition && ` · ${lu.competition}`}
              {lu.venue && ` · ${lu.venue}`}
            </span>
          </p>
          <div className="lineup-grid">
            <MatchPitch lineup={lu} />
            <div className="lineup-teams">
              {[
                { t: lu.home, away: false },
                { t: lu.away, away: true },
              ].map(({ t, away }) => (
                <div key={t.team} className="panel lineup-team">
                  <h3>
                    {t.team} <span dir="ltr">{t.formation}</span>
                  </h3>
                  {t.coach && (
                    <p className="muted">
                      سرمربی: <strong>{t.coach}</strong>
                    </p>
                  )}
                  <h4>ذخیره‌ها</h4>
                  <BenchList players={t.substitutes} away={away} />
                </div>
              ))}
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
