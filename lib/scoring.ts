/**
 * Scoring engine for Bolão do Barão.
 *
 * Pure, deterministic functions — no I/O, no dates, no DB. The caller is
 * responsible for passing the correct scoreline:
 *
 *  - For knockout matches decided in extra time, pass the regulation + extra-time
 *    scoreline (shootout ignored). A match level after ET is therefore a draw here.
 *
 * Point tiers (flat across group and knockout stages):
 *   - Exact score ............................. 10
 *   - Correct result + one team's goals exact . 5
 *   - Correct result only ..................... 3
 *   - Wrong ................................... 0
 */

export const POINTS = {
  EXACT: 10,
  RESULT_PLUS_ONE: 5,
  RESULT: 3,
  WRONG: 0,
  CHAMPION: 25,
  TOP_SCORER: 15,
} as const;

export type Scoreline = {
  home: number;
  away: number;
};

/** -1 away win, 0 draw, 1 home win. */
function outcome(s: Scoreline): -1 | 0 | 1 {
  return Math.sign(s.home - s.away) as -1 | 0 | 1;
}

/**
 * Points for a single match prediction against the actual (ET-inclusive) score.
 */
export function scoreMatch(pred: Scoreline, actual: Scoreline): number {
  const exact = pred.home === actual.home && pred.away === actual.away;
  if (exact) return POINTS.EXACT;

  const sameResult = outcome(pred) === outcome(actual);
  if (!sameResult) return POINTS.WRONG;

  const oneTeamExact =
    pred.home === actual.home || pred.away === actual.away;
  return oneTeamExact ? POINTS.RESULT_PLUS_ONE : POINTS.RESULT;
}

/** Champion bet: full points only on an exact team match. */
export function scoreChampion(
  predictedTeamId: string | null | undefined,
  actualChampionTeamId: string | null | undefined,
): number {
  if (!predictedTeamId || !actualChampionTeamId) return 0;
  return predictedTeamId === actualChampionTeamId ? POINTS.CHAMPION : POINTS.WRONG;
}

/**
 * Top-scorer bet. `actualTopScorerIds` is a set/array because the Golden Boot
 * can be shared; a pick matching any winner is awarded.
 */
export function scoreTopScorer(
  predictedPlayerId: string | null | undefined,
  actualTopScorerIds: readonly string[],
): number {
  if (!predictedPlayerId) return 0;
  return actualTopScorerIds.includes(predictedPlayerId)
    ? POINTS.TOP_SCORER
    : POINTS.WRONG;
}
