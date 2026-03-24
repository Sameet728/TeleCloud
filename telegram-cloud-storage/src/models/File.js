/**
 * models/File.js — File metadata schema
 * Actual bytes are stored in Telegram; we only keep metadata here
 */

const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema(
  {
    fileName: {
      type:     String,
      required: true,
      trim:     true,
      maxlength: [255, "File name too long"],
    },
    originalName: {
      type:     String,
      required: true,
      trim:     true,
    },
    mimeType: {
      type:    String,
      default: "application/octet-stream",
    },
    fileSize: {
      type:    Number,
      default: 0,  // bytes
    },
    // Telegram message ID in the user's Saved Messages chat
    messageId: {
      type:     Number,
      required: true,
    },
    folderId: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     "Folder",
      default: null,  // null = root
    },
    isStarred: {
      type:    Boolean,
      default: false,
    },
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
      index:    true,
    },
  },
  { timestamps: true }
);

// ── Indexes ────────────────────────────────────────────────────
fileSchema.index({ userId: 1, folderId: 1 });
fileSchema.index({ userId: 1, fileName: "text", originalName: "text" });

module.exports = mongoose.model("File", fileSchema);
