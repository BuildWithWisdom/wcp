import { and, eq, isNotNull } from "drizzle-orm";
import { scorePrediction } from "@wco/shared";
import type { AppDatabase } from "../db";
import * as schema from "../db/schema";

export interface ScorePassResult {
  scored: number;
  updated: number;
}

/**
 * Recomputes points for every prediction whose fixture has finished.
 * Idempotent — safe to run after each sync and before stats reads.
 */
export function scoreFinishedPredictions(db: AppDatabase): ScorePassResult {
  const rows = db
    .select({
      id: schema.predictions.id,
      pickHome: schema.predictions.homeScore,
      pickAway: schema.predictions.awayScore,
      points: schema.predictions.points,
      actualHome: schema.fixtures.homeScore,
      actualAway: schema.fixtures.awayScore,
    })
    .from(schema.predictions)
    .innerJoin(schema.fixtures, eq(schema.predictions.fixtureId, schema.fixtures.id))
    .where(
      and(
        eq(schema.fixtures.status, "FINISHED"),
        isNotNull(schema.fixtures.homeScore),
        isNotNull(schema.fixtures.awayScore)
      )
    )
    .all();

  let updated = 0;
  for (const row of rows) {
    const { points } = scorePrediction(
      { homeScore: row.pickHome, awayScore: row.pickAway },
      { homeScore: row.actualHome as number, awayScore: row.actualAway as number }
    );
    if (points !== row.points) {
      db.update(schema.predictions)
        .set({ points, updatedAt: new Date().toISOString() })
        .where(eq(schema.predictions.id, row.id))
        .run();
      updated++;
    }
  }

  return { scored: rows.length, updated };
}
