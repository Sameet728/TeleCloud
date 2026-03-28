/**
 * utils/telegram.js — Telegram MTProto helpers
 *
 * All Telegram operations are isolated here:
 *   getClientForUser()          → returns authenticated TelegramClient
 *   sendOTP()                   → send OTP to phone number
 *   verifyOTPAndSaveSession()   → complete Telegram auth flow
 *   uploadToSavedMessages()     → upload a local file to Saved Messages
 *   streamFile()                → stream a Telegram file to HTTP response
 *   deleteMessages()            → delete messages by ID
 */

const { TelegramClient }  = require("telegram");
const { StringSession }   = require("telegram/sessions");
const { Api }             = require("telegram");
const fs   = require("fs");
const path = require("path");
const crypto = require("crypto");
const bigInt = require("big-integer");
const env  = require("../config/env");
const logger = require("./logger");

// ── In-memory client cache (avoids reconnecting on every request) ──
const clientCache = new Map();
const connectingPromises = new Map();
const messageCache = new WeakMap();
const MESSAGE_CACHE_TTL_MS = 5 * 60 * 1000;

const getCachedMessagesForClient = (client) => {
  if (!messageCache.has(client)) {
    messageCache.set(client, new Map());
  }
  return messageCache.get(client);
};

const getTelegramMessage = async (client, messageId) => {
  const cache = getCachedMessagesForClient(client);
  const cached = cache.get(messageId);

  if (cached && Date.now() < cached.expiresAt) {
    return cached.message;
  }

  const messages = await client.getMessages("me", { ids: [messageId] });
  if (!messages || messages.length === 0 || !messages[0]) {
    throw new Error("File not found in Telegram");
  }

  const message = messages[0];
  cache.set(messageId, {
    message,
    expiresAt: Date.now() + MESSAGE_CACHE_TTL_MS,
  });
  return message;
};

/**
 * getClientForUser
 * Returns a connected TelegramClient for the given user.
 * Reuses cached clients when possible. Prevents concurrent connection races.
 *
 * @param {Object} user   — Mongoose User doc (must include telegramSession)
 * @returns {TelegramClient}
 */
const getClientForUser = async (user) => {
  if (!user.telegramSession) {
    throw new Error("Telegram account not connected. Please connect Telegram first.");
  }

  const cacheKey = user._id.toString();

  // Return cached client if still connected
  if (clientCache.has(cacheKey)) {
    const cached = clientCache.get(cacheKey);
    try {
      if (cached.connected) return cached;
    } catch (_) {}
    clientCache.delete(cacheKey);
  }

  // If an active connection attempt is already happening, await it instead of duplicating
  if (connectingPromises.has(cacheKey)) {
    logger.debug(`Waiting for existing connection for user ${cacheKey}`);
    return connectingPromises.get(cacheKey);
  }

  const connectPromise = (async () => {
    let client = null;
    let attempts = 0;
    const MAX_ATTEMPTS = 3;

    while (attempts < MAX_ATTEMPTS) {
      try {
        const session = new StringSession(user.telegramSession);
        // We remove autoReconnect: true because it is known to cause AUTH_KEY_DUPLICATED
        // internal racing during the initial connection in some GramJS versions.
        client = new TelegramClient(session, env.telegramApiId, env.telegramApiHash, {
          connectionRetries: 5,
          retryDelay: 2000,
          deviceModel: "TeleCloud Node",
          systemVersion: "1.0",
          appVersion: "1.0",
        });

        await client.connect();
        clientCache.set(cacheKey, client);
        logger.debug(`Telegram client connected for user ${cacheKey}`);
        return client;
      } catch (err) {
        attempts++;
        logger.warn(`Connection attempt ${attempts} failed for ${cacheKey}: ${err.message}`);
        
        // If it's a ghost connection lock from nodemon restarts, wait 3 seconds and retry
        if (err.message.includes("AUTH_KEY_DUPLICATED") && attempts < MAX_ATTEMPTS) {
          logger.info(`Ghost connection detected. Waiting 3s before retry...`);
          await new Promise(r => setTimeout(r, 3000));
        } else {
          try { if (client) await client.disconnect(); } catch (_) {}
          connectingPromises.delete(cacheKey);
          throw err;
        }
      }
    }
  })();

  connectingPromises.set(cacheKey, connectPromise);
  return connectPromise;
};

