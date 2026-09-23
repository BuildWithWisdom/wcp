import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { param } from "express-validator";
import { asyncHandler } from "../middleware/error.middleware";
import { FixtureController } from "../controllers/fixture.controller";

const router = Router();

// Protects the Gemini-backed predict endpoint on top of the global limiter
const predictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many predictions from this IP. Please try again later.",
  },
});

router.get("/", asyncHandler(FixtureController.list));

router.post(
  "/:id/predict",
  predictLimiter,
  param("id").isString().trim().notEmpty(),
  asyncHandler(FixtureController.predict)
);

export default router;
