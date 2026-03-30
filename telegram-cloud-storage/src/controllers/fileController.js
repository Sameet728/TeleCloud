/**
 * controllers/fileController.js
 *
 * POST   /api/files/upload
 * GET    /api/files/:id/download
 * GET    /api/files/:id/preview
 * DELETE /api/files/:id
 * POST   /api/files/bulk-delete
 * POST   /api/files/move
 * GET    /api/files               → list files in root or folder
 */

const path     = require("path");
const fs       = require("fs");
const os       = require("os");
const crypto   = require("crypto");
const Busboy   = require("busboy");

const File     = require("../models/File");
const Folder   = require("../models/Folder");
const User     = require("../models/User");
const telegram = require("../utils/telegram");
const { asyncHandler, sendSuccess, sendError, sanitizeFileName } = require("../utils/helpers");
const logger   = require("../utils/logger");

// ── Global Upload Session Store ─────────────────────────────────────
const uploadSessions = new Map();
const TELEGRAM_PART_SIZE = 512 * 1024; // Exactly 512KB for MTProto

// ── 1. Init Upload ────────────────────────────────────────────────
exports.initUpload = asyncHandler(async (req, res) => {
  const { fileName, fileSize, folderId, mimeType } = req.body;
  if (!fileName || !fileSize) return sendError(res, "Missing file metadata", 400);

  const uploadId = crypto.randomUUID();
  const telegramFileId = telegram.generateTelegramFileId();
  const totalParts = Math.ceil(fileSize / TELEGRAM_PART_SIZE);

  uploadSessions.set(uploadId, {
    telegramFileId,
    totalParts,
    fileSize,
    fileName: sanitizeFileName(fileName) || "file",
    mimeType: mimeType || "application/octet-stream",
    folderId: folderId || null,
    userId: req.user._id,
    createdAt: Date.now()
  });

  // Cleanup abandoned sessions after 24 hours
  setTimeout(() => uploadSessions.delete(uploadId), 24 * 60 * 60 * 1000);

  sendSuccess(res, { uploadId, telegramFileId: telegramFileId.toString(), totalParts }, "Upload initialized");
});

// ── 2. Chunk Upload ───────────────────────────────────────────────
exports.uploadChunk = asyncHandler(async (req, res, next) => {
  const busboy = Busboy({ headers: req.headers });
  
  let uploadId = null;
  let startByte = 0;
  let bufferChunks = [];

  busboy.on("field", (name, value) => {
    if (name === "uploadId") uploadId = value;
    if (name === "startByte") startByte = parseInt(value, 10) || 0;
  });

  busboy.on("file", (_fieldname, stream) => {
    stream.on("data", (data) => bufferChunks.push(data));
  });

  busboy.on("finish", async () => {
    if (!uploadId || !uploadSessions.has(uploadId)) {
      if (!res.headersSent) return sendError(res, "Invalid or expired upload session", 400);
      return;
    }
    const session = uploadSessions.get(uploadId);
    if (session.userId.toString() !== req.user._id.toString()) {
      if (!res.headersSent) return sendError(res, "Unauthorized upload session", 403);
      return;
    }

    try {
      const client = await telegram.getClientForUser(req.user);
      const fullBuffer = Buffer.concat(bufferChunks);
      
      let telegramStartPart = Math.floor(startByte / TELEGRAM_PART_SIZE);
      
      for (let i = 0; i < fullBuffer.length; i += TELEGRAM_PART_SIZE) {
        const partBuffer = fullBuffer.slice(i, i + TELEGRAM_PART_SIZE);
        await telegram.uploadBigFilePart(
          client,
          session.telegramFileId,
          session.totalParts,
          telegramStartPart++,
          partBuffer
        );
      }

      if (!res.headersSent) sendSuccess(res, { success: true }, "Chunk uploaded successfully");
    } catch (err) {
      logger.error("Chunk upload error:", err);
      if (!res.headersSent) next(err);
    }
  });

  busboy.on("error", (err) => {
    if (!res.headersSent) next(err);
  });

  req.pipe(busboy);
});

// ── 3. Finalize Upload ────────────────────────────────────────────
exports.finalizeUpload = asyncHandler(async (req, res, next) => {
  const { uploadId } = req.body;
  
  if (!uploadId || !uploadSessions.has(uploadId)) {
    return sendError(res, "Invalid or expired upload session", 400);
  }
  
  const session = uploadSessions.get(uploadId);
  if (session.userId.toString() !== req.user._id.toString()) {
    return sendError(res, "Unauthorized upload session", 403);
  }

  try {
    const client = await telegram.getClientForUser(req.user);
    
    // Finalize MTProto message
    const messageId = await telegram.finalizeBigFile(
      client,
      session.telegramFileId,
      session.totalParts,
      session.fileName,
      session.mimeType
    );

    // Save MongoDB record
    if (session.folderId) {
      const folder = await Folder.findOne({ _id: session.folderId, userId: req.user._id });
      if (!folder) return sendError(res, "Folder not found", 404);
    }

    const file = await File.create({
      fileName: session.fileName,
      originalName: session.fileName,
      mimeType: session.mimeType,
      fileSize: session.fileSize,
      messageId,
      folderId: session.folderId || null,
      userId: req.user._id,
    });

    await User.findByIdAndUpdate(req.user._id, { $inc: { storageUsed: session.fileSize } });
    
    // Clean up session
    uploadSessions.delete(uploadId);

    sendSuccess(res, { file }, "File successfully finalized and saved", 201);
  } catch (err) {
    logger.error("Finalize upload error:", err);
    next(err);
  }
});

