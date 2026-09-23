import { describe, it, expect } from "vitest";
import {
  drawPoisson,
  getTeamRatings,
  computeLambdas,
  simulateScoreline,
  penaltyConversionRate,
  simulateShootout,
} from "./poisson";

describe("drawPoisson", () => {
  it("returns 0 for non-positive lambda", () => {
    expect(drawPoisson(0)).toBe(0);
    expect(drawPoisson(-1)).toBe(0);
  });

  it("produces non-negative integers", () => {
    for (let i = 0; i < 1000; i++) {
      const k = drawPoisson(2.5);
      expect(Number.isInteger(k)).toBe(true);
      expect(k).toBeGreaterThanOrEqual(0);
    }
  });

  it("has empirical mean close to lambda", () => {
    const lambda = 2;
    const n = 20000;
    let sum = 0;
    for (let i = 0; i < n; i++) sum += drawPoisson(lambda);
    const mean = sum / n;
    expect(mean).toBeGreaterThan(lambda - 0.15);
    expect(mean).toBeLessThan(lambda + 0.15);
  });

  it("uses injected rng deterministically", () => {
    // rng returning 0 immediately: p = 1*0 = 0, loop exits when p <= L → k=1 → returns 0
    expect(drawPoisson(1, () => 0)).toBe(0);
  });
});

describe("getTeamRatings", () => {
  it("gives stronger teams higher attack and lower defense factor", () => {
    const strong = getTeamRatings({ fifaPoints: 1850, squadValue: 1200 });
    const weak = getTeamRatings({ fifaPoints: 1200, squadValue: 20 });
    expect(strong.quality).toBeGreaterThan(weak.quality);
    expect(strong.attack).toBeGreaterThan(weak.attack);
    expect(strong.defense).toBeLessThan(weak.defense);
  });

  it("clamps ratings into safe bounds", () => {
    const extreme = getTeamRatings({ fifaPoints: 99999, squadValue: 999999 });
    expect(extreme.attack).toBeLessThanOrEqual(2.0);
    expect(extreme.defense).toBeGreaterThanOrEqual(0.4);
  });
});

describe("computeLambdas", () => {
  const home = getTeamRatings({ fifaPoints: 1530, squadValue: 250 });
  const away = getTeamRatings({ fifaPoints: 1530, squadValue: 250 });

  it("raises home lambda when home attack modifier increases", () => {
    const base = computeLambdas(home, away);
    const boosted = computeLambdas(home, away, { homeAttackModifier: 1.2 });
    expect(boosted.lambdaHome).toBeCloseTo(base.lambdaHome * 1.2, 5);
    expect(boosted.lambdaAway).toBeCloseTo(base.lambdaAway, 5);
  });

  it("defaults modifiers to 1.0", () => {
    const base = computeLambdas(home, away);
    const none = computeLambdas(home, away, {});
    expect(none.lambdaHome).toBeCloseTo(base.lambdaHome, 10);
  });
});

describe("simulateScoreline", () => {
  it("returns non-negative integer scores", () => {
    const { homeScore, awayScore } = simulateScoreline(1.5, 1.2);
    expect(Number.isInteger(homeScore)).toBe(true);
    expect(Number.isInteger(awayScore)).toBe(true);
    expect(homeScore).toBeGreaterThanOrEqual(0);
    expect(awayScore).toBeGreaterThanOrEqual(0);
  });
});

describe("penaltyConversionRate", () => {
  it("sits in a plausible band around 75%", () => {
    expect(penaltyConversionRate(0)).toBeCloseTo(0.75);
    expect(penaltyConversionRate(1)).toBeCloseTo(0.8);
    expect(penaltyConversionRate(-1)).toBeCloseTo(0.7);
  });
});

describe("simulateShootout", () => {
  it("always produces a winner", () => {
    for (let i = 0; i < 200; i++) {
      const result = simulateShootout(0.75, 0.75);
      expect(result.homeScored).not.toBe(result.awayScored);
      expect(["home", "away"]).toContain(result.winnerSide);
    }
  });

  it("stops regulation early when remaining kicks cannot save a side", () => {
    // home always scores, away never → ends 3-0 after 6 kicks
    // (away's 2 remaining kicks could score at most 2, cannot equalize)
    const result = simulateShootout(1, 0);
    expect(result.awayScored).toBe(0);
    expect(result.homeScored).toBe(3);
    expect(result.kicks).toHaveLength(6);
    expect(result.kicks.every((k) => !k.suddenDeath)).toBe(true);
    expect(result.winnerSide).toBe("home");
  });

  it("alternates home then away within each round", () => {
    const result = simulateShootout(0.7, 0.7);
    const regulation = result.kicks.filter((k) => !k.suddenDeath);
    for (let i = 0; i + 1 < regulation.length; i += 2) {
      expect(regulation[i].side).toBe("home");
      expect(regulation[i + 1]?.side ?? "away").toBe("away");
    }
  });

  it("goes to sudden death when perfectly matched conversion always happens", () => {
    // Both always score → level after 5 each → sudden death until rng diverges.
    // With deterministic alternating rng both stay level forever would hang;
    // use a rng sequence that eventually misses for away.
    let calls = 0;
    const rng = () => {
      calls++;
      // first 10 kicks (5 rounds both) always score (rng 0.5 < rate 1)
      // then away starts missing: simulate by returning values relative to rate 0.5
      return calls <= 10 ? 0.5 : calls % 2 === 0 ? 0.6 : 0.4;
    };
    const result = simulateShootout(0.5, 0.5, rng);
    expect(result.kicks.some((k) => k.suddenDeath)).toBe(true);
    expect(result.homeScored).not.toBe(result.awayScored);
  });
});
