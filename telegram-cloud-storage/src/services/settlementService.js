const mongoose = require("mongoose");
const env = require("../config/env");
const File = require("../models/File");
const FileAnalyticsDaily = require("../models/FileAnalyticsDaily");
const RevenueSettlement = require("../models/RevenueSettlement");
const WalletLedger = require("../models/WalletLedger");
const { roundMoney, refreshUsersWallets } = require("./walletService");

const recalculateSettlementForDate = async ({
  dateKey,
  grossRevenue,
  reportedImpressions = null,
  notes = null,
  updatedBy = null,
}) => {
  const creatorShareRatio = env.creatorShareRatio;
  const platformShareRatio = roundMoney(1 - creatorShareRatio);

  const trackedAgg = await FileAnalyticsDaily.aggregate([
    { $match: { dateKey } },
    { $group: { _id: null, trackedImpressions: { $sum: "$impressions" } } },
  ]);

  const trackedImpressions = trackedAgg[0]?.trackedImpressions || 0;
  const gross = roundMoney(grossRevenue || 0);
  const revenuePerImpression = trackedImpressions > 0 ? gross / trackedImpressions : 0;

  const settlement = await RevenueSettlement.findOneAndUpdate(
    { dateKey },
    {
      grossRevenue: gross,
      trackedImpressions,
      reportedImpressions:
        reportedImpressions === null || reportedImpressions === undefined
          ? null
          : Number(reportedImpressions),
      revenuePerImpression,
      creatorShareRatio,
      platformShareRatio,
      notes,
      updatedBy,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const dailyRows = await FileAnalyticsDaily.find({ dateKey }).lean();
  const dailyOps = [];
  const userTotals = new Map();

  for (const row of dailyRows) {
    const estimatedRevenue =
      trackedImpressions > 0 ? row.impressions * revenuePerImpression : 0;
    const userEarning = estimatedRevenue * creatorShareRatio;

    dailyOps.push({
      updateOne: {
        filter: { _id: row._id },
        update: { $set: { estimatedRevenue, userEarning } },
      },
    });

    const key = String(row.userId);
    userTotals.set(key, (userTotals.get(key) || 0) + userEarning);
  }

  if (dailyOps.length) {
    await FileAnalyticsDaily.bulkWrite(dailyOps);
  }

  const previousCredits = await WalletLedger.find({
    entryType: "settlement_credit",
    dateKey,
  }).select("userId");

  const impactedUserIds = new Set(previousCredits.map((entry) => String(entry.userId)));
  const ledgerOps = [];

  for (const [userId, amount] of userTotals.entries()) {
    impactedUserIds.add(userId);
    ledgerOps.push({
      updateOne: {
        filter: {
          userId: new mongoose.Types.ObjectId(userId),
          entryType: "settlement_credit",
          dateKey,
        },
        update: {
          $set: {
            amount,
            settlementId: settlement._id,
            notes: `Settlement credit for ${dateKey}`,
            meta: {
              grossRevenue: gross,
              trackedImpressions,
              creatorShareRatio,
            },
          },
        },
        upsert: true,
      },
    });
  }

  if (ledgerOps.length) {
    await WalletLedger.bulkWrite(ledgerOps);
  }

  const activeUserIds = new Set(userTotals.keys());
  const staleUserIds = [...impactedUserIds].filter((userId) => !activeUserIds.has(userId));
  if (staleUserIds.length) {
    await WalletLedger.deleteMany({
      entryType: "settlement_credit",
      dateKey,
      userId: { $in: staleUserIds.map((userId) => new mongoose.Types.ObjectId(userId)) },
    });
  }

  const fileRollups = await FileAnalyticsDaily.aggregate([
    {
      $group: {
        _id: "$fileId",
        estimatedRevenue: { $sum: "$estimatedRevenue" },
        userEarning: { $sum: "$userEarning" },
      },
    },
  ]);

  if (fileRollups.length) {
    await File.bulkWrite(
      fileRollups.map((row) => ({
        updateOne: {
          filter: { _id: row._id },
          update: {
            $set: {
              estimatedRevenue: row.estimatedRevenue,
              userEarning: row.userEarning,
              lastSettledDate: dateKey,
            },
          },
        },
      }))
    );
  }

  const rolledUpFileIds = new Set(fileRollups.map((row) => String(row._id)));
  const staleFiles = await File.find({
    estimatedRevenue: { $gt: 0 },
    _id: { $nin: [...rolledUpFileIds].map((fileId) => new mongoose.Types.ObjectId(fileId)) },
  }).select("_id");

  if (staleFiles.length) {
    await File.updateMany(
      { _id: { $in: staleFiles.map((file) => file._id) } },
      {
        $set: {
          estimatedRevenue: 0,
          userEarning: 0,
          lastSettledDate: dateKey,
        },
      }
    );
  }

  settlement.totalCreatorPayout = roundMoney(
    [...userTotals.values()].reduce((sum, amount) => sum + amount, 0)
  );
  await settlement.save();

  await refreshUsersWallets([...impactedUserIds]);

  return {
    settlement,
    trackedImpressions,
    impactedUsers: [...impactedUserIds],
  };
};

module.exports = {
  recalculateSettlementForDate,
};
