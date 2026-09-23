import { describe, it, expect } from "vitest";
import { createDatabase } from "../src/db";
import * as schema from "../src/db/schema";
import { scoreFinishedPredictions } from "../src/services/scoring.service";

function seedTeam(db: ReturnType<typeof createDatabase>, id: string, name: string): void {
  db.insert(schema.teams)
    .values({ id, name, tla: null, crestUrl: null, primaryColor: null, secondaryColor: null })
    .run();
}

function seedFixture(
  db: ReturnType<typeof createDatabase>,
  opts: {
    id: string;
    status: "TIMED" | "FINISHED";
    homeScore?: number | null;
    awayScore?: number | null;
    kickoffAt?: string;
  }
): void {
  db.insert(schema.fixtures)
    .values({
      id: opts.id,
      competitionId: "PL",
      homeTeamId: "t1",
      awayTeamId: "t2",
      kickoffAt: opts.kickoffAt ?? "2020-01-01T15:00:00.000Z",
      status: opts.status,
      stage: "REGULAR_SEASON",
      matchday: 1,
      homeScore: opts.homeScore ?? null,
      awayScore: opts.awayScore ?? null,
      updatedAt: new Date().toISOString(),
    })
    .run();
}

function seedPrediction(
  db: ReturnType<typeof createDatabase>,
  id: string,
  fixtureId: string,
  home: number,
  away: number,
  device: string
): void {
  const now = new Date().toISOString();
  db.insert(schema.predictions)
    .values({
      id,
      ownerDeviceId: device,
      fixtureId,
      homeScore: home,
      awayScore: away,
      points: null,
      createdAt: now,
      updatedAt: now,
    })
    .run();
}

const DEV_A = "123e4567-e89b-42d3-a456-426614174000";
const DEV_B = "123e4567-e89b-42d3-a456-426614174001";
const DEV_C = "123e4567-e89b-42d3-a456-426614174002";

describe("scoreFinishedPredictions", () => {
  it("scores exact, outcome, and wrong predictions on finished fixtures", () => {
    const db = createDatabase(":memory:");
    seedTeam(db, "t1", "Home FC");
    seedTeam(db, "t2", "Away FC");
    seedFixture(db, { id: "f1", status: "FINISHED", homeScore: 2, awayScore: 1 });
    seedFixture(db, { id: "f2", status: "TIMED" });

    seedPrediction(db, "p-exact", "f1", 2, 1, DEV_A);
    seedPrediction(db, "p-outcome", "f1", 5, 0, DEV_B);
    seedPrediction(db, "p-wrong", "f1", 0, 1, DEV_C);
    seedPrediction(db, "p-pending", "f2", 1, 1, DEV_A);

    const result = scoreFinishedPredictions(db);
    expect(result.scored).toBe(3); // only predictions on the FINISHED fixture
    expect(result.updated).toBe(3);

    const byId = new Map(
      db.select().from(schema.predictions).all().map((p) => [p.id, p.points])
    );
    expect(byId.get("p-exact")).toBe(3);
    expect(byId.get("p-outcome")).toBe(1);
    expect(byId.get("p-wrong")).toBe(0);
    expect(byId.get("p-pending")).toBeNull();
  });

  it("is idempotent — second pass updates nothing", () => {
    const db = createDatabase(":memory:");
    seedTeam(db, "t1", "Home FC");
    seedTeam(db, "t2", "Away FC");
    seedFixture(db, { id: "f1", status: "FINISHED", homeScore: 1, awayScore: 0 });
    seedPrediction(db, "p1", "f1", 1, 0, DEV_A);

    expect(scoreFinishedPredictions(db).updated).toBe(1);
    expect(scoreFinishedPredictions(db).updated).toBe(0);
  });
});