// ── Download file ─────────────────────────────────────────────────
exports.getFile = asyncHandler(async (req, res) => {
  const file = await File.findOne({ _id: req.params.id, userId: req.user._id });
  if (!file) return sendError(res, "File not found", 404);

  sendSuccess(res, { file }, "File retrieved");
});

exports.downloadFile = asyncHandler(async (req, res) => {
  const file = await File.findOne({ _id: req.params.id, userId: req.user._id });
  if (!file) return sendError(res, "File not found", 404);

  const client = await telegram.getClientForUser(req.user);
  await telegram.streamFile(client, file.messageId, res, file.mimeType, file.fileName, false, req, file.fileSize);
});

// ── Preview file (inline) ─────────────────────────────────────────
exports.previewFile = asyncHandler(async (req, res) => {
  const file = await File.findOne({ _id: req.params.id, userId: req.user._id });
  if (!file) return sendError(res, "File not found", 404);

  // Consider restricting frame-ancestors to your specific frontend domain in production
  res.setHeader("Content-Security-Policy", "frame-ancestors *");
  res.setHeader("X-Frame-Options", "ALLOWALL");
  res.setHeader("Content-Disposition", "inline");

  const client = await telegram.getClientForUser(req.user);

  await telegram.streamFile(
    client,
    file.messageId,
    res,
    file.mimeType,
    file.fileName,
    true,
    req,
    file.fileSize
  );
});

// ── Get file thumbnail ────────────────────────────────────────────
exports.getThumbnail = asyncHandler(async (req, res) => {
  const file = await File.findOne({ _id: req.params.id, userId: req.user._id });
  if (!file) return res.status(404).end();

  try {
    const client = await telegram.getClientForUser(req.user);
    await telegram.streamThumbnail(client, file.messageId, res);
  } catch (err) {
    res.status(404).end();
  }
});

// ── Update file ───────────────────────────────────────────────────
exports.updateFile = asyncHandler(async (req, res) => {
  const { fileName, isStarred } = req.body;
  const updateData = {};
  if (fileName) updateData.fileName = fileName.trim();
  if (isStarred !== undefined) updateData.isStarred = Boolean(isStarred);

  const file = await File.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    updateData,
    { new: true, runValidators: true }
  );
  if (!file) return sendError(res, "File not found", 404);
  sendSuccess(res, file, "File updated");
});

// ── Delete single file ────────────────────────────────────────────
exports.deleteFile = asyncHandler(async (req, res) => {
  const file = await File.findOne({ _id: req.params.id, userId: req.user._id });
  if (!file) return sendError(res, "File not found", 404);

  const client = await telegram.getClientForUser(req.user);
  await telegram.deleteMessages(client, [file.messageId]);
  await file.deleteOne();
  await User.findByIdAndUpdate(req.user._id, { $inc: { storageUsed: -file.fileSize } });

  sendSuccess(res, null, "File deleted successfully");
});

// ── Bulk delete ───────────────────────────────────────────────────
exports.bulkDelete = asyncHandler(async (req, res) => {
  const { fileIds } = req.body;
  if (!Array.isArray(fileIds) || fileIds.length === 0) {
    return sendError(res, "fileIds array is required", 400);
  }

  const files = await File.find({ _id: { $in: fileIds }, userId: req.user._id });
  if (files.length === 0) return sendError(res, "No files found", 404);

  const client     = await telegram.getClientForUser(req.user);
  const messageIds = files.map((f) => f.messageId);
  const totalSize  = files.reduce((sum, f) => sum + f.fileSize, 0);

  await telegram.deleteMessages(client, messageIds);
  await File.deleteMany({ _id: { $in: files.map((f) => f._id) } });
  await User.findByIdAndUpdate(req.user._id, { $inc: { storageUsed: -totalSize } });

  sendSuccess(res, { deleted: files.length }, `${files.length} files deleted`);
});

// ── Bulk Zip Download ─────────────────────────────────────────────
const jwt = require("jsonwebtoken");
const env = require("../config/env");

exports.getZipToken = asyncHandler(async (req, res) => {
  const { fileIds = [], folderIds = [] } = req.body;
  if (fileIds.length === 0 && folderIds.length === 0) {
    return sendError(res, "No items selected to download", 400);
  }

  const token = jwt.sign(
    { userId: req.user._id, fileIds, folderIds, purpose: "zip_download" },
    env.jwtSecret,
    { expiresIn: "10m" }
  );
  
  sendSuccess(res, { token }, "Download token generated");
});

