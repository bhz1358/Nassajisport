// The table as the match results give it: each team's wins, draws, losses, goals and its last
// five results (the «۵ بازی اخیر» symbols). Pure, so it is tested directly.

import type { Fixture, StandingRow } from "./types";

export type ResultRow = { team: string; played: number; won: number; drawn: number; lost: number; goalsFor: number; goalsAgainst: number; points: number; form: ("W" | "D" | "L")[] };

const finished = (f: Fixture) => f.status === "finished" && f.homeScore != null && f.awayScore != null;

export function tableFromResults(fixtures: Fixture[]): Map<string, ResultRow> {
  const rows = new Map<string, ResultRow & { all: ("W" | "D" | "L")[] }>();
  const row = (team: string) => {
    let r = rows.get(team);
    if (!r) rows.set(team, (r = { team, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0, form: [], all: [] }));
    return r;
  };
  for (const f of fixtures.filter(finished).sort((a, b) => Date.parse(a.date) - Date.parse(b.date))) {
    for (const [team, gf, ga] of [[f.home, f.homeScore!, f.awayScore!], [f.away, f.awayScore!, f.homeScore!]] as const) {
      const r = row(team);
      const res = gf > ga ? "W" : gf === ga ? "D" : "L";
      r.played++;
      r.goalsFor += gf;
      r.goalsAgainst += ga;
      if (res === "W") (r.won++, (r.points += 3));
      else if (res === "D") (r.drawn++, r.points++);
      else r.lost++;
      r.all.push(res);
    }
  }
  return new Map([...rows].map(([t, r]) => [t, { ...r, form: r.all.slice(-5), all: undefined } as ResultRow]));
}

/**
 * The table to show: the source's numbers (they include points deductions and matches the
 * results may lack), with the «last five» symbols taken from the results — the league site
 * doesn't publish them, and kept ones go stale. Only when the results cover as many matches
 * as the table says, so the symbols really are the last five.
 */
export function withResultForm(standings: StandingRow[], fixtures: Fixture[]): StandingRow[] {
  const calc = tableFromResults(fixtures);
  return standings.map((r) => {
    const c = calc.get(r.team);
    if (!c || r.partial || c.played !== r.played) return r;
    return { ...r, form: c.form };
  });
}

/** Where the table and the results disagree, team by team, in plain words. */
export function tableDifferences(standings: StandingRow[], fixtures: Fixture[]): { team: string; notes: string[] }[] {
  const calc = tableFromResults(fixtures);
  const out: { team: string; notes: string[] }[] = [];
  for (const r of standings) {
    const c = calc.get(r.team);
    if (!c) {
      out.push({ team: r.team, notes: ["هیچ نتیجه‌ای از این تیم در برنامهٔ بازی‌ها نیست (نام تیم را بررسی کنید)."] });
      continue;
    }
    const notes: string[] = [];
    if (c.played !== r.played) notes.push(`جدول ${r.played} بازی دارد ولی نتیجهٔ ${c.played} بازی ثبت شده است.`);
    else {
      if (r.won !== c.won || r.drawn !== c.drawn || r.lost !== c.lost) notes.push(`برد-مساوی-باخت در جدول ${r.won}-${r.drawn}-${r.lost} ولی طبق نتایج ${c.won}-${c.drawn}-${c.lost}.`);
      if (r.goalsFor !== c.goalsFor || r.goalsAgainst !== c.goalsAgainst) notes.push(`گل زده-خورده در جدول ${r.goalsFor}-${r.goalsAgainst} ولی طبق نتایج ${c.goalsFor}-${c.goalsAgainst}.`);
      const expected = c.points - (r.deducted ?? 0);
      if (r.points !== expected) notes.push(`امتیاز در جدول ${r.points} ولی طبق نتایج ${c.points}${r.deducted ? ` منهای ${r.deducted} کسر شده` : ""}.`);
    }
    if (notes.length) out.push({ team: r.team, notes });
  }
  return out;
}
