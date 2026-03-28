/**
 * controllers/shareController.js
 */

const Share    = require("../models/Share");
const File     = require("../models/File");
const Folder   = require("../models/Folder");
const User     = require("../models/User");
const telegram = require("../utils/telegram");
const bcrypt   = require("bcryptjs");
const { asyncHandler, sendSuccess, sendError, generateToken } = require("../utils/helpers");

// ── Create share link ─────────────────────────────────────────────
exports.createShare = asyncHandler(async (req, res) => {
  const { fileId, folderId, expiresInHours, maxDownloads, password, allowDownload } = req.body;
  
  if (!fileId && !folderId) {
    return sendError(res, "Either fileId or folderId is required", 400);
  }

  let file, folder;
  if (fileId) {
    file = await File.findOne({ _id: fileId, userId: req.user._id });
    if (!file) return sendError(res, "File not found", 404);
  } else {
    folder = await Folder.findOne({ _id: folderId, userId: req.user._id });
    if (!folder) return sendError(res, "Folder not found", 404);
  }

  const token     = generateToken(32);
  const expiresAt = expiresInHours ? new Date(Date.now() + parseInt(expiresInHours) * 3600000) : null;
  const hashedPwd = password ? await bcrypt.hash(password, 10) : null;

  const share = await Share.create({
    token,
    fileId:       file?._id,
    folderId:     folder?._id,
    userId:       req.user._id,
    expiresAt,
    maxDownloads: maxDownloads ? parseInt(maxDownloads) : null,
    password:     hashedPwd,
    allowDownload: allowDownload !== undefined ? allowDownload : true,
  });

  const clientOrigin = "http://localhost:3000";
  const shareUrl = `${clientOrigin}/s/${token}`;
  sendSuccess(res, { share, shareUrl }, "Share link created", 201);
});

// ── List share links ───────────────────────────────────────────────
exports.listShares = asyncHandler(async (req, res) => {
  const shares = await Share.find({ userId: req.user._id, isRevoked: false })
    .populate("fileId", "fileName mimeType fileSize")
    .populate("folderId", "name color")
    .sort("-createdAt");
  sendSuccess(res, shares, "Share links retrieved");
});

// ── Revoke share link ─────────────────────────────────────────────
exports.revokeShare = asyncHandler(async (req, res) => {
  const share = await Share.findOneAndUpdate(
    { token: req.params.token, userId: req.user._id },
    { isRevoked: true },
    { new: true }
  );
  if (!share) return sendError(res, "Share link not found", 404);
  sendSuccess(res, null, "Share link revoked");
});

// ── PUBLIC: Get info ─────────────────────────────────────────────
exports.publicInfo = asyncHandler(async (req, res) => {
  const share = await Share.findOne({ token: req.params.token })
    .populate("fileId")
    .populate("folderId");
    
  if (!share) return sendError(res, "Share link not found", 404);

  const isActive = share.isActive; // Virtual boolean
  if (!isActive) {
    return res.status(410).json({ success: false, expired: true, message: "This share link has expired or reached its limit." });
  }

  // Check if owner's subscription is still valid
  const owner = await User.findById(share.userId);
  if (owner && owner.plan !== "free" && owner.subscriptionEnd && new Date() > owner.subscriptionEnd) {
    return res.status(403).json({
      success: false,
      message: "Link expired due to inactive subscription",
      data: null,
    });
  }

  // Password check
  const providedPassword = req.headers["x-share-password"] || req.body.password;
  if (share.password) {
    if (!providedPassword) {
      return res.status(401).json({ success: false, requiresPassword: true });
    }
    const isValid = await bcrypt.compare(providedPassword, share.password);
    if (!isValid) {
      return res.status(401).json({ success: false, requiresPassword: true, error: "Incorrect password" });
    }
  }

  // Return safe info to the frontend
  if (share.fileId) {
    return sendSuccess(res, {
      type: "file",
      file: share.fileId,
      shareParams: { maxDownloads: share.maxDownloads, expiresAt: share.expiresAt, allowDownload: share.allowDownload }
    });
  } else if (share.folderId) {
    const files = await File.find({ folderId: share.folderId._id }).select("-messageId");
    return sendSuccess(res, {
      type: "folder",
      folder: share.folderId,
      files,
      shareParams: { maxDownloads: share.maxDownloads, expiresAt: share.expiresAt, allowDownload: share.allowDownload }
    });
  }
});

