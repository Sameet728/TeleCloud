const mongoose = require("mongoose");

const walletLedgerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    entryType: {
      type: String,
      enum: [
        "settlement_credit",
        "withdrawal_hold",
        "withdrawal_release",
        "withdrawal_completed",
      ],
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    dateKey: {
      type: String,
      default: null,
      index: true,
    },
    settlementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RevenueSettlement",
      default: null,
    },
    withdrawalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Withdrawal",
      default: null,
      index: true,
    },
    notes: {
      type: String,
      default: null,
      trim: true,
    },
    meta: {
      type: Object,
      default: {},
    },
  },
  { timestamps: true }
);

walletLedgerSchema.index({ userId: 1, entryType: 1, dateKey: 1 });

module.exports = mongoose.model("WalletLedger", walletLedgerSchema);
