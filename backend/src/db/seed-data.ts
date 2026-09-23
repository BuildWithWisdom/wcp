import type { CompetitionKind } from "@wco/shared";

export interface CompetitionSeed {
  id: string;
  name: string;
  kind: CompetitionKind;
  providerId: number;
}

/**
 * Launch coverage: top-5 European leagues, UCL, and the two recurring
 * international tournament slots (populated when in season).
 */
export const COMPETITION_SEEDS: CompetitionSeed[] = [
  { id: "PL", name: "Premier League", kind: "league", providerId: 2021 },
  { id: "PD", name: "La Liga", kind: "league", providerId: 2014 },
  { id: "SA", name: "Serie A", kind: "league", providerId: 2019 },
  { id: "BL1", name: "Bundesliga", kind: "league", providerId: 2002 },
  { id: "FL1", name: "Ligue 1", kind: "league", providerId: 2015 },
  { id: "CL", name: "UEFA Champions League", kind: "cup", providerId: 2001 },
  { id: "WC", name: "FIFA World Cup", kind: "international", providerId: 2000 },
  { id: "EC", name: "UEFA European Championship", kind: "international", providerId: 2018 },
];
