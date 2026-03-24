/**
 * config/db.js — MongoDB connection setup
 */

const mongoose = require("mongoose");
const logger   = require("../utils/logger");

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not defined in environment variables");

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });
  console.log(`✅ MongoDB connected: ${mongoose.connection.host}`);

  logger.info(`✅ MongoDB connected: ${mongoose.connection.host}`);

  mongoose.connection.on("error", (err) => logger.error("MongoDB error:", err));
  mongoose.connection.on("disconnected", () => logger.warn("MongoDB disconnected"));
};

module.exports = connectDB;
