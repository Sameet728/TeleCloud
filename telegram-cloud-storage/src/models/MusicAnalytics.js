const mongoose = require("mongoose");

const musicAnalyticsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    videoId: { type: String, required: true },
    playCount: { type: Number, default: 0 },
    skipCount: { type: Number, default: 0 },
    watchSeconds: { type: Number, default: 0 },
  },
  { timestamps: true }
);

musicAnalyticsSchema.index({ userId: 1, videoId: 1 }, { unique: true });

module.exports = mongoose.model("MusicAnalytics", musicAnalyticsSchema);
