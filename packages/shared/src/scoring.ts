import type { ScorePair } from "./types";

export const POINTS_EXACT = 3;
export const POINTS_OUTCOME = 1;
export const POINTS_WRONG = 0;

export interface PredictionScore {
  points: number;
  exact: boolean;
  outcome: boolean;
}

const outcomeOf = (s: ScorePair): "home" | "draw" | "away" =>
  s.homeScore > s.awayScore ? "home" : s.homeScore < s.awayScore ? "away" : "draw";

/**
 * Scores a prediction against the actual result:
 * exact scoreline = 3 pts, correct outcome (incl. draw) = 1 pt, otherwise 0.
 */
export function scorePrediction(pick: ScorePair, actual: ScorePair): PredictionScore {
  if (
    !Number.isInteger(pick.homeScore) ||
    !Number.isInteger(pick.awayScore) ||
    !Number.isInteger(actual.homeScore) ||
    !Number.isInteger(actual.awayScore) ||
    pick.homeScore < 0 ||
    pick.awayScore < 0 ||
    actual.homeScore < 0 ||
    actual.awayScore < 0
  ) {
    throw new Error("Scores must be non-negative integers");
  }

  const exact = pick.homeScore === actual.homeScore && pick.awayScore === actual.awayScore;
  const outcome = outcomeOf(pick) === outcomeOf(actual);

  if (exact) return { points: POINTS_EXACT, exact: true, outcome: true };
  if (outcome) return { points: POINTS_OUTCOME, exact: false, outcome: true };
  return { points: POINTS_WRONG, exact: false, outcome: false };
}
