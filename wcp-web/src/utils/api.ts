import type { Team } from "./teams";
import type { Match } from "./poisson";
import type { TournamentState } from "./state";

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

export const api = {
  // Teams API
  getTeams: () => request<Record<string, Team>>("/teams"),
  
  updateTeam: (id: string, fifaPoints: number, squadValue: number) =>
    request<Team>(`/teams/${id}`, {
      method: "PUT",
      body: JSON.stringify({ fifaPoints, squadValue }),
    }),

  resetTeams: () => request<Record<string, Team>>("/teams/reset", { method: "POST" }),

  // Tournament API
  getTournament: () => request<TournamentState>("/tournament"),
  
  resetTournament: () => request<TournamentState>("/tournament/reset", { method: "POST" }),

  simulateMatch: (matchId: string) =>
    request<{ match: Match; state: TournamentState }>("/tournament/simulate-match", {
      method: "POST",
      body: JSON.stringify({ matchId }),
    }),

  simulateDay: () => request<{ matches: Match[]; state: TournamentState }>("/tournament/simulate-day", { method: "POST" }),
  
  fastForwardDay: () => request<TournamentState>("/tournament/fast-forward", { method: "POST" }),
};
