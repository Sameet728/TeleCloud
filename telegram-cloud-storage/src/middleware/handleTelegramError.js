/**
 * middleware/handleTelegramError.js
 * Catches Telegram AUTH_KEY_UNREGISTERED errors thrown anywhere in a route,
 * clears the stale session from DB + cache, and returns a 401 with a
 * user-friendly message prompting the user to reconnect.
 */

const { clearSessionForUser } = require("../utils/telegram");
const logger = require("../utils/logger");

const handleTelegramError = async (err, req, res, next) => {
  if (err && (err.message || "").includes("AUTH_KEY_UNREGISTERED")) {
    const userId = req.user?._id;
    logger.warn(`AUTH_KEY_UNREGISTERED for user ${userId} — clearing session`);
    if (userId) await clearSessionForUser(userId);
    return res.status(403).json({
      success:             false,
      telegramDisconnected: true,
      message:             "Your Telegram session has expired or was revoked. Please reconnect your Telegram account.",
      data:                null,
    });
  }
  next(err);
};

module.exports = handleTelegramError;
