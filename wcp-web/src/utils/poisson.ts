import type { Team } from "./teams";

export type MatchStage = "GROUP" | "R32" | "R16" | "QF" | "SF" | "FINAL" | "THIRD_PLACE";
export type MatchStatus = "PENDING" | "SIMULATING" | "COMPLETED";

export interface MatchEvent {
  type: "GOAL" | "YELLOW" | "RED" | "INJURY" | "MISS";
  minute: number;
  teamId: string;
  playerName?: string;
  detail?: string;
}

export interface Match {
  id: string;
  stage: MatchStage;
  day: number;
  kickoffTime: string;
  groupName?: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number | null;
  awayScore: number | null;
  status: MatchStatus;
  timeline: MatchEvent[];
  aiSummary: string | null;
  winnerId?: string;
  decidedBy?: "REGULAR" | "EXTRA_TIME" | "PENALTIES";
  penaltyScores?: { home: number; away: number };
  homeAttackModifier?: number;
  homeDefenseModifier?: number;
  awayAttackModifier?: number;
  awayDefenseModifier?: number;
  aiTacticalAnalysis?: string | null;
}

export interface SimulationResult {
  homeScore: number;
  awayScore: number;
  timeline: MatchEvent[];
  decidedBy: "REGULAR" | "EXTRA_TIME" | "PENALTIES";
  winnerId: string;
  penaltyScores?: { home: number; away: number };
}

// Global averages computed across the 48 teams
export const FIFA_P_AVG = 1530;
export const FIFA_P_MAX = 1860;
export const FIFA_P_MIN = 1200;

// Since squad values are heavily skewed, we use log scale for normalization
export const LOG_VAL_AVG = Math.log(250 + 1); // Avg around 250M
export const LOG_VAL_MAX = Math.log(1300 + 1); // Max 1300M (England)
export const LOG_VAL_MIN = Math.log(10 + 1);   // Min 10M (Curaçao)

export interface TeamRatings {
  attack: number;
  defense: number;
  quality: number;
}

/**
 * Calculates Attack and Defense ratings based on normalized FIFA points and Squad Values.
 */
export function getTeamRatings(team: Team): TeamRatings {
  // 1. FIFA ranking strength (-0.5 to 0.5 roughly)
  const fifaStrength = (team.fifaPoints - FIFA_P_AVG) / (FIFA_P_MAX - FIFA_P_MIN);

  // 2. Squad value strength log-normalized (-0.5 to 0.5 roughly)
  const logVal = Math.log(team.squadValue + 1);
  const valStrength = (logVal - LOG_VAL_AVG) / (LOG_VAL_MAX - LOG_VAL_MIN);

  // 3. Combine: 60% FIFA history + 40% Squad Talent
  const quality = 0.6 * fifaStrength + 0.4 * valStrength;

  // 4. Map to Attack (higher is better) and Defense (lower is better/stronger)
  // Base Attack is 1.0, quality adjusts it by up to 0.5.
  // Base Defense is 1.0, quality adjusts it by up to 0.4.
  const attack = Math.max(0.5, Math.min(2.0, 1.0 + quality * 0.6));
  const defense = Math.max(0.4, Math.min(1.8, 1.0 - quality * 0.45));

  return { attack, defense, quality };
}

/**
 * Knuth's algorithm for drawing a Poisson random variable.
 */
function drawPoisson(lambda: number): number {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1.0;
  do {
    k++;
    p *= Math.random();
  } while (p > L);
  return k - 1;
}

/**
 * Simulates a single football match between two teams.
 * Supports group stage (can end in draw) and knockout stage (requires a winner via ET or Penalties).
 */
export function simulateMatch(
  homeTeam: Team,
  awayTeam: Team,
  isKnockout: boolean
): SimulationResult {
  const homeRatings = getTeamRatings(homeTeam);
  const awayRatings = getTeamRatings(awayTeam);

  const BASE_GOALS = 1.35; // Average goals scored per team

  // Expected goals (lambda)
  const lambdaHome = BASE_GOALS * homeRatings.attack * awayRatings.defense;
  const lambdaAway = BASE_GOALS * awayRatings.attack * homeRatings.defense;

  // Draw goals
  let homeScore = drawPoisson(lambdaHome);
  let awayScore = drawPoisson(lambdaAway);

  let decidedBy: "REGULAR" | "EXTRA_TIME" | "PENALTIES" = "REGULAR";
  let timeline: MatchEvent[] = [];
  let winnerId = "";
  let penaltyScores: { home: number; away: number } | undefined;

  // Generate regular 90 min events
  timeline = generateTimeline(homeTeam, awayTeam, homeScore, awayScore, 1, 90);

  if (isKnockout && homeScore === awayScore) {
    // 1. Simulate Extra Time (30 mins)
    decidedBy = "EXTRA_TIME";
    // Extra time goals are Poisson with scaled down lambda (1/3 of regular time)
    const etHomeScore = drawPoisson(lambdaHome * 0.33);
    const etAwayScore = drawPoisson(lambdaAway * 0.33);

    const etTimeline = generateTimeline(
      homeTeam,
      awayTeam,
      etHomeScore,
      etAwayScore,
      91,
      120
    );
    timeline = [...timeline, ...etTimeline];

    homeScore += etHomeScore;
    awayScore += etAwayScore;

    // 2. Simulate Penalty Shootout if still drawn
    if (homeScore === awayScore) {
      decidedBy = "PENALTIES";
      const shootout = simulatePenalties(homeTeam, awayTeam);
      timeline = [...timeline, ...shootout.events];
      penaltyScores = shootout.score;
      winnerId = shootout.winnerId;
    } else {
      winnerId = homeScore > awayScore ? homeTeam.id : awayTeam.id;
    }
  } else {
    if (homeScore > awayScore) {
      winnerId = homeTeam.id;
    } else if (awayScore > homeScore) {
      winnerId = awayTeam.id;
    } else {
      winnerId = ""; // Draw (Group Stage only)
    }
  }

  // Sort timeline by minute, keeping goals/cards ordered
  timeline.sort((a, b) => a.minute - b.minute);

  return {
    homeScore,
    awayScore,
    timeline,
    decidedBy,
    winnerId,
    penaltyScores,
  };
}

