import { describe, it, expect } from "vitest";
import { matchRatings, normalizeName } from "../src/scripts/backfill-ratings";

describe("normalizeName", () => {
  it("lowercases, trims, and strips diacritics", () => {
    expect(normalizeName("Türkiye")).toBe("turkiye");
    expect(normalizeName("  Côte d'Ivoire ")).toBe("cote d'ivoire");
    expect(normalizeName("MEXICO")).toBe("mexico");
  });
});

describe("matchRatings", () => {
  const legacy = [
    { id: "brazil", name: "Brazil", code: "BRA", fifaPoints: 1800, squadValue: 900 },
    { id: "south_korea", name: "South Korea", code: "KOR", fifaPoints: 1560, squadValue: 180 },
    { id: "germany", name: "Germany", code: "GER", fifaPoints: 1650, squadValue: 800 },
  ];

  it("matches by name case-insensitively", () => {
    const teams = [{ id: "764", name: "Brazil", tla: "BRA" }];
    const { updates, unmatchedLegacy } = matchRatings(legacy, teams);
    expect(updates).toEqual([{ teamId: "764", fifaPoints: 1800, squadValue: 900 }]);
    expect(unmatchedLegacy).toEqual(["South Korea", "Germany"]);
  });

  it("falls back to TLA/code match", () => {
    const teams = [
      { id: "764", name: "Brazil National Team", tla: "BRA" },
      { id: "771", name: "Korea Republic", tla: "KOR" },
    ];
    const { updates } = matchRatings(legacy, teams);
    expect(updates.find((u) => u.teamId === "764")?.fifaPoints).toBe(1800);
    expect(updates.find((u) => u.teamId === "771")?.fifaPoints).toBe(1560);
  });

  it("never assigns two legacy teams to the same provider team", () => {
    const teams = [{ id: "764", name: "Brazil", tla: "BRA" }];
    const duplicate = [...legacy, { id: "brazil2", name: "brazil", code: "BR2", fifaPoints: 1, squadValue: 1 }];
    const { updates } = matchRatings(duplicate, teams);
    expect(updates).toHaveLength(1);
  });
});
