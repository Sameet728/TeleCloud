const mongoose = require("mongoose");

const revenueSettlementSchema = new mongoose.Schema(
  {
    dateKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    grossRevenue: {
      type: Number,
      required: true,
      default: 0,
    },
    trackedImpressions: {
      type: Number,
      required: true,
      default: 0,
    },
    reportedImpressions: {
      type: Number,
      default: null,
    },
    revenuePerImpression: {
      type: Number,
      default: 0,
    },
    creatorShareRatio: {
      type: Number,
      required: true,
      default: 0.7,
    },
    platformShareRatio: {
      type: Number,
      required: true,
      default: 0.3,
    },
    totalCreatorPayout: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      default: null,
      trim: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("RevenueSettlement", revenueSettlementSchema);
