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
const progress = require("../utils/progressStore");
const { asyncHandler, sendSuccess, sendError, sanitizeFileName } = require("../utils/helpers");
const logger   = require("../utils/logger");

// ── Upload file ───────────────────────────────────────────────────
exports.uploadFile = (req, res, next) => {
  const user     = req.user;
  const uploadId = req.headers["x-upload-id"] || crypto.randomUUID();
  progress.create(uploadId);

  const busboy  = Busboy({
    headers:  req.headers,
    limits: { fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB) || 2000) * 1024 * 1024 },
  });

  let tmpPath      = null;
  let originalName = "file";
  let mimeType     = "application/octet-stream";
  let folderId     = req.query.folderId || null;
  let fileSize     = 0;

  // Parse form fields (must appear before file field in the multipart form)
  busboy.on("field", (name, value) => {
    if (name === "folderId") folderId = value || null;
  });

  let writeStreamFinished = null; // Promise that resolves when file is fully on disk

  busboy.on("file", (_fieldname, stream, info) => {
    originalName = sanitizeFileName(info.filename) || "file";
    mimeType     = info.mimeType || "application/octet-stream";
    tmpPath      = path.join(os.tmpdir(), `tcs_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`);

    const writeStream = fs.createWriteStream(tmpPath);
    stream.pipe(writeStream);

    stream.on("data", (chunk) => { fileSize += chunk.length; });
    stream.on("limit", () => {
      stream.destroy();
      progress.fail(uploadId, "File exceeds maximum allowed size");
      if (!res.headersSent) sendError(res, "File exceeds maximum allowed size", 413);
    });

    // ⚠️ Wait for writeStream to finish flushing before proceeding.
    // Without this, busboy 'finish' can fire before the OS buffer is
    // flushed — Telegram then reads an empty/partial file → FILE_PARTS_INVALID.
    writeStreamFinished = new Promise((resolve, reject) => {
      writeStream.on("finish", resolve);
      writeStream.on("error", reject);
    });
  });

  busboy.on("finish", async () => {
    if (!tmpPath || res.headersSent) return;

    // Wait until the write stream has fully flushed to disk
    try { if (writeStreamFinished) await writeStreamFinished; }
    catch (err) { progress.fail(uploadId, err.message); return next(err); }

    try {
      // Verify folder belongs to user
      if (folderId) {
        const folder = await Folder.findOne({ _id: folderId, userId: user._id });
        if (!folder) return sendError(res, "Folder not found", 404);
      }

      progress.update(uploadId, 10, "connecting");

      const client = await telegram.getClientForUser(user);

      progress.update(uploadId, 20, "uploading");

      const messageId = await telegram.uploadToSavedMessages(
        client,
        tmpPath,
        originalName,
        (sent, total) => {
          if (total > 0) {
            const pct = 20 + Math.round((sent / total) * 70);
            progress.update(uploadId, pct, "uploading");
          }
        }
      );

      progress.update(uploadId, 92, "saving");

      const file = await File.create({
        fileName:     originalName,
        originalName,
        mimeType,
        fileSize,
        messageId,
        folderId:     folderId || null,
        userId:       user._id,
      });

      // Update user storage usage
      await User.findByIdAndUpdate(user._id, { $inc: { storageUsed: fileSize } });

      progress.complete(uploadId);

      sendSuccess(res, { file, uploadId }, "File uploaded successfully", 201);
    } catch (err) {
      progress.fail(uploadId, err.message);
      logger.error("Upload error:", err);
      next(err);
    } finally {
      // Always clean up tmp file
      if (tmpPath) {
        fs.unlink(tmpPath, () => {});
      }
    }
  });

  busboy.on("error", (err) => {
    progress.fail(uploadId, err.message);
    next(err);
  });

  req.pipe(busboy);
};

// ── Download file ─────────────────────────────────────────────────
exports.downloadFile = asyncHandler(async (req, res) => {
  const file = await File.findOne({ _id: req.params.id, userId: req.user._id });
  if (!file) return sendError(res, "File not found", 404);

  const client = await telegram.getClientForUser(req.user);
  await telegram.streamFile(client, file.messageId, res, file.mimeType, file.fileName, false);
});

// ── Preview file (inline) ─────────────────────────────────────────
exports.previewFile = asyncHandler(async (req, res) => {
  const file = await File.findOne({ _id: req.params.id, userId: req.user._id });
  if (!file) return sendError(res, "File not found", 404);

  // 🔥 VERY IMPORTANT FIX (ADD THESE 3 LINES)
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
    true
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
           const buffer = await client.downloadMedia(messages[0], { workers: 4 });
           if (buffer) {
             let fpath = prefix + f.fileName;
             // duplicate name resolution
             while (pendingPaths.has(fpath)) fpath = prefix + Math.random().toString(36).substr(2, 4) + "_" + f.fileName;
             pendingPaths.add(fpath);
             
             archive.append(buffer, { name: fpath });
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
