import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { body, param } from "express-validator";
import { asyncHandler } from "../middleware/error.middleware";
import { optionalDeviceId, requireDeviceId } from "../middleware/device";
import { FixtureController } from "../controllers/fixture.controller";

const router = Router();

// Protects the Gemini-backed Oracle endpoint on top of the global limiter
const suggestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many Oracle requests from this IP. Please try again later.",
  },
});

router.get("/", optionalDeviceId, asyncHandler(FixtureController.list));

router.post(
  "/:id/predictions",
  requireDeviceId,
  param("id").isString().trim().notEmpty(),
  body("homeScore").isInt({ min: 0, max: 20 }).withMessage("homeScore must be an integer between 0 and 20."),
  body("awayScore").isInt({ min: 0, max: 20 }).withMessage("awayScore must be an integer between 0 and 20."),
  asyncHandler(FixtureController.predict)
);

router.post(
  "/:id/suggest",
  suggestLimiter,
  param("id").isString().trim().notEmpty(),
  asyncHandler(FixtureController.suggest)
);

export default router;
