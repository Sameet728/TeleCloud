const mongoose = require("mongoose");

const musicFavoriteSchema = new mongoose.Schema(
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
  },
  { timestamps: true }
);

musicFavoriteSchema.index({ userId: 1, videoId: 1 }, { unique: true });

module.exports = mongoose.model("MusicFavorite", musicFavoriteSchema);
