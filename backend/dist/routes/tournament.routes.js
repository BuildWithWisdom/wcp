"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const tournament_controller_1 = require("../controllers/tournament.controller");
const router = (0, express_1.Router)();
router.get("/", tournament_controller_1.TournamentController.getTournament);
router.post("/reset", tournament_controller_1.TournamentController.resetTournament);
router.post("/simulate-match", [
    (0, express_validator_1.body)("matchId")
        .isString()
        .notEmpty()
        .withMessage("matchId is required and must be a string."),
], tournament_controller_1.TournamentController.simulateMatch);
router.post("/simulate-day", tournament_controller_1.TournamentController.simulateDay);
router.post("/fast-forward", tournament_controller_1.TournamentController.fastForwardDay);
exports.default = router;
