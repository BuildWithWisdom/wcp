import { TEAMS } from "./teams";
import type { Match, MatchStage } from "./poisson";
import { FIFA_P_MIN, FIFA_P_MAX, LOG_VAL_MIN, LOG_VAL_MAX } from "./poisson";

export interface TeamStanding {
  teamId: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export interface GroupState {
  groupName: string; // "A" to "L"
  teams: string[];    // 4 team IDs
  standings: TeamStanding[];
  matches: Match[];
}

export interface BracketRound {
  roundName: "R32" | "R16" | "QF" | "SF" | "FINAL";
  matches: Match[];
}

export interface TournamentState {
  currentStage: "GROUPS" | "R32" | "R16" | "QF" | "SF" | "FINAL" | "COMPLETED";
  currentDay: number;
  dateOffset: number;
  groups: Record<string, GroupState>;
  bracket: Record<string, BracketRound>;
  championId: string | null;
}

export function getRoundAndIndex(i: number, j: number): { round: number; matchIdx: number } {
  if (i === 0 && j === 3) return { round: 1, matchIdx: 0 };
  if (i === 1 && j === 2) return { round: 1, matchIdx: 1 };
  if (i === 0 && j === 1) return { round: 2, matchIdx: 0 };
  if (i === 2 && j === 3) return { round: 2, matchIdx: 1 };
  if (i === 0 && j === 2) return { round: 3, matchIdx: 0 };
  if (i === 1 && j === 3) return { round: 3, matchIdx: 1 };
  return { round: 1, matchIdx: 0 };
}

export function getOfficialGroupMatchDay(groupName: string, round: number, matchIdx: number): number {

  if (round === 1) {
    if (groupName === "A") return 1;
    if (groupName === "B") return matchIdx === 0 ? 2 : 3;
    if (groupName === "C") return 3;
    if (groupName === "D") return matchIdx === 0 ? 2 : 3;
    if (groupName === "E") return 4;
    if (groupName === "F") return 4;
    if (groupName === "G") return 5;
    if (groupName === "H") return 5;
    if (groupName === "I") return 6;
    if (groupName === "J") return 6;
    if (groupName === "K") return 6;
    if (groupName === "L") return 7;
  }

  if (round === 2) {
    if (groupName === "A") return matchIdx === 0 ? 8 : 9;
    if (groupName === "B") return matchIdx === 0 ? 8 : 9;
    if (groupName === "C") return matchIdx === 0 ? 9 : 10;
    if (groupName === "D") return matchIdx === 0 ? 9 : 10;
    if (groupName === "E") return matchIdx === 0 ? 10 : 11;
    if (groupName === "F") return matchIdx === 0 ? 10 : 12;
    if (groupName === "G") return matchIdx === 0 ? 11 : 12;
    if (groupName === "H") return matchIdx === 0 ? 11 : 12;
    if (groupName === "I") return 12;
    if (groupName === "J") return matchIdx === 0 ? 12 : 13;
    if (groupName === "K") return 13;
    if (groupName === "L") return 13;
  }

  if (round === 3) {
    if (groupName === "A" || groupName === "B" || groupName === "C") return 14;
    if (groupName === "D" || groupName === "E" || groupName === "F") return 15;
    if (groupName === "G" || groupName === "H" || groupName === "I") return 16;
    if (groupName === "J" || groupName === "K" || groupName === "L") return 17;
  }

  return 1;
}

/**
 * Initializes the tournament state with 12 groups and group stage fixtures.
 */
export function initializeTournament(): TournamentState {
  const groups: Record<string, GroupState> = {};
  const groupNames = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

  // 1. Group teams by group letter
  groupNames.forEach((gName) => {
    const groupTeams = Object.values(TEAMS)
      .filter((t) => t.group === gName)
      .map((t) => t.id);

    // Initial standings
    const standings = groupTeams.map((tId) => ({
      teamId: tId,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
    }));

    // Generate round-robin matches (6 fixtures per group)
    const matches: Match[] = [];
    let matchCounter = 1;
    for (let i = 0; i < groupTeams.length; i++) {
      for (let j = i + 1; j < groupTeams.length; j++) {
        const { round, matchIdx } = getRoundAndIndex(i, j);
        const day = getOfficialGroupMatchDay(gName, round, matchIdx);
        matches.push({
          id: `match_G${gName}_${matchCounter++}`,
          stage: "GROUP",
          day,
          kickoffTime: "",
          groupName: gName,
          homeTeamId: groupTeams[i],
          awayTeamId: groupTeams[j],
          homeScore: null,
          awayScore: null,
          status: "PENDING",
          timeline: [],
          aiSummary: null,
        });
      }
    }

    groups[gName] = {
      groupName: gName,
      teams: groupTeams,
      standings,
      matches,
    };
  });

  // 2. Initialize Empty Brackets
  const bracket: Record<string, BracketRound> = {
    R32: { roundName: "R32", matches: generateEmptyKnockouts("R32", 16) },
    R16: { roundName: "R16", matches: generateEmptyKnockouts("R16", 8) },
    QF: { roundName: "QF", matches: generateEmptyKnockouts("QF", 4) },
    SF: { roundName: "SF", matches: generateEmptyKnockouts("SF", 2) },
    FINAL: { roundName: "FINAL", matches: generateEmptyKnockouts("FINAL", 1) },
  };

  const state: TournamentState = {
    currentStage: "GROUPS",
    currentDay: 1,
    dateOffset: 0,
    groups,
    bracket,
    championId: null,
  };

  assignKickoffTimes(state);

  return state;
}

function generateEmptyKnockouts(roundName: MatchStage, count: number): Match[] {
  const matches: Match[] = [];
  for (let i = 1; i <= count; i++) {
    let day = 1;
    const idx = i - 1;
    if (roundName === "R32") {
      if (idx < 3) day = 18;
      else if (idx < 6) day = 19;
      else if (idx < 9) day = 20;
      else if (idx < 12) day = 21;
      else if (idx < 14) day = 22;
      else day = 23;
    } else if (roundName === "R16") {
      day = 24 + Math.floor(idx / 2);
    } else if (roundName === "QF") {
      if (idx < 2) day = 28;
      else if (idx === 2) day = 29;
      else day = 30;
    } else if (roundName === "SF") {
      day = 31 + idx;
    } else if (roundName === "FINAL") {
      day = 33;
    }

    matches.push({
      id: `${roundName}_M${i}`,
      stage: roundName,
      day,
      kickoffTime: "",
      homeTeamId: "",
      awayTeamId: "",
      homeScore: null,
      awayScore: null,
      status: "PENDING",
      timeline: [],
      aiSummary: null,
    });
  }
  return matches;
}

/**
 * Re-calculates standings for a group based on simulated match outcomes.
 */
export function calculateStandings(group: GroupState): TeamStanding[] {
  const standingsMap: Record<string, TeamStanding> = {};
  group.teams.forEach((tId) => {
    standingsMap[tId] = {
      teamId: tId,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
    };
  });

  group.matches.forEach((m) => {
    if (m.status !== "COMPLETED" || m.homeScore === null || m.awayScore === null) return;

    const h = standingsMap[m.homeTeamId];
    const a = standingsMap[m.awayTeamId];

    h.played++;
    a.played++;

    h.goalsFor += m.homeScore;
    h.goalsAgainst += m.awayScore;
    a.goalsFor += m.awayScore;
    a.goalsAgainst += m.homeScore;

    h.goalDifference = h.goalsFor - h.goalsAgainst;
    a.goalDifference = a.goalsFor - a.goalsAgainst;

    if (m.homeScore > m.awayScore) {
      h.wins++;
      h.points += 3;
      a.losses++;
    } else if (m.awayScore > m.homeScore) {
      a.wins++;
      a.points += 3;
      h.losses++;
    } else {
      h.draws++;
      h.points += 1;
      a.draws++;
      a.points += 1;
    }
  });

  // Sort standings: Points -> Goal Difference -> Goals For -> Team ID alphabetically
  return Object.values(standingsMap).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return a.teamId.localeCompare(b.teamId);
  });
}

