/**
 * models/Share.js — Public share link schema
 * Token-based sharing; owner's Telegram session used to stream
 */

const mongoose = require("mongoose");

const shareSchema = new mongoose.Schema(
  {
    token: {
      type:     String,
      required: true,
      unique:   true,
      index:    true,
    },
    fileId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "File",
    },
    folderId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "Folder",
    },
    password: {
      type:     String,
      default:  null, // Hashed password, null = no password
    },
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
    },
    expiresAt: {
      type:    Date,
      default: null, // null = never expires
    },
    maxDownloads: {
      type:    Number,
      default: null, // null = unlimited
    },
    downloadCount: {
      type:    Number,
      default: 0,
    },
    allowDownload: {
      type:    Boolean,
      default: true,
    },
    isRevoked: {
      type:    Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// ── Virtual: isActive ──────────────────────────────────────────
shareSchema.virtual("isActive").get(function () {
  if (this.isRevoked) return false;
  if (this.expiresAt && new Date() > this.expiresAt) return false;
  if (this.maxDownloads !== null && this.downloadCount >= this.maxDownloads) return false;
  return true;
});

module.exports = mongoose.model("Share", shareSchema);
