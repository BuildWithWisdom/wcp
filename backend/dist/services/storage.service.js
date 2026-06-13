"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageService = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const fs_1 = require("fs");
const DATA_DIR = path_1.default.join(__dirname, "../../data");
const PERSISTENT_DIR = process.env.PERSISTENT_DATA_DIR || DATA_DIR;
const TEAMS_PATH = path_1.default.join(PERSISTENT_DIR, "teams.json");
const STATE_PATH = path_1.default.join(PERSISTENT_DIR, "tournament_state.json");
const SEED_TEAMS_PATH = path_1.default.join(DATA_DIR, "teams.json");
class StorageService {
    /**
     * Load the team database.
     */
    async loadTeams() {
        try {
            // Auto-seed teams.json to persistent volume if missing
            if (!(0, fs_1.existsSync)(TEAMS_PATH) && (0, fs_1.existsSync)(SEED_TEAMS_PATH)) {
                await promises_1.default.mkdir(PERSISTENT_DIR, { recursive: true });
                const seedData = await promises_1.default.readFile(SEED_TEAMS_PATH, "utf-8");
                await promises_1.default.writeFile(TEAMS_PATH, seedData, "utf-8");
            }
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
