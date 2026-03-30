const User = require("../models/User");
const Withdrawal = require("../models/Withdrawal");
const WalletLedger = require("../models/WalletLedger");

const roundMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;

const refreshUserWallet = async (userId) => {
  const [earnedAgg, withdrawnAgg, pendingAgg] = await Promise.all([
    WalletLedger.aggregate([
      { $match: { userId, entryType: "settlement_credit" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    WalletLedger.aggregate([
      { $match: { userId, entryType: "withdrawal_completed" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Withdrawal.aggregate([
      { $match: { userId, status: { $in: ["pending", "approved"] } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
  ]);

  const totalEarned = roundMoney(earnedAgg[0]?.total || 0);
  const totalWithdrawn = roundMoney(withdrawnAgg[0]?.total || 0);
  const pendingWithdrawalBalance = roundMoney(pendingAgg[0]?.total || 0);
  const walletBalance = roundMoney(
    Math.max(0, totalEarned - totalWithdrawn - pendingWithdrawalBalance)
  );

  await User.findByIdAndUpdate(userId, {
    totalEarned,
    totalWithdrawn,
    pendingWithdrawalBalance,
    walletBalance,
  });

  return {
    totalEarned,
    totalWithdrawn,
    pendingWithdrawalBalance,
    walletBalance,
  };
};

const refreshUsersWallets = async (userIds = []) => {
  const uniqueIds = [...new Set(userIds.map((id) => String(id)).filter(Boolean))];
  const results = [];

  for (const userId of uniqueIds) {
    results.push(await refreshUserWallet(userId));
  }

  return results;
};

module.exports = {
  roundMoney,
  refreshUserWallet,
  refreshUsersWallets,
};
