/**
 * controllers/folderController.js
 *
 * POST   /api/folders           → create folder
 * GET    /api/folders           → list root folders
 * GET    /api/folders/:id       → get folder + contents
 * PUT    /api/folders/:id       → rename / recolor
 * DELETE /api/folders/:id       → recursive delete
 */

const Folder   = require("../models/Folder");
const File     = require("../models/File");
const User     = require("../models/User");
const telegram = require("../utils/telegram");
const { asyncHandler, sendSuccess, sendError } = require("../utils/helpers");

// ── Create folder ─────────────────────────────────────────────────
exports.createFolder = asyncHandler(async (req, res) => {
  const { name, parentFolderId, color } = req.body;
  if (!name || !name.trim()) return sendError(res, "Folder name is required", 400);

  // Validate parent folder ownership
  if (parentFolderId) {
    const parent = await Folder.findOne({ _id: parentFolderId, userId: req.user._id });
    if (!parent) return sendError(res, "Parent folder not found", 404);
  }

  const folder = await Folder.create({
    name:           name.trim(),
    parentFolderId: parentFolderId || null,
    userId:         req.user._id,
    color,
  });

  sendSuccess(res, folder, "Folder created", 201);
});

// ── List root folders ─────────────────────────────────────────────
exports.listFolders = asyncHandler(async (req, res) => {
  const { parentFolderId, isStarred } = req.query;

  const folderQuery = { userId: req.user._id };
  const fileQuery = { userId: req.user._id };

  if (isStarred === "true") {
    folderQuery.isStarred = true;
    fileQuery.isStarred = true;
  } else {
    folderQuery.parentFolderId = parentFolderId || null;
    fileQuery.folderId = parentFolderId || null;
  }

  const [folders, files] = await Promise.all([
    Folder.find(folderQuery).sort("name"),
    File.find(fileQuery).sort("-createdAt"),
  ]);

  sendSuccess(res, { folders, files }, "Contents retrieved");
});

// ── Get folder contents ───────────────────────────────────────────
exports.getFolder = asyncHandler(async (req, res) => {
  const folder = await Folder.findOne({ _id: req.params.id, userId: req.user._id });
  if (!folder) return sendError(res, "Folder not found", 404);

  const [subFolders, files] = await Promise.all([
    Folder.find({ userId: req.user._id, parentFolderId: folder._id }).sort("name"),
    File.find({ userId: req.user._id, folderId: folder._id }).sort("-createdAt"),
  ]);

  sendSuccess(res, { folder, subFolders, files }, "Folder contents retrieved");
});

// ── Update folder ─────────────────────────────────────────────────
exports.updateFolder = asyncHandler(async (req, res) => {
  const { name, color, parentFolderId, isStarred } = req.body;
  
  // Prevent moving folder into itself
  if (parentFolderId && parentFolderId === req.params.id) {
    return sendError(res, "Cannot move a folder into itself", 400);
  }

  const updateData = {};
  if (name) updateData.name = name.trim();
  if (color) updateData.color = color;
  if (parentFolderId !== undefined) updateData.parentFolderId = parentFolderId;
  if (isStarred !== undefined) updateData.isStarred = Boolean(isStarred);

  const folder = await Folder.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    updateData,
    { new: true, runValidators: true }
  );
  if (!folder) return sendError(res, "Folder not found", 404);
  sendSuccess(res, folder, "Folder updated");
});

// ── Recursive delete helper ───────────────────────────────────────
const _recursiveDelete = async (folderId, userId, client) => {
  // Delete all files in this folder
  const files = await File.find({ folderId, userId });
  if (files.length > 0) {
    await telegram.deleteMessages(client, files.map((f) => f.messageId));
    const totalSize = files.reduce((s, f) => s + f.fileSize, 0);
    await File.deleteMany({ folderId, userId });
    await User.findByIdAndUpdate(userId, { $inc: { storageUsed: -totalSize } });
  }

  // Recurse into sub-folders
  const subFolders = await Folder.find({ parentFolderId: folderId, userId });
  for (const sub of subFolders) {
    await _recursiveDelete(sub._id, userId, client);
  }

  // Delete the folder itself
  await Folder.deleteOne({ _id: folderId });
};

// ── Delete folder (recursive) ─────────────────────────────────────
exports.deleteFolder = asyncHandler(async (req, res) => {
  const folder = await Folder.findOne({ _id: req.params.id, userId: req.user._id });
  if (!folder) return sendError(res, "Folder not found", 404);

  const client = await telegram.getClientForUser(req.user);
  await _recursiveDelete(folder._id, req.user._id, client);

  sendSuccess(res, null, "Folder and all its contents deleted");
});
