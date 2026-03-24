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
const env  = require("../config/env");
const logger = require("./logger");

// ── In-memory client cache (avoids reconnecting on every request) ──
const clientCache = new Map();

/**
 * getClientForUser
 * Returns a connected TelegramClient for the given user.
 * Reuses cached clients when possible.
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

  const session = new StringSession(user.telegramSession);
  const client  = new TelegramClient(session, env.telegramApiId, env.telegramApiHash, {
    connectionRetries: 5,
    retryDelay: 1000,
    autoReconnect: true,
  });

  await client.connect();
  clientCache.set(cacheKey, client);
  logger.debug(`Telegram client connected for user ${cacheKey}`);
  return client;
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
    workers: 4,       // Parallel upload workers
    progressCallback: onProgress,
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
 */
const streamFile = async (client, messageId, res, mimeType, fileName, inline = false) => {
  // Fetch the message to get its media
  const messages = await client.getMessages("me", { ids: [messageId] });
  if (!messages || messages.length === 0 || !messages[0]) {
    throw new Error("File not found in Telegram");
  }

  const message = messages[0];
  if (!message.media) {
    throw new Error("Message has no media attached");
  }

  const disposition = inline ? "inline" : `attachment; filename="${encodeURIComponent(fileName)}"`;
  res.setHeader("Content-Disposition", disposition);
  res.setHeader("Content-Type", mimeType || "application/octet-stream");
  res.setHeader("Cache-Control", "private, max-age=3600");
  res.setHeader("Accept-Ranges", "bytes");

  // Download and pipe in chunks
  const buffer = await client.downloadMedia(message, { workers: 4 });
  if (!buffer) throw new Error("Failed to download file from Telegram");

  res.setHeader("Content-Length", buffer.length);
  res.end(buffer);
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
  const messages = await client.getMessages("me", { ids: [messageId] });
  if (!messages || messages.length === 0 || !messages[0]) {
    throw new Error("File not found in Telegram");
  }

  const message = messages[0];
  if (!message.media) throw new Error("Message has no media attached");

  // Try fetching the thumb object at index 1 (usually 's' or 'm' size)
  // Fallback to index 0 if it fails.
  let buffer;
  try {
    buffer = await client.downloadMedia(message, { thumb: 1 });
  } catch (err) {
    buffer = await client.downloadMedia(message, { thumb: 0 });
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
  const messages = await client.getMessages("me", { ids: [messageId] });
  if (!messages?.[0]?.media) return 0;
  return messages[0].media?.document?.size?.toJSNumber?.() || 0;
};

module.exports = {
  getClientForUser,
  disconnectClientForUser,
  clearSessionForUser,
  sendOTP,
  verifyOTPAndSaveSession,
  uploadToSavedMessages,
  streamFile,
  streamThumbnail,
  deleteMessages,
  getFileSize,
};
