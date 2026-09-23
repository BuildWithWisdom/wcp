import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import teamRoutes from "./routes/team.routes";
import tournamentRoutes from "./routes/tournament.routes";
import { errorHandler } from "./middleware/error.middleware";
import { getDb } from "./db";
import { competitions } from "./db/schema";

/**
 * Builds the Express application without listening — importable in tests.
 */
export function buildApp(): express.Express {
  const app = express();
  app.set("trust proxy", 1);

  // Security Headers via Helmet
  app.use(helmet());

  // Cross-Origin Resource Sharing (CORS) Configuration
  const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",")
    : ["http://localhost:5173", "http://localhost:3000"];

  app.use(
    cors({
      origin: allowedOrigins,
      methods: ["GET", "POST", "PUT", "DELETE"],
      credentials: true,
    })
  );

  // Global Rate Limiter (Prevent brute-force / server overload)
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300, // Limit each IP to 300 requests per window
    message: {
      success: false,
      message: "Too many requests from this IP. Please try again later.",
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);

  // Request Body Parsers
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Healthcheck Route
  app.get("/health", (_req, res) => {
    res.json({ success: true, status: "UP", timestamp: new Date() });
  });

  // Route Mounts
  app.use("/api/teams", teamRoutes);
  app.use("/api/tournament", tournamentRoutes);

  app.get("/api/competitions", (_req, res) => {
    const list = getDb().select().from(competitions).all();
    res.json({ success: true, data: list });
  });

  // 404 for unknown routes (JSON, not Express default HTML)
  app.use((_req, res) => {
    res.status(404).json({ success: false, message: "Not found" });
  });

  // Centralized Error Handler Middleware (Must be registered last)
  app.use(errorHandler);

  return app;
}
