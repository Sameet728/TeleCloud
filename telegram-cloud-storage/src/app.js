/**
 * app.js — Express application factory
 * Registers all middleware and routes
 */

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/auth");
const fileRoutes = require("./routes/files");
const folderRoutes = require("./routes/folders");
const shareRoutes = require("./routes/share");
const dashboardRoutes = require("./routes/dashboard");
const searchRoutes = require("./routes/search");
const musicRoutes = require("./routes/music");
const publicRoutes = require("./routes/public");
const telegramRoutes = require("./routes/telegram");
const errorHandler = require("./middleware/errorHandler");
const handleTelegramError = require("./middleware/handleTelegramError");
const logger = require("./utils/logger");
const checkSubscription = require("./middleware/checkSubscription");
const checkStorageLimit = require("./middleware/checkStorageLimit");
const cleanupService = require("./services/cleanupService");

const app = express();

// Start background cleanup service
cleanupService.start();
logger.info("Background cleanup service initialized");

// ── Security headers ───────────────────────────────────────────
// ── Security headers ─────────────────────────
// app.use(
//   helmet({
//     crossOriginResourcePolicy: { policy: "cross-origin" },
//     frameguard: false,
//     contentSecurityPolicy: false,
//   })
// );


// ── CORS ───────────────────────────────────────────────────────
const allowedOrigins = [
  "https://telecloud-tau.vercel.app",
  "http://localhost:5173"
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // allow Postman / curl

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error("CORS not allowed"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Upload-Id",
    "X-File-Size",
    "X-Share-Password",
    "Range"
  ],
  exposedHeaders: [
    "Content-Range",
    "Accept-Ranges",
    "Content-Length",
    "Content-Disposition"
  ],
  credentials: true,
}));

app.options("*", cors({
  origin: allowedOrigins,
  credentials: true
}));



// ── Request logging (errors only) ─────────────────────────────────
app.use(morgan("combined", {
  stream: { write: (msg) => logger.http(msg.trim()) },
  skip: (_req, res) => res.statusCode < 400,   // skip 2xx / 3xx
}));

// ── Webhook raw body (MUST be before express.json) ───────────────
// Razorpay HMAC signature verification requires the raw request buffer.
// We capture ONLY the /api/payments/webhook route here with raw middleware.
const paymentRoutes = require("./routes/payments");
app.use("/api/payments", (req, _res, next) => {
  if (req.path === "/webhook") {
    express.raw({ type: "application/json" })(req, _res, next);
  } else {
    next();
  }
});
// ── Body parsing ───────────────────────────────────────────────
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// ── Global rate limiting ───────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2000,
  message: { success: false, message: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

// ── Auth rate limiting (stricter) ──────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, message: "Too many auth attempts, please try again later." },
});

// ── Routes ─────────────────────────────────────────────────────
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/files", checkSubscription, fileRoutes);
app.use("/api/folders", checkSubscription, folderRoutes);
app.use("/api/share", shareRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/music", musicRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/telegram", telegramRoutes);
app.use("/public", publicRoutes);



// ── Health check ───────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ success: true, message: "Server is healthy", data: { uptime: process.uptime() } });
});

// ── 404 handler ────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Route not found", data: null });
});

// ── Telegram auth error handler (before generic handler) ─────────
app.use(handleTelegramError);

// ── Centralized error handler ──────────────────────────────────
app.use(errorHandler);

module.exports = app;

