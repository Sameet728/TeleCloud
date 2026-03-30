/**
 * models/User.js — User schema
 * Stores auth credentials and Telegram session data
 */

const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");
const env      = require("../config/env");

const userSchema = new mongoose.Schema(
  {
    email: {
      type:      String,
      required:  [true, "Email is required"],
      unique:    true,
      lowercase: true,
      trim:      true,
      match:     [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email format"],
    },
    password: {
      type:     String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select:   false, // Never return password in queries by default
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
      index: true,
    },
    // Telegram account details (filled after Telegram auth)
    telegramId: {
      type:    String,
      default: null,
    },
    telegramSession: {
      type:    String,  // Serialised StringSession
      default: null,
      select:  false,   // Sensitive — exclude from default queries
    },
    isTelegramConnected: {
      type:    Boolean,
      default: false,
    },
    storageUsed: {
      type:    Number,
      default: 0, // bytes
    },
    // ── Subscription ────────────────────────────────────────────
    plan: {
      type:    String,
      enum:    ["free", "monthly", "6months", "yearly"],
      default: "free",
    },
    storageLimit: {
      type:    Number,
      default: 10 * 1024 * 1024 * 1024, // 10 GB in bytes
    },
    isSubscribed: {
      type:    Boolean,
      default: false,
    },
    subscriptionStart: {
      type:    Date,
      default: null,
    },
    subscriptionEnd: {
      type:    Date,
      default: null,
    },
    lastFetchedMessageId: {
      type:    Number,
      default: 0, // Used for incremental Telegram sync
    },
    walletBalance: {
      type: Number,
      default: 0,
    },
    pendingWithdrawalBalance: {
      type: Number,
      default: 0,
    },
    totalEarned: {
      type: Number,
      default: 0,
    },
    totalWithdrawn: {
      type: Number,
      default: 0,
    },
    defaultUpiId: {
      type: String,
      default: null,
      trim: true,
    },
  },
  { timestamps: true }
);

// ── Hash password before saving ────────────────────────────────
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, env.bcryptRounds);
  next();
});

// ── Instance method: compare password ─────────────────────────
userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

// ── Instance method: safe public object ───────────────────────
userSchema.methods.toPublicJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.telegramSession;
  return obj;
};

module.exports = mongoose.model("User", userSchema);