/**
 * Generates match events (goals, cards, near misses) for a given time window.
 */
function generateTimeline(
  homeTeam: Team,
  awayTeam: Team,
  homeGoals: number,
  awayGoals: number,
  startMin: number,
  endMin: number
): MatchEvent[] {
  const events: MatchEvent[] = [];

  // 1. Goal Events
  const addGoalEvents = (team: Team, count: number) => {
    for (let i = 0; i < count; i++) {
      // Pick a random minute in the window
      const minute = Math.floor(Math.random() * (endMin - startMin + 1)) + startMin;
      // Pick scorer (star player 75% of time, generic squad player 25%)
      let scorer = "Squad Player";
      if (Math.random() < 0.75 && team.keyPlayers.length > 0) {
        const idx = Math.floor(Math.random() * team.keyPlayers.length);
        scorer = team.keyPlayers[idx];
      }
      
      const goalTypes = ["Clinical finish", "Power header", "Stunning volley", "Tap-in", "Solo run", "Curling effort"];
      const detail = goalTypes[Math.floor(Math.random() * goalTypes.length)];

      events.push({
        type: "GOAL",
        minute,
        teamId: team.id,
        playerName: scorer,
        detail,
      });
    }
  };

  addGoalEvents(homeTeam, homeGoals);
  addGoalEvents(awayTeam, awayGoals);

  // 2. Generate Random Cards/Misses/Injuries
  // We determine event rate based on match intensity (goals) and randomness
  const totalGoals = homeGoals + awayGoals;
  const numYellows = drawPoisson(1.8 + totalGoals * 0.1); // Average 2 yellows per match
  const numReds = Math.random() < 0.05 ? 1 : 0;          // 5% chance of a red card
  const numMisses = drawPoisson(3.0);                    // Average 3 near misses
  const numInjuries = Math.random() < 0.15 ? 1 : 0;      // 15% chance of an injury stoppage

  const getRandomPlayer = (team: Team): string => {
    // If not a key player, pick a standard player name (derived from key players list for team consistency)
    if (Math.random() < 0.4 && team.keyPlayers.length > 0) {
      return team.keyPlayers[Math.floor(Math.random() * team.keyPlayers.length)];
    }
    const genericNames: Record<string, string[]> = {
      mexico: ["Ochoa", "Sánchez", "Montes", "Gallardo", "Chávez"],
      south_korea: ["Hwang", "Cho", "Seol", "Jung", "Lee"],
      czech_republic: ["Barák", "Provod", "Coufal", "Holeš", "Staněk"],
      south_africa: ["Williams", "Mudau", "Modiba", "Mvala", "Tau"],
      france: ["Maignan", "Hernández", "Saliba", "Upamecano", "Dembele"],
      argentina: ["Martínez", "Molina", "Romero", "De Paul", "Fernández"],
      brazil: ["Alisson", "Marquinhos", "Danilo", "Paquetá", "Martinelli"],
      england: ["Pickford", "Walker", "Stones", "Rice", "Foden"],
      spain: ["Simon", "Carvajal", "Le Normand", "Ruiz", "Williams"],
      portugal: ["Costa", "Dias", "Cancelo", "Neves", "Leao"],
    };
    const pool = genericNames[team.id] || ["Defender", "Midfielder", "Forward", "Goalkeeper"];
    return pool[Math.floor(Math.random() * pool.length)];
  };

  // Add Yellow Cards
  for (let i = 0; i < numYellows; i++) {
    const team = Math.random() < 0.5 ? homeTeam : awayTeam;
    const minute = Math.floor(Math.random() * (endMin - startMin + 1)) + startMin;
    events.push({
      type: "YELLOW",
      minute,
      teamId: team.id,
      playerName: getRandomPlayer(team),
      detail: "Tactical foul halting a counter-attack",
    });
  }

  // Add Red Cards
  for (let i = 0; i < numReds; i++) {
    const team = Math.random() < 0.5 ? homeTeam : awayTeam;
    const minute = Math.floor(Math.random() * (endMin - startMin + 1)) + startMin;
    events.push({
      type: "RED",
      minute,
      teamId: team.id,
      playerName: getRandomPlayer(team),
      detail: "Second yellow or a dangerous high boot",
    });
  }

  // Add Misses (saves, posts, headers wide)
  for (let i = 0; i < numMisses; i++) {
    const team = Math.random() < 0.5 ? homeTeam : awayTeam;
    const minute = Math.floor(Math.random() * (endMin - startMin + 1)) + startMin;
    const missDetails = [
      `Fires over the crossbar from close range`,
      `Header hits the post! Unbelievable escape`,
      `Stunning finger-tip save by the keeper`,
      `Strikes it wide after a brilliant solo dribble`,
    ];
    events.push({
      type: "MISS",
      minute,
      teamId: team.id,
      playerName: getRandomPlayer(team),
      detail: missDetails[Math.floor(Math.random() * missDetails.length)],
    });
  }

  // Add Injuries
  for (let i = 0; i < numInjuries; i++) {
    const team = Math.random() < 0.5 ? homeTeam : awayTeam;
    const minute = Math.floor(Math.random() * (endMin - startMin + 1)) + startMin;
    events.push({
      type: "INJURY",
      minute,
      teamId: team.id,
      playerName: getRandomPlayer(team),
      detail: "Receiving medical attention on the pitch",
    });
  }

  return events;
}

