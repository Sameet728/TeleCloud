/**
 * utils/logger.js — Winston logger
 */

const { createLogger, format, transports } = require("winston");
const path = require("path");

const logger = createLogger({
  level: 'debug',   // captures everything for file transports
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.json()
  ),
  transports: [
    // Console: only warn + error (no http/info/debug noise)
    new transports.Console({
      level: 'warn',
      format: format.combine(
        format.colorize(),
        format.printf(({ timestamp, level, message, stack }) =>
          stack
            ? `${timestamp} [${level}]: ${message}\n${stack}`
            : `${timestamp} [${level}]: ${message}`
        )
      ),
    }),
    new transports.File({ filename: 'logs/error.log',   level: 'error' }),
    new transports.File({ filename: 'logs/combined.log' }),
  ],
});

module.exports = logger;
