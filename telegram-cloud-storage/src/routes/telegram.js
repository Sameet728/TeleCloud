/**
 * routes/telegram.js
 * All routes require authenticated + Telegram-connected user.
 */

const router = require("express").Router();
const { protect } = require("../middleware/auth");
const ctrl = require("../controllers/telegramController");

router.use(protect);


router.get("/files",  ctrl.getFiles);
router.post("/import", ctrl.importFile);
router.get("/sync",   ctrl.syncFiles);

module.exports = router;