/**
 * Checks if all matches in the group stage are simulated.
 */
export function isGroupStageFinished(groups: Record<string, GroupState>): boolean {
  return Object.values(groups).every((g) => g.matches.every((m) => m.status === "COMPLETED"));
}

/**
 * Calculates qualifiers from groups and seeds the Round of 32.
 * Top 2 of all 12 groups + 8 best 3rd placed teams.
 */
export function buildRoundOf32(groups: Record<string, GroupState>): Match[] {
  const groupWinners: string[] = [];
  const groupRunnersUp: string[] = [];
  const thirdPlacedTeams: { teamId: string; points: number; gd: number; gf: number }[] = [];

  Object.values(groups).forEach((g) => {
    const sorted = calculateStandings(g);
    if (sorted[0]) groupWinners.push(sorted[0].teamId);
    if (sorted[1]) groupRunnersUp.push(sorted[1].teamId);
    if (sorted[2]) {
      const t = sorted[2];
      thirdPlacedTeams.push({
        teamId: t.teamId,
        points: t.points,
        gd: t.goalDifference,
        gf: t.goalsFor,
      });
    }
  });

  // Sort third placed teams to find the 8 best
  thirdPlacedTeams.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.gd !== a.gd) return b.gd - a.gd;
    if (b.gf !== a.gf) return b.gf - a.gf;
    return a.teamId.localeCompare(b.teamId);
  });

  const bestThirds = thirdPlacedTeams.slice(0, 8).map((t) => t.teamId);

  // Seed the 16 Round of 32 matches
  // Deterministic matching:
  // Matches 0 to 7: Winner of Group A-H vs one of the 8 Best 3rd place teams
  // Matches 8 to 11: Winner of Group I-L vs Runner-up of Group J-L-I-K (crossed)
  // Matches 12 to 15: Runner-up of Group A-H matched against each other
  const r32Matches = generateEmptyKnockouts("R32", 16);

  // Group Winners A-H vs Best Thirds (A-H mapped to 3rds 0-7)
  for (let i = 0; i < 8; i++) {
    r32Matches[i].homeTeamId = groupWinners[i]; // Winners of A, B, C, D, E, F, G, H
    r32Matches[i].awayTeamId = bestThirds[i] || "";
  }

  // Group Winners I-L vs Group Runners-up (cross pairing)
  // W_I vs R_J, W_J vs R_I, W_K vs R_L, W_L vs R_K
  r32Matches[8].homeTeamId = groupWinners[8];  // W_I
  r32Matches[8].awayTeamId = groupRunnersUp[9]; // R_J

  r32Matches[9].homeTeamId = groupWinners[9];  // W_J
  r32Matches[9].awayTeamId = groupRunnersUp[8]; // R_I

  r32Matches[10].homeTeamId = groupWinners[10]; // W_K
  r32Matches[10].awayTeamId = groupRunnersUp[11];// R_L

  r32Matches[11].homeTeamId = groupWinners[11]; // W_L
  r32Matches[11].awayTeamId = groupRunnersUp[10];// R_K

  // Group Runners-up A-H matched against each other
  // R_A vs R_B, R_C vs R_D, R_E vs R_F, R_G vs R_H
  r32Matches[12].homeTeamId = groupRunnersUp[0]; // R_A
  r32Matches[12].awayTeamId = groupRunnersUp[1]; // R_B

  r32Matches[13].homeTeamId = groupRunnersUp[2]; // R_C
  r32Matches[13].awayTeamId = groupRunnersUp[3]; // R_D

  r32Matches[14].homeTeamId = groupRunnersUp[4]; // R_E
  r32Matches[14].awayTeamId = groupRunnersUp[5]; // R_F

  r32Matches[15].homeTeamId = groupRunnersUp[6]; // R_G
  r32Matches[15].awayTeamId = groupRunnersUp[7]; // R_H

  return r32Matches;
}

