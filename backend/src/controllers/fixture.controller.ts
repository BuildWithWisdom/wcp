import { Request, Response } from "express";
import { randomUUID } from "crypto";
import { validationResult } from "express-validator";
import { and, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { isPredictionOpen } from "@wco/shared";
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

    let predictionsByFixture = new Map<string, typeof schema.predictions.$inferSelect>();
    if (req.deviceId && fixtureRows.length > 0) {
      const preds = db
        .select()
        .from(schema.predictions)
        .where(
          and(
            eq(schema.predictions.ownerDeviceId, req.deviceId),
            inArray(
              schema.predictions.fixtureId,
              fixtureRows.map((f) => f.id)
            )
          )
        )
        .all();
      predictionsByFixture = new Map(preds.map((p) => [p.fixtureId, p]));
    }

    const data = fixtureRows.map((fixture) => {
      const home = teamsById.get(fixture.homeTeamId);
      const away = teamsById.get(fixture.awayTeamId);
      const prediction = predictionsByFixture.get(fixture.id);
      return {
        id: fixture.id,
        competitionId: fixture.competitionId,
        kickoffAt: fixture.kickoffAt,
        status: fixture.status,
        stage: fixture.stage,
        matchday: fixture.matchday,
        homeScore: fixture.homeScore,
        awayScore: fixture.awayScore,
        homeTeam: home ? toPublicTeam(home) : null,
        awayTeam: away ? toPublicTeam(away) : null,
        prediction: prediction
          ? {
              homeScore: prediction.homeScore,
              awayScore: prediction.awayScore,
              points: prediction.points,
            }
          : null,
        predictionOpen: isPredictionOpen(fixture.kickoffAt, now),
      };
    });

    res.json({ success: true, data });
  };

  /**
   * POST /api/fixtures/:id/predictions  {homeScore, awayScore}
   * Create or update this device's prediction (allowed until kickoff).
   */
  static predict = async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const db = getDb();
    const fixtureId = req.params.id;
    const deviceId = req.deviceId as string;

    const fixture = db
      .select()
      .from(schema.fixtures)
      .where(eq(schema.fixtures.id, fixtureId))
      .get();

    if (!fixture) {
      res.status(404).json({ success: false, message: `Fixture ${fixtureId} not found.` });
      return;
    }
    if (fixture.status === "CANCELLED") {
      res.status(400).json({ success: false, message: "This match has been cancelled." });
      return;
    }
    if (!isPredictionOpen(fixture.kickoffAt)) {
      res.status(400).json({ success: false, message: "Prediction window has closed (kickoff passed)." });
      return;
    }

    const homeScore = Number(req.body.homeScore);
    const awayScore = Number(req.body.awayScore);
    const nowIso = new Date().toISOString();

    const existing = db
      .select()
      .from(schema.predictions)
      .where(
        and(
          eq(schema.predictions.ownerDeviceId, deviceId),
          eq(schema.predictions.fixtureId, fixtureId)
        )
      )
      .get();

    if (existing) {
      db.update(schema.predictions)
        .set({ homeScore, awayScore, points: null, updatedAt: nowIso })
        .where(eq(schema.predictions.id, existing.id))
        .run();

      const updated = db
        .select()
        .from(schema.predictions)
        .where(eq(schema.predictions.id, existing.id))
        .get();
      res.json({ success: true, data: { prediction: updated, created: false } });
      return;
    }

    const id = randomUUID();
    db.insert(schema.predictions)
      .values({
        id,
        ownerDeviceId: deviceId,
        fixtureId,
        homeScore,
        awayScore,
        points: null,
        createdAt: nowIso,
        updatedAt: nowIso,
      })
      .run();

    const created = db
      .select()
      .from(schema.predictions)
      .where(eq(schema.predictions.id, id))
      .get();
    res.json({ success: true, data: { prediction: created, created: true } });
  };

  /**
   * POST /api/fixtures/:id/suggest — the Oracle's simulated pick (not stored).
   */
  static suggest = async (req: Request, res: Response): Promise<void> => {
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
