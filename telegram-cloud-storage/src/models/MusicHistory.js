const mongoose = require("mongoose");

const musicHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    videoId: { type: String, required: true },
    title: { type: String, default: "" },
    artist: { type: String, default: "" },
    thumbnail: { type: String, default: "" },
    duration: { type: String, default: "" },
    album: { type: String, default: "" },
    playedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

musicHistorySchema.index({ userId: 1, playedAt: -1 });
musicHistorySchema.index({ userId: 1, videoId: 1 });

module.exports = mongoose.model("MusicHistory", musicHistorySchema);
