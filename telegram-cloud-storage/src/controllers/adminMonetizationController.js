const mongoose = require("mongoose");
const User = require("../models/User");
const File = require("../models/File");
const RevenueSettlement = require("../models/RevenueSettlement");
const Withdrawal = require("../models/Withdrawal");
const WalletLedger = require("../models/WalletLedger");
const { asyncHandler, sendError, sendSuccess } = require("../utils/helpers");
const { recalculateSettlementForDate } = require("../services/settlementService");
const { refreshUserWallet } = require("../services/walletService");

exports.updateRevenue = asyncHandler(async (req, res) => {
  const dateKey = String(req.body?.dateKey || "").trim();
  const grossRevenue = Number(req.body?.grossRevenue || 0);
  const reportedImpressions =
    req.body?.reportedImpressions === undefined || req.body?.reportedImpressions === null
      ? null
      : Number(req.body.reportedImpressions);
  const notes = String(req.body?.notes || "").trim() || null;

  if (!dateKey) return sendError(res, "dateKey is required", 400);
  if (!Number.isFinite(grossRevenue) || grossRevenue < 0) {
    return sendError(res, "grossRevenue must be a non-negative number", 400);
  }

  const result = await recalculateSettlementForDate({
    dateKey,
    grossRevenue,
    reportedImpressions,
    notes,
    updatedBy: req.user._id,
  });

  sendSuccess(res, result, "Revenue settlement recalculated");
});

exports.getSettlementHistory = asyncHandler(async (_req, res) => {
  const settlements = await RevenueSettlement.find({})
    .sort({ dateKey: -1 })
    .limit(90)
    .populate("updatedBy", "email")
    .lean();

  sendSuccess(res, { settlements }, "Settlement history retrieved");
});

exports.getWithdrawals = asyncHandler(async (req, res) => {
  const status = String(req.query?.status || "").trim();
  const query = status ? { status } : {};

  const withdrawals = await Withdrawal.find(query)
    .sort({ createdAt: -1 })
    .populate("userId", "email walletBalance pendingWithdrawalBalance totalEarned totalWithdrawn")
    .populate("processedBy", "email")
    .lean();

  sendSuccess(res, { withdrawals }, "Withdrawals retrieved");
});

exports.updateWithdrawal = asyncHandler(async (req, res) => {
  const { action, transactionId, notes } = req.body || {};
  const withdrawal = await Withdrawal.findById(req.params.id);
  if (!withdrawal) return sendError(res, "Withdrawal not found", 404);

  if (!["approve", "reject", "complete"].includes(action)) {
    return sendError(res, "Valid action is required", 400);
  }

  if (action === "approve") {
    if (withdrawal.status !== "pending") {
      return sendError(res, "Only pending withdrawals can be approved", 400);
    }

    withdrawal.status = "approved";
    withdrawal.processedBy = req.user._id;
    withdrawal.processedAt = new Date();
    withdrawal.notes = String(notes || "").trim() || withdrawal.notes;
    await withdrawal.save();
  }

  if (action === "reject") {
    if (!["pending", "approved"].includes(withdrawal.status)) {
      return sendError(res, "Only pending or approved withdrawals can be rejected", 400);
    }

    withdrawal.status = "rejected";
    withdrawal.processedBy = req.user._id;
    withdrawal.processedAt = new Date();
    withdrawal.notes = String(notes || "").trim() || withdrawal.notes;
    await withdrawal.save();

    await WalletLedger.create({
      userId: withdrawal.userId,
      entryType: "withdrawal_release",
      amount: withdrawal.amount,
      withdrawalId: withdrawal._id,
      notes: withdrawal.notes || "Withdrawal rejected",
    });
  }

  if (action === "complete") {
    if (withdrawal.status !== "approved") {
      return sendError(res, "Only approved withdrawals can be completed", 400);
    }

    const txn = String(transactionId || "").trim();
    if (!txn) {
      return sendError(res, "transactionId is required to complete payout", 400);
    }

    withdrawal.status = "completed";
    withdrawal.transactionId = txn;
    withdrawal.processedBy = req.user._id;
    withdrawal.processedAt = withdrawal.processedAt || new Date();
    withdrawal.completedAt = new Date();
    withdrawal.notes = String(notes || "").trim() || withdrawal.notes;
    await withdrawal.save();

    await WalletLedger.create({
      userId: withdrawal.userId,
      entryType: "withdrawal_completed",
      amount: withdrawal.amount,
      withdrawalId: withdrawal._id,
      notes: `Withdrawal completed (${txn})`,
    });
  }

  await refreshUserWallet(withdrawal.userId);

  const updated = await Withdrawal.findById(withdrawal._id)
    .populate("userId", "email walletBalance pendingWithdrawalBalance totalEarned totalWithdrawn")
    .populate("processedBy", "email")
    .lean();

  sendSuccess(res, { withdrawal: updated }, "Withdrawal updated");
});

exports.getUsers = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query?.page || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query?.limit || "20", 10), 1), 100);
  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    User.find({ role: "user" })
      .sort({ totalEarned: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments({ role: "user" }),
  ]);

  const userIds = users.map((user) => user._id);
  const [fileStats, topFiles] = await Promise.all([
    File.aggregate([
      { $match: { userId: { $in: userIds } } },
      {
        $group: {
          _id: "$userId",
          uploadCount: { $sum: 1 },
        },
      },
    ]),
    File.aggregate([
      { $match: { userId: { $in: userIds } } },
      { $sort: { userEarning: -1, createdAt: -1 } },
      {
        $group: {
          _id: "$userId",
          files: {
            $push: {
              _id: "$_id",
              fileName: "$fileName",
              userEarning: "$userEarning",
              estimatedRevenue: "$estimatedRevenue",
              impressions: "$impressions",
            },
          },
        },
      },
    ]),
  ]);

  const countMap = new Map(fileStats.map((row) => [String(row._id), row.uploadCount]));
  const topFileMap = new Map(
    topFiles.map((row) => [String(row._id), (row.files || []).slice(0, 3)])
  );

  sendSuccess(
    res,
    {
      users: users.map((user) => ({
        _id: user._id,
        email: user.email,
        totalEarned: user.totalEarned || 0,
        walletBalance: user.walletBalance || 0,
        pendingWithdrawalBalance: user.pendingWithdrawalBalance || 0,
        totalWithdrawn: user.totalWithdrawn || 0,
        uploadCount: countMap.get(String(user._id)) || 0,
        topFiles: topFileMap.get(String(user._id)) || [],
        createdAt: user.createdAt,
      })),
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    },
    "Admin user monetization data retrieved"
  );
});
