export interface RatingsInput {
  fifaPoints: number;
  squadValue: number;
}

export interface TeamRatings {
  attack: number;
  defense: number;
  quality: number;
}

export interface MatchModifiers {
  homeAttackModifier: number;
  homeDefenseModifier: number;
  awayAttackModifier: number;
  awayDefenseModifier: number;
}

// Global averages computed across the 48 World Cup teams
const FIFA_P_AVG = 1530;
const FIFA_P_MAX = 1860;
const FIFA_P_MIN = 1200;

const LOG_VAL_AVG = Math.log(250 + 1);
const LOG_VAL_MAX = Math.log(1300 + 1);
const LOG_VAL_MIN = Math.log(10 + 1);

export const BASE_GOALS = 1.35;

/**
 * Calculates attack/defense ratings from normalized FIFA points and squad value.
 * 60% FIFA history + 40% log squad talent.
 */
export function getTeamRatings(team: RatingsInput): TeamRatings {
  const fifaStrength = (team.fifaPoints - FIFA_P_AVG) / (FIFA_P_MAX - FIFA_P_MIN);
  const logVal = Math.log(team.squadValue + 1);
  const valStrength = (logVal - LOG_VAL_AVG) / (LOG_VAL_MAX - LOG_VAL_MIN);

  const quality = 0.6 * fifaStrength + 0.4 * valStrength;
  const attack = Math.max(0.5, Math.min(2.0, 1.0 + quality * 0.6));
  const defense = Math.max(0.4, Math.min(1.8, 1.0 - quality * 0.45));

  return { attack, defense, quality };
}

/**
 * Knuth's algorithm for drawing a Poisson random variable.
 * `rng` is injectable for deterministic tests.
 */
export function drawPoisson(lambda: number, rng: () => number = Math.random): number {
  if (lambda <= 0) return 0;
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1.0;
  do {
    k++;
    p *= rng();
  } while (p > L);
  return k - 1;
}

/**
 * Expected goals for both sides from team ratings and optional AI modifiers.
 */
export function computeLambdas(
  home: TeamRatings,
  away: TeamRatings,
  modifiers?: Partial<MatchModifiers>
): { lambdaHome: number; lambdaAway: number } {
  const homeAttackMod = modifiers?.homeAttackModifier ?? 1.0;
  const homeDefenseMod = modifiers?.homeDefenseModifier ?? 1.0;
  const awayAttackMod = modifiers?.awayAttackModifier ?? 1.0;
  const awayDefenseMod = modifiers?.awayDefenseModifier ?? 1.0;

  return {
    lambdaHome: BASE_GOALS * (home.attack * homeAttackMod) * (away.defense * awayDefenseMod),
    lambdaAway: BASE_GOALS * (away.attack * awayAttackMod) * (home.defense * homeDefenseMod),
  };
}

export function simulateScoreline(
  lambdaHome: number,
  lambdaAway: number,
  rng: () => number = Math.random
): { homeScore: number; awayScore: number } {
  return {
    homeScore: drawPoisson(lambdaHome, rng),
    awayScore: drawPoisson(lambdaAway, rng),
  };
}

/**
 * Penalty conversion rate derived from team quality.
 */
export function penaltyConversionRate(quality: number): number {
  return 0.75 + quality * 0.05;
}

export interface ShootoutKick {
  side: "home" | "away";
  scored: boolean;
  /** 1-5 for the regulation rounds, 6+ for sudden death rounds */
  round: number;
  suddenDeath: boolean;
}

export interface ShootoutResult {
  kicks: ShootoutKick[];
  homeScored: number;
  awayScored: number;
  winnerSide: "home" | "away";
}

/**
 * Simulates a penalty shootout: 5 rounds with mathematically correct
 * early-stop checks, then sudden death until a side leads.
 */
export function simulateShootout(
  homeRate: number,
  awayRate: number,
  rng: () => number = Math.random
): ShootoutResult {
  const kicks: ShootoutKick[] = [];
  let homeScored = 0;
  let awayScored = 0;
  let homeTaken = 0;
  let awayTaken = 0;

  for (let round = 1; round <= 5; round++) {
    const homeIn = rng() < homeRate;
    homeTaken++;
    if (homeIn) homeScored++;
    kicks.push({ side: "home", scored: homeIn, round, suddenDeath: false });

    if (homeScored > awayScored + (5 - awayTaken)) break;
    if (awayScored > homeScored + (5 - homeTaken)) break;

    const awayIn = rng() < awayRate;
    awayTaken++;
    if (awayIn) awayScored++;
    kicks.push({ side: "away", scored: awayIn, round, suddenDeath: false });

    if (homeScored > awayScored + (5 - awayTaken)) break;
    if (awayScored > homeScored + (5 - homeTaken)) break;
  }

  let suddenDeathRound = 6;
  while (homeScored === awayScored) {
    const homeIn = rng() < homeRate;
    if (homeIn) homeScored++;
    kicks.push({ side: "home", scored: homeIn, round: suddenDeathRound, suddenDeath: true });

    const awayIn = rng() < awayRate;
    if (awayIn) awayScored++;
    kicks.push({ side: "away", scored: awayIn, round: suddenDeathRound, suddenDeath: true });

    suddenDeathRound++;
  }

  return {
    kicks,
    homeScored,
    awayScored,
    winnerSide: homeScored > awayScored ? "home" : "away",
  };
}