/**
 * Propagates winners of one round to the next knockout round.
 * e.g., R32 winner 1 and 2 meet in R16 Match 1.
 */
export function propagateKnockouts(
  _roundName: "R32" | "R16" | "QF" | "SF",
  currentMatches: Match[],
  nextRoundMatches: Match[]
): Match[] {
  const updatedNext = [...nextRoundMatches];
  
  for (let i = 0; i < currentMatches.length; i += 2) {
    const nextMatchIdx = Math.floor(i / 2);
    if (nextMatchIdx >= updatedNext.length) break;

    const m1 = currentMatches[i];
    const m2 = currentMatches[i + 1];

    if (m1 && m1.status === "COMPLETED" && m1.winnerId) {
      updatedNext[nextMatchIdx].homeTeamId = m1.winnerId;
    }
    if (m2 && m2.status === "COMPLETED" && m2.winnerId) {
      updatedNext[nextMatchIdx].awayTeamId = m2.winnerId;
    }
  }
  return updatedNext;
}

/**
 * Helper to get winner chances percentages based on tournament status.
 * Dynamically computes chances based on team ratings and progression.
 */
export function getWinnerChances(state: TournamentState): { teamId: string; chance: number }[] {
  // If champion is already decided
  if (state.championId) {
    return [{ teamId: state.championId, chance: 100 }];
  }

  // Get list of active teams based on stage
  let activeTeams: string[] = [];
  if (state.currentStage === "GROUPS") {
    activeTeams = Object.keys(TEAMS);
  } else {
    const roundMatches = state.bracket[state.currentStage]?.matches || [];
    roundMatches.forEach((m) => {
      if (m.homeTeamId && m.status !== "COMPLETED") activeTeams.push(m.homeTeamId);
      if (m.awayTeamId && m.status !== "COMPLETED") activeTeams.push(m.awayTeamId);
      if (m.status === "COMPLETED" && m.winnerId) activeTeams.push(m.winnerId);
    });
    // Remove duplicates
    activeTeams = Array.from(new Set(activeTeams));
  }

  // Calculate quality weight for each active team
  const weights = activeTeams.map((tId) => {
    const team = TEAMS[tId];
    if (!team) return { teamId: tId, weight: 0 };
    
    // FIFA ranking strength + Log squad value strength
    const fifaStrength = (team.fifaPoints - FIFA_P_MIN) / (FIFA_P_MAX - FIFA_P_MIN);
    const logVal = Math.log(team.squadValue + 1);
    const valStrength = (logVal - LOG_VAL_MIN) / (LOG_VAL_MAX - LOG_VAL_MIN);
    
    // Quality rating between 0.1 and 10.0 (exponential to favor top teams realistically)
    const baseQuality = 0.6 * fifaStrength + 0.4 * valStrength;
    const weight = Math.exp(baseQuality * 4.0); // Amplify quality difference
    return { teamId: tId, weight };
  });

  const totalWeight = weights.reduce((acc, w) => acc + w.weight, 0);
  const chances = weights.map((w) => ({
    teamId: w.teamId,
    chance: totalWeight > 0 ? Math.round((w.weight / totalWeight) * 100) : 0,
  }));

  // Sort descending
  return chances.sort((a, b) => b.chance - a.chance).slice(0, 8); // Top 8 chances
}

