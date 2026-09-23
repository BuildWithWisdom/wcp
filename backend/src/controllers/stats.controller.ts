import { Request, Response } from "express";
import { and, asc, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { getDb } from "../db";
import * as schema from "../db/schema";
import { scoreFinishedPredictions } from "../services/scoring.service";

type StatsRow = {
  predictionId: string;
  fixtureId: string;
  points: number | null;
  pickHome: number;
  pickAway: number;
  competitionId: string;
  kickoffAt: string;
  status: string;
  actualHome: number | null;
  actualAway: number | null;
};

interface Streaks {
  current: number;
  max: number;
}

function computeStreaks(pointsAscendingByKickoff: number[]): Streaks {
  let current = 0;
  let max = 0;
  for (const points of pointsAscendingByKickoff) {
    if (points >= 1) {
      current++;
      max = Math.max(max, current);
    } else {
      current = 0;
    }
  }
  // current streak = trailing run of successes
  let trailing = 0;
  for (let i = pointsAscendingByKickoff.length - 1; i >= 0; i--) {
    if (pointsAscendingByKickoff[i] >= 1) trailing++;
    else break;
  }
  return { current: trailing, max };
}

export class StatsController {
  /**
   * GET /api/stats — device-scoped prediction performance.
   */
  static summary = async (req: Request, res: Response): Promise<void> => {
    const db = getDb();
    const deviceId = req.deviceId as string;

    // Ensure any newly finished fixtures are scored before we read
    scoreFinishedPredictions(db);

    const rows = db
      .select({
        predictionId: schema.predictions.id,
        fixtureId: schema.predictions.fixtureId,
        points: schema.predictions.points,
        pickHome: schema.predictions.homeScore,
        pickAway: schema.predictions.awayScore,
        competitionId: schema.fixtures.competitionId,
        kickoffAt: schema.fixtures.kickoffAt,
        status: schema.fixtures.status,
        actualHome: schema.fixtures.homeScore,
        actualAway: schema.fixtures.awayScore,
      })
      .from(schema.predictions)
      .innerJoin(schema.fixtures, eq(schema.predictions.fixtureId, schema.fixtures.id))
      .where(eq(schema.predictions.ownerDeviceId, deviceId))
      .orderBy(asc(schema.fixtures.kickoffAt))
      .all() as StatsRow[];

    const scored = rows.filter((r) => r.points !== null && r.status === "FINISHED");
    const totalPoints = scored.reduce((sum, r) => sum + (r.points ?? 0), 0);
    const exact = scored.filter((r) => r.points === 3).length;
    const outcome = scored.filter((r) => (r.points ?? 0) >= 1).length;
    const wrong = scored.filter((r) => r.points === 0).length;
    const hitRate = scored.length > 0 ? outcome / scored.length : 0;

    const streaks = computeStreaks(scored.map((r) => r.points ?? 0));

    const byCompetitionMap = new Map<
      string,
      { competitionId: string; points: number; scored: number; exact: number; outcomeWins: number }
    >();
    for (const row of scored) {
      const entry = byCompetitionMap.get(row.competitionId) ?? {
        competitionId: row.competitionId,
        points: 0,
        scored: 0,
        exact: 0,
        outcomeWins: 0,
      };
      entry.points += row.points ?? 0;
      entry.scored += 1;
      if (row.points === 3) entry.exact += 1;
      if ((row.points ?? 0) >= 1) entry.outcomeWins += 1;
      byCompetitionMap.set(row.competitionId, entry);
    }
    const byCompetition = [...byCompetitionMap.values()]
      .map((entry) => ({
        ...entry,
        hitRate: entry.scored > 0 ? entry.outcomeWins / entry.scored : 0,
      }))
      .sort((a, b) => b.points - a.points);

    // Recent predictions (any state), newest kickoff first, with team context
    const recentRows = db
      .select({
        fixtureId: schema.fixtures.id,
        competitionId: schema.fixtures.competitionId,
        kickoffAt: schema.fixtures.kickoffAt,
        status: schema.fixtures.status,
        homeScore: schema.fixtures.homeScore,
        awayScore: schema.fixtures.awayScore,
        homeTeamId: schema.fixtures.homeTeamId,
        awayTeamId: schema.fixtures.awayTeamId,
        homeName: schema.teams.name,
        predictionId: schema.predictions.id,
        pickHome: schema.predictions.homeScore,
        pickAway: schema.predictions.awayScore,
        points: schema.predictions.points,
      })
      .from(schema.predictions)
      .innerJoin(schema.fixtures, eq(schema.predictions.fixtureId, schema.fixtures.id))
      .innerJoin(schema.teams, eq(schema.fixtures.homeTeamId, schema.teams.id))
      .where(eq(schema.predictions.ownerDeviceId, deviceId))
      .orderBy(desc(schema.fixtures.kickoffAt))
      .limit(10)
      .all();

    // Second join for away team names
    const awayIds = [...new Set(recentRows.map((r) => r.awayTeamId))];
    const awayTeams =
      awayIds.length > 0
        ? db.select().from(schema.teams).where(inArray(schema.teams.id, awayIds)).all()
        : [];
    const awayById = new Map(awayTeams.map((t) => [t.id, t.name]));

    const recent = recentRows.map((row) => ({
      fixtureId: row.fixtureId,
      competitionId: row.competitionId,
      kickoffAt: row.kickoffAt,
      status: row.status,
      homeTeamId: row.homeTeamId,
      awayTeamId: row.awayTeamId,
      homeTeamName: row.homeName,
      awayTeamName: awayById.get(row.awayTeamId) ?? row.awayTeamId,
      actual:
        row.status === "FINISHED" && row.homeScore !== null && row.awayScore !== null
          ? { homeScore: row.homeScore, awayScore: row.awayScore }
          : null,
      prediction: { homeScore: row.pickHome, awayScore: row.pickAway, points: row.points },
    }));

    res.json({
      success: true,
      data: {
        predictionsTotal: rows.length,
        fixturesScored: scored.length,
        points: { total: totalPoints, exact, outcome, wrong },
        hitRate,
        currentStreak: streaks.current,
        maxStreak: streaks.max,
        byCompetition,
        recent,
      },
    });
  };
}

/**
 * GET /api/competitions/:id/standings — computed from finished fixtures in the DB.
 */
export async function getStandings(req: Request, res: Response): Promise<void> {
  const db = getDb();
  const competitionId = req.params.id;

  const competition = db
    .select()
    .from(schema.competitions)
    .where(eq(schema.competitions.id, competitionId))
    .get();

  if (!competition) {
    res.status(404).json({ success: false, message: `Unknown competition ${competitionId}.` });
    return;
  }

  if (competition.kind !== "league") {
    res.json({
      success: true,
      data: {
        applicable: false,
        competitionId,
        reason: "Standings only apply to league competitions.",
      },
    });
    return;
  }

  const finished = db
    .select({
      homeTeamId: schema.fixtures.homeTeamId,
      awayTeamId: schema.fixtures.awayTeamId,
      homeScore: schema.fixtures.homeScore,
      awayScore: schema.fixtures.awayScore,
    })
    .from(schema.fixtures)
    .where(
      and(
        eq(schema.fixtures.competitionId, competitionId),
        eq(schema.fixtures.status, "FINISHED"),
        isNotNull(schema.fixtures.homeScore),
        isNotNull(schema.fixtures.awayScore)
      )
    )
    .all();

  const teamIds = [...new Set(finished.flatMap((f) => [f.homeTeamId, f.awayTeamId]))];
  const teams =
    teamIds.length > 0
      ? db.select().from(schema.teams).where(inArray(schema.teams.id, teamIds)).all()
      : [];
  const teamsById = new Map(teams.map((t) => [t.id, t]));

  interface Row {
    teamId: string;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    gf: number;
    ga: number;
    gd: number;
    points: number;
  }
  const table = new Map<string, Row>();
  const row = (teamId: string): Row => {
    let r = table.get(teamId);
    if (!r) {
      r = { teamId, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 };
      table.set(teamId, r);
    }
    return r;
  };

  for (const match of finished) {
    const home = row(match.homeTeamId);
    const away = row(match.awayTeamId);
    const hs = match.homeScore as number;
    const as = match.awayScore as number;

    home.played++;
    away.played++;
    home.gf += hs;
    home.ga += as;
    away.gf += as;
    away.ga += hs;

    if (hs > as) {
      home.won++;
      away.lost++;
      home.points += 3;
    } else if (hs < as) {
      away.won++;
      home.lost++;
      away.points += 3;
    } else {
      home.drawn++;
      away.drawn++;
      home.points += 1;
      away.points += 1;
    }
  }

  for (const r of table.values()) r.gd = r.gf - r.ga;

  const sorted = [...table.values()].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.gd !== a.gd) return b.gd - a.gd;
    if (b.gf !== a.gf) return b.gf - a.gf;
    const nameA = teamsById.get(a.teamId)?.name ?? a.teamId;
    const nameB = teamsById.get(b.teamId)?.name ?? b.teamId;
    return nameA.localeCompare(nameB);
  });

  res.json({
    success: true,
    data: {
      applicable: true,
      competitionId,
      rows: sorted.map((r, index) => {
        const team = teamsById.get(r.teamId);
        return {
          position: index + 1,
          team: team
            ? { id: team.id, name: team.name, tla: team.tla, crestUrl: team.crestUrl }
            : { id: r.teamId, name: r.teamId, tla: null, crestUrl: null },
          played: r.played,
          won: r.won,
          drawn: r.drawn,
          lost: r.lost,
          goalsFor: r.gf,
          goalsAgainst: r.ga,
          goalDifference: r.gd,
          points: r.points,
        };
      }),
    },
  });
}
