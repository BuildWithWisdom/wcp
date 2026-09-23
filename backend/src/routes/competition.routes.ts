import { Router } from "express";
import { getDb } from "../db";
import * as schema from "../db/schema";

const router = Router();

router.get("/", (_req, res) => {
  const list = getDb().select().from(schema.competitions).all();
  res.json({ success: true, data: list });
});

export default router;
