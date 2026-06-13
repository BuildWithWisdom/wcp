"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageService = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const TEAMS_PATH = path_1.default.join(__dirname, "../../data/teams.json");
const STATE_PATH = path_1.default.join(__dirname, "../../data/tournament_state.json");
class StorageService {
    /**
     * Load the team database.
     */
    async loadTeams() {
        try {
            const data = await promises_1.default.readFile(TEAMS_PATH, "utf-8");
            return JSON.parse(data);
        }
        catch (error) {
            throw new Error("Failed to load teams. Seed file may be missing or corrupt.");
        }
    }
    /**
     * Save custom team ratings.
     */
    async saveTeams(teams) {
        await promises_1.default.writeFile(TEAMS_PATH, JSON.stringify(teams, null, 2), "utf-8");
    }
    /**
     * Load current tournament state.
     * If it doesn't exist, we return null to let the controller trigger init.
     */
    async loadTournamentState() {
        try {
            const data = await promises_1.default.readFile(STATE_PATH, "utf-8");
            const state = JSON.parse(data);
            if (state) {
                const tournamentStart = new Date("2026-06-11T00:00:00");
                const now = new Date();
                const startDay = new Date(tournamentStart.getFullYear(), tournamentStart.getMonth(), tournamentStart.getDate());
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const diffTime = today.getTime() - startDay.getTime();
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                const baseDay = diffDays + 1 < 1 ? 1 : diffDays + 1;
                state.currentDay = Math.min(33, baseDay + (state.dateOffset || 0));
            }
            return state;
        }
        catch (error) {
            return null;
        }
    }
    /**
     * Save tournament state.
     */
    async saveTournamentState(state) {
        await promises_1.default.writeFile(STATE_PATH, JSON.stringify(state, null, 2), "utf-8");
    }
}
exports.StorageService = StorageService;
