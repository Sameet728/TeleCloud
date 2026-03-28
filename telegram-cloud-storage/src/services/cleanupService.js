/**
 * services/cleanupService.js — Periodic maintenance and cleanup
 * Handles temp file cleanup, stale lock removal, and database maintenance
 */

const Song = require("../models/Song");
const youtubeDownloadService = require("./youtubeDownloadService");
const logger = require("../utils/logger");

class CleanupService {
  constructor() {
    this.isRunning = false;
    this.CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
    this.LOCK_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
  }

  /**
   * Start periodic cleanup tasks
   */
  start() {
    if (this.isRunning) {
      logger.warn("Cleanup service already running");
      return;
    }

    this.isRunning = true;
    logger.info("Cleanup service started");

    // Run cleanup periodically
    this.cleanupInterval = setInterval(
      () => this.runCleanup(),
      this.CLEANUP_INTERVAL_MS
    );

    // Initial cleanup after 1 minute
    setTimeout(() => this.runCleanup(), 60 * 1000);
  }

  /**
   * Stop cleanup service
   */
  stop() {
    this.isRunning = false;
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    logger.info("Cleanup service stopped");
  }

  /**
   * Run all cleanup tasks
   */
  async runCleanup() {
    try {
      logger.info("Starting cleanup cycle...");

      await Promise.all([
        this.cleanStaleLocks(),
        this.cleanTempFiles(),
        this.cleanFailedSongs(),
      ]);

      logger.info("Cleanup cycle completed");
    } catch (error) {
      logger.error("Cleanup cycle failed:", error.message);
    }
  }

  /**
   * Clear stale processing locks (downloads/uploads that timed out)
   */
  async cleanStaleLocks() {
    try {
      const staleTime = new Date(Date.now() - this.LOCK_TIMEOUT_MS);

      const result = await Song.updateMany(
        {
          status: { $in: ["downloading", "uploading"] },
          lastProcessedAt: { $lt: staleTime },
        },
        {
          $set: {
            status: "failed",
            errorMessage: "Processing timed out - lock cleared",
            lastProcessedAt: new Date(),
          },
        }
      );

      if (result.modifiedCount > 0) {
        logger.info(`Cleared ${result.modifiedCount} stale processing lock(s)`);
      }
    } catch (error) {
      logger.error("Failed to clean stale locks:", error.message);
    }
  }

  /**
   * Clean temporary files from disk
   */
  async cleanTempFiles() {
    try {
      await youtubeDownloadService.cleanupAll();
    } catch (error) {
      logger.error("Failed to clean temp files:", error.message);
    }
  }

  /**
   * Clean up old failed songs (older than 7 days)
   */
  async cleanFailedSongs() {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const result = await Song.deleteMany({
        status: "failed",
        updatedAt: { $lt: sevenDaysAgo },
      });

      if (result.deletedCount > 0) {
        logger.info(`Deleted ${result.deletedCount} old failed song record(s)`);
      }
    } catch (error) {
      logger.error("Failed to clean failed songs:", error.message);
    }
  }

  /**
   * Get cleanup statistics
   */
  async getStats() {
    try {
      const [
        totalSongs,
        readySongs,
        processingSongs,
        failedSongs,
      ] = await Promise.all([
        Song.countDocuments(),
        Song.countDocuments({ status: "ready" }),
        Song.countDocuments({ status: { $in: ["downloading", "uploading"] } }),
        Song.countDocuments({ status: "failed" }),
      ]);

      return {
        isRunning: this.isRunning,
        totalSongs,
        readySongs,
        processingSongs,
        failedSongs,
        nextCleanupIn: this.CLEANUP_INTERVAL_MS,
      };
    } catch (error) {
      logger.error("Failed to get cleanup stats:", error.message);
      return { error: error.message };
    }
  }
}

// Singleton instance
const cleanupService = new CleanupService();

module.exports = cleanupService;
