/**
 * routes/auth.js
 */

const router = require("express").Router();
const ctrl   = require("../controllers/authController");
const { protect } = require("../middleware/auth");

// Public routes
router.post("/register",  ctrl.register);
router.post("/login",     ctrl.login);

// Protected routes
router.get("/me",                       protect, ctrl.getMe);
router.post("/telegram/send-otp",       protect, ctrl.sendTelegramOTP);
router.post("/telegram/verify",         protect, ctrl.verifyTelegramOTP);
router.post("/telegram/disconnect",     protect, ctrl.disconnectTelegram);

module.exports = router;