/**
 * clearSessionForUser — called when AUTH_KEY_UNREGISTERED is detected.
 * Wipes the cached client and marks the user as disconnected in DB.
 * @param {string} userId
 */
const clearSessionForUser = async (userId) => {
  const key = userId.toString();
  if (clientCache.has(key)) {
    try { await clientCache.get(key).disconnect(); } catch (_) {}
    clientCache.delete(key);
  }
  try {
    const User = require("../models/User");
    await User.findByIdAndUpdate(userId, {
      telegramSession:     null,
      telegramId:          null,
      isTelegramConnected: false,
    });
    logger.warn(`Telegram session cleared for user ${key} due to AUTH_KEY_UNREGISTERED`);
  } catch (_) {}
};

/**
 * disconnectClientForUser — cleans up cache on logout
 * @param {string} userId
 */
const disconnectClientForUser = async (userId) => {
  const key = userId.toString();
  if (clientCache.has(key)) {
    const client = clientCache.get(key);
    try { await client.disconnect(); } catch (_) {}
    clientCache.delete(key);
  }
};

/**
 * sendOTP
 * Initiates Telegram login; sends OTP to the provided phone number.
 * Returns the phoneCodeHash required for verification.
 *
 * @param {string} phoneNumber  e.g. "+919876543210"
 * @returns {{ tempSession: string, phoneCodeHash: string }}
 */
const sendOTP = async (phoneNumber) => {
  const session = new StringSession("");
  const client  = new TelegramClient(session, env.telegramApiId, env.telegramApiHash, {
    connectionRetries: 3,
  });

  await client.connect();

  const result = await client.invoke(
    new Api.auth.SendCode({
      phoneNumber,
      apiId:   env.telegramApiId,
      apiHash: env.telegramApiHash,
      settings: new Api.CodeSettings({ allowFlashcall: false, currentNumber: false }),
    })
  );

  const tempSession = client.session.save();
  await client.disconnect();

  return { tempSession, phoneCodeHash: result.phoneCodeHash };
};

/**
 * verifyOTPAndSaveSession
 * Completes the Telegram auth flow.
 * Returns the serialised session string to store in the database.
 *
 * @param {string} phoneNumber
 * @param {string} phoneCode       — OTP received via SMS/Telegram
 * @param {string} phoneCodeHash
 * @param {string} tempSession     — Partial session from sendOTP
 * @param {string} [password]      — 2FA password if enabled
 * @returns {{ sessionString: string, telegramId: string }}
 */
const verifyOTPAndSaveSession = async (
  phoneNumber, phoneCode, phoneCodeHash, tempSession, password
) => {
  const session = new StringSession(tempSession);
  const client  = new TelegramClient(session, env.telegramApiId, env.telegramApiHash, {
    connectionRetries: 3,
  });

  await client.connect();

  try {
    await client.invoke(
      new Api.auth.SignIn({ phoneNumber, phoneCodeHash, phoneCode })
    );
  } catch (err) {
    // Handle 2FA
    if (err.message === "SESSION_PASSWORD_NEEDED") {
      if (!password) throw new Error("Two-factor authentication password required");

      const { srp_id, current_algo, srp_B } = await client.invoke(
        new Api.account.GetPassword()
      );
      const { A, M1 } = await computeSRPParams({ g: current_algo.g, p: current_algo.p, salt1: current_algo.salt1, salt2: current_algo.salt2, gB: srp_B, password });
      await client.invoke(new Api.auth.CheckPassword({
        password: new Api.InputCheckPasswordSRP({ srpId: srp_id, A, M1 }),
      }));
    } else {
      throw err;
    }
  }

  const me = await client.getMe();
  const sessionString = client.session.save();
  await client.disconnect();

  return {
    sessionString,
    telegramId: me.id.toString(),
  };
};

/**
 * uploadToSavedMessages
 * Uploads a local file to the user's Telegram "Saved Messages" (self-chat).
 * Returns the Telegram message ID (used to retrieve the file later).
 *
 * @param {TelegramClient} client
 * @param {string} filePath       — Absolute path to temp file
 * @param {string} originalName   — Display name / caption
 * @param {Function} [onProgress] — Progress callback (percent: number) => void
 * @returns {number}              — Telegram message ID
 */
