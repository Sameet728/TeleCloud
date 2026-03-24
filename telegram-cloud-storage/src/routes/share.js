/**
 * routes/share.js — authenticated share management
 */

const router = require("express").Router();
const ctrl   = require("../controllers/shareController");
const { protect } = require("../middleware/auth");

router.use(protect);

router.post("/",              ctrl.createShare);
router.get("/",               ctrl.listShares);
router.delete("/:token",      ctrl.revokeShare);

module.exports = router;
