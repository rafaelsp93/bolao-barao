import { describe, it, expect } from "vitest";
import { computeGroupStandings, type StandingMatch } from "./standings";

const fin = (
  groupName: string,
  h: string,
  a: string,
  hg: number,
  ag: number,
): StandingMatch => ({
  groupName,
  status: "finished",
  homeTeamId: h,
  awayTeamId: a,
  homeGoals: hg,
  awayGoals: ag,
});

describe("computeGroupStandings", () => {
  it("awards 3 for a win, 1 for a draw, and orders by points then GD", () => {
    const table = computeGroupStandings([
      fin("A", "BRA", "SRB", 2, 0), // BRA win
      fin("A", "SUI", "CMR", 1, 1), // draw
      fin("A", "BRA", "SUI", 1, 0), // BRA win
    ]);
    const a = table.get("A")!;
    expect(a[0].teamId).toBe("BRA");
    expect(a[0].points).toBe(6);
    expect(a[0].goalDiff).toBe(3);
    // SUI: 1 draw + 1 loss = 1 pt
    const sui = a.find((r) => r.teamId === "SUI")!;
    expect(sui.points).toBe(1);
  });

  it("ignores unfinished matches", () => {
    const table = computeGroupStandings([
      { ...fin("B", "ARG", "MEX", 0, 0), status: "scheduled", homeGoals: null, awayGoals: null },
    ]);
    expect(table.get("B")).toBeUndefined();
  });
});
