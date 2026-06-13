import { Router } from "express";
import { body } from "express-validator";
import { TournamentController } from "../controllers/tournament.controller";
import { asyncHandler } from "../middleware/error.middleware";

const router = Router();

router.get("/", asyncHandler(TournamentController.getTournament));
router.post("/reset", asyncHandler(TournamentController.resetTournament));

router.post(
  "/simulate-match",
  [
    body("matchId")
      .isString()
      .notEmpty()
      .withMessage("matchId is required and must be a string."),
  ],
  asyncHandler(TournamentController.simulateMatch)
);

router.post("/simulate-day", asyncHandler(TournamentController.simulateDay));
router.post("/fast-forward", asyncHandler(TournamentController.fastForwardDay));

export default router;
