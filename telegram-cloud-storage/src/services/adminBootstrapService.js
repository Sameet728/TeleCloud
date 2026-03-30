const User = require("../models/User");
const env = require("../config/env");
const logger = require("../utils/logger");

const ensureAdminAccount = async () => {
  const email = (env.adminEmail || "").trim().toLowerCase();
  const password = env.adminPassword;

  if (!email) {
    logger.warn("Admin bootstrap skipped: ADMIN_EMAIL not configured");
    return;
  }

  if (!password || password.length < 8) {
    logger.warn("Admin bootstrap skipped: ADMIN_PASSWORD missing or too short");
    return;
  }

  const existing = await User.findOne({ email });

  if (existing) {
    if (existing.role !== "admin") {
      existing.role = "admin";
      await existing.save();
      logger.info(`Promoted existing admin account: ${email}`);
    }
    return;
  }

  await User.create({
    email,
    password,
    role: "admin",
    isTelegramConnected: false,
  });

  logger.info(`Seeded admin account: ${email}`);
};

module.exports = { ensureAdminAccount };
