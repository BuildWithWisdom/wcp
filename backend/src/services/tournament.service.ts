import { Team, Match, MatchStage, TeamStanding, GroupState, BracketRound, TournamentState } from "./storage.service";
import { SimulationResult } from "./simulation.service";
import fs from "fs";
import path from "path";

export class TournamentService {
  getDayFromRealDate(): number {
    const tournamentStart = new Date("2026-06-11T00:00:00");
    const now = new Date();
    
    const startDay = new Date(tournamentStart.getFullYear(), tournamentStart.getMonth(), tournamentStart.getDate());
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const diffTime = today.getTime() - startDay.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    const day = diffDays + 1;
    return day < 1 ? 1 : day;
  }

  parseKickoffTimeToISO(dateStr: string, timeStr: string): string {
    const match = timeStr.match(/(\d{2}:\d{2})\s+UTC([+-]\d+)?/);
    if (match) {
      const time = match[1];
      const offsetNum = match[2] ? parseInt(match[2], 10) : 0;
      const offsetSign = offsetNum >= 0 ? "+" : "-";
      const absOffset = Math.abs(offsetNum);
      const offsetStr = `${offsetSign}${absOffset < 10 ? "0" : ""}${absOffset}:00`;
      return `${dateStr}T${time}:00${offsetStr}`;
    }
    return `${dateStr}T12:00:00-04:00`;
  }

  getRoundAndIndex(i: number, j: number): { round: number; matchIdx: number } {
    if (i === 0 && j === 3) return { round: 1, matchIdx: 0 };
    if (i === 1 && j === 2) return { round: 1, matchIdx: 1 };
    if (i === 0 && j === 1) return { round: 2, matchIdx: 0 };
    if (i === 2 && j === 3) return { round: 2, matchIdx: 1 };
    if (i === 0 && j === 2) return { round: 3, matchIdx: 0 };
    if (i === 1 && j === 3) return { round: 3, matchIdx: 1 };
    return { round: 1, matchIdx: 0 };
  }

