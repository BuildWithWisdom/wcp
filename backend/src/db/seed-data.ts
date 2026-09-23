import type { CompetitionKind } from "@wco/shared";

export interface CompetitionSeed {
  id: string;
  name: string;
  kind: CompetitionKind;
  providerId: number;
}

/**
 * Launch coverage: top-5 European leagues + UCL.
 */
export const COMPETITION_SEEDS: CompetitionSeed[] = [
  { id: "PL", name: "EPL", kind: "league", providerId: 2021 },
  { id: "PD", name: "La Liga", kind: "league", providerId: 2014 },
  { id: "SA", name: "Serie A", kind: "league", providerId: 2019 },
  { id: "BL1", name: "Bundesliga", kind: "league", providerId: 2002 },
  { id: "FL1", name: "Ligue 1", kind: "league", providerId: 2015 },
  { id: "CL", name: "UCL", kind: "cup", providerId: 2001 },
];
