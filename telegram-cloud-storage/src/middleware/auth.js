/**
 * middleware/auth.js — JWT authentication middleware
 * Attaches req.user after verifying Bearer token
 */

const jwt    = require("jsonwebtoken");
const User   = require("../models/User");
const env    = require("../config/env");
const logger = require("../utils/logger");

const extractToken = (req) => {
  const header = req.headers.authorization;

  if (header && header.startsWith("Bearer ")) {
    return header.split(" ")[1];
  }

  if (req.query.token) {
    return req.query.token;
  }

  return null;
};

const protect = async (req, res, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No authentication token provided",
        data: null,
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, env.jwtSecret);
    } catch (err) {
      const msg =
        err.name === "TokenExpiredError"
          ? "Token expired"
          : "Invalid token";
      return res.status(401).json({
        success: false,
        message: msg,
        data: null,
      });
    }

    const user = await User.findById(decoded.userId).select("+telegramSession");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
        data: null,
      });
    }

    req.user = user;
    next();
  } catch (err) {
    logger.error("Auth middleware error:", err);
    next(err);
  }
};

const optionalProtect = async (req, _res, next) => {
  try {
    const token = extractToken(req);
    if (!token) return next();

    try {
      const decoded = jwt.verify(token, env.jwtSecret);
      const user = await User.findById(decoded.userId).select("+telegramSession");
      if (user) req.user = user;
    } catch (err) {
      logger.warn(`Optional auth ignored invalid token: ${err.message}`);
    }

    next();
  } catch (err) {
    logger.error("Optional auth middleware error:", err);
    next(err);
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
      data: null,
    });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Admin access required",
      data: null,
    });
  }

  next();
};

module.exports = { protect, optionalProtect, requireAdmin, extractToken };
