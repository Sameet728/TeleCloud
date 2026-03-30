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
  viewerContextExpiresIn: process.env.MONETIZATION_VIEWER_CONTEXT_EXPIRES_IN || "15m",
  telegramApiId:   parseInt(process.env.TELEGRAM_API_ID),
  telegramApiHash: process.env.TELEGRAM_API_HASH,
  maxFileSizeMb:   parseInt(process.env.MAX_FILE_SIZE_MB) || 2000,
  bcryptRounds:    parseInt(process.env.BCRYPT_ROUNDS) || 12,
  adminEmail: process.env.ADMIN_EMAIL || "admin@gmail.com",
  adminPassword:
    process.env.ADMIN_PASSWORD ||
    (process.env.NODE_ENV === "production" ? null : "admin12345"),
  monetizationTimezone: process.env.MONETIZATION_TIMEZONE || "Asia/Kolkata",
  creatorShareRatio: parseFloat(process.env.CREATOR_SHARE_RATIO || "0.7"),
  minWithdrawalAmount: parseFloat(process.env.MIN_WITHDRAWAL_AMOUNT || "500"),
  viewCooldownMinutes: parseInt(process.env.MONETIZATION_VIEW_COOLDOWN_MINUTES || "30", 10),
  impressionCooldownMinutes: parseInt(process.env.MONETIZATION_IMPRESSION_COOLDOWN_MINUTES || "5", 10),
  maxDailyViewsPerIpPerFile: parseInt(process.env.MONETIZATION_MAX_DAILY_VIEWS_PER_IP_PER_FILE || "30", 10),
  maxDailyImpressionsPerIpPerFile: parseInt(process.env.MONETIZATION_MAX_DAILY_IMPRESSIONS_PER_IP_PER_FILE || "60", 10),
  monetizationEventTtlSeconds: parseInt(process.env.MONETIZATION_EVENT_TTL_SECONDS || `${60 * 60 * 24 * 90}`, 10),
};
