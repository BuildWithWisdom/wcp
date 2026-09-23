import "dotenv/config";
import fs from "fs";
import path from "path";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import * as schema from "../db/schema";

interface LegacyTeam {
  id: string;
  name: string;
  code: string;
  fifaPoints: number;
  squadValue: number;
}

/** Case/diacritic-insensitive name key for cross-provider matching. */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export interface RatingUpdate {
  teamId: string;
  fifaPoints: number;
  squadValue: number;
}

/**
 * Pairs legacy World Cup ratings with synced provider teams by name (preferred)
 * or TLA/code. Pure so it can be unit-tested.
 */
export function matchRatings(
  legacy: LegacyTeam[],
  teams: { id: string; name: string; tla: string | null }[]
): { updates: RatingUpdate[]; unmatchedLegacy: string[] } {
  const byName = new Map<string, (typeof teams)[number]>();
  const byTla = new Map<string, (typeof teams)[number]>();
  for (const team of teams) {
    byName.set(normalizeName(team.name), team);
    if (team.tla) byTla.set(team.tla.toUpperCase(), team);
  }

  const updates: RatingUpdate[] = [];
  const unmatchedLegacy: string[] = [];
  const seen = new Set<string>();

  for (const legacyTeam of legacy) {
    const match =
      byName.get(normalizeName(legacyTeam.name)) ??
      byTla.get((legacyTeam.code || "").toUpperCase());

    if (!match || seen.has(match.id)) {
      unmatchedLegacy.push(legacyTeam.name);
      continue;
    }
    seen.add(match.id);
    updates.push({
      teamId: match.id,
      fifaPoints: legacyTeam.fifaPoints,
      squadValue: legacyTeam.squadValue,
    });
  }

  return { updates, unmatchedLegacy };
}

function main(): void {
  const db = getDb();
  const legacyPath = path.resolve(__dirname, "../../data/default_teams.json");
  const legacy = Object.values(JSON.parse(fs.readFileSync(legacyPath, "utf8"))) as LegacyTeam[];
  const teams = db.select({ id: schema.teams.id, name: schema.teams.name, tla: schema.teams.tla })
    .from(schema.teams)
    .all();

  const { updates, unmatchedLegacy } = matchRatings(legacy, teams);

  for (const update of updates) {
    db.update(schema.teams)
      .set({ fifaPoints: update.fifaPoints, squadValue: update.squadValue })
      .where(eq(schema.teams.id, update.teamId))
      .run();
  }

  console.log(`Backfilled ratings for ${updates.length}/${legacy.length} legacy teams.`);
  if (unmatchedLegacy.length > 0) {
    console.log(`Unmatched: ${unmatchedLegacy.join(", ")}`);
  }
}

if (require.main === module) {
  main();
}
