"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const tournament_controller_1 = require("../controllers/tournament.controller");
const error_middleware_1 = require("../middleware/error.middleware");
const router = (0, express_1.Router)();
router.get("/", (0, error_middleware_1.asyncHandler)(tournament_controller_1.TournamentController.getTournament));
router.post("/reset", (0, error_middleware_1.asyncHandler)(tournament_controller_1.TournamentController.resetTournament));
router.post("/simulate-match", [
    (0, express_validator_1.body)("matchId")
        .isString()
        .notEmpty()
        .withMessage("matchId is required and must be a string."),
], (0, error_middleware_1.asyncHandler)(tournament_controller_1.TournamentController.simulateMatch));
router.post("/simulate-day", (0, error_middleware_1.asyncHandler)(tournament_controller_1.TournamentController.simulateDay));
router.post("/fast-forward", (0, error_middleware_1.asyncHandler)(tournament_controller_1.TournamentController.fastForwardDay));
exports.default = router;