  getOfficialGroupMatchDay(groupName: string, round: number, matchIdx: number): number {
    const groups = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
    const groupIndex = groups.indexOf(groupName);

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
   * Generates empty knockout match placeholders for a given stage.
   */
  generateEmptyKnockouts(roundName: MatchStage, count: number): Match[] {
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
   * Initializes the tournament state with 12 groups and group stage fixtures.
   */
  initializeTournament(teams: Record<string, Team>): TournamentState {
    const groups: Record<string, GroupState> = {};
    const groupNames = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

    // 1. Load official world cup fixtures from JSON file
    let openfootballMatches: any[] = [];
    try {
      const filePath = path.join(__dirname, "../../data/worldcup_2026.json");
      const rawData = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(rawData);
      openfootballMatches = parsed.matches || [];
    } catch (error) {
      console.error("Failed to load worldcup_2026.json fixtures. Falling back to default generation.", error);
    }

    const nameToIdMap: Record<string, string> = {
      "Bosnia & Herzegovina": "bosnia_herzegovina",
      "Czech Republic": "czech_republic",
      "South Korea": "south_korea",
      "DR Congo": "dr_congo",
      "Ivory Coast": "ivory_coast",
      "Cape Verde": "cape_verde",
      "Saudi Arabia": "saudi_arabia",
      "New Zealand": "new_zealand",
      "Costa Rica": "costa_rica",
      "Curaçao": "curacao",
      "Turkey": "turkey",
      "USA": "usa"
    };

    const getTeamIdByName = (name: string): string => {
      if (nameToIdMap[name]) return nameToIdMap[name];
      return name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    };

    groupNames.forEach((gName) => {
      const groupTeams = Object.values(teams)
        .filter((t) => t.group === gName)
        .map((t) => t.id);

      // Filter matches from the official schedule JSON for this group
      let matches: Match[] = [];
      const groupMatchesData = openfootballMatches.filter((m: any) => m.group === `Group ${gName}`);

      if (groupMatchesData.length > 0) {
        matches = groupMatchesData.map((m: any, idx: number) => {
          const homeTeamId = getTeamIdByName(m.team1);
          const awayTeamId = getTeamIdByName(m.team2);
          const day = parseInt(m.round.replace("Matchday ", ""), 10) || 1;
          const isCompleted = m.score && m.score.ft;

          return {
            id: `match_G${gName}_${idx + 1}`,
            stage: "GROUP" as const,
            day,
            kickoffTime: this.parseKickoffTimeToISO(m.date, m.time || ""),
            groupName: gName,
            homeTeamId,
            awayTeamId,
            homeScore: isCompleted ? m.score.ft[0] : null,
            awayScore: isCompleted ? m.score.ft[1] : null,
            status: isCompleted ? ("COMPLETED" as const) : ("PENDING" as const),
            timeline: [],
            aiSummary: isCompleted ? `Simulated historical score: ${m.team1} ${m.score.ft[0]}-${m.score.ft[1]} ${m.team2}.` : null,
          };
        });
      } else {
        // Fallback to automatic template generator if JSON data has an issue
        let matchCounter = 1;
        for (let i = 0; i < groupTeams.length; i++) {
          for (let j = i + 1; j < groupTeams.length; j++) {
            const { round, matchIdx } = this.getRoundAndIndex(i, j);
            const day = this.getOfficialGroupMatchDay(gName, round, matchIdx);
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
      }

      groups[gName] = {
        groupName: gName,
        teams: groupTeams,
        standings: [],
        matches,
      };

      // Calculate initial standings (which will automatically factor in any completed games from JSON!)
      groups[gName].standings = this.calculateStandings(groups[gName]);
    });

    const bracket: Record<string, BracketRound> = {
      R32: { roundName: "R32", matches: this.generateEmptyKnockouts("R32", 16) },
      R16: { roundName: "R16", matches: this.generateEmptyKnockouts("R16", 8) },
      QF: { roundName: "QF", matches: this.generateEmptyKnockouts("QF", 4) },
      SF: { roundName: "SF", matches: this.generateEmptyKnockouts("SF", 2) },
      FINAL: { roundName: "FINAL", matches: this.generateEmptyKnockouts("FINAL", 1) },
    };

    const state: TournamentState = {
      currentStage: "GROUPS",
      currentDay: this.getDayFromRealDate(),
      dateOffset: 0,
      groups,
      bracket,
      championId: null,
    };

    this.assignKickoffTimes(state);

    return state;
  }

  /**
   * Re-calculates standings for a group based on simulated match outcomes.
   */
  calculateStandings(group: GroupState): TeamStanding[] {
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

      if (!h || !a) return;

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
  isGroupStageFinished(groups: Record<string, GroupState>): boolean {
    return Object.values(groups).every((g) => g.matches.every((m) => m.status === "COMPLETED"));
  }

  /**
   * Calculates qualifiers from groups and seeds the Round of 32.
   * Top 2 of all 12 groups + 8 best 3rd placed teams.
   */
  buildRoundOf32(groups: Record<string, GroupState>): Match[] {
    const groupWinners: string[] = [];
    const groupRunnersUp: string[] = [];
    const thirdPlacedTeams: { teamId: string; points: number; gd: number; gf: number }[] = [];

    Object.values(groups).forEach((g) => {
      const sorted = this.calculateStandings(g);
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

    thirdPlacedTeams.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.gd !== a.gd) return b.gd - a.gd;
      if (b.gf !== a.gf) return b.gf - a.gf;
      return a.teamId.localeCompare(b.teamId);
    });

    const bestThirds = thirdPlacedTeams.slice(0, 8).map((t) => t.teamId);
    const r32Matches = this.generateEmptyKnockouts("R32", 16);

    for (let i = 0; i < 8; i++) {
      r32Matches[i].homeTeamId = groupWinners[i];
      r32Matches[i].awayTeamId = bestThirds[i] || "";
    }

    r32Matches[8].homeTeamId = groupWinners[8];
    r32Matches[8].awayTeamId = groupRunnersUp[9];

    r32Matches[9].homeTeamId = groupWinners[9];
    r32Matches[9].awayTeamId = groupRunnersUp[8];

    r32Matches[10].homeTeamId = groupWinners[10];
    r32Matches[10].awayTeamId = groupRunnersUp[11];

    r32Matches[11].homeTeamId = groupWinners[11];
    r32Matches[11].awayTeamId = groupRunnersUp[10];

    r32Matches[12].homeTeamId = groupRunnersUp[0];
    r32Matches[12].awayTeamId = groupRunnersUp[1];

    r32Matches[13].homeTeamId = groupRunnersUp[2];
    r32Matches[13].awayTeamId = groupRunnersUp[3];

    r32Matches[14].homeTeamId = groupRunnersUp[4];
    r32Matches[14].awayTeamId = groupRunnersUp[5];

    r32Matches[15].homeTeamId = groupRunnersUp[6];
    r32Matches[15].awayTeamId = groupRunnersUp[7];

    return r32Matches;
  }

  /**
   * Propagates winners of one round to the next knockout round.
   */
  propagateKnockouts(
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

  getMatchesForDay(state: TournamentState, day: number): Match[] {
    const matches: Match[] = [];
    Object.values(state.groups).forEach((g) => {
      matches.push(...g.matches.filter((m) => m.day === day));
    });
    Object.values(state.bracket).forEach((r) => {
      matches.push(...r.matches.filter((m) => m.day === day));
    });
    return matches;
  }

  /**
   * Logs a simulated match result and automatically runs stage transitions.
   */
  updateMatchResultAndProgress(
    state: TournamentState,
    matchId: string,
    result: SimulationResult,
    aiSummary: string
  ): { match: Match; state: TournamentState } {
    let targetMatch: Match | undefined;
    let found = false;

    // Search and update in Groups
    for (const groupKey of Object.keys(state.groups)) {
      const group = state.groups[groupKey];
      const matchIdx = group.matches.findIndex((m) => m.id === matchId);
      if (matchIdx !== -1) {
        group.matches[matchIdx] = {
          ...group.matches[matchIdx],
          homeScore: result.homeScore,
          awayScore: result.awayScore,
          status: "COMPLETED",
          timeline: result.timeline,
          aiSummary,
          winnerId: result.winnerId,
          decidedBy: result.decidedBy,
          penaltyScores: result.penaltyScores,
          homeAttackModifier: result.homeAttackModifier,
          homeDefenseModifier: result.homeDefenseModifier,
          awayAttackModifier: result.awayAttackModifier,
          awayDefenseModifier: result.awayDefenseModifier,
          aiTacticalAnalysis: result.aiTacticalAnalysis,
        };
        targetMatch = group.matches[matchIdx];
        
        // Recalculate group standings immediately
        group.standings = this.calculateStandings(group);

        found = true;
        break;
      }
    }

    // Search and update in Bracket
    if (!found) {
      for (const roundKey of Object.keys(state.bracket)) {
        const round = state.bracket[roundKey];
        const matchIdx = round.matches.findIndex((m) => m.id === matchId);
        if (matchIdx !== -1) {
          round.matches[matchIdx] = {
            ...round.matches[matchIdx],
            homeScore: result.homeScore,
            awayScore: result.awayScore,
            status: "COMPLETED",
            timeline: result.timeline,
            aiSummary,
            winnerId: result.winnerId,
            decidedBy: result.decidedBy,
            penaltyScores: result.penaltyScores,
            homeAttackModifier: result.homeAttackModifier,
            homeDefenseModifier: result.homeDefenseModifier,
            awayAttackModifier: result.awayAttackModifier,
            awayDefenseModifier: result.awayDefenseModifier,
            aiTacticalAnalysis: result.aiTacticalAnalysis,
          };
          targetMatch = round.matches[matchIdx];
          found = true;
          break;
        }
      }
    }

    if (!targetMatch) {
      throw new Error(`Match with ID ${matchId} not found in current tournament state.`);
    }



    // Check round completeness and progress stage
    this.checkProgress(state);

    return { match: targetMatch, state };
  }

  /**
   * Evaluates if the current stage is fully finished and transitions to the next stage.
   */
  private checkProgress(state: TournamentState): void {
    if (state.currentStage === "GROUPS") {
      if (this.isGroupStageFinished(state.groups)) {
        state.currentStage = "R32";
        state.bracket.R32.matches = this.buildRoundOf32(state.groups);
      }
    } else {
      const currentRound = state.bracket[state.currentStage];
      if (currentRound) {
        const roundFinished = currentRound.matches.every((m) => m.status === "COMPLETED");
        if (roundFinished) {
          if (state.currentStage === "R32") {
            state.currentStage = "R16";
            state.bracket.R16.matches = this.propagateKnockouts(
              state.bracket.R32.matches,
              state.bracket.R16.matches
            );
          } else if (state.currentStage === "R16") {
            state.currentStage = "QF";
            state.bracket.QF.matches = this.propagateKnockouts(
              state.bracket.R16.matches,
              state.bracket.QF.matches
            );
          } else if (state.currentStage === "QF") {
            state.currentStage = "SF";
            state.bracket.SF.matches = this.propagateKnockouts(
              state.bracket.QF.matches,
              state.bracket.SF.matches
            );
          } else if (state.currentStage === "SF") {
            state.currentStage = "FINAL";
            state.bracket.FINAL.matches = this.propagateKnockouts(
              state.bracket.SF.matches,
              state.bracket.FINAL.matches
            );
          } else if (state.currentStage === "FINAL") {
            const finalMatch = state.bracket.FINAL.matches[0];
            if (finalMatch && finalMatch.winnerId) {
              state.championId = finalMatch.winnerId;
              state.currentStage = "COMPLETED";
            }
          }
        }
      }
    }
    this.assignKickoffTimes(state);
  }

  assignKickoffTimes(state: TournamentState): void {
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
        // Skip if kickoffTime is already set (preserves official JSON schedule timezones)
        if (match.kickoffTime) return;

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

  syncOfficialResults(state: TournamentState): boolean {
    let openfootballMatches: any[] = [];
    try {
      const filePath = path.join(__dirname, "../../data/worldcup_2026.json");
      const rawData = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(rawData);
      openfootballMatches = parsed.matches || [];
    } catch (error) {
      console.error("Failed to load worldcup_2026.json for sync:", error);
      return false;
    }

    let modified = false;

    // 1. Sync Group Stage Matches
    const groupNames = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
    groupNames.forEach((gName) => {
      const groupMatchesData = openfootballMatches.filter((m: any) => m.group === `Group ${gName}`);
      const group = state.groups[gName];
      if (!group) return;

      groupMatchesData.forEach((m: any, idx: number) => {
        const matchId = `match_G${gName}_${idx + 1}`;
        const match = group.matches.find((x) => x.id === matchId);
        if (match) {
          const isCompletedInJson = m.score && m.score.ft;
          if (isCompletedInJson && match.status !== "COMPLETED") {
            match.homeScore = m.score.ft[0];
            match.awayScore = m.score.ft[1];
            match.status = "COMPLETED";
            match.aiSummary = `Simulated historical score: ${m.team1} ${m.score.ft[0]}-${m.score.ft[1]} ${m.team2}.`;
            
            const nameToIdMap: Record<string, string> = {
              "Bosnia & Herzegovina": "bosnia_herzegovina",
              "Czech Republic": "czech_republic",
              "South Korea": "south_korea",
              "DR Congo": "dr_congo",
              "Ivory Coast": "ivory_coast",
              "Cape Verde": "cape_verde",
              "Saudi Arabia": "saudi_arabia",
              "New Zealand": "new_zealand",
              "Costa Rica": "costa_rica",
              "Curaçao": "curacao",
              "Turkey": "turkey",
              "USA": "usa"
            };
            const getTeamIdByName = (name: string): string => {
              if (nameToIdMap[name]) return nameToIdMap[name];
              return name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
            };
            
            const homeId = getTeamIdByName(m.team1);
            const awayId = getTeamIdByName(m.team2);
            if (m.score.ft[0] > m.score.ft[1]) {
              match.winnerId = homeId;
            } else if (m.score.ft[1] > m.score.ft[0]) {
              match.winnerId = awayId;
            } else {
              match.winnerId = "";
            }
            match.decidedBy = "REGULAR";

            modified = true;
          }
        }
      });

      if (modified) {
        group.standings = this.calculateStandings(group);
      }
    });

    // 2. Sync Knockout Stage Matches
    const knockoutStages: { roundJson: string; stageKey: string }[] = [
      { roundJson: "Round of 32", stageKey: "R32" },
      { roundJson: "Round of 16", stageKey: "R16" },
      { roundJson: "Quarter-finals", stageKey: "QF" },
      { roundJson: "Quarter-final", stageKey: "QF" },
      { roundJson: "Semi-finals", stageKey: "SF" },
      { roundJson: "Semi-final", stageKey: "SF" },
      { roundJson: "Final", stageKey: "FINAL" }
    ];

    knockoutStages.forEach(({ roundJson, stageKey }) => {
      const jsonMatches = openfootballMatches.filter(
        (m: any) => m.round && m.round.toLowerCase() === roundJson.toLowerCase()
      );
      const round = state.bracket[stageKey];
      if (!round) return;

      jsonMatches.forEach((m: any, idx: number) => {
        const match = round.matches[idx];
        if (match) {
          const isCompletedInJson = m.score && m.score.ft;
          if (isCompletedInJson && match.status !== "COMPLETED") {
            match.homeScore = m.score.ft[0];
            match.awayScore = m.score.ft[1];
            match.status = "COMPLETED";
            match.aiSummary = `Simulated historical score: ${m.team1} ${m.score.ft[0]}-${m.score.ft[1]} ${m.team2}.`;
            
            const nameToIdMap: Record<string, string> = {
              "Bosnia & Herzegovina": "bosnia_herzegovina",
              "Czech Republic": "czech_republic",
              "South Korea": "south_korea",
              "DR Congo": "dr_congo",
              "Ivory Coast": "ivory_coast",
              "Cape Verde": "cape_verde",
              "Saudi Arabia": "saudi_arabia",
              "New Zealand": "new_zealand",
              "Costa Rica": "costa_rica",
              "Curaçao": "curacao",
              "Turkey": "turkey",
              "USA": "usa"
            };
            const getTeamIdByName = (name: string): string => {
              if (nameToIdMap[name]) return nameToIdMap[name];
              return name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
            };

            const homeId = getTeamIdByName(m.team1);
            const awayId = getTeamIdByName(m.team2);

            match.homeTeamId = homeId;
            match.awayTeamId = awayId;

            if (m.score.ft[0] > m.score.ft[1]) {
              match.winnerId = homeId;
            } else if (m.score.ft[1] > m.score.ft[0]) {
              match.winnerId = awayId;
            }
            match.decidedBy = "REGULAR";

            modified = true;
          }
        }
      });
    });

    if (modified) {
      this.checkProgress(state);
    }

    return modified;
  }
}
