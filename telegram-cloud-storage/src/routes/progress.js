/**
 * routes/progress.js — Server-Sent Events for upload progress
 *
 * GET /api/progress/:uploadId
 * Client connects before starting upload, then opens upload with
 * header X-Upload-Id: <uploadId>
 */

const router   = require("express").Router();
const { protect }  = require("../middleware/auth");
const progressStore = require("../utils/progressStore");

router.get("/:uploadId", protect, (req, res) => {
  const { uploadId } = req.params;

  // SSE headers
  res.setHeader("Content-Type",  "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection",    "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // Disable Nginx buffering
  res.flushHeaders();

  // Send an initial ping
  res.write(`data: ${JSON.stringify({ progress: 0, status: "connected" })}\n\n`);

  // Register this response as a client for the given upload
  progressStore.addClient(uploadId, res);

  // Send heartbeat every 20 s to keep connection alive
  const heartbeat = setInterval(() => {
    try { res.write(": heartbeat\n\n"); } catch (_) {}
  }, 20_000);

  // Cleanup when client disconnects
  req.on("close", () => {
    clearInterval(heartbeat);
    progressStore.removeClient(uploadId, res);
  });
});

module.exports = router;
