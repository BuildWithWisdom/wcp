import type { Fixture, FixtureStatus, Team } from "@wco/shared";

interface ProviderTeam {
  id: number;
  name: string;
  tla?: string | null;
  crest?: string | null;
}

interface ProviderScore {
  home: number | null;
  away: number | null;
}

interface ProviderMatch {
  id: number;
  utcDate: string;
  status: string;
  stage: string | null;
  matchday?: number | null;
  homeTeam: ProviderTeam;
  awayTeam: ProviderTeam;
  score: {
    fullTime: ProviderScore;
    halfTime?: ProviderScore;
  };
}

interface ProviderMatchesResponse {
  matches: ProviderMatch[];
}

export interface CompetitionSyncData {
  teams: Team[];
  fixtures: Fixture[];
}

const STATUS_MAP: Record<string, FixtureStatus> = {
  SCHEDULED: "SCHEDULED",
  TIMED: "TIMED",
  IN_PLAY: "IN_PLAY",
  PAUSED: "PAUSED",
  FINISHED: "FINISHED",
  POSTPONED: "POSTPONED",
  SUSPENDED: "SUSPENDED",
  CANCELLED: "CANCELLED",
  AWARDED: "FINISHED",
};

export function mapStatus(providerStatus: string): FixtureStatus {
  const mapped = STATUS_MAP[providerStatus];
  if (!mapped) {
    console.warn(`Unknown provider fixture status "${providerStatus}" — treating as SCHEDULED`);
    return "SCHEDULED";
  }
  return mapped;
}

function mapTeam(team: ProviderTeam): Team {
  return {
    id: String(team.id),
    name: team.name,
    tla: team.tla ?? null,
    crestUrl: team.crest ?? null,
    primaryColor: null,
    secondaryColor: null,
  };
}

/**
 * Maps a football-data.org matches payload into domain teams + fixtures.
 * Scores are only populated for FINISHED/AWARDED fixtures.
 */
export function mapMatches(competitionId: string, payload: ProviderMatchesResponse): CompetitionSyncData {
  const teamsById = new Map<string, Team>();
  const fixtures: Fixture[] = [];
  const now = new Date().toISOString();

  for (const match of payload.matches ?? []) {
    const home = mapTeam(match.homeTeam);
    const away = mapTeam(match.awayTeam);
    for (const team of [home, away]) {
      const existing = teamsById.get(team.id);
      if (!existing) {
        teamsById.set(team.id, team);
      } else {
        // later payloads may repeat a team with partial fields — keep the richer record
        teamsById.set(team.id, {
          ...existing,
          name: existing.name || team.name,
          tla: existing.tla ?? team.tla,
          crestUrl: existing.crestUrl ?? team.crestUrl,
        });
      }
    }

    const status = mapStatus(match.status);
    const finished = status === "FINISHED";
    const fullTime = match.score?.fullTime;

    fixtures.push({
      id: String(match.id),
      competitionId,
      homeTeamId: home.id,
      awayTeamId: away.id,
      kickoffAt: match.utcDate,
      status,
      stage: match.stage ?? null,
      matchday: typeof match.matchday === "number" ? match.matchday : null,
      homeScore: finished ? fullTime?.home ?? null : null,
      awayScore: finished ? fullTime?.away ?? null : null,
      updatedAt: now,
    });
  }

  return { teams: [...teamsById.values()], fixtures };
}

export class FootballDataAdapter {
  constructor(
    private readonly apiKey: string | undefined,
    private readonly baseUrl = "https://api.football-data.org/v4"
  ) {}

  get isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  async fetchCompetitionMatches(competitionId: string): Promise<CompetitionSyncData> {
    if (!this.apiKey) {
      throw new Error("FOOTBALL_DATA_API_KEY is not configured");
    }

    const url = `${this.baseUrl}/competitions/${competitionId}/matches`;
    const res = await fetch(url, {
      headers: { "X-Auth-Token": this.apiKey },
    });

    if (res.status === 429) {
      const reset = res.headers.get("X-RequestCounter-Reset");
      throw new Error(
        `football-data.org rate limit hit${reset ? ` (resets ${reset})` : ""} for ${competitionId}`
      );
    }

    if (!res.ok) {
      throw new Error(`football-data.org ${competitionId} matches request failed: HTTP ${res.status}`);
    }

    const payload = (await res.json()) as ProviderMatchesResponse;
    return mapMatches(competitionId, payload);
  }
}
