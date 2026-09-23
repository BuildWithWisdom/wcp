import { Router } from "express";
import { asyncHandler } from "../middleware/error.middleware";
import { requireDeviceId } from "../middleware/device";
import { StatsController } from "../controllers/stats.controller";

const router = Router();

router.get("/", requireDeviceId, asyncHandler(StatsController.summary));

export default router;
