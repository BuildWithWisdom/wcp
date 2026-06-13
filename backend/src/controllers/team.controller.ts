import { Request, Response } from "express";
import { validationResult } from "express-validator";
import { StorageService } from "../services/storage.service";
import path from "path";
import fs from "fs/promises";

const storageService = new StorageService();
const DEFAULT_TEAMS_PATH = path.join(__dirname, "../../data/default_teams.json");

export class TeamController {
  /**
   * Get all teams.
   */
  static getTeams = async (req: Request, res: Response): Promise<void> => {
    const teams = await storageService.loadTeams();
    res.json({ success: true, data: teams });
  };

  /**
   * Update a team's parameters.
   */
  static updateTeam = async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const { id } = req.params;
    const { fifaPoints, squadValue } = req.body;

    const teams = await storageService.loadTeams();
    if (!teams[id]) {
      res.status(404).json({ success: false, message: `Team with ID ${id} not found.` });
      return;
    }

    // Update fields
    teams[id] = {
      ...teams[id],
      fifaPoints: Number(fifaPoints),
      squadValue: Number(squadValue),
    };

    await storageService.saveTeams(teams);

    res.json({ success: true, data: teams[id] });
  };

  /**
   * Reset all teams to default ratings.
   */
  static resetTeams = async (req: Request, res: Response): Promise<void> => {
    const defaultData = await fs.readFile(DEFAULT_TEAMS_PATH, "utf-8");
    const defaultTeams = JSON.parse(defaultData);

    await storageService.saveTeams(defaultTeams);

    res.json({ success: true, data: defaultTeams });
  };
}
