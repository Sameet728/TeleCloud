/**
 * routes/public.js — NO authentication required
 */

const router = require("express").Router();
const { publicInfo, publicDownload, publicDownloadZip } = require("../controllers/shareController");

// GET /api/public/info/:token
router.get("/info/:token", publicInfo);

// GET /api/public/download/:token
router.get("/download/:token", publicDownload);

// GET /api/public/download-zip/:token
router.get("/download-zip/:token", publicDownloadZip);

module.exports = router;
