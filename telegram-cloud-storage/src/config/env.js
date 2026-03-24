/**
 * config/env.js — Validated environment variables
 * Fails fast if required vars are missing
 */

const required = [
  "MONGODB_URI",
  "JWT_SECRET",
  "TELEGRAM_API_ID",
  "TELEGRAM_API_HASH",
];

required.forEach((key) => {
  if (!process.env[key]) {
    console.error(`❌ Missing required environment variable: ${key}`);
    process.exit(1);
  }
});

module.exports = {
  port:          parseInt(process.env.PORT) || 5000,
  nodeEnv:       process.env.NODE_ENV || "development",
  mongoUri:      process.env.MONGODB_URI,
  jwtSecret:     process.env.JWT_SECRET,
  jwtExpiresIn:  process.env.JWT_EXPIRES_IN || "7d",
  telegramApiId:   parseInt(process.env.TELEGRAM_API_ID),
  telegramApiHash: process.env.TELEGRAM_API_HASH,
  maxFileSizeMb:   parseInt(process.env.MAX_FILE_SIZE_MB) || 2000,
  bcryptRounds:    parseInt(process.env.BCRYPT_ROUNDS) || 12,
};
