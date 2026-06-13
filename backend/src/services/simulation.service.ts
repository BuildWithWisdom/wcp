import { Team, MatchEvent, MatchStage } from "./storage.service";

export interface SimulationResult {
  homeScore: number;
  awayScore: number;
  timeline: MatchEvent[];
  decidedBy: "REGULAR" | "EXTRA_TIME" | "PENALTIES";
  winnerId: string;
  penaltyScores?: { home: number; away: number };
  homeAttackModifier?: number;
  homeDefenseModifier?: number;
  awayAttackModifier?: number;
  awayDefenseModifier?: number;
  aiTacticalAnalysis?: string | null;
}

// Global averages computed across the 48 teams
const FIFA_P_AVG = 1530;
const FIFA_P_MAX = 1860;
const FIFA_P_MIN = 1200;

// Log scale variables for squad values
const LOG_VAL_AVG = Math.log(250 + 1);
const LOG_VAL_MAX = Math.log(1300 + 1);
const LOG_VAL_MIN = Math.log(10 + 1);

export interface TeamRatings {
  attack: number;
  defense: number;
  quality: number;
}

export class SimulationService {
  /**
   * Calculates Attack and Defense ratings based on normalized FIFA points and Squad Values.
   */
  getTeamRatings(team: Team): TeamRatings {
    const fifaStrength = (team.fifaPoints - FIFA_P_AVG) / (FIFA_P_MAX - FIFA_P_MIN);
    const logVal = Math.log(team.squadValue + 1);
    const valStrength = (logVal - LOG_VAL_AVG) / (LOG_VAL_MAX - LOG_VAL_MIN);

    // Combine: 60% FIFA history + 40% Squad Talent
    const quality = 0.6 * fifaStrength + 0.4 * valStrength;

    // Base attack/defense factors
    const attack = Math.max(0.5, Math.min(2.0, 1.0 + quality * 0.6));
    const defense = Math.max(0.4, Math.min(1.8, 1.0 - quality * 0.45));

    return { attack, defense, quality };
  }

