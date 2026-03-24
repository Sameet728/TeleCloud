/**
 * models/Payment.js — Razorpay payment records
 */

const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
      index:    true,
    },
    orderId:          { type: String, required: true, unique: true },  // Razorpay order_id
    paymentId:        { type: String, default: null },                  // Razorpay payment_id
    signature:        { type: String, default: null },
    plan:             { type: String, enum: ["monthly", "6months", "yearly"], required: true },
    amount:           { type: Number, required: true },                 // paise
    currency:         { type: String, default: "INR" },
    status:           { type: String, enum: ["created", "paid", "failed"], default: "created" },
    // Idempotency: store the Razorpay event id so duplicate webhooks are ignored
    webhookEventId:   { type: String, default: null, sparse: true },
    // Raw payload stored for debugging / audit
    rawWebhookPayload:{ type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);
