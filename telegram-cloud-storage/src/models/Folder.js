/**
 * models/Folder.js — Folder schema
 * Supports unlimited nesting via parentFolderId
 */

const mongoose = require("mongoose");

const folderSchema = new mongoose.Schema(
  {
    name: {
      type:     String,
      required: [true, "Folder name is required"],
      trim:     true,
      maxlength: [100, "Folder name too long"],
    },
    parentFolderId: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     "Folder",
      default: null,  // null = root level
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
    color: {
      type:    String,
      default: "#6366f1",
    },
  },
  { timestamps: true }
);

folderSchema.index({ userId: 1, parentFolderId: 1 });
folderSchema.index({ userId: 1, name: "text" });

module.exports = mongoose.model("Folder", folderSchema);
