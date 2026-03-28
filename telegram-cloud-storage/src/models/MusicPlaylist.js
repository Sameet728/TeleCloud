const mongoose = require("mongoose");

const playlistItemSchema = new mongoose.Schema(
  {
    videoId: { type: String, required: true },
    title: { type: String, default: "" },
    artist: { type: String, default: "" },
    thumbnail: { type: String, default: "" },
    duration: { type: String, default: "" },
    album: { type: String, default: "" },
  },
  { _id: false }
);

const musicPlaylistSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    slug: {
      type: String,
      default: "",
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 280,
    },
    cover: {
      type: String,
      default: "",
      trim: true,
    },
    isSystem: {
      type: Boolean,
      default: false,
    },
    tracks: {
      type: [playlistItemSchema],
      default: [],
    },
  },
  { timestamps: true }
);

musicPlaylistSchema.index({ userId: 1, createdAt: -1 });
musicPlaylistSchema.index({ userId: 1, slug: 1 });

module.exports = mongoose.model("MusicPlaylist", musicPlaylistSchema);
