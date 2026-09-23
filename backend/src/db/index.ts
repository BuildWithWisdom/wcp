import path from "path";
import fs from "fs";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema";
import { COMPETITION_SEEDS } from "./seed-data";

export type AppDatabase = BetterSQLite3Database<typeof schema>;

/**
 * Opens (creating if needed) the SQLite database, runs migrations,
 * and seeds the competition list. Safe to call with ":memory:" in tests.
 */
export function createDatabase(filePath: string): AppDatabase {
  if (filePath !== ":memory:") {
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
  }

  const sqlite = new Database(filePath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  const db = drizzle(sqlite, { schema });

  const migrationsFolder = path.resolve(__dirname, "../../drizzle");
  migrate(db, { migrationsFolder });

  seedCompetitions(db);
  return db;
}

export function seedCompetitions(db: AppDatabase): void {
  const now = COMPETITION_SEEDS.map((c) => ({
    id: c.id,
    name: c.name,
    kind: c.kind,
    providerId: c.providerId,
  }));
  db.insert(schema.competitions)
    .values(now)
    .onConflictDoNothing()
    .run();
}

export function defaultDatabasePath(): string {
  return process.env.DATABASE_PATH || path.resolve(__dirname, "../../data/app.db");
}

let singleton: AppDatabase | undefined;

/**
 * Lazy app-wide database handle (created on first use).
 */
export function getDb(): AppDatabase {
  if (!singleton) {
    singleton = createDatabase(defaultDatabasePath());
  }
  return singleton;
}
