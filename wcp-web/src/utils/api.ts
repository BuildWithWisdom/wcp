import type { MatchEvent } from "./poisson";

export type { MatchEvent };

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api";

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error(json.message || `API error: ${response.status}`);
  }

  return json.data;
}

export type CompetitionKind = "league" | "cup" | "international";

export interface Competition {
  id: string;
  name: string;
  kind: CompetitionKind;
  providerId: number;
}

export interface FixtureTeam {
  id: string;
  name: string;
  tla: string | null;
  crestUrl: string | null;
  fifaPoints: number;
  squadValue: number;
}

export type FixtureStatus =
  | "TIMED"
  | "IN_PLAY"
  | "PAUSED"
  | "FINISHED"
  | "SUSPENDED"
  | "POSTPONED"
  | "CANCELLED"
  | "AWARDED";

export interface Fixture {
  id: string;
  competitionId: string;
  kickoffAt: string;
  status: FixtureStatus;
  stage: string | null;
  matchday: number | null;
  homeScore: number | null;
  awayScore: number | null;
  homeTeam: FixtureTeam | null;
  awayTeam: FixtureTeam | null;
}

export interface PredictionModifiers {
  homeAttackModifier: number;
  homeDefenseModifier: number;
  awayAttackModifier: number;
  awayDefenseModifier: number;
}

export interface Prediction {
  fixtureId: string;
  isKnockout: boolean;
  homeScore: number;
  awayScore: number;
  timeline: MatchEvent[];
  decidedBy: "REGULAR" | "EXTRA_TIME" | "PENALTIES";
  winnerId: string | null;
  penaltyScores: { home: number; away: number } | null;
  modifiers: PredictionModifiers;
  tacticalAnalysis: string;
  aiSummary: string;
}

export interface FixturesQuery {
  competition?: string;
  window?: "upcoming" | "recent";
  limit?: number;
}

export const api = {
  getCompetitions: () => request<Competition[]>("/competitions"),

  getFixtures: (query: FixturesQuery = {}) => {
    const params = new URLSearchParams();
    if (query.competition) params.set("competition", query.competition);
    if (query.window) params.set("window", query.window);
    if (query.limit) params.set("limit", String(query.limit));
    const qs = params.toString();
    return request<Fixture[]>(`/fixtures${qs ? `?${qs}` : ""}`);
  },

  predict: (fixtureId: string) =>
    request<Prediction>(`/fixtures/${encodeURIComponent(fixtureId)}/predict`, {
      method: "POST",
    }),
};
