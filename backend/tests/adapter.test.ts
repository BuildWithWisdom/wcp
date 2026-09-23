import { describe, it, expect } from "vitest";
import { mapMatches, mapStatus } from "../src/services/football-data.adapter";

describe("mapStatus", () => {
  it("maps known provider statuses", () => {
    expect(mapStatus("SCHEDULED")).toBe("SCHEDULED");
    expect(mapStatus("TIMED")).toBe("TIMED");
    expect(mapStatus("IN_PLAY")).toBe("IN_PLAY");
    expect(mapStatus("PAUSED")).toBe("PAUSED");
    expect(mapStatus("FINISHED")).toBe("FINISHED");
    expect(mapStatus("POSTPONED")).toBe("POSTPONED");
    expect(mapStatus("SUSPENDED")).toBe("SUSPENDED");
    expect(mapStatus("CANCELLED")).toBe("CANCELLED");
  });

  it("maps AWARDED to FINISHED", () => {
    expect(mapStatus("AWARDED")).toBe("FINISHED");
  });

  it("falls back to SCHEDULED for unknown statuses", () => {
    expect(mapStatus("SOMETHING_NEW")).toBe("SCHEDULED");
  });
});

describe("mapMatches", () => {
  const payload = {
    matches: [
      {
        id: 1001,
        utcDate: "2026-09-20T15:00:00Z",
        status: "TIMED",
        stage: "REGULAR_SEASON",
        matchday: 5,
        homeTeam: { id: 61, name: "Chelsea FC", tla: "CHE", crest: "https://example.com/che.png" },
        awayTeam: { id: 66, name: "Manchester United", tla: "MUN", crest: null },
        score: { fullTime: { home: null, away: null } },
      },
      {
        id: 1002,
        utcDate: "2026-09-13T14:00:00Z",
        status: "FINISHED",
        stage: "REGULAR_SEASON",
        matchday: 4,
        homeTeam: { id: 66, name: "Manchester United FC", tla: "MUN", crest: null },
        awayTeam: { id: 61, name: "Chelsea FC", tla: "CHE", crest: null },
        score: { fullTime: { home: 2, away: 3 } },
      },
    ],
  };

  it("maps fixtures with competition id and kickoff", () => {
    const { fixtures } = mapMatches("PL", payload);
    expect(fixtures).toHaveLength(2);
    expect(fixtures[0]).toMatchObject({
      id: "1001",
      competitionId: "PL",
      homeTeamId: "61",
      awayTeamId: "66",
      status: "TIMED",
      matchday: 5,
      homeScore: null,
      awayScore: null,
    });
    expect(fixtures[0].kickoffAt).toBe("2026-09-20T15:00:00Z");
  });

  it("populates scores only for finished fixtures", () => {
    const { fixtures } = mapMatches("PL", payload);
    expect(fixtures[1].status).toBe("FINISHED");
    expect(fixtures[1].homeScore).toBe(2);
    expect(fixtures[1].awayScore).toBe(3);
    expect(fixtures[0].homeScore).toBeNull();
  });

  it("dedupes teams across matches", () => {
    const { teams } = mapMatches("PL", payload);
    expect(teams).toHaveLength(2);
    const ids = teams.map((t) => t.id).sort();
    expect(ids).toEqual(["61", "66"]);
    const che = teams.find((t) => t.id === "61");
    expect(che).toMatchObject({ name: "Chelsea FC", tla: "CHE", crestUrl: "https://example.com/che.png" });
  });
});
