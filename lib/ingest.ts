/**
 * Ingestion: pull from football-data.org and mirror into Postgres, then
 * recompute prediction points for any finished matches. Called by
 * /api/cron/ingest and reusable after an admin score override.
 */

import { eq, and, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { teams, matches, predictions, scorersCache } from "@/lib/db/schema";
import {
  fetchMatches,
  fetchScorers,
  mapStage,
  mapStatus,
  type FdMatch,
} from "@/lib/football-data";
import { scoreMatch } from "@/lib/scoring";
import { teamNamePtBr } from "@/lib/team-names";

function teamCode(t: { tla?: string; id: number }): string {
  return t.tla && t.tla.length === 3 ? t.tla : `fd-${t.id}`;
}

async function upsertTeam(t: FdMatch["homeTeam"]) {
  const id = teamCode(t);
  const name = teamNamePtBr({ id, tla: t.tla, name: t.name });
  await db
    .insert(teams)
    .values({ id, externalId: String(t.id), name, crest: t.crest })
    .onConflictDoUpdate({
      target: teams.id,
      set: { name, crest: t.crest, externalId: String(t.id) },
    });
  return id;
}

/** Sync fixtures + scores. Returns the number of matches written. */
export async function ingestMatches(): Promise<number> {
  const { matches: fdMatches } = await fetchMatches();
  for (const m of fdMatches) {
    const homeId = m.homeTeam?.id ? await upsertTeam(m.homeTeam) : null;
    const awayId = m.awayTeam?.id ? await upsertTeam(m.awayTeam) : null;
    const status = mapStatus(m.status);
    const homeGoals = m.score?.fullTime?.home ?? null;
    const awayGoals = m.score?.fullTime?.away ?? null;

    await db
      .insert(matches)
      .values({
        externalId: String(m.id),
        stage: mapStage(m.stage) as never,
        groupName: m.group ? m.group.replace(/^GROUP_/, "") : null,
        matchday: m.matchday,
        homeTeamId: homeId,
        awayTeamId: awayId,
        kickoffAt: new Date(m.utcDate),
        status,
        homeGoals,
        awayGoals,
        lastSyncedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: matches.externalId,
        set: {
          stage: mapStage(m.stage) as never,
          groupName: m.group ? m.group.replace(/^GROUP_/, "") : null,
          matchday: m.matchday,
          homeTeamId: homeId,
          awayTeamId: awayId,
          kickoffAt: new Date(m.utcDate),
          status,
          homeGoals,
          awayGoals,
          lastSyncedAt: new Date(),
        },
      });
  }
  return fdMatches.length;
}

/** Recompute points for every prediction on finished, fully-scored matches. */
export async function recomputeScores(): Promise<number> {
  const finished = await db
    .select()
    .from(matches)
    .where(
      and(
        eq(matches.status, "finished"),
        isNotNull(matches.homeGoals),
        isNotNull(matches.awayGoals),
      ),
    );

  let updated = 0;
  for (const m of finished) {
    const actual = { home: m.homeGoals!, away: m.awayGoals! };
    const preds = await db
      .select()
      .from(predictions)
      .where(eq(predictions.matchId, m.id));
    for (const p of preds) {
      const pts = scoreMatch({ home: p.predHome, away: p.predAway }, actual);
      if (p.points !== pts) {
        await db
          .update(predictions)
          .set({ points: pts })
          .where(eq(predictions.id, p.id));
        updated++;
      }
    }
  }
  return updated;
}

/** Mirror top scorers for the stats view + top-scorer-bet resolution. */
export async function ingestScorers(): Promise<number> {
  const { scorers } = await fetchScorers();
  await db.delete(scorersCache);
  const maxGoals = scorers.reduce((mx, s) => Math.max(mx, s.goals ?? 0), 0);
  let rank = 1;
  for (const s of scorers) {
    await db.insert(scorersCache).values({
      rank: rank++,
      playerName: s.player.name,
      playerExternalId: String(s.player.id),
      goals: s.goals ?? 0,
      isTopScorer: (s.goals ?? 0) > 0 && (s.goals ?? 0) === maxGoals,
    });
  }
  return scorers.length;
}

export async function ingestAll() {
  const matchesWritten = await ingestMatches();
  const scored = await recomputeScores();
  let scorersWritten = 0;
  try {
    scorersWritten = await ingestScorers();
  } catch {
    // Scorers endpoint may be empty very early in the tournament — non-fatal.
  }
  return { matchesWritten, scored, scorersWritten };
}