// ── PUBLIC: Download / Stream ──────────────────────────────────────
exports.publicDownload = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { fileId, pwd, preview } = req.query; // pwd comes from query string for <a> streams

  const share = await Share.findOne({ token }).populate("fileId folderId");
  if (!share) return sendError(res, "Share link not found", 404);
  if (!share.isActive) return sendError(res, "Expired", 410);

  // Owner subscription check
  const shareOwner = await User.findById(share.userId);
  if (shareOwner && shareOwner.plan !== "free" && shareOwner.subscriptionEnd && new Date() > shareOwner.subscriptionEnd) {
    return sendError(res, "Link expired due to inactive subscription", 403);
  }

  if (share.password) {
    if (!pwd) return sendError(res, "Password required", 401);
    const isValid = await bcrypt.compare(pwd, share.password);
    if (!isValid) return sendError(res, "Incorrect password", 401);
  }

  let targetFile;
  if (share.fileId) {
    targetFile = share.fileId;
  } else if (share.folderId) {
    if (!fileId) return sendError(res, "File ID required for folder shares", 400);
    targetFile = await File.findOne({ _id: fileId, folderId: share.folderId._id });
    if (!targetFile) return sendError(res, "File not found in this folder", 404);
  }

  // Owner session
  const owner = await User.findById(share.userId).select("+telegramSession");
  const client = await telegram.getClientForUser(owner);

  const inline = preview === "1";
  if (!inline && !share.allowDownload) {
    return sendError(res, "Downloading is disabled for this link", 403);
  }

  await telegram.streamFile(client, targetFile.messageId, res, targetFile.mimeType, targetFile.fileName, inline, req, targetFile.fileSize);

  // Increment download count (only for file downloads, or per-root-share logic)
  if (!inline && share.fileId) {
    await Share.findByIdAndUpdate(share._id, { $inc: { downloadCount: 1 } });
  }
});

// ── PUBLIC: Download Folder Zip ─────────────────────────────────────
exports.publicDownloadZip = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { pwd } = req.query;

  const share = await Share.findOne({ token }).populate("folderId");
  if (!share || !share.folderId) return sendError(res, "Share link not found", 404);
  if (!share.isActive) return sendError(res, "Expired", 410);
  if (!share.allowDownload) return sendError(res, "Downloading is disabled", 403);

  if (share.password) {
    if (!pwd) return sendError(res, "Password required", 401);
    const isValid = await bcrypt.compare(pwd, share.password);
    if (!isValid) return sendError(res, "Incorrect password", 401);
  }

  const owner = await User.findById(share.userId).select("+telegramSession");
  const client = await telegram.getClientForUser(owner);
  
  const archiver = require("archiver");
  res.setHeader("Content-Disposition", `attachment; filename="${share.folderId.name}.zip"`);
  res.setHeader("Content-Type", "application/zip");

  const archive = archiver("zip", { zlib: { level: 5 } });
  archive.on("error", (err) => {
    logger.error("Archiver error", err);
    if (!res.headersSent) res.status(500).end();
  });

  archive.pipe(res);

  const pendingPaths = new Set();
  
  const addFilesToArchive = async (fIds, prefix = "") => {
    const files = await File.find({ _id: { $in: fIds }, userId: owner._id });
    for (const f of files) {
      if (res.closed) break;
      try {
        const messages = await client.getMessages("me", { ids: [f.messageId] });
        if (messages && messages[0] && messages[0].media) {
           const stream = await telegram.createTelegramReadable(client, f.messageId);
           if (stream) {
             let fpath = prefix + f.fileName;
             while (pendingPaths.has(fpath)) fpath = prefix + Math.random().toString(36).substr(2, 4) + "_" + f.fileName;
             pendingPaths.add(fpath);
             archive.append(stream, { name: fpath });
             await new Promise((resolve) => {
               stream.on('end', resolve);
               stream.on('error', resolve);
             });
           }
        }
      } catch (err) {}
    }
  };

  const traverseFolder = async (folderId, prefix) => {
    if (res.closed) return;
    const folder = await Folder.findOne({ _id: folderId, userId: owner._id });
    if (!folder) return;

    let dirName = prefix + folder.name + "/";
    while (pendingPaths.has(dirName)) dirName = prefix + folder.name + "_" + Math.random().toString(36).substr(2, 4) + "/";
    pendingPaths.add(dirName);
    archive.append("", { name: dirName });

    const filesInFolder = await File.find({ folderId: folder._id, userId: owner._id });
    if (filesInFolder.length > 0) {
      await addFilesToArchive(filesInFolder.map(f => f._id), dirName);
    }

    const subFolders = await Folder.find({ parentFolderId: folder._id, userId: owner._id });
    for (const sub of subFolders) {
      await traverseFolder(sub._id, dirName);
    }
  };

  await traverseFolder(share.folderId._id, "");
  await archive.finalize();

  await Share.findByIdAndUpdate(share._id, { $inc: { downloadCount: 1 } });
});