export function assignKickoffTimes(state: TournamentState): void {
  const monthDays: Record<number, { month: number; date: number }> = {
    1: { month: 6, date: 11 }, 2: { month: 6, date: 12 }, 3: { month: 6, date: 13 },
    4: { month: 6, date: 14 }, 5: { month: 6, date: 15 }, 6: { month: 6, date: 16 },
    7: { month: 6, date: 17 }, 8: { month: 6, date: 18 }, 9: { month: 6, date: 19 },
    10: { month: 6, date: 20 }, 11: { month: 6, date: 21 }, 12: { month: 6, date: 22 },
    13: { month: 6, date: 23 }, 14: { month: 6, date: 24 }, 15: { month: 6, date: 25 },
    16: { month: 6, date: 26 }, 17: { month: 6, date: 27 }, 18: { month: 6, date: 28 },
    19: { month: 6, date: 29 }, 20: { month: 6, date: 30 }, 21: { month: 7, date: 1 },
    22: { month: 7, date: 2 }, 23: { month: 7, date: 3 }, 24: { month: 7, date: 4 },
    25: { month: 7, date: 5 }, 26: { month: 7, date: 6 }, 27: { month: 7, date: 7 },
    28: { month: 7, date: 9 }, 29: { month: 7, date: 10 }, 30: { month: 7, date: 11 },
    31: { month: 7, date: 14 }, 32: { month: 7, date: 15 }, 33: { month: 7, date: 19 }
  };

  const allMatches: Match[] = [];
  Object.values(state.groups).forEach((g) => allMatches.push(...g.matches));
  Object.values(state.bracket).forEach((b) => allMatches.push(...b.matches));

  const matchesByDay: Record<number, Match[]> = {};
  allMatches.forEach((m) => {
    if (!matchesByDay[m.day]) matchesByDay[m.day] = [];
    matchesByDay[m.day].push(m);
  });

  Object.entries(matchesByDay).forEach(([dayStr, dayMatches]) => {
    const day = parseInt(dayStr, 10);
    const md = monthDays[day];
    if (!md) return;

    dayMatches.sort((a, b) => a.id.localeCompare(b.id));

    const count = dayMatches.length;
    dayMatches.forEach((match, index) => {
      let time = "19:00";

      if (count === 6) {
        const uniqueGroups = Array.from(new Set(dayMatches.map((m) => m.groupName).filter(Boolean)));
        const groupIdx = uniqueGroups.indexOf(match.groupName || "");
        if (groupIdx === 0) time = "15:00";
        else if (groupIdx === 1) time = "18:00";
        else time = "21:00";
      } else if (count === 4) {
        if (index === 0) time = "12:00";
        else if (index === 1) time = "15:00";
        else if (index === 2) time = "18:00";
        else time = "21:00";
      } else if (count === 3) {
        if (index === 0) time = "12:00";
        else if (index === 1) time = "15:00";
        else time = "19:00";
      } else if (count === 2) {
        if (match.stage === "GROUP") {
          if (match.day === 1) {
            time = index === 0 ? "13:00" : "19:00";
          } else {
            time = index === 0 ? "15:00" : "18:00";
          }
        } else {
          time = index === 0 ? "15:00" : "19:00";
        }
      } else if (count === 1) {
        if (match.stage === "FINAL") time = "15:00";
        else time = "19:00";
      }

      const mStr = md.month < 10 ? `0${md.month}` : `${md.month}`;
      const dStr = md.date < 10 ? `0${md.date}` : `${md.date}`;
      match.kickoffTime = `2026-${mStr}-${dStr}T${time}:00-04:00`;
    });
  });
}
