"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const team_controller_1 = require("../controllers/team.controller");
const router = (0, express_1.Router)();
router.get("/", team_controller_1.TeamController.getTeams);
router.put("/:id", [
    (0, express_validator_1.body)("fifaPoints")
        .isInt({ min: 500, max: 2500 })
        .withMessage("FIFA points must be an integer between 500 and 2500."),
    (0, express_validator_1.body)("squadValue")
        .isFloat({ min: 1, max: 5000 })
        .withMessage("Squad value must be a number between 1 and 5000."),
], team_controller_1.TeamController.updateTeam);
router.post("/reset", team_controller_1.TeamController.resetTeams);
exports.default = router;
