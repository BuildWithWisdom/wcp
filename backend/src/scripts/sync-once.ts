import "dotenv/config";
import { getDb } from "../db";
import { FootballDataAdapter } from "../services/football-data.adapter";
import { SyncService } from "../services/sync.service";

async function main(): Promise<void> {
  getDb(); // run migrations + seed

  const adapter = new FootballDataAdapter(process.env.FOOTBALL_DATA_API_KEY);
  if (!adapter.isConfigured) {
    console.error("FOOTBALL_DATA_API_KEY is not set — nothing to sync.");
    process.exitCode = 1;
    return;
  }

  const sync = new SyncService(adapter, getDb());
  console.log("Syncing competitions (spaced for rate limit, ~7s apart)...");
  const results = await sync.syncAll(undefined, { force: true, spaced: true });

  for (const r of results) {
    if (r.error) {
      console.error(`  ✗ ${r.competitionId}: ${r.error}`);
    } else {
      console.log(`  ✓ ${r.competitionId}: ${r.fixtures} fixtures, ${r.teams} teams`);
    }
  }

  const failed = results.filter((r) => r.error).length;
  process.exitCode = failed === results.length ? 1 : 0;
}

main().catch((error) => {
  console.error("sync:once failed:", error);
  process.exit(1);
});
