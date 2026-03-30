const mongoose = require("mongoose");

const fileAnalyticsDailySchema = new mongoose.Schema(
  {
    fileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "File",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    dateKey: {
      type: String,
      required: true,
      index: true,
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    uploadDate: {
      type: Date,
      default: null,
    },
    views: {
      type: Number,
      default: 0,
    },
    impressions: {
      type: Number,
      default: 0,
    },
    clicks: {
      type: Number,
      default: 0,
    },
    estimatedRevenue: {
      type: Number,
      default: 0,
    },
    userEarning: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

fileAnalyticsDailySchema.index({ fileId: 1, dateKey: 1 }, { unique: true });
fileAnalyticsDailySchema.index({ userId: 1, dateKey: 1 });

module.exports = mongoose.model("FileAnalyticsDaily", fileAnalyticsDailySchema);
