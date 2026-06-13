"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeamController = void 0;
const express_validator_1 = require("express-validator");
const storage_service_1 = require("../services/storage.service");
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const storageService = new storage_service_1.StorageService();
const DEFAULT_TEAMS_PATH = path_1.default.join(__dirname, "../../data/default_teams.json");
class TeamController {
    /**
     * Get all teams.
     */
    static getTeams = async (req, res) => {
        const teams = await storageService.loadTeams();
        res.json({ success: true, data: teams });
    };
    /**
     * Update a team's parameters.
     */
    static updateTeam = async (req, res) => {
        const errors = (0, express_validator_1.validationResult)(req);
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
    static resetTeams = async (req, res) => {
        const defaultData = await promises_1.default.readFile(DEFAULT_TEAMS_PATH, "utf-8");
        const defaultTeams = JSON.parse(defaultData);
        await storageService.saveTeams(defaultTeams);
        res.json({ success: true, data: defaultTeams });
    };
}
exports.TeamController = TeamController;
