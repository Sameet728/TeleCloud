/**
 * utils/helpers.js — Generic utility functions
 */

const crypto = require("crypto");
const path   = require("path");

/**
 * generateToken — secure random hex token for share links
 * @param {number} bytes
 * @returns {string}
 */
const generateToken = (bytes = 32) => crypto.randomBytes(bytes).toString("hex");

/**
 * sanitizeFileName — removes dangerous characters from file names
 * @param {string} name
 * @returns {string}
 */
const sanitizeFileName = (name) => {
  if (!name) return "file";
  return path
    .basename(name)
    .replace(/[^a-zA-Z0-9._\-\s]/g, "_")
    .replace(/\s+/g, "_")
    .substring(0, 255);
};

/**
 * formatBytes — converts bytes to human-readable string
 * @param {number} bytes
 * @returns {string}
 */
const formatBytes = (bytes) => {
  if (bytes === 0) return "0 Bytes";
  const k     = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i     = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

/**
 * asyncHandler — wraps async route handlers to catch errors
 * @param {Function} fn
 * @returns {Function}
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * sendSuccess — standardised success response
 */
const sendSuccess = (res, data = null, message = "Success", statusCode = 200) => {
  res.status(statusCode).json({ success: true, message, data });
};

/**
 * sendError — standardised error response
 */
const sendError = (res, message = "An error occurred", statusCode = 500, data = null) => {
  res.status(statusCode).json({ success: false, message, data });
};

module.exports = {
  generateToken,
  sanitizeFileName,
  formatBytes,
  asyncHandler,
  sendSuccess,
  sendError,
};
