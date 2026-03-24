/**
 * controllers/searchController.js
 *
 * GET /api/search?q=keyword&limit=20&page=1
 */

const File   = require("../models/File");
const Folder = require("../models/Folder");
const { asyncHandler, sendSuccess, sendError } = require("../utils/helpers");

exports.search = asyncHandler(async (req, res) => {
  const { q, page = 1, limit = 30 } = req.query;

  if (!q || q.trim().length < 1) {
    return sendError(res, "Search query (q) is required", 400);
  }

  const keyword = q.trim();
  const regex   = new RegExp(keyword, "i");  // Case-insensitive
  const skip    = (parseInt(page) - 1) * parseInt(limit);

  const [files, folders] = await Promise.all([
    File.find({
      userId:   req.user._id,
      $or: [{ fileName: regex }, { originalName: regex }],
    }).sort("-createdAt").skip(skip).limit(parseInt(limit)),

    Folder.find({
      userId: req.user._id,
      name:   regex,
    }).sort("name").skip(skip).limit(parseInt(limit)),
  ]);

  sendSuccess(res, {
    query:   keyword,
    results: { files, folders },
    totals:  { files: files.length, folders: folders.length },
  }, `Found ${files.length + folders.length} result(s)`);
});