  /**
   * Knuth's algorithm for drawing a Poisson random variable.
   */
  private drawPoisson(lambda: number): number {
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
   * Simulates a football match.
   */
  simulateMatch(
    homeTeam: Team,
    awayTeam: Team,
    isKnockout: boolean,
    modifiers?: {
      homeAttackModifier: number;
      homeDefenseModifier: number;
      awayAttackModifier: number;
      awayDefenseModifier: number;
      tacticalAnalysis: string;
    }
  ): SimulationResult {
    const homeRatings = this.getTeamRatings(homeTeam);
    const awayRatings = this.getTeamRatings(awayTeam);

    const BASE_GOALS = 1.35; // average goals per team per match

    const homeAttackMod = modifiers?.homeAttackModifier ?? 1.0;
    const homeDefenseMod = modifiers?.homeDefenseModifier ?? 1.0;
    const awayAttackMod = modifiers?.awayAttackModifier ?? 1.0;
    const awayDefenseMod = modifiers?.awayDefenseModifier ?? 1.0;

    const lambdaHome = BASE_GOALS * (homeRatings.attack * homeAttackMod) * (awayRatings.defense * awayDefenseMod);
    const lambdaAway = BASE_GOALS * (awayRatings.attack * awayAttackMod) * (homeRatings.defense * homeDefenseMod);

    let homeScore = this.drawPoisson(lambdaHome);
    let awayScore = this.drawPoisson(lambdaAway);

    let decidedBy: "REGULAR" | "EXTRA_TIME" | "PENALTIES" = "REGULAR";
    let timeline: MatchEvent[] = [];
    let winnerId = "";
    let penaltyScores: { home: number; away: number } | undefined;

    // Regular time events
    timeline = this.generateTimeline(homeTeam, awayTeam, homeScore, awayScore, 1, 90);

    if (isKnockout && homeScore === awayScore) {
      decidedBy = "EXTRA_TIME";
      const etHomeScore = this.drawPoisson(lambdaHome * 0.33);
      const etAwayScore = this.drawPoisson(lambdaAway * 0.33);

      const etTimeline = this.generateTimeline(homeTeam, awayTeam, etHomeScore, etAwayScore, 91, 120);
      timeline = [...timeline, ...etTimeline];

      homeScore += etHomeScore;
      awayScore += etAwayScore;

      if (homeScore === awayScore) {
        decidedBy = "PENALTIES";
        const shootout = this.simulatePenalties(homeTeam, awayTeam);
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

    timeline.sort((a, b) => a.minute - b.minute);

    return {
      homeScore,
      awayScore,
      timeline,
      decidedBy,
      winnerId,
      penaltyScores,
      homeAttackModifier: homeAttackMod,
      homeDefenseModifier: homeDefenseMod,
      awayAttackModifier: awayAttackMod,
      awayDefenseModifier: awayDefenseMod,
      aiTacticalAnalysis: modifiers?.tacticalAnalysis ?? null,
    };
  }

  /**
   * Generates a timeline of goal events and miscellaneous events.
   */
  private generateTimeline(
    homeTeam: Team,
    awayTeam: Team,
    homeGoals: number,
    awayGoals: number,
    startMin: number,
    endMin: number
  ): MatchEvent[] {
    const events: MatchEvent[] = [];

    const addGoalEvents = (team: Team, count: number) => {
      for (let i = 0; i < count; i++) {
        const minute = Math.floor(Math.random() * (endMin - startMin + 1)) + startMin;
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

    const totalGoals = homeGoals + awayGoals;
    const numYellows = this.drawPoisson(1.8 + totalGoals * 0.1);
    const numReds = Math.random() < 0.05 ? 1 : 0;
    const numMisses = this.drawPoisson(3.0);
    const numInjuries = Math.random() < 0.15 ? 1 : 0;

    const getRandomPlayer = (team: Team): string => {
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

    for (let i = 0; i < numMisses; i++) {
      const team = Math.random() < 0.5 ? homeTeam : awayTeam;
      const minute = Math.floor(Math.random() * (endMin - startMin + 1)) + startMin;
      const missDetails = [
        "Fires over the crossbar from close range",
        "Header hits the post! Unbelievable escape",
        "Stunning finger-tip save by the keeper",
        "Strikes it wide after a brilliant solo dribble",
      ];
      events.push({
        type: "MISS",
        minute,
        teamId: team.id,
        playerName: getRandomPlayer(team),
        detail: missDetails[Math.floor(Math.random() * missDetails.length)],
      });
    }

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
   * Simulates penalty kick shootout.
   */
  private simulatePenalties(
    homeTeam: Team,
    awayTeam: Team
  ): { events: MatchEvent[]; score: { home: number; away: number }; winnerId: string } {
    const events: MatchEvent[] = [];
    let homePenState = 0;
    let awayPenState = 0;
    let homeScored = 0;
    let awayScored = 0;

    const homeRatings = this.getTeamRatings(homeTeam);
    const awayRatings = this.getTeamRatings(awayTeam);
    const homeRate = 0.75 + homeRatings.quality * 0.05;
    const awayRate = 0.75 + awayRatings.quality * 0.05;

    const simulateKick = (rate: number): boolean => Math.random() < rate;

    for (let round = 1; round <= 5; round++) {
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

      if (homeScored > awayScored + (5 - awayPenState)) break;
      if (awayScored > homeScored + (5 - homePenState)) break;

      const awayIn = simulateKick(awayRate);
      awayPenState++;
      if (awayIn) awayScored++;
      events.push({
        type: awayIn ? "GOAL" : "MISS",
        minute: 120 + awayPenState + 5,
        teamId: awayTeam.id,
        playerName: `Penalty Taker #${round}`,
        detail: awayIn ? "⚽ Shootout Penalty Scored!" : "❌ Shootout Penalty Missed/Saved!",
      });

      if (homeScored > awayScored + (5 - awayPenState)) break;
      if (awayScored > homeScored + (5 - homePenState)) break;
    }

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

  /**
   * Generates a witty, professional post-match summary based on templates.
   */
  generateWittySummary(home: Team, away: Team, result: SimulationResult): string {
    const goals = result.timeline.filter((event) => event.type === "GOAL");
    const scorersText = goals
      .map((g) => `${g.playerName} (${g.minute}')`)
      .join(", ");

    const winner = result.winnerId === home.id ? home : result.winnerId === away.id ? away : null;
    const loser = winner ? (winner.id === home.id ? away : home) : null;
    const margin = Math.abs(result.homeScore - result.awayScore);

    if (result.homeScore === 0 && result.awayScore === 0) {
      const scorelessTemplates = [
        `A tactical 0-0 gridlock as ${home.name} and ${away.name} cancel each other out.`,
        `A barren 0-0 draw between ${home.name} and ${away.name} with neither side breaking the deadlock.`,
      ];
      return scorelessTemplates[Math.floor(Math.random() * scorelessTemplates.length)];
    }

    if (result.homeScore === result.awayScore) {
      const drawTemplates = [
        `A thrilling ${result.homeScore}-${result.awayScore} draw${scorersText ? ` featuring goals from ${scorersText}` : ""}.`,
        `Honors even in a dramatic ${result.homeScore}-${result.awayScore} stalemate between ${home.name} and ${away.name}.`,
      ];
      return drawTemplates[Math.floor(Math.random() * drawTemplates.length)];
    }

    if (result.decidedBy === "PENALTIES" && winner && loser) {
      return `${winner.name} edges past ${loser.name} in a nerve-shredding penalty shootout (${result.penaltyScores?.home}-${result.penaltyScores?.away}) after a draw.`;
    }

    if (result.decidedBy === "EXTRA_TIME" && winner && loser) {
      return `${winner.name} secures a hard-fought ${result.homeScore}-${result.awayScore} extra-time victory over ${loser.name}.`;
    }

    if (winner && loser && margin >= 3) {
      const blowoutTemplates = [
        `${winner.name} dominates ${loser.name} in a brutal ${result.homeScore}-${result.awayScore} blowout${scorersText ? ` with goals from ${scorersText}` : ""}.`,
        `${winner.name} runs riot in a clinical ${result.homeScore}-${result.awayScore} masterclass against ${loser.name}.`,
      ];
      return blowoutTemplates[Math.floor(Math.random() * blowoutTemplates.length)];
    }

    if (winner && loser) {
      const winTemplates = [
        `${winner.name} squeezes past ${loser.name} in a tight ${result.homeScore}-${result.awayScore} victory${scorersText ? ` via ${scorersText}` : ""}.`,
        `${winner.name} secures a vital ${result.homeScore}-${result.awayScore} win against a resilient ${loser.name}.`,
      ];
      return winTemplates[Math.floor(Math.random() * winTemplates.length)];
    }

    return `The match between ${home.name} and ${away.name} ended in a scoreline of ${result.homeScore}-${result.awayScore}.`;
  }
}

