import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";

export const competitions = sqliteTable("competitions", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  kind: text("kind", { enum: ["league", "cup", "international"] }).notNull(),
  providerId: integer("provider_id").notNull(),
});

export const teams = sqliteTable("teams", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  tla: text("tla"),
  crestUrl: text("crest_url"),
  primaryColor: text("primary_color"),
  secondaryColor: text("secondary_color"),
  // Oracle strength ratings (legacy FIFA-points scale; neutral defaults until curated)
  fifaPoints: integer("fifa_points").notNull().default(1530),
  squadValue: integer("squad_value").notNull().default(250),
});

export const fixtures = sqliteTable(
  "fixtures",
  {
    id: text("id").primaryKey(),
    competitionId: text("competition_id")
      .notNull()
      .references(() => competitions.id),
    homeTeamId: text("home_team_id")
      .notNull()
      .references(() => teams.id),
    awayTeamId: text("away_team_id")
      .notNull()
      .references(() => teams.id),
    kickoffAt: text("kickoff_at").notNull(),
    status: text("status", {
      enum: [
        "SCHEDULED",
        "TIMED",
        "IN_PLAY",
        "PAUSED",
        "FINISHED",
        "POSTPONED",
        "SUSPENDED",
        "CANCELLED",
      ],
    }).notNull(),
    stage: text("stage"),
    matchday: integer("matchday"),
    homeScore: integer("home_score"),
    awayScore: integer("away_score"),
    updatedAt: text("updated_at").notNull(),
  }
);

export const predictions = sqliteTable(
  "predictions",
  {
    id: text("id").primaryKey(),
    ownerDeviceId: text("owner_device_id").notNull(),
    fixtureId: text("fixture_id")
      .notNull()
      .references(() => fixtures.id),
    homeScore: integer("home_score").notNull(),
    awayScore: integer("away_score").notNull(),
    points: integer("points"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [uniqueIndex("owner_fixture_unique").on(table.ownerDeviceId, table.fixtureId)]
);
