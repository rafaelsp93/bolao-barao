/**
 * Compute group standings from finished group-stage matches. Pure function so
 * it's testable and needs no extra API call (we already mirror every match).
 *
 * Tiebreakers here are simplified to points → goal difference → goals for.
 * (FIFA's full head-to-head rules are out of scope for a friends' stats view.)
 */

export type StandingMatch = {
  groupName: string | null;
  status: "scheduled" | "live" | "finished";
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeGoals: number | null;
  awayGoals: number | null;
};

export type StandingRow = {
  teamId: string;
  played: number;
  won: number;
  draw: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
};

export function computeGroupStandings(
  matches: StandingMatch[],
): Map<string, StandingRow[]> {
  const groups = new Map<string, Map<string, StandingRow>>();

  const ensure = (group: string, teamId: string): StandingRow => {
    if (!groups.has(group)) groups.set(group, new Map());
    const g = groups.get(group)!;
    if (!g.has(teamId)) {
      g.set(teamId, {
        teamId,
        played: 0,
        won: 0,
        draw: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDiff: 0,
        points: 0,
      });
    }
    return g.get(teamId)!;
  };

  for (const m of matches) {
    if (
      m.status !== "finished" ||
      !m.groupName ||
      !m.homeTeamId ||
      !m.awayTeamId ||
      m.homeGoals == null ||
      m.awayGoals == null
    ) {
      continue;
    }
    const home = ensure(m.groupName, m.homeTeamId);
    const away = ensure(m.groupName, m.awayTeamId);

    home.played++;
    away.played++;
    home.goalsFor += m.homeGoals;
    home.goalsAgainst += m.awayGoals;
    away.goalsFor += m.awayGoals;
    away.goalsAgainst += m.homeGoals;

    if (m.homeGoals > m.awayGoals) {
      home.won++;
      home.points += 3;
      away.lost++;
    } else if (m.homeGoals < m.awayGoals) {
      away.won++;
      away.points += 3;
      home.lost++;
    } else {
      home.draw++;
      away.draw++;
      home.points += 1;
      away.points += 1;
    }
  }

  const result = new Map<string, StandingRow[]>();
  for (const [group, table] of groups) {
    const rows = [...table.values()];
    for (const r of rows) r.goalDiff = r.goalsFor - r.goalsAgainst;
    rows.sort(
      (a, b) =>
        b.points - a.points ||
        b.goalDiff - a.goalDiff ||
        b.goalsFor - a.goalsFor,
    );
    result.set(group, rows);
  }
  return result;
}
