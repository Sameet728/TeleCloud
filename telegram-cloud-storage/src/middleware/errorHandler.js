/**
 * middleware/errorHandler.js — Centralised error handler
 * Catches all errors thrown or passed via next(err)
 */

const logger = require("../utils/logger");

const errorHandler = (err, req, res, _next) => {
  logger.error(`${req.method} ${req.originalUrl} → ${err.message}`, { stack: err.stack });

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ success: false, message: messages.join(", "), data: null });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    // Map internal field names to user-friendly messages
    const fieldMessages = {
      email: 'An account with this email already exists',
      orderId: 'Duplicate order detected',
    };
    const message = fieldMessages[field] ||
      `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
    return res.status(409).json({ success: false, message, data: null });
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === "CastError") {
    return res.status(400).json({ success: false, message: "Invalid ID format", data: null });
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({ success: false, message: "Invalid token", data: null });
  }

  const statusCode = err.statusCode || err.status || 500;
  const message    = statusCode < 500 ? err.message : "Internal server error";

  res.status(statusCode).json({ success: false, message, data: null });
};

module.exports = errorHandler;
