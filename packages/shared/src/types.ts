export type CompetitionKind = "league" | "cup" | "international";

export interface Competition {
  id: string;
  name: string;
  kind: CompetitionKind;
  providerId: number;
}

export type FixtureStatus =
  | "SCHEDULED"
  | "TIMED"
  | "IN_PLAY"
  | "PAUSED"
  | "FINISHED"
  | "POSTPONED"
  | "SUSPENDED"
  | "CANCELLED";

export interface Team {
  id: string;
  name: string;
  tla: string | null;
  crestUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
}

export interface Fixture {
  id: string;
  competitionId: string;
  homeTeamId: string;
  awayTeamId: string;
  kickoffAt: string;
  status: FixtureStatus;
  stage: string | null;
  matchday: number | null;
  homeScore: number | null;
  awayScore: number | null;
  updatedAt: string;
}

export interface Prediction {
  id: string;
  ownerDeviceId: string;
  fixtureId: string;
  homeScore: number;
  awayScore: number;
  points: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScorePair {
  homeScore: number;
  awayScore: number;
}
