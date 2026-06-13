import { Router } from "express";
import { body } from "express-validator";
import { TournamentController } from "../controllers/tournament.controller";

const router = Router();

router.get("/", TournamentController.getTournament);
router.post("/reset", TournamentController.resetTournament);

router.post(
  "/simulate-match",
  [
    body("matchId")
      .isString()
      .notEmpty()
      .withMessage("matchId is required and must be a string."),
  ],
  TournamentController.simulateMatch
);

router.post("/simulate-day", TournamentController.simulateDay);
router.post("/fast-forward", TournamentController.fastForwardDay);

export default router;
