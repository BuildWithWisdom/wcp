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
let PERSISTENT_DIR = DATA_DIR;
if (process.env.PERSISTENT_DATA_DIR) {
    try {
        const testDir = process.env.PERSISTENT_DATA_DIR;
        (0, fs_1.mkdirSync)(testDir, { recursive: true });
        const testFile = path_1.default.join(testDir, ".write_test");
        (0, fs_1.writeFileSync)(testFile, "test", "utf-8");
        (0, fs_1.unlinkSync)(testFile);
        PERSISTENT_DIR = testDir;
        console.log(`Successfully verified write access to persistent storage directory: ${testDir}`);
    }
    catch (error) {
        console.error(`Warning: Persistent storage directory ${process.env.PERSISTENT_DATA_DIR} is not writable. Falling back to local data directory. Error:`, error);
        PERSISTENT_DIR = DATA_DIR;
    }
}
const TEAMS_PATH = path_1.default.join(PERSISTENT_DIR, "teams.json");
const STATE_PATH = path_1.default.join(PERSISTENT_DIR, "tournament_state.json");
const SEED_TEAMS_PATH = path_1.default.join(DATA_DIR, "teams.json");
class StorageService {
    /**
     * Load the team database.
     */
    async loadTeams() {
        try {
            let data = null;
            let parsed = null;
            // 1. Try to read and parse existing persistent file if it exists
            if ((0, fs_1.existsSync)(TEAMS_PATH)) {
                try {
                    data = await promises_1.default.readFile(TEAMS_PATH, "utf-8");
                    if (data && data.trim().length > 0) {
                        parsed = JSON.parse(data);
                    }
                }
                catch (readErr) {
                    console.warn("Warning: Existing teams.json in persistent storage is empty or corrupt. Overwriting with seed defaults.", readErr);
                }
            }
            // 2. If file doesn't exist, is empty, or is corrupted, seed it from built-in file
            if (!parsed && (0, fs_1.existsSync)(SEED_TEAMS_PATH)) {
                await promises_1.default.mkdir(PERSISTENT_DIR, { recursive: true });
                const seedData = await promises_1.default.readFile(SEED_TEAMS_PATH, "utf-8");
                parsed = JSON.parse(seedData);
                await promises_1.default.writeFile(TEAMS_PATH, seedData, "utf-8");
                console.log("Successfully seeded default team ratings to persistent storage.");
            }
            if (!parsed) {
                throw new Error("Teams database is empty and no seed data is available.");
            }
            return parsed;
        }
        catch (error) {
            console.error("Detailed loadTeams error:", error);
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
