/**
 * controllers/telegramController.js
 *
 * GET  /api/telegram/files   → List files from Telegram Saved Messages (paginated)
 * POST /api/telegram/import  → Import a Telegram message as a TeleCloud file
 * GET  /api/telegram/sync    → Fetch only new messages since last sync
 */

const { Api } = require("telegram");
const File     = require("../models/File");
const User     = require("../models/User");
const telegram = require("../utils/telegram");
const { asyncHandler, sendSuccess, sendError } = require("../utils/helpers");
const logger   = require("../utils/logger");

// ── Helpers ────────────────────────────────────────────────────────

/**
 * Extract metadata from a GramJS message object.
 * Returns null if the message has no downloadable media.
 */
function extractMetadata(msg) {
  if (!msg || !msg.media) return null;

  let fileName = "file";
  let mimeType = "application/octet-stream";
  let fileSize = 0;

  if (msg.media.document) {
    const doc = msg.media.document;
    if (doc.attributes) {
      const filenameAttr = doc.attributes.find(
        (a) => a.className === "DocumentAttributeFilename"
      );
      if (filenameAttr?.fileName) fileName = filenameAttr.fileName;
    }
    mimeType = doc.mimeType || "application/octet-stream";
    fileSize = doc.size?.toJSNumber?.() ?? (typeof doc.size === "number" ? doc.size : 0);
  } else if (msg.media.photo) {
    const photo = msg.media.photo;
    fileName = `photo_${photo.id || msg.id}.jpg`;
    mimeType = "image/jpeg";
    // Photo sizes are in the sizes array, pick the largest one
    if (photo.sizes && photo.sizes.length > 0) {
      const largest = photo.sizes[photo.sizes.length - 1];
      fileSize = largest.size?.toJSNumber?.() ?? (typeof largest.size === "number" ? largest.size : 0);
    }
  } else {
    return null; // unsupported media type
  }

  return {
    messageId: msg.id,
    fileName,
    mimeType,
    fileSize,
    date: new Date(msg.date * 1000).toISOString(),
  };
}

// ── GET /api/telegram/files ────────────────────────────────────────
exports.getFiles = asyncHandler(async (req, res) => {
  const user     = req.user;
  const limit    = Math.min(parseInt(req.query.limit, 10) || 20, 50);
  const offsetId = parseInt(req.query.offsetId, 10) || 0;

  const client = await telegram.getClientForUser(user);

  const messages = await client.getMessages("me", {
    limit,
    offsetId: offsetId > 0 ? offsetId : undefined,
  });

  const files = messages
    .map(extractMetadata)
    .filter(Boolean); // drop messages without media

  // Already-imported messageIds for this user (for UI duplication check)
  const importedIds = new Set(
    (await File.find({ userId: user._id })
      .select("messageId")
      .lean()
    ).map((f) => f.messageId)
  );

  const enriched = files.map((f) => ({
    ...f,
    alreadyImported: importedIds.has(f.messageId),
  }));

  const nextOffsetId = messages.length > 0 ? messages[messages.length - 1].id : 0;

  return sendSuccess(res, { files: enriched, nextOffsetId, hasMore: messages.length === limit });
});

// ── POST /api/telegram/import ──────────────────────────────────────
exports.importFile = asyncHandler(async (req, res) => {
  const user      = req.user;
  const { messageId } = req.body;

  if (!messageId || typeof messageId !== "number") {
    return sendError(res, "messageId (number) is required", 400);
  }

  // 1. Validate ownership — confirm this message actually belongs to the user's Saved Messages
  const client   = await telegram.getClientForUser(user);
  const messages = await client.getMessages("me", { ids: [messageId] });

  if (!messages || messages.length === 0 || !messages[0]) {
    return sendError(res, "Message not found in your Telegram Saved Messages", 404);
  }

  // 2. Prevent duplicates
  const existing = await File.findOne({ userId: user._id, messageId });
  if (existing) {
    return sendError(res, "This file has already been imported", 409);
  }

  // 3. Extract metadata server-side (never trust client input)
  const meta = extractMetadata(messages[0]);
  if (!meta) {
    return sendError(res, "This message does not contain a downloadable file", 422);
  }

  // 4. Create File record
  const file = await File.create({
    fileName:     meta.fileName,
    originalName: meta.fileName,
    mimeType:     meta.mimeType,
    fileSize:     meta.fileSize,
    messageId:    meta.messageId,
    folderId:     null,
    userId:       user._id,
    source:       "telegram-import",
  });

  // 5. Update storage usage
  await User.findByIdAndUpdate(user._id, { $inc: { storageUsed: meta.fileSize } });

  logger.info(`[telegram-import] User ${user._id} imported msgId ${messageId} (${meta.fileName})`);

  return sendSuccess(res, { file }, "File imported successfully", 201);
});

// ── GET /api/telegram/sync ─────────────────────────────────────────
exports.syncFiles = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("+lastFetchedMessageId");
  const minId = user.lastFetchedMessageId || 0;

  const client   = await telegram.getClientForUser(user);
  const messages = await client.getMessages("me", { limit: 50, minId });

  const newFiles = messages.map(extractMetadata).filter(Boolean);

  // Update cursor
  if (messages.length > 0) {
    const maxId = Math.max(...messages.map((m) => m.id));
    await User.findByIdAndUpdate(user._id, { lastFetchedMessageId: maxId });
  }

  return sendSuccess(res, { newFiles, count: newFiles.length });
});
