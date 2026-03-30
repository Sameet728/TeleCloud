const mongoose = require("mongoose");
const env = require("../config/env");

const monetizationEventSchema = new mongoose.Schema(
  {
    fileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "File",
      required: true,
      index: true,
    },
    ownerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    actorUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    shareId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Share",
      default: null,
      index: true,
    },
    eventType: {
      type: String,
      enum: ["view", "impression", "click"],
      required: true,
      index: true,
    },
    source: {
      type: String,
      required: true,
      trim: true,
    },
    viewerSessionId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    hashedIp: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    userAgentHash: {
      type: String,
      required: true,
      trim: true,
    },
    slotId: {
      type: String,
      default: null,
      trim: true,
    },
    dateKey: {
      type: String,
      required: true,
      index: true,
    },
    bucketStart: {
      type: Date,
      required: true,
      index: true,
    },
    accepted: {
      type: Boolean,
      default: false,
      index: true,
    },
    rejectionReason: {
      type: String,
      default: null,
      trim: true,
    },
    viewEventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MonetizationEvent",
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

monetizationEventSchema.index({
  eventType: 1,
  fileId: 1,
  viewerSessionId: 1,
  hashedIp: 1,
  dateKey: 1,
  bucketStart: 1,
});
monetizationEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: env.monetizationEventTtlSeconds });

module.exports = mongoose.model("MonetizationEvent", monetizationEventSchema);
