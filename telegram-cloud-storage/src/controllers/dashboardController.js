/**
 * controllers/dashboardController.js
 *
 * GET /api/dashboard → summary stats + recent files + folder tree
 */

const File   = require("../models/File");
const Folder = require("../models/Folder");
const User   = require("../models/User");
const { asyncHandler, sendSuccess, formatBytes } = require("../utils/helpers");

exports.getDashboard = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const [totalFiles, user, recentFiles, rootFolders] = await Promise.all([
    File.countDocuments({ userId }),
    User.findById(userId),
    File.find({ userId }).sort("-createdAt").limit(10).select("-__v"),
    Folder.find({ userId, parentFolderId: null }).sort("name"),
  ]);

  sendSuccess(res, {
    stats: {
      totalFiles,
      storageUsed:        user.storageUsed,
      storageUsedFormatted: formatBytes(user.storageUsed),
      isTelegramConnected: user.isTelegramConnected,
    },
    recentFiles,
    folderStructure: rootFolders,
  }, "Dashboard data retrieved");
});
