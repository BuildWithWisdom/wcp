import { Router } from "express";
import { body } from "express-validator";
import { TeamController } from "../controllers/team.controller";

const router = Router();

router.get("/", TeamController.getTeams);

router.put(
  "/:id",
  [
    body("fifaPoints")
      .isInt({ min: 500, max: 2500 })
      .withMessage("FIFA points must be an integer between 500 and 2500."),
    body("squadValue")
      .isFloat({ min: 1, max: 5000 })
      .withMessage("Squad value must be a number between 1 and 5000."),
  ],
  TeamController.updateTeam
);

router.post("/reset", TeamController.resetTeams);

export default router;
