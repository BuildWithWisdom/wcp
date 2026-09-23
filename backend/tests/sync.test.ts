import { describe, it, expect } from "vitest";
import { createDatabase } from "../src/db";
import * as schema from "../src/db/schema";
import { SyncService } from "../src/services/sync.service";
import { FootballDataAdapter, type CompetitionSyncData } from "../src/services/football-data.adapter";

function fakeAdapter(data: CompetitionSyncData | null, configured = true): FootballDataAdapter {
  return {
    isConfigured: configured,
    fetchCompetitionMatches: async () => {
      if (!data) throw new Error("fetch failed");
      return data;
    },
  } as unknown as FootballDataAdapter;
}

const sampleData = (): CompetitionSyncData => ({
  teams: [
    { id: "61", name: "Chelsea FC", tla: "CHE", crestUrl: null, primaryColor: null, secondaryColor: null },
    { id: "66", name: "Manchester United", tla: "MUN", crestUrl: null, primaryColor: null, secondaryColor: null },
  ],
  fixtures: [
    {
      id: "1001",
      competitionId: "PL",
      homeTeamId: "61",
      awayTeamId: "66",
      kickoffAt: "2026-09-20T15:00:00.000Z",
      status: "TIMED",
      stage: "REGULAR_SEASON",
      matchday: 5,
      homeScore: null,
      awayScore: null,
      updatedAt: new Date().toISOString(),
    },
  ],
});

describe("SyncService", () => {
  it("upserts teams and fixtures from adapter data", async () => {
    const db = createDatabase(":memory:");
    const sync = new SyncService(fakeAdapter(sampleData()), db, 0);

    const result = await sync.syncCompetition("PL", { force: true });
    expect(result.error).toBeUndefined();
    expect(result.teams).toBe(2);
    expect(result.fixtures).toBe(1);

    expect(db.select().from(schema.teams).all()).toHaveLength(2);
    const fixtures = db.select().from(schema.fixtures).all();
    expect(fixtures).toHaveLength(1);
    expect(fixtures[0].competitionId).toBe("PL");
  });

  it("updates scores when a fixture is re-synced", async () => {
    const db = createDatabase(":memory:");
    const sync = new SyncService(fakeAdapter(sampleData()), db, 0);
    await sync.syncCompetition("PL", { force: true });

    const finished = sampleData();
    finished.fixtures[0].status = "FINISHED";
    finished.fixtures[0].homeScore = 2;
    finished.fixtures[0].awayScore = 1;
    const sync2 = new SyncService(fakeAdapter(finished), db, 0);
    await sync2.syncCompetition("PL", { force: true });

    const fixtures = db.select().from(schema.fixtures).all();
    expect(fixtures).toHaveLength(1);
    expect(fixtures[0].status).toBe("FINISHED");
    expect(fixtures[0].homeScore).toBe(2);
    expect(fixtures[0].awayScore).toBe(1);
    expect(db.select().from(schema.teams).all()).toHaveLength(2);
  });

  it("skips fresh competitions until TTL expires", async () => {
    const db = createDatabase(":memory:");
    const sync = new SyncService(fakeAdapter(sampleData()), db, 60_000);

    await sync.syncCompetition("PL", { force: true });
    expect(sync.isFresh("PL")).toBe(true);

    const second = await sync.syncCompetition("PL");
    expect(second.skipped).toBe(true);
  });

  it("reports skipped with no API key configured", async () => {
    const db = createDatabase(":memory:");
    const sync = new SyncService(fakeAdapter(sampleData(), false), db, 0);
    const result = await sync.syncCompetition("PL", { force: true });
    expect(result.skipped).toBe(true);
    expect(result.error).toBe("no API key");
  });

  it("returns error result when adapter fetch fails", async () => {
    const db = createDatabase(":memory:");
    const sync = new SyncService(fakeAdapter(null), db, 0);
    const result = await sync.syncCompetition("PL", { force: true });
    expect(result.error).toBe("fetch failed");
    expect(db.select().from(schema.fixtures).all()).toHaveLength(0);
  });

  it("reads seeded competition ids", () => {
    const db = createDatabase(":memory:");
    const sync = new SyncService(fakeAdapter(sampleData()), db, 0);
    expect(sync.listCompetitionIds()).toContain("PL");
    expect(sync.getCompetitions().find((c) => c.id === "CL")?.name).toBe("UEFA Champions League");
  });
});
