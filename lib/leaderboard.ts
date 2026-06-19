/**
 * Leaderboard aggregation. Total = match-prediction points + admin
 * starting-points adjustments. Tiny group (≈4 players), so we aggregate in JS
 * for clarity. Rank movement (▲/▼) is computed client-side by comparing
 * successive polls — no server-side snapshot needed.
 */

import { db } from "@/lib/db";
import { users, predictions, pointsAdjustments } from "@/lib/db/schema";

export type LeaderboardEntry = {
  userId: string;
  displayName: string;
  rank: number;
  total: number;
  matchPoints: number;
  adjustmentPoints: number;
  exactScores: number;
  scoringHits: number;
};

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  // Admins can also play, so everyone with an account is on the board.
  const [everyone, allPreds, allAdj] = await Promise.all([
    db.select().from(users),
    db.select().from(predictions),
    db.select().from(pointsAdjustments),
  ]);

  const byUser = new Map<string, LeaderboardEntry>();
  for (const u of everyone) {
    byUser.set(u.id, {
      userId: u.id,
      displayName: u.displayName ?? u.email,
      rank: 0,
      total: 0,
      matchPoints: 0,
      adjustmentPoints: 0,
      exactScores: 0,
      scoringHits: 0,
    });
  }
  for (const p of allPreds) {
    const e = byUser.get(p.userId);
    if (!e || p.points == null) continue;
    e.matchPoints += p.points;
    if (p.points > 0) e.scoringHits += 1;
    if (p.points === 10) e.exactScores += 1;
  }
  for (const a of allAdj) {
    const e = byUser.get(a.userId);
    if (e) e.adjustmentPoints += a.points;
  }

  const entries = [...byUser.values()];
  for (const e of entries) {
    e.total = e.matchPoints + e.adjustmentPoints;
  }
  entries.sort(
    (a, b) => b.total - a.total || a.displayName.localeCompare(b.displayName),
  );
  entries.forEach((e, i) => {
    e.rank = i + 1;
  });
  return entries;
}