/**
 * Simulates a penalty shootout round-by-round until there is a winner.
 */
function simulatePenalties(
  homeTeam: Team,
  awayTeam: Team
): { events: MatchEvent[]; score: { home: number; away: number }; winnerId: string } {
  const events: MatchEvent[] = [];
  let homePenState = 0;
  let awayPenState = 0;

  let homeScored = 0;
  let awayScored = 0;

  // Base convert rate is 75%, modified slightly by team quality rating
  const homeRatings = getTeamRatings(homeTeam);
  const awayRatings = getTeamRatings(awayTeam);
  const homeRate = 0.75 + homeRatings.quality * 0.05;
  const awayRate = 0.75 + awayRatings.quality * 0.05;

  const simulateKick = (rate: number): boolean => Math.random() < rate;

  // Round 1 to 5
  for (let round = 1; round <= 5; round++) {
    // Home team kick
    const homeIn = simulateKick(homeRate);
    homePenState++;
    if (homeIn) homeScored++;
    events.push({
      type: homeIn ? "GOAL" : "MISS",
      minute: 120 + homePenState,
      teamId: homeTeam.id,
      playerName: `Penalty Taker #${round}`,
      detail: homeIn ? "⚽ Shootout Penalty Scored!" : "❌ Shootout Penalty Missed/Saved!",
    });

    // Check if away team can mathematically catch up
    if (homeScored > awayScored + (5 - awayPenState)) break;
    if (awayScored > homeScored + (5 - homePenState)) break;

    // Away team kick
    const awayIn = simulateKick(awayRate);
    awayPenState++;
    if (awayIn) awayScored++;
    events.push({
      type: awayIn ? "GOAL" : "MISS",
      minute: 120 + awayPenState + 5, // Offset to keep sorting clean
      teamId: awayTeam.id,
      playerName: `Penalty Taker #${round}`,
      detail: awayIn ? "⚽ Shootout Penalty Scored!" : "❌ Shootout Penalty Missed/Saved!",
    });

    if (homeScored > awayScored + (5 - awayPenState)) break;
    if (awayScored > homeScored + (5 - homePenState)) break;
  }

  // Sudden Death (if tied after 5 kicks)
  let suddenDeathRound = 6;
  while (homeScored === awayScored) {
    const homeIn = simulateKick(homeRate);
    if (homeIn) homeScored++;
    events.push({
      type: homeIn ? "GOAL" : "MISS",
      minute: 130 + suddenDeathRound,
      teamId: homeTeam.id,
      playerName: `Sudden Death Taker #${suddenDeathRound - 5}`,
      detail: homeIn ? "⚽ Sudden Death Penalty Scored!" : "❌ Sudden Death Penalty Missed/Saved!",
    });

    const awayIn = simulateKick(awayRate);
    if (awayIn) awayScored++;
    events.push({
      type: awayIn ? "GOAL" : "MISS",
      minute: 140 + suddenDeathRound,
      teamId: awayTeam.id,
      playerName: `Sudden Death Taker #${suddenDeathRound - 5}`,
      detail: awayIn ? "⚽ Sudden Death Penalty Scored!" : "❌ Sudden Death Penalty Missed/Saved!",
    });

    suddenDeathRound++;
  }

  const winnerId = homeScored > awayScored ? homeTeam.id : awayTeam.id;

  return {
    events,
    score: { home: homeScored, away: awayScored },
    winnerId,
  };
}