const uploadToSavedMessages = async (client, filePath, originalName, onProgress) => {
  const message = await client.sendFile("me", {
    file:    filePath,
    caption: originalName,
    workers: 1,       // ⚠️ MUST be 1 to prevent AUTH_KEY_DUPLICATED on huge files
    progressCallback: onProgress,
  });

  return message.id;
};

/**
 * uploadStreamToSavedMessages
 * Discards local disk buffering and directly streams Node chunks into MTProto BigFileParts.
 * 
 * @param {TelegramClient} client
 * @param {Readable} fileStream - The raw file stream (e.g. from Busboy)
 * @param {string} fileName - Original file name
 * @param {number} fileSize - Precise total byte size of the file
 * @param {Function} [onProgress] - (sent, total) => void
 * @returns {number} - Telegram message ID
 */
const uploadStreamToSavedMessages = async (client, fileStream, fileName, fileSize, onProgress) => {
  if (!fileSize || fileSize <= 0) {
    throw new Error("File size is required for direct streaming to MTProto");
  }

  const fileId = bigInt(crypto.randomBytes(8).readBigInt64LE().toString());
  const chunkSize = 512 * 1024; // 512KB exactly as required by MTProto parts
  const totalParts = Math.ceil(fileSize / chunkSize);
  
  let partIndex = 0;
  let buffered = Buffer.alloc(0);
  let uploadedBytes = 0;

  for await (const chunk of fileStream) {
    buffered = Buffer.concat([buffered, chunk]);
    
    // As long as we have enough for a full 512KB part, push it to Telegram immediately
    while (buffered.length >= chunkSize) {
      const partData = buffered.slice(0, chunkSize);
      buffered = buffered.slice(chunkSize);
      
      await client.invoke(new Api.upload.SaveBigFilePart({
        fileId: fileId,
        filePart: partIndex,
        fileTotalParts: totalParts,
        bytes: partData,
      }));
      
      partIndex++;
      uploadedBytes += chunkSize;
      if (onProgress) onProgress(uploadedBytes, fileSize);
    }
  }

  // Flush remaining partial tail bytes
  if (buffered.length > 0) {
    await client.invoke(new Api.upload.SaveBigFilePart({
      fileId: fileId,
      filePart: partIndex,
      fileTotalParts: totalParts,
      bytes: buffered,
    }));
    uploadedBytes += buffered.length;
    if (onProgress) onProgress(uploadedBytes, fileSize);
  }

  // Finalize the file creation in MTProto by linking the ID
  const inputFile = new Api.InputFileBig({
    id: fileId,
    parts: totalParts,
    name: fileName
  });

  // Attach the file pointer to a new message
  const message = await client.sendFile("me", {
    file: inputFile,
    caption: fileName
  });

  return message.id;
};

/**
 * generateTelegramFileId
 * @returns {bigInt} Random 64-bit integer for a new Telegram BigFile session
 */
const generateTelegramFileId = () => {
  return bigInt(crypto.randomBytes(8).readBigInt64LE().toString());
};

/**
 * uploadBigFilePart
 * Directly sends exactly a 512KB chunk (or smaller tail) to Telegram.
 * 
 * @param {TelegramClient} client
 * @param {bigInt} fileId 
 * @param {number} totalParts 
 * @param {number} partIndex 
 * @param {Buffer} partBuffer 
 */
const uploadBigFilePart = async (client, fileId, totalParts, partIndex, partBuffer) => {
  await client.invoke(new Api.upload.SaveBigFilePart({
    fileId: fileId,
    filePart: partIndex,
    fileTotalParts: totalParts,
    bytes: partBuffer,
  }));
};

/**
 * finalizeBigFile
 * Links uploaded MTProto parts into a coherent message and posts it.
 * 
 * @param {TelegramClient} client
 * @param {bigInt} fileId 
 * @param {number} totalParts 
 * @param {string} fileName 
 * @param {string} [mimeType] - MIME type to determine if file should be forced as document
 * @returns {number} The created message ID
 */
