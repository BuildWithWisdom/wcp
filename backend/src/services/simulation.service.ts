import { Team, MatchEvent } from "./storage.service";
import {
  getTeamRatings,
  computeLambdas,
  simulateScoreline,
  penaltyConversionRate,
  simulateShootout,
  drawPoisson,
  type ShootoutResult,
} from "@wco/shared";

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

export { getTeamRatings };
export type { TeamRatings } from "@wco/shared";

export class SimulationService {
  /**
   * Simulates a football match using shared Poisson math.
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
    const homeRatings = getTeamRatings(homeTeam);
    const awayRatings = getTeamRatings(awayTeam);

    const { lambdaHome, lambdaAway } = computeLambdas(homeRatings, awayRatings, modifiers);

    const homeAttackMod = modifiers?.homeAttackModifier ?? 1.0;
    const homeDefenseMod = modifiers?.homeDefenseModifier ?? 1.0;
    const awayAttackMod = modifiers?.awayAttackModifier ?? 1.0;
    const awayDefenseMod = modifiers?.awayDefenseModifier ?? 1.0;

    let { homeScore, awayScore } = simulateScoreline(lambdaHome, lambdaAway);

    let decidedBy: "REGULAR" | "EXTRA_TIME" | "PENALTIES" = "REGULAR";
    let winnerId = "";
    let penaltyScores: { home: number; away: number } | undefined;

    let timeline = this.generateTimeline(homeTeam, awayTeam, homeScore, awayScore, 1, 90);

    if (isKnockout && homeScore === awayScore) {
      decidedBy = "EXTRA_TIME";
      const et = simulateScoreline(lambdaHome * 0.33, lambdaAway * 0.33);
      const etTimeline = this.generateTimeline(homeTeam, awayTeam, et.homeScore, et.awayScore, 91, 120);
      timeline = [...timeline, ...etTimeline];

      homeScore += et.homeScore;
      awayScore += et.awayScore;

      if (homeScore === awayScore) {
        decidedBy = "PENALTIES";
        const shootout = simulateShootout(
          penaltyConversionRate(homeRatings.quality),
          penaltyConversionRate(awayRatings.quality)
        );
        timeline = [...timeline, ...this.buildShootoutEvents(homeTeam, awayTeam, shootout)];
        penaltyScores = { home: shootout.homeScored, away: shootout.awayScored };
        winnerId = shootout.winnerSide === "home" ? homeTeam.id : awayTeam.id;
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
   * Maps shared shootout kicks to timeline events with original minute conventions:
   * regulation home 121-125, away 126-130, sudden death from 136/146.
   */
  private buildShootoutEvents(homeTeam: Team, awayTeam: Team, shootout: ShootoutResult): MatchEvent[] {
    const events: MatchEvent[] = [];
    let homeKicks = 0;
    let awayKicks = 0;

    for (const kick of shootout.kicks) {
      const team = kick.side === "home" ? homeTeam : awayTeam;
      let minute: number;
      let playerName: string;
      let detail: string;

      if (kick.suddenDeath) {
        const suffix = kick.round - 5;
        minute = kick.side === "home" ? 130 + kick.round : 140 + kick.round;
        playerName = `Sudden Death Taker #${suffix}`;
        detail = kick.scored
          ? "Sudden Death Penalty Scored!"
          : "Sudden Death Penalty Missed/Saved!";
      } else {
        if (kick.side === "home") {
          homeKicks++;
          minute = 120 + homeKicks;
        } else {
          awayKicks++;
          minute = 120 + awayKicks + 5;
        }
        playerName = `Penalty Taker #${kick.round}`;
        detail = kick.scored
          ? "Shootout Penalty Scored!"
          : "Shootout Penalty Missed/Saved!";
      }

      events.push({
        type: kick.scored ? "GOAL" : "MISS",
        minute,
        teamId: team.id,
        playerName,
        detail,
      });
    }

    return events;
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
    const numYellows = drawPoisson(1.8 + totalGoals * 0.1);
    const numReds = Math.random() < 0.05 ? 1 : 0;
    const numMisses = drawPoisson(3.0);
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
