const File = require("../models/File");
const User = require("../models/User");
const Withdrawal = require("../models/Withdrawal");
const FileAnalyticsDaily = require("../models/FileAnalyticsDaily");
const { asyncHandler, sendSuccess } = require("../utils/helpers");
const { getDateRangeKeys } = require("../services/monetizationService");

exports.getAnalytics = asyncHandler(async (req, res) => {
  const { from, to } = getDateRangeKeys(req.query || {});
  const userId = req.user._id;

  const [user, files, timeline, pendingWithdrawals] = await Promise.all([
    User.findById(userId).lean(),
    File.find({ userId })
      .sort({ userEarning: -1, createdAt: -1 })
      .select(
        "fileName views impressions clicks estimatedRevenue userEarning createdAt mimeType fileSize"
      )
      .lean(),
    FileAnalyticsDaily.aggregate([
      {
        $match: {
          userId,
          dateKey: { $gte: from, $lte: to },
        },
      },
      {
        $group: {
          _id: "$dateKey",
          earnings: { $sum: "$userEarning" },
          views: { $sum: "$views" },
          impressions: { $sum: "$impressions" },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Withdrawal.aggregate([
      {
        $match: {
          userId,
          status: { $in: ["pending", "approved"] },
        },
      },
      {
        $group: {
          _id: null,
          amount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const pendingSummary = pendingWithdrawals[0] || { amount: 0, count: 0 };
  const topFiles = [...files]
    .sort((a, b) => (b.userEarning || 0) - (a.userEarning || 0))
    .slice(0, 8);

  sendSuccess(
    res,
    {
      overview: {
        estimatedEarnings: user?.totalEarned || 0,
        totalViews: files.reduce((sum, file) => sum + (file.views || 0), 0),
        totalImpressions: files.reduce((sum, file) => sum + (file.impressions || 0), 0),
        totalFilesUploaded: files.length,
        walletBalance: user?.walletBalance || 0,
        pendingWithdrawalsAmount: pendingSummary.amount || 0,
        pendingWithdrawalsCount: pendingSummary.count || 0,
      },
      charts: {
        earnings: timeline.map((item) => ({
          date: item._id,
          amount: item.earnings || 0,
        })),
        views: timeline.map((item) => ({
          date: item._id,
          count: item.views || 0,
          impressions: item.impressions || 0,
        })),
        topFiles: topFiles.map((file) => ({
          fileId: file._id,
          fileName: file.fileName,
          views: file.views || 0,
          impressions: file.impressions || 0,
          estimatedRevenue: file.estimatedRevenue || 0,
          userEarning: file.userEarning || 0,
        })),
      },
      files: files.map((file) => ({
        fileId: file._id,
        fileName: file.fileName,
        views: file.views || 0,
        impressions: file.impressions || 0,
        clicks: file.clicks || 0,
        estimatedRevenue: file.estimatedRevenue || 0,
        userEarning: file.userEarning || 0,
        uploadDate: file.createdAt,
        mimeType: file.mimeType,
        fileSize: file.fileSize,
      })),
      range: { from, to },
    },
    "Analytics retrieved"
  );
});
