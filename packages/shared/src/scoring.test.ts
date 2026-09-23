import { describe, it, expect } from "vitest";
import { scorePrediction, POINTS_EXACT, POINTS_OUTCOME, POINTS_WRONG } from "./scoring";

describe("scorePrediction", () => {
  it("awards exact points for an exact scoreline", () => {
    const result = scorePrediction(
      { homeScore: 2, awayScore: 1 },
      { homeScore: 2, awayScore: 1 }
    );
    expect(result).toEqual({ points: POINTS_EXACT, exact: true, outcome: true });
  });

  it("awards outcome points for a correct winner, wrong score", () => {
    const result = scorePrediction(
      { homeScore: 1, awayScore: 0 },
      { homeScore: 3, awayScore: 2 }
    );
    expect(result).toEqual({ points: POINTS_OUTCOME, exact: false, outcome: true });
  });

  it("awards outcome points for predicted away win", () => {
    const result = scorePrediction(
      { homeScore: 0, awayScore: 2 },
      { homeScore: 1, awayScore: 4 }
    );
    expect(result.points).toBe(POINTS_OUTCOME);
  });

  it("treats draw correctly both ways", () => {
    expect(
      scorePrediction({ homeScore: 1, awayScore: 1 }, { homeScore: 2, awayScore: 2 })
    ).toEqual({ points: POINTS_OUTCOME, exact: false, outcome: true });
    expect(
      scorePrediction({ homeScore: 1, awayScore: 1 }, { homeScore: 2, awayScore: 2 }).exact
    ).toBe(false);
  });

  it("awards zero when the outcome is wrong", () => {
    const result = scorePrediction(
      { homeScore: 2, awayScore: 0 },
      { homeScore: 0, awayScore: 1 }
    );
    expect(result).toEqual({ points: POINTS_WRONG, exact: false, outcome: false });
  });

  it("rejects negative and non-integer scores", () => {
    expect(() =>
      scorePrediction({ homeScore: -1, awayScore: 0 }, { homeScore: 0, awayScore: 0 })
    ).toThrow();
    expect(() =>
      scorePrediction({ homeScore: 1.5, awayScore: 0 }, { homeScore: 0, awayScore: 0 })
    ).toThrow();
    expect(() =>
      scorePrediction({ homeScore: 1, awayScore: 0 }, { homeScore: 0.5, awayScore: 0 })
    ).toThrow();
  });
});
