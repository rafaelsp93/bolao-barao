import { describe, it, expect } from "vitest";
import {
  scoreMatch,
  scoreChampion,
  scoreTopScorer,
  POINTS,
} from "./scoring";

describe("scoreMatch", () => {
  it("awards 10 for an exact score (home win)", () => {
    expect(scoreMatch({ home: 2, away: 1 }, { home: 2, away: 1 })).toBe(POINTS.EXACT);
  });

  it("awards 10 for an exact draw", () => {
    expect(scoreMatch({ home: 1, away: 1 }, { home: 1, away: 1 })).toBe(POINTS.EXACT);
  });

  it("awards 5 for correct result + home goals exact", () => {
    // predicted 2-0, actual 2-1: home win right, home goals exact, away wrong
    expect(scoreMatch({ home: 2, away: 0 }, { home: 2, away: 1 })).toBe(POINTS.RESULT_PLUS_ONE);
  });

  it("awards 5 for correct result + away goals exact", () => {
    // predicted 3-1, actual 2-1: home win right, away goals exact
    expect(scoreMatch({ home: 3, away: 1 }, { home: 2, away: 1 })).toBe(POINTS.RESULT_PLUS_ONE);
  });

  it("awards 3 for correct result only (no goals match)", () => {
    // predicted 3-0, actual 2-1: both home wins, neither goal count matches
    expect(scoreMatch({ home: 3, away: 0 }, { home: 2, away: 1 })).toBe(POINTS.RESULT);
  });

  it("awards 3 for correct draw result with wrong score", () => {
    expect(scoreMatch({ home: 2, away: 2 }, { home: 1, away: 1 })).toBe(POINTS.RESULT);
  });

  it("awards 0 for wrong result", () => {
    // predicted home win, actual away win
    expect(scoreMatch({ home: 2, away: 1 }, { home: 0, away: 1 })).toBe(POINTS.WRONG);
  });

  it("awards 0 when predicting a draw but a team wins (even if one goal matches)", () => {
    // predicted 1-1, actual 1-0: wrong result, no points despite home goals matching
    expect(scoreMatch({ home: 1, away: 1 }, { home: 1, away: 0 })).toBe(POINTS.WRONG);
  });

  it("is idempotent / deterministic", () => {
    const a = scoreMatch({ home: 2, away: 1 }, { home: 2, away: 1 });
    const b = scoreMatch({ home: 2, away: 1 }, { home: 2, away: 1 });
    expect(a).toBe(b);
  });

  it("treats a level-after-ET knockout score as a draw (caller passes ET-inclusive)", () => {
    // 1-1 after extra time, decided on penalties: prediction of 1-1 is exact here
    expect(scoreMatch({ home: 1, away: 1 }, { home: 1, away: 1 })).toBe(POINTS.EXACT);
  });
});

describe("scoreChampion", () => {
  it("awards 25 for the correct champion", () => {
    expect(scoreChampion("BRA", "BRA")).toBe(POINTS.CHAMPION);
  });
  it("awards 0 for the wrong champion", () => {
    expect(scoreChampion("BRA", "ARG")).toBe(POINTS.WRONG);
  });
  it("awards 0 when no pick or no result", () => {
    expect(scoreChampion(null, "BRA")).toBe(0);
    expect(scoreChampion("BRA", null)).toBe(0);
  });
});

describe("scoreTopScorer", () => {
  it("awards 15 for the correct top scorer", () => {
    expect(scoreTopScorer("p1", ["p1"])).toBe(POINTS.TOP_SCORER);
  });
  it("awards 15 when the pick is one of several tied winners", () => {
    expect(scoreTopScorer("p2", ["p1", "p2", "p3"])).toBe(POINTS.TOP_SCORER);
  });
  it("awards 0 for the wrong top scorer", () => {
    expect(scoreTopScorer("p9", ["p1", "p2"])).toBe(POINTS.WRONG);
  });
  it("awards 0 when no pick", () => {
    expect(scoreTopScorer(null, ["p1"])).toBe(0);
  });
});
