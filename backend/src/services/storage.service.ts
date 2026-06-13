import fs from "fs/promises";
import path from "path";

export interface Team {
  id: string;
  name: string;
  code: string;
  flag: string;
  group: string;
  fifaPoints: number;
  squadValue: number;
  keyPlayers: string[];
}

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
  groupName: string;
  teams: string[];
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

import { existsSync } from "fs";

const DATA_DIR = path.join(__dirname, "../../data");
const PERSISTENT_DIR = process.env.PERSISTENT_DATA_DIR || DATA_DIR;

const TEAMS_PATH = path.join(PERSISTENT_DIR, "teams.json");
const STATE_PATH = path.join(PERSISTENT_DIR, "tournament_state.json");
const SEED_TEAMS_PATH = path.join(DATA_DIR, "teams.json");

export class StorageService {
  /**
   * Load the team database.
   */
  async loadTeams(): Promise<Record<string, Team>> {
    try {
      // Auto-seed teams.json to persistent volume if missing
      if (!existsSync(TEAMS_PATH) && existsSync(SEED_TEAMS_PATH)) {
        await fs.mkdir(PERSISTENT_DIR, { recursive: true });
        const seedData = await fs.readFile(SEED_TEAMS_PATH, "utf-8");
        await fs.writeFile(TEAMS_PATH, seedData, "utf-8");
      }
      const data = await fs.readFile(TEAMS_PATH, "utf-8");
      return JSON.parse(data);
    } catch (error) {
      console.error("Detailed loadTeams error:", error);
      throw new Error("Failed to load teams. Seed file may be missing or corrupt.");
    }
  }

  /**
   * Save custom team ratings.
   */
  async saveTeams(teams: Record<string, Team>): Promise<void> {
    await fs.writeFile(TEAMS_PATH, JSON.stringify(teams, null, 2), "utf-8");
  }

  /**
   * Load current tournament state.
   * If it doesn't exist, we return null to let the controller trigger init.
   */
  async loadTournamentState(): Promise<TournamentState | null> {
    try {
      const data = await fs.readFile(STATE_PATH, "utf-8");
      const state: TournamentState = JSON.parse(data);
      if (state) {
        const tournamentStart = new Date("2026-06-11T00:00:00");
        const now = new Date();
        const startDay = new Date(tournamentStart.getFullYear(), tournamentStart.getMonth(), tournamentStart.getDate());
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const diffTime = today.getTime() - startDay.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const baseDay = diffDays + 1 < 1 ? 1 : diffDays + 1;
        state.currentDay = Math.min(33, baseDay + (state.dateOffset || 0));
      }
      return state;
    } catch (error) {
      return null;
    }
  }

  /**
   * Save tournament state.
   */
  async saveTournamentState(state: TournamentState): Promise<void> {
    await fs.writeFile(STATE_PATH, JSON.stringify(state, null, 2), "utf-8");
  }
}
