/**
 * server.js - Application entry point
 * Bootstraps Express, MongoDB, and starts HTTP server
 */

require("dotenv").config();
const app = require("./src/app");
const connectDB = require("./src/config/db");
const logger = require("./src/utils/logger");
const { ensureAdminAccount } = require("./src/services/adminBootstrapService");

const PORT = process.env.PORT || 5000;

// Connect to MongoDB then start server
connectDB()
  .then(() => ensureAdminAccount().catch((err) => {
    logger.error("Failed to bootstrap admin account:", err);
  }))
  .then(() => {
    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT} [${process.env.NODE_ENV}]`);
      logger.info(`Server running on port ${PORT} [${process.env.NODE_ENV}]`);
    });

    // Critical: large file uploads/streams need long timeouts
    server.setTimeout(15 * 60 * 1000);
    server.headersTimeout = 15 * 60 * 1000 + 10_000;
    server.keepAliveTimeout = 5 * 60 * 1000;
  })
  .catch((err) => {
    logger.error("Failed to connect to MongoDB:", err);
    process.exit(1);
  });

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled Rejection:", reason);
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception:", err);
  process.exit(1);
});
