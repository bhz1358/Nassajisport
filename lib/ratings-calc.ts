// Fans' 1–10 ratings for Nassaji's players and coach after a match. Pure functions.

export type Candidate = { id: string; name: string; number?: number; slug?: string; photo?: string; role: "player" | "coach" };
export type RatingVote = { poll: string; fanId: string; scores: Record<string, number>; at: string };
export type CandidateResult = Candidate & { avg: number; count: number };

/** Averages per candidate, best first; candidates nobody rated come last with avg 0. */
export function results(candidates: Candidate[], votes: RatingVote[]): CandidateResult[] {
  return candidates
    .map((c) => {
      const s = votes.map((v) => v.scores[c.id]).filter((x): x is number => Number.isInteger(x) && x >= 1 && x <= 10);
      return { ...c, count: s.length, avg: s.length ? Math.round((s.reduce((a, b) => a + b, 0) / s.length) * 10) / 10 : 0 };
    })
    .sort((a, b) => b.avg - a.avg || b.count - a.count);
}

/**
 * The fans' best player: the highest average among players (not the coach) rated by more than
 * half as many fans as the most-rated player, so one fan's 10 for a late sub doesn't win.
 */
export function bestPlayer(candidates: Candidate[], votes: RatingVote[]): CandidateResult | undefined {
  const players = results(candidates.filter((c) => c.role === "player"), votes).filter((r) => r.count > 0);
  const most = Math.max(0, ...players.map((r) => r.count));
  return players.find((r) => r.count * 2 > most);
}

/** "۷٫۸" */
export const faScore = (n: number) => n.toFixed(1).replace(".", "٫").replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);

/** Only whole scores 1–10 for known candidates; empty when nothing valid was given. */
export function cleanScores(raw: Record<string, unknown>, candidates: Candidate[]): Record<string, number> {
  const ids = new Set(candidates.map((c) => c.id));
  return Object.fromEntries(
    Object.entries(raw)
      .map(([k, v]) => [k, Number(v)] as const)
      .filter(([k, v]) => ids.has(k) && Number.isInteger(v) && v >= 1 && v <= 10),
  );
}
