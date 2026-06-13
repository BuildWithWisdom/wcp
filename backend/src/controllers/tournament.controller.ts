import { Request, Response } from "express";
import { validationResult } from "express-validator";
import { StorageService, Match } from "../services/storage.service";
import { TournamentService } from "../services/tournament.service";
import { SimulationService } from "../services/simulation.service";
import { GeminiService } from "../services/gemini.service";

const storageService = new StorageService();
const tournamentService = new TournamentService();
const simulationService = new SimulationService();

export class TournamentController {
  /**
   * Get the current tournament state, initializing it if none exists.
   */
  static getTournament = async (req: Request, res: Response): Promise<void> => {
    let state = await storageService.loadTournamentState();
    if (!state) {
      const teams = await storageService.loadTeams();
      state = tournamentService.initializeTournament(teams);
      await storageService.saveTournamentState(state);
    }
    res.json({ success: true, data: state });
  };

  /**
   * Reset the tournament state.
   */
  static resetTournament = async (req: Request, res: Response): Promise<void> => {
    const teams = await storageService.loadTeams();
    const state = tournamentService.initializeTournament(teams);
    await storageService.saveTournamentState(state);
    res.json({ success: true, data: state });
  };

  /**
   * Simulate a single match by ID.
   */
  static simulateMatch = async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const { matchId } = req.body;

    const state = await storageService.loadTournamentState();
    if (!state) {
      res.status(400).json({ success: false, message: "Tournament has not been initialized." });
      return;
    }

    // Find the match in the current stage
    let matchToSimulate: Match | undefined;
    if (state.currentStage === "GROUPS") {
      for (const group of Object.values(state.groups)) {
        const found = group.matches.find((m) => m.id === matchId);
        if (found) {
          matchToSimulate = found;
          break;
        }
      }
    } else {
      const round = state.bracket[state.currentStage];
      if (round) {
        matchToSimulate = round.matches.find((m) => m.id === matchId);
      }
    }

    if (!matchToSimulate) {
      res.status(404).json({ success: false, message: `Match ${matchId} not found in current stage.` });
      return;
    }

    if (matchToSimulate.status === "COMPLETED") {
      res.status(400).json({ success: false, message: `Match ${matchId} has already been completed.` });
      return;
    }

    if (matchToSimulate.day > state.currentDay + 1) {
      res.status(400).json({
        success: false,
        message: `Match is locked. You can only predict matches for Today and Tomorrow.`,
      });
      return;
    }

    const now = new Date();
    const kickoff = new Date(matchToSimulate.kickoffTime);
    if (now >= kickoff) {
      const isLive = now.getTime() < kickoff.getTime() + 2 * 60 * 60 * 1000;
      res.status(400).json({
        success: false,
        message: isLive
          ? "Match has already started and is currently live/in-progress. Predictions are closed."
          : "Match has concluded. You cannot predict past matches.",
      });
      return;
    }

    const teams = await storageService.loadTeams();
    const homeTeam = teams[matchToSimulate.homeTeamId];
    const awayTeam = teams[matchToSimulate.awayTeamId];

    if (!homeTeam || !awayTeam) {
      res.status(400).json({ success: false, message: "Home or Away team not found in database." });
      return;
    }

    const isKnockout = state.currentStage !== "GROUPS";
    
    const modifiers = await GeminiService.getMatchPredictionModifiers(
      homeTeam,
      awayTeam,
      matchToSimulate.stage
    );

    const result = simulationService.simulateMatch(homeTeam, awayTeam, isKnockout, modifiers);
    const localSummary = simulationService.generateWittySummary(homeTeam, awayTeam, result);

    const finalSummary = `🔮 ${modifiers.tacticalAnalysis} Recap: ${localSummary}`;

    const updateOutcome = tournamentService.updateMatchResultAndProgress(
      state,
      matchId,
      result,
      finalSummary
    );

    await storageService.saveTournamentState(updateOutcome.state);

    res.json({
      success: true,
      data: {
        match: updateOutcome.match,
        state: updateOutcome.state,
      },
    });
  };

  /**
   * Simulate all remaining matches scheduled for the active tournament day.
   */
  static simulateDay = async (req: Request, res: Response): Promise<void> => {
    const state = await storageService.loadTournamentState();
    if (!state) {
      res.status(400).json({ success: false, message: "Tournament has not been initialized." });
      return;
    }

    if (state.currentStage === "COMPLETED") {
      res.status(400).json({ success: false, message: "Tournament is already completed." });
      return;
    }

    // Retrieve pending matches scheduled on currentDay
    let pendingMatches: Match[] = [];
    if (state.currentStage === "GROUPS") {
      Object.values(state.groups).forEach((group) => {
        pendingMatches.push(...group.matches.filter((m) => m.day === state.currentDay && m.status === "PENDING"));
      });
    } else {
      const round = state.bracket[state.currentStage];
      if (round) {
        pendingMatches = round.matches.filter((m) => m.day === state.currentDay && m.status === "PENDING");
      }
    }

    if (pendingMatches.length === 0) {
      res.status(400).json({ success: false, message: `No pending matches to simulate on Day ${state.currentDay}.` });
      return;
    }

    const teams = await storageService.loadTeams();
    const isKnockout = state.currentStage !== "GROUPS";

    // Simulate each match in sequence
    for (const match of pendingMatches) {
      const homeTeam = teams[match.homeTeamId];
      const awayTeam = teams[match.awayTeamId];
      if (!homeTeam || !awayTeam) continue;

      const result = simulationService.simulateMatch(homeTeam, awayTeam, isKnockout);
      const summary = simulationService.generateWittySummary(homeTeam, awayTeam, result);

      tournamentService.updateMatchResultAndProgress(
        state,
        match.id,
        result,
        summary
      );
    }

    await storageService.saveTournamentState(state);

    res.json({ success: true, data: state });
  };

  /**
   * Fast forward the tournament calendar by 1 day (for developer testing).
   */
  static fastForwardDay = async (req: Request, res: Response): Promise<void> => {
    const state = await storageService.loadTournamentState();
    if (!state) {
      res.status(400).json({ success: false, message: "Tournament has not been initialized." });
      return;
    }

    state.dateOffset = (state.dateOffset || 0) + 1;

    // Recalculate currentDay
    const tournamentStart = new Date("2026-06-11T00:00:00");
    const now = new Date();
    const startDay = new Date(tournamentStart.getFullYear(), tournamentStart.getMonth(), tournamentStart.getDate());
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffTime = today.getTime() - startDay.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const baseDay = diffDays + 1 < 1 ? 1 : diffDays + 1;
    state.currentDay = Math.min(33, baseDay + state.dateOffset);

    await storageService.saveTournamentState(state);

    res.json({ success: true, data: state });
  };
}
