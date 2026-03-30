/**
 * controllers/authController.js
 *
 * POST /api/auth/register          → create account
 * POST /api/auth/login             → get JWT
 * GET  /api/auth/me                → current user profile
 * POST /api/auth/telegram/send-otp → start Telegram link
 * POST /api/auth/telegram/verify   → complete Telegram link
 * POST /api/auth/telegram/disconnect → unlink Telegram
 */

const jwt      = require("jsonwebtoken");
const User     = require("../models/User");
const env      = require("../config/env");
const telegram = require("../utils/telegram");
const { asyncHandler, sendSuccess, sendError } = require("../utils/helpers");

/**
 * Sign a JWT for a user
 */
const signToken = (userId) =>
  jwt.sign({ userId }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

// ── Register ──────────────────────────────────────────────────────
exports.register = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return sendError(res, "Email and password are required", 400);
  }
  if (password.length < 8) {
    return sendError(res, "Password must be at least 8 characters", 400);
  }

  // Explicit check — gives a clean error instead of raw Mongo 11000
  const existing = await User.findOne({ email: email.trim().toLowerCase() });
  if (existing) {
    return sendError(res, "An account with this email already exists", 409);
  }

  const user  = await User.create({ email: email.trim().toLowerCase(), password });
  const token = signToken(user._id);

  // Send Welcome Email
  const { sendWelcomeEmail } = require("../services/emailService");
  sendWelcomeEmail(user.email, "");

  sendSuccess(res, { token, user: user.toPublicJSON() }, "Registration successful", 201);
});

// ── Login ─────────────────────────────────────────────────────────
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = String(email || "").trim().toLowerCase();

  if (!email || !password) {
    return sendError(res, "Email and password are required", 400);
  }

  const user = await User.findOne({ email: normalizedEmail }).select("+password");
  if (!user || !(await user.comparePassword(password))) {
    return sendError(res, "Invalid email or password", 401);
  }

  const token = signToken(user._id);
  sendSuccess(res, { token, user: user.toPublicJSON() }, "Login successful");
});

// ── Get current user ───────────────────────────────────────────────
exports.getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  sendSuccess(res, user.toPublicJSON(), "User profile fetched");
});

// ── Send Telegram OTP ──────────────────────────────────────────────
exports.sendTelegramOTP = asyncHandler(async (req, res) => {
  const { phoneNumber } = req.body;
  if (!phoneNumber) return sendError(res, "Phone number is required", 400);

  const { tempSession, phoneCodeHash } = await telegram.sendOTP(phoneNumber);

  // Store temp session in user document (overwrite if exists)
  await User.findByIdAndUpdate(req.user._id, {
    telegramSession: tempSession,
  });

  sendSuccess(
    res,
    { phoneCodeHash },
    "OTP sent to your Telegram account. Use the code to verify."
  );
});

// ── Verify OTP & link Telegram ─────────────────────────────────────
exports.verifyTelegramOTP = asyncHandler(async (req, res) => {
  const { phoneNumber, phoneCode, phoneCodeHash, password } = req.body;
  if (!phoneNumber || !phoneCode || !phoneCodeHash) {
    return sendError(res, "phoneNumber, phoneCode, and phoneCodeHash are required", 400);
  }

  // Get current temp session
  const user = await User.findById(req.user._id).select("+telegramSession");
  if (!user.telegramSession) {
    return sendError(res, "Please request an OTP first", 400);
  }

  const { sessionString, telegramId } = await telegram.verifyOTPAndSaveSession(
    phoneNumber, phoneCode, phoneCodeHash, user.telegramSession, password
  );

  await User.findByIdAndUpdate(req.user._id, {
    telegramSession:      sessionString,
    telegramId,
    isTelegramConnected:  true,
  });

  sendSuccess(res, { telegramId }, "Telegram account connected successfully");
});

// ── Disconnect Telegram ────────────────────────────────────────────
exports.disconnectTelegram = asyncHandler(async (req, res) => {
  telegram.disconnectClientForUser(req.user._id);
  await User.findByIdAndUpdate(req.user._id, {
    telegramSession:     null,
    telegramId:          null,
    isTelegramConnected: false,
  });
  sendSuccess(res, null, "Telegram account disconnected");
});
