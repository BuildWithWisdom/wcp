"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const dotenv_1 = __importDefault(require("dotenv"));
const team_routes_1 = __importDefault(require("./routes/team.routes"));
const tournament_routes_1 = __importDefault(require("./routes/tournament.routes"));
const error_middleware_1 = require("./middleware/error.middleware");
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// 1. Security Headers via Helmet
app.use((0, helmet_1.default)());
// 2. Cross-Origin Resource Sharing (CORS) Configuration
app.use((0, cors_1.default)({
    origin: ["http://localhost:5173", "http://localhost:3000"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
}));
// 3. Global Rate Limiter (Prevent brute-force / server overload)
const limiter = (0, express_rate_limit_1.default)({
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
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Healthcheck Route
app.get("/health", (_req, res) => {
    res.json({ success: true, status: "UP", timestamp: new Date() });
});
// 5. Route Mounts
app.use("/api/teams", team_routes_1.default);
app.use("/api/tournament", tournament_routes_1.default);
// 6. Centralized Error Handler Middleware (Must be registered last)
app.use(error_middleware_1.errorHandler);
// Boot server
app.listen(PORT, () => {
    console.log(`World Cup Oracle Backend is running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`);
});
