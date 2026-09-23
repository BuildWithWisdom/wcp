import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import type { Express } from "express";

// Deterministic Oracle: never call Gemini from tests
delete process.env.GEMINI_API_KEY;

const FUTURE = "2099-06-01T15:00:00.000Z";

let app: Express;

async function seed() {
  const { getDb } = await import("../src/db");
  const schema = await import("../src/db/schema");
  const db = getDb();

  for (const t of [
    { id: "t1", name: "Alpha FC", tla: "ALP" },
    { id: "t2", name: "Beta United", tla: "BET" },
  ]) {
    db.insert(schema.teams)
      .values({ ...t, crestUrl: null, primaryColor: null, secondaryColor: null })
      .onConflictDoNothing()
      .run();
  }

  db.insert(schema.fixtures)
    .values({
      id: "fx-upcoming",
      competitionId: "PL",
      homeTeamId: "t1",
      awayTeamId: "t2",
      kickoffAt: FUTURE,
      status: "TIMED",
      stage: "REGULAR_SEASON",
      matchday: 1,
      homeScore: null,
      awayScore: null,
      updatedAt: new Date().toISOString(),
    })
    .onConflictDoNothing()
    .run();
}

describe("fixtures API", () => {
  beforeAll(async () => {
    const { buildApp } = await import("../src/app");
    app = buildApp();
    await seed();
  });

  it("lists upcoming fixtures with team joins", async () => {
    const res = await request(app).get("/api/fixtures").expect(200);
    expect(res.body.success).toBe(true);
    const fx = res.body.data.find((f: { id: string }) => f.id === "fx-upcoming");
    expect(fx).toBeTruthy();
    expect(fx.homeTeam.name).toBe("Alpha FC");
    expect(fx.awayTeam.name).toBe("Beta United");
    expect(fx.homeTeam.fifaPoints).toBeGreaterThan(0);
  });

  it("filters by competition and 404s on unknown competition", async () => {
    const res = await request(app).get("/api/fixtures?competition=PL").expect(200);
    expect(res.body.data.every((f: { competitionId: string }) => f.competitionId === "PL")).toBe(true);
    await request(app).get("/api/fixtures?competition=NOPE").expect(404);
  });

  it("returns an Oracle prediction without Gemini (fallback modifiers)", async () => {
    const res = await request(app).post("/api/fixtures/fx-upcoming/predict").expect(200);
    const data = res.body.data;
    expect(data.fixtureId).toBe("fx-upcoming");
    expect(Number.isInteger(data.homeScore)).toBe(true);
    expect(Number.isInteger(data.awayScore)).toBe(true);
    expect(Array.isArray(data.timeline)).toBe(true);
    expect(["REGULAR", "EXTRA_TIME", "PENALTIES"]).toContain(data.decidedBy);
    expect(data.modifiers.homeAttackModifier).toBeGreaterThanOrEqual(0.8);
    expect(data.modifiers.homeAttackModifier).toBeLessThanOrEqual(1.2);
    expect(typeof data.aiSummary).toBe("string");
    expect(data.isKnockout).toBe(false);
  });

  it("404s predict for unknown fixture", async () => {
    await request(app).post("/api/fixtures/nope/predict").expect(404);
  });
});
