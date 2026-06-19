import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { matches, teams, predictions } from "@/lib/db/schema";
import { teamNamePtBr } from "@/lib/team-names";

export type EnrichedMatch = {
  id: string;
  stage: string;
  groupName: string | null;
  matchday: number | null;
  kickoffAt: Date;
  status: "scheduled" | "live" | "finished";
  homeGoals: number | null;
  awayGoals: number | null;
  home: { id: string; name: string; crest: string | null } | null;
  away: { id: string; name: string; crest: string | null } | null;
};

export async function getEnrichedMatches(): Promise<EnrichedMatch[]> {
  const [rows, teamRows] = await Promise.all([
    db.select().from(matches).orderBy(asc(matches.kickoffAt)),
    db.select().from(teams),
  ]);
  const t = new Map(teamRows.map((x) => [x.id, x]));
  const team = (id: string | null) => {
    if (!id) return null;
    const row = t.get(id);
    return row
      ? { id: row.id, name: teamNamePtBr(row), crest: row.crest }
      : null;
  };
  return rows.map((m) => ({
    id: m.id,
    stage: m.stage,
    groupName: m.groupName,
    matchday: m.matchday,
    kickoffAt: m.kickoffAt,
    status: m.status,
    homeGoals: m.homeGoals,
    awayGoals: m.awayGoals,
    home: team(m.homeTeamId),
    away: team(m.awayTeamId),
  }));
}

export async function getUserPredictionsMap(
  userId: string,
): Promise<Map<string, { predHome: number; predAway: number }>> {
  const rows = await db
    .select()
    .from(predictions)
    .where(eq(predictions.userId, userId));
  return new Map(
    rows.map((r) => [r.matchId, { predHome: r.predHome, predAway: r.predAway }]),
  );
}
