/**
 * middleware/auth.js — JWT authentication middleware
 * Attaches req.user after verifying Bearer token
 */

const jwt    = require("jsonwebtoken");
const User   = require("../models/User");
const env    = require("../config/env");
const logger = require("../utils/logger");

const protect = async (req, res, next) => {
  try {
    let token;

    const header = req.headers.authorization;

    if (header && header.startsWith("Bearer ")) {
      token = header.split(" ")[1];
    }

    if (!token && req.query.token) {
      token = req.query.token;
    }

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

module.exports = { protect };
