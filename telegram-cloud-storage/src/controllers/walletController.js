const validator = require("validator");
const User = require("../models/User");
const WalletLedger = require("../models/WalletLedger");
const Withdrawal = require("../models/Withdrawal");
const env = require("../config/env");
const { asyncHandler, sendError, sendSuccess } = require("../utils/helpers");
const { refreshUserWallet } = require("../services/walletService");

const UPI_REGEX = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z]{2,64}$/;

exports.getWallet = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).lean();
  const [ledger, withdrawals] = await Promise.all([
    WalletLedger.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean(),
    Withdrawal.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean(),
  ]);

  sendSuccess(
    res,
    {
      summary: {
        walletBalance: user?.walletBalance || 0,
        pendingWithdrawalBalance: user?.pendingWithdrawalBalance || 0,
        totalEarned: user?.totalEarned || 0,
        totalWithdrawn: user?.totalWithdrawn || 0,
        defaultUpiId: user?.defaultUpiId || null,
      },
      ledger,
      withdrawals,
    },
    "Wallet retrieved"
  );
});

exports.getWithdrawals = asyncHandler(async (req, res) => {
  const withdrawals = await Withdrawal.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .lean();

  sendSuccess(res, { withdrawals }, "Withdrawals retrieved");
});

exports.requestWithdrawal = asyncHandler(async (req, res) => {
  const amount = Number(req.body?.amount || 0);
  const upiId = String(req.body?.upiId || "").trim();

  if (!Number.isFinite(amount) || amount <= 0) {
    return sendError(res, "Valid withdrawal amount is required", 400);
  }

  if (amount < env.minWithdrawalAmount) {
    return sendError(
      res,
      `Minimum withdrawal amount is ${env.minWithdrawalAmount}`,
      400
    );
  }

  if (!upiId || !validator.matches(upiId, UPI_REGEX)) {
    return sendError(res, "Valid UPI ID is required", 400);
  }

  await refreshUserWallet(req.user._id);
  const user = await User.findById(req.user._id);
  if (!user) return sendError(res, "User not found", 404);

  if (amount > (user.walletBalance || 0)) {
    return sendError(res, "Insufficient available balance", 400);
  }

  const withdrawal = await Withdrawal.create({
    userId: req.user._id,
    amount,
    upiId,
    status: "pending",
  });

  await Promise.all([
    WalletLedger.create({
      userId: req.user._id,
      entryType: "withdrawal_hold",
      amount,
      withdrawalId: withdrawal._id,
      notes: `Withdrawal requested to ${upiId}`,
    }),
    User.findByIdAndUpdate(req.user._id, { defaultUpiId: upiId }),
  ]);

  await refreshUserWallet(req.user._id);

  sendSuccess(res, { withdrawal }, "Withdrawal request created", 201);
});