exports.downloadZip = asyncHandler(async (req, res) => {
  const { token } = req.query;
  if (!token) return sendError(res, "Token required", 401);

  let decoded;
  try { decoded = jwt.verify(token, env.jwtSecret); }
  catch (err) { return sendError(res, "Invalid or expired token", 401); }

  if (decoded.purpose !== "zip_download") return sendError(res, "Invalid token purpose", 400);

  const user = await User.findById(decoded.userId).select("+telegramSession");
  if (!user) return sendError(res, "User not found", 404);

  const { fileIds, folderIds } = decoded;
  const client = await telegram.getClientForUser(user);
  
  const archiver = require("archiver");
  res.setHeader("Content-Disposition", `attachment; filename="CloudSpace_Archive_${Date.now()}.zip"`);
  res.setHeader("Content-Type", "application/zip");

  const archive = archiver("zip", { zlib: { level: 5 } });
  archive.on("error", (err) => {
    logger.error("Archiver error", err);
    if (!res.headersSent) res.status(500).end();
  });

  archive.pipe(res);

  const pendingPaths = new Set(); // to avoid duplicates in edge cases

  // Helper to fetch files
  const addFilesToArchive = async (fIds, prefix = "") => {
    const files = await File.find({ _id: { $in: fIds }, userId: user._id });
    for (const f of files) {
      if (res.closed) break;
      try {
        const messages = await client.getMessages("me", { ids: [f.messageId] });
        if (messages && messages[0] && messages[0].media) {
             const stream = await telegram.createTelegramReadable(client, f.messageId);
             if (stream) {
               let fpath = prefix + f.fileName;
               // duplicate name resolution
               while (pendingPaths.has(fpath)) fpath = prefix + Math.random().toString(36).substr(2, 4) + "_" + f.fileName;
               pendingPaths.add(fpath);
               
               archive.append(stream, { name: fpath });
               // Wait for this stream to be fully appended before fetching next file
               await new Promise((resolve) => {
                 stream.on('end', resolve);
                 stream.on('error', resolve); // Move to next file on error
               });
             }
        }
      } catch (err) {
        logger.error(`Failed to DL ${f.fileName} for zip:`, err.message);
      }
    }
  };

  const traverseFolder = async (folderId, prefix) => {
    if (res.closed) return;
    const folder = await Folder.findOne({ _id: folderId, userId: user._id });
    if (!folder) return;

    let dirName = prefix + folder.name + "/";
    while (pendingPaths.has(dirName)) dirName = prefix + folder.name + "_" + Math.random().toString(36).substr(2, 4) + "/";
    pendingPaths.add(dirName);
    
    // add empty dir just in case it has no files
    archive.append("", { name: dirName });

    const filesInFolder = await File.find({ folderId: folder._id, userId: user._id });
    if (filesInFolder.length > 0) {
      await addFilesToArchive(filesInFolder.map(f => f._id), dirName);
    }

    const subFolders = await Folder.find({ parentFolderId: folder._id, userId: user._id });
    for (const sub of subFolders) {
      await traverseFolder(sub._id, dirName);
    }
  };

  if (fileIds.length > 0) await addFilesToArchive(fileIds, "");
  for (const fId of folderIds) await traverseFolder(fId, "");

  await archive.finalize();
});

// ── Move files to folder ──────────────────────────────────────────
exports.moveFiles = asyncHandler(async (req, res) => {
  const { fileIds, targetFolderId } = req.body;

  if (!Array.isArray(fileIds) || fileIds.length === 0) {
    return sendError(res, "fileIds array is required", 400);
  }

  // Validate target folder (null = move to root)
  if (targetFolderId) {
    const folder = await Folder.findOne({ _id: targetFolderId, userId: req.user._id });
    if (!folder) return sendError(res, "Target folder not found", 404);
  }

  const result = await File.updateMany(
    { _id: { $in: fileIds }, userId: req.user._id },
    { folderId: targetFolderId || null }
  );

  sendSuccess(res, { modified: result.modifiedCount }, "Files moved successfully");
});

// ── List files ────────────────────────────────────────────────────
exports.listFiles = asyncHandler(async (req, res) => {
  const { folderId, isStarred, type, page = 1, limit = 50, sort = "-createdAt" } = req.query;

  const query = { userId: req.user._id };
  
  if (isStarred === "true") query.isStarred = true;
  
  if (type === "image") query.mimeType = { $regex: /^image\// };
  else if (type === "video") query.mimeType = { $regex: /^video\// };
  
  // Only scope by folderId if we aren't doing a global filter
  if (isStarred !== "true" && !type) {
    query.folderId = folderId || null;
  }

  const skip  = (parseInt(page) - 1) * parseInt(limit);

  const [files, total] = await Promise.all([
    File.find(query).sort(sort).skip(skip).limit(parseInt(limit)),
    File.countDocuments(query),
  ]);

  sendSuccess(res, {
    files,
    pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) },
  }, "Files retrieved");
});
