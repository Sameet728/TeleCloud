/**
 * routes/payments.js
 */

const router  = require("express").Router();
const express = require("express");
const { protect } = require("../middleware/auth");
const {
  createOrder,
  verifyPayment,
  handleWebhook,
  getPaymentStatus,
  getSubscription,
  getHistory,
} = require("../controllers/paymentController");

// ── Webhook — NO auth, receives raw body (set in app.js before json middleware)
router.post("/webhook", handleWebhook);

// ── Protected routes
router.use(protect);

router.post("/create-order",       createOrder);
router.post("/verify",             verifyPayment);
router.get("/subscription",        getSubscription);
router.get("/history",             getHistory);
router.get("/status/:orderId",     getPaymentStatus);

module.exports = router;
