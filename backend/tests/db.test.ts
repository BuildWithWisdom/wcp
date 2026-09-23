import { describe, it, expect } from "vitest";
import { createDatabase } from "../src/db";
import * as schema from "../src/db/schema";

describe("createDatabase", () => {
  it("runs migrations and seeds the 6 competitions", () => {
    const db = createDatabase(":memory:");
    const rows = db.select().from(schema.competitions).all();
    expect(rows).toHaveLength(6);
    expect(rows.map((r) => r.id).sort()).toEqual(
      ["BL1", "CL", "FL1", "PD", "PL", "SA"].sort()
    );
  });

  it("is safe to call twice (migrations idempotent)", () => {
    const db = createDatabase(":memory:");
    const again = createDatabase(":memory:");
    expect(again.select().from(schema.competitions).all()).toHaveLength(6);
    expect(db.select().from(schema.competitions).all()).toHaveLength(6);
  });

  it("upserts fixtures and updates scores on re-sync", () => {
    const db = createDatabase(":memory:");
    const now = new Date().toISOString();

    const fixture = {
      id: "f1",
      competitionId: "PL",
      homeTeamId: "t1",
      awayTeamId: "t2",
      kickoffAt: "2026-09-20T15:00:00.000Z",
      status: "TIMED" as const,
      stage: "REGULAR_SEASON",
      matchday: 5,
      homeScore: null,
      awayScore: null,
      updatedAt: now,
    };

    for (const t of [
      { id: "t1", name: "Home FC", tla: "HOM", crestUrl: null, primaryColor: null, secondaryColor: null },
      { id: "t2", name: "Away FC", tla: "AWY", crestUrl: null, primaryColor: null, secondaryColor: null },
    ]) {
      db.insert(schema.teams).values(t).run();
    }

    db.insert(schema.fixtures).values(fixture).run();

    db.insert(schema.fixtures)
      .values({ ...fixture, status: "FINISHED" as const, homeScore: 2, awayScore: 1, updatedAt: new Date().toISOString() })
      .onConflictDoUpdate({
        target: schema.fixtures.id,
        set: {
          status: "FINISHED",
          homeScore: 2,
          awayScore: 1,
          updatedAt: new Date().toISOString(),
        },
      })
      .run();

    const rows = db.select().from(schema.fixtures).all();
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("FINISHED");
    expect(rows[0].homeScore).toBe(2);
    expect(rows[0].awayScore).toBe(1);
  });

  it("enforces one prediction per device per fixture", () => {
    const db = createDatabase(":memory:");
    const now = new Date().toISOString();

    for (const t of [
      { id: "t1", name: "Home FC", tla: null, crestUrl: null, primaryColor: null, secondaryColor: null },
      { id: "t2", name: "Away FC", tla: null, crestUrl: null, primaryColor: null, secondaryColor: null },
    ]) {
      db.insert(schema.teams).values(t).run();
    }
    db.insert(schema.fixtures)
      .values({
        id: "f1",
        competitionId: "PL",
        homeTeamId: "t1",
        awayTeamId: "t2",
        kickoffAt: "2026-09-20T15:00:00.000Z",
        status: "TIMED",
        stage: null,
        matchday: 1,
        homeScore: null,
        awayScore: null,
        updatedAt: now,
      })
      .run();

    const pred = {
      id: "p1",
      ownerDeviceId: "device-a",
      fixtureId: "f1",
      homeScore: 1,
      awayScore: 0,
      points: null,
      createdAt: now,
      updatedAt: now,
    };

    db.insert(schema.predictions).values(pred).run();
    expect(() =>
      db
        .insert(schema.predictions)
        .values({ ...pred, id: "p2", homeScore: 2 })
        .run()
    ).toThrow(/UNIQUE/);
  });
});
