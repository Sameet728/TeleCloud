/**
 * models/Song.js — Cached YouTube song schema
 * Stores Telegram file references for YouTube audio to avoid re-downloading
 */

const mongoose = require("mongoose");

const songSchema = new mongoose.Schema(
  {
    videoId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    artist: {
      type: String,
      default: "",
      trim: true,
    },
    thumbnail: {
      type: String,
      default: "",
    },
    duration: {
      type: Number, // in seconds
      default: 0,
    },
    // Telegram storage reference
    telegramFileId: {
      type: String,
      default: "",
      index: true,
    },
    telegramMessageId: {
      type: Number,
      default: null,
    },
    telegramChatId: {
      type: String,
      default: null,
    },
    // File metadata
    fileSize: {
      type: Number,
      default: 0,
    },
    mimeType: {
      type: String,
      default: "audio/webm",
    },
    // Upload tracking
    uploadedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    // Status tracking for queue system
    status: {
      type: String,
      enum: ["downloading", "uploading", "ready", "failed"],
      default: "ready",
      index: true,
    },
    // Processing metadata
    downloadAttempts: {
      type: Number,
      default: 0,
    },
    uploadAttempts: {
      type: Number,
      default: 0,
    },
    lastProcessedAt: {
      type: Date,
      default: Date.now,
    },
    errorMessage: {
      type: String,
      default: "",
    },
    failureCount: {
      type: Number,
      default: 0,
    },
    nextRetryAt: {
      type: Date,
      default: null,
    },
    // Access tracking
    playCount: {
      type: Number,
      default: 0,
    },
    lastPlayedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Indexes for efficient queries
songSchema.index({ videoId: 1, status: 1 });
songSchema.index({ uploadedByUserId: 1, createdAt: -1 });
songSchema.index({ status: 1, createdAt: 1 }); // For queue processing
songSchema.index({ playCount: -1 }); // For trending

// Static method: Find or create lock for videoId
songSchema.statics.acquireProcessingLock = async function(videoId) {
  const LOCK_DURATION_MS = 5 * 60 * 1000; // 5 minutes
  
  const existing = await this.findOne({ videoId });
  
  if (existing && (existing.status === "downloading" || existing.status === "uploading")) {
    // Check if lock is stale
    if (existing.lastProcessedAt && 
        Date.now() - new Date(existing.lastProcessedAt).getTime() > LOCK_DURATION_MS) {
      // Lock is stale, reset it
      await this.updateOne(
        { videoId },
        { 
          $set: { 
            status: "ready",
            errorMessage: "Lock expired due to timeout"
          } 
        }
      );
      return true; // Can proceed
    }
    return false; // Already being processed
  }
  
  return true; // Can proceed
};

// Static method: Mark as being processed
songSchema.statics.markAsProcessing = async function(videoId, userId) {
  return this.findOneAndUpdate(
    { videoId },
    {
      $set: {
        status: "downloading",
        lastProcessedAt: new Date(),
        uploadedByUserId: userId,
      },
      $inc: { downloadAttempts: 1 },
    },
    { upsert: true, new: true }
  );
};

// Instance method: Update play statistics
songSchema.methods.incrementPlayCount = async function() {
  this.playCount += 1;
  this.lastPlayedAt = new Date();
  return this.save();
};

module.exports = mongoose.model("Song", songSchema);