const finalizeBigFile = async (client, fileId, totalParts, fileName, mimeType) => {
  const inputFile = new Api.InputFileBig({
    id: fileId,
    parts: totalParts,
    name: fileName
  });

  // Force images/videos as documents to avoid PHOTO_SAVE_FILE_INVALID error
  // Telegram's photo compression and validation doesn't work with InputFileBig
  const isMedia = mimeType && (mimeType.startsWith('image/') || mimeType.startsWith('video/'));
  
  const message = await client.sendFile("me", {
    file: inputFile,
    caption: fileName,
    forceDocument: isMedia // This prevents Telegram from treating it as a photo/video
  });

  return message.id;
};

/**
 * streamFile
 * Streams a Telegram file directly to an HTTP response.
 * Supports byte-range streaming for media previews.
 *
 * @param {TelegramClient} client
 * @param {number}         messageId  — Telegram message ID
 * @param {Object}         res        — Express response object
 * @param {string}         mimeType
 * @param {string}         fileName
 * @param {boolean}        [inline]   — true = preview, false = download
 * @param {Object}         [req]      — Express request object (for Range header)
 * @param {number}         [fileSize] — File size from DB
 */
const streamFile = async (client, messageId, res, mimeType, fileName, inline = false, req = null, fileSize = 0) => {
  const message = await getTelegramMessage(client, messageId);
  if (!message.media) {
    throw new Error("Message has no media attached");
  }

  // Determine actual file size if not provided
  if (!fileSize) {
    fileSize = message.media?.document?.size?.toJSNumber?.() || 0;
  }

  const disposition = inline ? "inline" : `attachment; filename="${encodeURIComponent(fileName)}"`;

  // ── Range parsing for partial requests ──
  let offset = 0;
  let limit = fileSize || undefined;
  let status = 200;

  if (req && req.headers.range && fileSize > 0) {
    const range = req.headers.range;
    const parts = range.replace(/bytes=/, "").split("-");
    const partialStart = parts[0];
    const partialEnd = parts[1];

    offset = parseInt(partialStart, 10);
    const end = partialEnd ? parseInt(partialEnd, 10) : fileSize - 1;

    limit = (end - offset) + 1;
    status = 206;

    res.status(status);
    res.setHeader("Content-Range", `bytes ${offset}-${end}/${fileSize}`);
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Content-Length", limit.toString());
  } else {
    res.status(status);
    if (fileSize > 0) res.setHeader("Content-Length", fileSize.toString());
    res.setHeader("Accept-Ranges", "bytes");
  }

  res.setHeader("Content-Disposition", disposition);
  res.setHeader("Content-Type", mimeType || "application/octet-stream");
  res.setHeader("Cache-Control", "private, max-age=3600");
  if (typeof res.flushHeaders === "function") {
    res.flushHeaders();
  }

  // Lock chunk size to 512KB. 
  // Why? GramJS buffers the ENTIRE `requestSize` in memory before yielding the chunk to Node.js. 
  // If we set this to 4MB, the browser has to wait for a 4MB download before it gets a single byte!
  // By using 512KB (the native MTProto limit), the Time-To-First-Byte (TTFB) is virtually instant, 
  // preventing stacking 10-second delays every time the MP4 demuxer performs a seek.
  const playSize = 512 * 1024;
  const targetBytes = limit;
  let bytesWritten = 0;

  try {
    // iterDownload yields Buffer chunks without buffering the whole file in memory
    for await (const chunk of client.iterDownload({
      file: message.media,
      offset: bigInt(offset),
      requestSize: playSize
    })) {
      // Slice chunk if it overshoots the requested Range
      let writeChunk = chunk;
      if (bytesWritten + chunk.length > targetBytes) {
        writeChunk = chunk.slice(0, targetBytes - bytesWritten);
      }

      // Handle backpressure and TCP socket aborts correctly mapped
      if (!res.write(writeChunk)) {
        await new Promise((resolve) => {
          const onEvent = () => {
            res.removeListener("drain", onEvent);
            res.removeListener("close", onEvent);
            res.removeListener("error", onEvent);
            resolve();
          };
          res.once("drain", onEvent);
          res.once("close", onEvent);
          res.once("error", onEvent);
        });
      }
      
      bytesWritten += writeChunk.length;

      // If client disconnected or we fulfilled the Range byte limit, stop pulling from Telegram
      if (res.destroyed || bytesWritten >= targetBytes) break;
    }
    if (!res.destroyed) res.end();
  } catch (err) {
    logger.error(`[streamFile] Stream error: ${err.message}`);
    if (!res.headersSent) res.status(500).json({ success: false, message: "Stream failed" });
    if (!res.destroyed) res.destroy(err);
  }
};

