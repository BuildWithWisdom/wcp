import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import type { Express } from "express";

// Deterministic Oracle: never call Gemini from tests
delete process.env.GEMINI_API_KEY;

const DEVICE = "123e4567-e89b-42d3-a456-426614174000";
const OTHER_DEVICE = "123e4567-e89b-42d3-a456-426614174999";
const FUTURE = "2099-06-01T15:00:00.000Z";
const PAST = "2020-06-01T15:00:00.000Z";

let app: Express;

async function seed() {
  const { getDb } = await import("../src/db");
  const schema = await import("../src/db/schema");
  const db = getDb();

  for (const t of [
    { id: "t1", name: "Alpha FC", tla: "ALP" },
    { id: "t2", name: "Beta United", tla: "BET" },
    { id: "t3", name: "Gamma City", tla: "GAM" },
    { id: "t4", name: "Delta Rovers", tla: "DEL" },
  ]) {
    db.insert(schema.teams)
      .values({ ...t, crestUrl: null, primaryColor: null, secondaryColor: null })
      .onConflictDoNothing()
      .run();
  }

  const now = new Date().toISOString();
  const fixtures = [
    {
      id: "fx-upcoming",
      homeTeamId: "t1",
      awayTeamId: "t2",
      kickoffAt: FUTURE,
      status: "TIMED" as const,
      homeScore: null,
      awayScore: null,
    },
    {
      id: "fx-past",
      homeTeamId: "t3",
      awayTeamId: "t4",
      kickoffAt: PAST,
      status: "TIMED" as const,
      homeScore: null,
      awayScore: null,
    },
    {
      id: "fx-finished-1",
      homeTeamId: "t1",
      awayTeamId: "t4",
      kickoffAt: "2020-01-01T15:00:00.000Z",
      status: "FINISHED" as const,
      homeScore: 0,
      awayScore: 2,
    },
    {
      id: "fx-finished-2",
      homeTeamId: "t2",
      awayTeamId: "t3",
      kickoffAt: "2020-01-02T15:00:00.000Z",
      status: "FINISHED" as const,
      homeScore: 3,
      awayScore: 1,
    },
    {
      id: "fx-finished-3",
      homeTeamId: "t3",
      awayTeamId: "t4",
      kickoffAt: "2020-01-03T15:00:00.000Z",
      status: "FINISHED" as const,
      homeScore: 1,
      awayScore: 1,
    },
  ];

  for (const f of fixtures) {
    db.insert(schema.fixtures)
      .values({
        ...f,
        competitionId: "PL",
        stage: "REGULAR_SEASON",
        matchday: 1,
        updatedAt: now,
      })
      .onConflictDoNothing()
      .run();
  }

  // Picks for the finished fixtures: wrong, outcome, exact-draw → 0 + 1 + 3
  const predictions = [
    { id: "sx-1", fixtureId: "fx-finished-1", homeScore: 1, awayScore: 0 },
    { id: "sx-2", fixtureId: "fx-finished-2", homeScore: 2, awayScore: 0 },
    { id: "sx-3", fixtureId: "fx-finished-3", homeScore: 1, awayScore: 1 },
  ];
  for (const p of predictions) {
    db.insert(schema.predictions)
      .values({
        ...p,
        ownerDeviceId: DEVICE,
        points: null,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing()
      .run();
  }
}

describe("fixtures & predictions API", () => {
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
    expect(fx.predictionOpen).toBe(true);
    expect(fx.prediction).toBeNull();
  });

  it("filters by competition and 404s on unknown competition", async () => {
    const res = await request(app).get("/api/fixtures?competition=PL").expect(200);
    expect(res.body.data.every((f: { competitionId: string }) => f.competitionId === "PL")).toBe(true);
    await request(app).get("/api/fixtures?competition=NOPE").expect(404);
  });

  it("rejects prediction without device header", async () => {
    await request(app)
      .post("/api/fixtures/fx-upcoming/predictions")
      .send({ homeScore: 1, awayScore: 0 })
      .expect(400);
  });

  it("rejects malformed device header", async () => {
    await request(app)
      .post("/api/fixtures/fx-upcoming/predictions")
      .set("X-Device-Id", "not-a-uuid")
      .send({ homeScore: 1, awayScore: 0 })
      .expect(400);
  });

  it("creates then updates a prediction until kickoff", async () => {
    const create = await request(app)
      .post("/api/fixtures/fx-upcoming/predictions")
      .set("X-Device-Id", OTHER_DEVICE)
      .send({ homeScore: 2, awayScore: 1 })
      .expect(200);
    expect(create.body.data.created).toBe(true);
    expect(create.body.data.prediction.homeScore).toBe(2);

    const update = await request(app)
      .post("/api/fixtures/fx-upcoming/predictions")
      .set("X-Device-Id", OTHER_DEVICE)
      .send({ homeScore: 0, awayScore: 0 })
      .expect(200);
    expect(update.body.data.created).toBe(false);
    expect(update.body.data.prediction.homeScore).toBe(0);
    expect(update.body.data.prediction.points).toBeNull();

    // visible on fixture list for that device
    const list = await request(app)
      .get("/api/fixtures?competition=PL")
      .set("X-Device-Id", OTHER_DEVICE)
      .expect(200);
    const fx = list.body.data.find((f: { id: string }) => f.id === "fx-upcoming");
    expect(fx.prediction).toEqual({ homeScore: 0, awayScore: 0, points: null });
  });

  it("404s prediction on unknown fixture", async () => {
    await request(app)
      .post("/api/fixtures/fx-does-not-exist/predictions")
      .set("X-Device-Id", OTHER_DEVICE)
      .send({ homeScore: 1, awayScore: 1 })
      .expect(404);
  });

  it("locks prediction after kickoff", async () => {
    const res = await request(app)
      .post("/api/fixtures/fx-past/predictions")
      .set("X-Device-Id", OTHER_DEVICE)
      .send({ homeScore: 1, awayScore: 1 });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/kickoff/i);
  });

  it("validates score bounds", async () => {
    await request(app)
      .post("/api/fixtures/fx-upcoming/predictions")
      .set("X-Device-Id", OTHER_DEVICE)
      .send({ homeScore: 99, awayScore: -1 })
      .expect(400);
  });

  it("returns an Oracle suggest payload without Gemini (fallback modifiers)", async () => {
    const res = await request(app)
      .post("/api/fixtures/fx-upcoming/suggest")
      .expect(200);
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

  it("404s suggest for unknown fixture", async () => {
    await request(app).post("/api/fixtures/nope/suggest").expect(404);
  });
});

describe("GET /api/stats", () => {
  it("requires a device id", async () => {
    const { buildApp } = await import("../src/app");
    await request(buildApp()).get("/api/stats").expect(400);
  });

  it("sums points, hit rate, and streaks from finished predictions", async () => {
    const { buildApp } = await import("../src/app");
    const res = await request(buildApp())
      .get("/api/stats")
      .set("X-Device-Id", DEVICE)
      .expect(200);

    const data = res.body.data;
    expect(data.fixturesScored).toBe(3);
    expect(data.points).toEqual({ total: 4, exact: 1, outcome: 2, wrong: 1 });
    expect(data.hitRate).toBeCloseTo(2 / 3, 5);
    // kickoff order: wrong(0), outcome(1), exact(3) → trailing streak 2, max 2
    expect(data.currentStreak).toBe(2);
    expect(data.maxStreak).toBe(2);
    expect(data.byCompetition[0].competitionId).toBe("PL");
    expect(data.byCompetition[0].points).toBe(4);
    expect(data.recent.length).toBe(3);
  });
});

describe("GET /api/competitions/:id/standings", () => {
  it("computes league table order from finished fixtures", async () => {
    const { buildApp } = await import("../src/app");
    const res = await request(buildApp()).get("/api/competitions/PL/standings").expect(200);
    const { applicable, rows } = res.body.data;
    expect(applicable).toBe(true);

    // Finished fixtures seeded:
    // Alpha 0-2 Delta, Beta 3-1 Gamma, Gamma 1-1 Delta
    // Alpha: 0 pts; Beta: 3; Gamma: 0+1=1; Delta: 3+1=4
    const byTeam = new Map(rows.map((r: { team: { name: string } }) => [r.team.name, r]));
    expect(byTeam.get("Delta Rovers").points).toBe(4);
    expect(byTeam.get("Beta United").points).toBe(3);
    expect(byTeam.get("Gamma City").points).toBe(1);
    expect(byTeam.get("Alpha FC").points).toBe(0);
    expect(rows[0].team.name).toBe("Delta Rovers");
    expect(rows[0].position).toBe(1);
    expect(rows[0].played).toBe(2);
    expect(byTeam.get("Delta Rovers").goalDifference).toBe(2); // 0-2 win (+2) + 1-1 (0)
  });

  it("marks cup competitions as not applicable", async () => {
    const { buildApp } = await import("../src/app");
    const res = await request(buildApp()).get("/api/competitions/CL/standings").expect(200);
    expect(res.body.data.applicable).toBe(false);
  });

  it("404s unknown competition", async () => {
    const { buildApp } = await import("../src/app");
    await request(buildApp()).get("/api/competitions/ZZZ/standings").expect(404);
  });
});
