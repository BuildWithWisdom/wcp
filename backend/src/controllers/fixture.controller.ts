import { Request, Response } from "express";
import { and, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { getDb } from "../db";
import * as schema from "../db/schema";
import { GeminiService } from "../services/gemini.service";
import { SimulationService } from "../services/simulation.service";
import type { Team as OracleTeam } from "../services/storage.service";

const simulationService = new SimulationService();

const KNOCKOUT_STAGES = new Set([
  "LAST_32",
  "LAST_16",
  "QUARTER_FINALS",
  "QUARTER_FINAL",
  "SEMI_FINALS",
  "SEMI_FINAL",
  "THIRD_PLACE",
  "FINAL",
]);

const toOracleTeam = (team: typeof schema.teams.$inferSelect): OracleTeam => ({
  id: team.id,
  name: team.name,
  code: team.tla ?? team.name.slice(0, 3).toUpperCase(),
  flag: "",
  group: "",
  fifaPoints: team.fifaPoints,
  squadValue: team.squadValue,
  keyPlayers: [],
});

const toPublicTeam = (team: typeof schema.teams.$inferSelect) => ({
  id: team.id,
  name: team.name,
  tla: team.tla,
  crestUrl: team.crestUrl,
  fifaPoints: team.fifaPoints,
  squadValue: team.squadValue,
});

export class FixtureController {
  /**
   * GET /api/fixtures?competition=PL&window=upcoming|recent&limit=30
   */
  static list = async (req: Request, res: Response): Promise<void> => {
    const db = getDb();

    const competition = typeof req.query.competition === "string" ? req.query.competition : undefined;
    const window = req.query.window === "recent" ? "recent" : "upcoming";
    const limitRaw = Number(req.query.limit ?? 30);
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(100, Math.floor(limitRaw))) : 30;

    if (competition) {
      const exists = db
        .select({ id: schema.competitions.id })
        .from(schema.competitions)
        .where(eq(schema.competitions.id, competition))
        .get();
      if (!exists) {
        res.status(404).json({ success: false, message: `Unknown competition ${competition}.` });
        return;
      }
    }

    const now = new Date();
    const cutoff = new Date(now.getTime() - 3 * 60 * 60 * 1000); // include in-play matches

    const conditions = [];
    if (competition) conditions.push(eq(schema.fixtures.competitionId, competition));
    if (window === "upcoming") {
      conditions.push(gte(schema.fixtures.kickoffAt, cutoff.toISOString()));
    } else {
      conditions.push(lte(schema.fixtures.kickoffAt, now.toISOString()));
    }

    const fixtureRows = await db
      .select()
      .from(schema.fixtures)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(
        window === "upcoming" ? schema.fixtures.kickoffAt : desc(schema.fixtures.kickoffAt)
      )
      .limit(limit)
      .all();

    const teamIds = [...new Set(fixtureRows.flatMap((f) => [f.homeTeamId, f.awayTeamId]))];
    const teams =
      teamIds.length > 0
        ? db.select().from(schema.teams).where(inArray(schema.teams.id, teamIds)).all()
        : [];
    const teamsById = new Map(teams.map((t) => [t.id, t]));

    const data = fixtureRows.map((fixture) => ({
      id: fixture.id,
      competitionId: fixture.competitionId,
      kickoffAt: fixture.kickoffAt,
      status: fixture.status,
      stage: fixture.stage,
      matchday: fixture.matchday,
      homeScore: fixture.homeScore,
      awayScore: fixture.awayScore,
      homeTeam: teamsById.get(fixture.homeTeamId)
        ? toPublicTeam(teamsById.get(fixture.homeTeamId)!)
        : null,
      awayTeam: teamsById.get(fixture.awayTeamId)
        ? toPublicTeam(teamsById.get(fixture.awayTeamId)!)
        : null,
    }));

    res.json({ success: true, data });
  };

  /**
   * POST /api/fixtures/:id/predict — the Oracle predicts this match
   * (Poisson simulation + AI modifiers). Nothing is stored.
   */
  static predict = async (req: Request, res: Response): Promise<void> => {
    const db = getDb();
    const fixtureId = req.params.id;

    const fixture = db
      .select()
      .from(schema.fixtures)
      .where(eq(schema.fixtures.id, fixtureId))
      .get();

    if (!fixture) {
      res.status(404).json({ success: false, message: `Fixture ${fixtureId} not found.` });
      return;
    }

    const homeRow = db
      .select()
      .from(schema.teams)
      .where(eq(schema.teams.id, fixture.homeTeamId))
      .get();
    const awayRow = db
      .select()
      .from(schema.teams)
      .where(eq(schema.teams.id, fixture.awayTeamId))
      .get();

    if (!homeRow || !awayRow) {
      res.status(400).json({ success: false, message: "Home or away team missing for this fixture." });
      return;
    }

    const isKnockout = fixture.stage !== null && KNOCKOUT_STAGES.has(fixture.stage);

    const homeTeam = toOracleTeam(homeRow);
    const awayTeam = toOracleTeam(awayRow);

    const modifiers = await GeminiService.getMatchPredictionModifiers(
      homeTeam,
      awayTeam,
      fixture.stage ?? fixture.competitionId
    );

    const result = simulationService.simulateMatch(homeTeam, awayTeam, isKnockout, modifiers);
    const localSummary = simulationService.generateWittySummary(homeTeam, awayTeam, result);
    const aiSummary = `🔮 ${modifiers.tacticalAnalysis} Recap: ${localSummary}`;

    res.json({
      success: true,
      data: {
        fixtureId,
        isKnockout,
        homeScore: result.homeScore,
        awayScore: result.awayScore,
        timeline: result.timeline,
        decidedBy: result.decidedBy,
        winnerId: result.winnerId,
        penaltyScores: result.penaltyScores ?? null,
        modifiers: {
          homeAttackModifier: result.homeAttackModifier,
          homeDefenseModifier: result.homeDefenseModifier,
          awayAttackModifier: result.awayAttackModifier,
          awayDefenseModifier: result.awayDefenseModifier,
        },
        tacticalAnalysis: modifiers.tacticalAnalysis,
        aiSummary,
      },
    });
  };
}
