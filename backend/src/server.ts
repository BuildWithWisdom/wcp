import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import teamRoutes from "./routes/team.routes";
import tournamentRoutes from "./routes/tournament.routes";
import { errorHandler } from "./middleware/error.middleware";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// 1. Security Headers via Helmet
app.use(helmet());

// 2. Cross-Origin Resource Sharing (CORS) Configuration
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:3000"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

// 3. Global Rate Limiter (Prevent brute-force / server overload)
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

// 4. Request Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Healthcheck Route
app.get("/health", (_req, res) => {
  res.json({ success: true, status: "UP", timestamp: new Date() });
});

// 5. Route Mounts
app.use("/api/teams", teamRoutes);
app.use("/api/tournament", tournamentRoutes);

// 6. Centralized Error Handler Middleware (Must be registered last)
app.use(errorHandler);

// Boot server
app.listen(PORT, () => {
  console.log(`World Cup Oracle Backend is running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`);
});
