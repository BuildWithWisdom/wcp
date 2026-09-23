import { describe, it, expect } from "vitest";
import { isPredictionOpen } from "./locks";

describe("isPredictionOpen", () => {
  const kickoff = "2026-09-25T15:00:00.000Z";

  it("is open strictly before kickoff", () => {
    const justBefore = new Date("2026-09-25T14:59:59.999Z");
    expect(isPredictionOpen(kickoff, justBefore)).toBe(true);
  });

  it("is closed at and after kickoff", () => {
    const atKickoff = new Date("2026-09-25T15:00:00.000Z");
    const after = new Date("2026-09-25T15:00:01.000Z");
    expect(isPredictionOpen(kickoff, atKickoff)).toBe(false);
    expect(isPredictionOpen(kickoff, after)).toBe(false);
  });

  it("accepts Date inputs", () => {
    expect(isPredictionOpen(new Date(kickoff), new Date("2026-09-25T14:00:00.000Z"))).toBe(true);
  });

  it("throws on invalid kickoff", () => {
    expect(() => isPredictionOpen("not-a-date", new Date())).toThrow(/Invalid kickoff/);
  });
});
