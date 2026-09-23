import type { Competition } from "@wco/shared";
import { type AppDatabase, getDb } from "../db";
import * as schema from "../db/schema";
import { FootballDataAdapter, type CompetitionSyncData } from "./football-data.adapter";
import { scoreFinishedPredictions } from "./scoring.service";

const DEFAULT_TTL_MS = 10 * 60 * 1000;
const DEFAULT_INTERVAL_MS = 15 * 60 * 1000;
// football-data.org free tier: 10 calls/min — space multi-competition syncs out
const REQUEST_SPACING_MS = 6500;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface SyncResult {
  competitionId: string;
  teams: number;
  fixtures: number;
  skipped?: boolean;
  error?: string;
}

export class SyncService {
  private readonly lastSyncAt = new Map<string, number>();
  private readonly ttlMs: number;

  constructor(
    private readonly adapter: FootballDataAdapter,
    private readonly db: AppDatabase = getDb(),
    ttlMs: number = Number(process.env.SYNC_TTL_MS) || DEFAULT_TTL_MS
  ) {
    this.ttlMs = ttlMs;
  }

  isFresh(competitionId: string): boolean {
    const last = this.lastSyncAt.get(competitionId);
    return last !== undefined && Date.now() - last < this.ttlMs;
  }

  async syncCompetition(competitionId: string, options: { force?: boolean } = {}): Promise<SyncResult> {
    if (!options.force && this.isFresh(competitionId)) {
      return { competitionId, teams: 0, fixtures: 0, skipped: true };
    }

    if (!this.adapter.isConfigured) {
      return { competitionId, teams: 0, fixtures: 0, skipped: true, error: "no API key" };
    }

    try {
      const data = await this.adapter.fetchCompetitionMatches(competitionId);
      this.upsert(data);
      scoreFinishedPredictions(this.db);
      this.lastSyncAt.set(competitionId, Date.now());
      return { competitionId, teams: data.teams.length, fixtures: data.fixtures.length };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Sync failed for ${competitionId}:`, message);
      return { competitionId, teams: 0, fixtures: 0, error: message };
    }
  }

  async syncAll(competitionIds?: string[], options: { force?: boolean; spaced?: boolean } = {}): Promise<SyncResult[]> {
    const ids = competitionIds ?? this.listCompetitionIds();
    const results: SyncResult[] = [];

    for (let i = 0; i < ids.length; i++) {
      if (options.spaced !== false && i > 0) {
        await sleep(REQUEST_SPACING_MS);
      }
      results.push(await this.syncCompetition(ids[i], options));
    }
    return results;
  }

  listCompetitionIds(): string[] {
    return this.db.select({ id: schema.competitions.id }).from(schema.competitions).all().map((r) => r.id);
  }

  getCompetitions(): Competition[] {
    return this.db.select().from(schema.competitions).all();
  }

  private upsert(data: CompetitionSyncData): void {
    for (const team of data.teams) {
      this.db
        .insert(schema.teams)
        .values(team)
        .onConflictDoUpdate({
          target: schema.teams.id,
          set: {
            name: team.name,
            tla: team.tla,
            crestUrl: team.crestUrl,
          },
        })
        .run();
    }

    for (const fixture of data.fixtures) {
      this.db
        .insert(schema.fixtures)
        .values(fixture)
        .onConflictDoUpdate({
          target: schema.fixtures.id,
          set: {
            status: fixture.status,
            stage: fixture.stage,
            matchday: fixture.matchday,
            homeScore: fixture.homeScore,
            awayScore: fixture.awayScore,
            updatedAt: fixture.updatedAt,
          },
        })
        .run();
    }
  }
}

let singleton: SyncService | undefined;

export function getSyncService(): SyncService {
  if (!singleton) {
    const adapter = new FootballDataAdapter(process.env.FOOTBALL_DATA_API_KEY);
    singleton = new SyncService(adapter);
  }
  return singleton;
}

export function startSyncScheduler(): NodeJS.Timeout | null {
  if (!process.env.FOOTBALL_DATA_API_KEY) {
    console.warn("FOOTBALL_DATA_API_KEY not set — fixture sync scheduler disabled");
    return null;
  }

  const intervalMs = Number(process.env.SYNC_INTERVAL_MS) || DEFAULT_INTERVAL_MS;
  const sync = getSyncService();

  const run = async () => {
    const results = await sync.syncAll(undefined, { spaced: true });
    const ok = results.filter((r) => !r.error).length;
    console.log(`Fixture sync complete: ${ok}/${results.length} competitions ok`);
  };

  // Initial pass shortly after boot, then on interval
  const initial = setTimeout(run, 5_000);
  const timer = setInterval(run, intervalMs);
  timer.unref?.();
  initial.unref?.();

  return timer;
}