/**
 * createTelegramReadable
 * Returns a Node.js Readable stream wrapping Telegram iterDownloadMedia.
 * Ideal for Zip Archiver integration.
 */
const { Readable } = require("stream");
const createTelegramReadable = async (client, messageId) => {
  const message = await getTelegramMessage(client, messageId);
  if (!message.media) throw new Error("Media not found");
  const fileSize = message.media?.document?.size?.toJSNumber?.() || 1048576;
  const chunkSizekb = Math.min(Math.max(512, Math.ceil(fileSize / 1024 / 100)), 4096) * 1024;

  const asyncGen = async function* () {
    for await (const chunk of client.iterDownload({ 
      file: message.media, 
      requestSize: chunkSizekb 
    })) {
      yield chunk;
    }
  };
  return Readable.from(asyncGen());
};

/**
 * streamThumbnail
 * Streams a thumbnail for a Telegram file directly to an HTTP response.
 *
 * @param {TelegramClient} client
 * @param {number}         messageId
 * @param {Object}         res
 */
const streamThumbnail = async (client, messageId, res) => {
  const message = await getTelegramMessage(client, messageId);
  if (!message.media) throw new Error("Message has no media attached");

  // Try fetching the thumb object at index 1 (usually 's' or 'm' size)
  // Fallback to index 0 if it fails.
  let buffer;
  try {
    buffer = await client.downloadMedia(message, { thumb: 1 });
  } catch (err) {}

  if (!buffer) {
    try {
      buffer = await client.downloadMedia(message, { thumb: 0 });
    } catch (err) {}
  }

  // If we still have no buffer, and it's a photo, try downloading the raw media file
  if (!buffer && message.media.photo) {
    try {
      buffer = await client.downloadMedia(message);
    } catch (err) {}
  }

  if (!buffer) throw new Error("Failed to download thumbnail from Telegram");

  res.setHeader("Content-Type", "image/jpeg");
  res.setHeader("Cache-Control", "public, max-age=86400"); // 1 day
  res.setHeader("Content-Length", buffer.length);
  res.end(buffer);
};

/**
 * deleteMessages
 * Deletes one or more messages from Saved Messages.
 *
 * @param {TelegramClient} client
 * @param {number[]}       messageIds
 */
const deleteMessages = async (client, messageIds) => {
  if (!messageIds || messageIds.length === 0) return;

  await client.invoke(
    new Api.messages.DeleteMessages({
      revoke: true,
      id:     messageIds,
    })
  );
};

/**
 * getFileSize
 * Returns the byte size of a Telegram message's media.
 *
 * @param {TelegramClient} client
 * @param {number}         messageId
 * @returns {number}
 */
const getFileSize = async (client, messageId) => {
  const message = await getTelegramMessage(client, messageId).catch(() => null);
  if (!message?.media) return 0;

  const media = message.media;
  if (media.document) {
    return media.document.size?.toJSNumber?.() || 0;
  }
  if (media.photo && media.photo.sizes) {
    const largest = media.photo.sizes.reduce((prev, current) => {
      const prevSize = prev.size || prev.bytes?.length || 0;
      const currSize = current.size || current.bytes?.length || 0;
      return (prevSize > currSize) ? prev : current;
    }, {});
    return largest.size || largest.bytes?.length || 0;
  }
  return 0;
};

module.exports = {
  getClientForUser,
  disconnectClientForUser,
  clearSessionForUser,
  sendOTP,
  verifyOTPAndSaveSession,
  uploadToSavedMessages,
  uploadStreamToSavedMessages,
  generateTelegramFileId,
  uploadBigFilePart,
  finalizeBigFile,
  streamFile,
  createTelegramReadable,
  streamThumbnail,
  deleteMessages,
  getFileSize,
};
