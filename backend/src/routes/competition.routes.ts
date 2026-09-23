import { Router } from "express";
import { asyncHandler } from "../middleware/error.middleware";
import { getDb } from "../db";
import * as schema from "../db/schema";
import { getStandings } from "../controllers/stats.controller";

const router = Router();

router.get("/", (_req, res) => {
  const list = getDb().select().from(schema.competitions).all();
  res.json({ success: true, data: list });
});

router.get("/:id/standings", asyncHandler(getStandings));

export default router;
