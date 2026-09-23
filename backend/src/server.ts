import dns from "dns";
import dotenv from "dotenv";

// Force IPv4-first resolution to prevent Node.js fetch dual-stack timeouts
dns.setDefaultResultOrder("ipv4first");

// Load environment variables before anything reads them
dotenv.config();

import { buildApp } from "./app";
import { getDb } from "./db";
import { startSyncScheduler } from "./services/sync.service";

const PORT = process.env.PORT || 3001;

getDb(); // run migrations + seed competitions on boot
startSyncScheduler();

const app = buildApp();

app.listen(PORT, () => {
  console.log(
    `World Cup Oracle Backend is running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`
  );
});
