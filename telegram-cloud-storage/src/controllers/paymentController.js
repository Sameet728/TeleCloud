/**
 * controllers/paymentController.js — Razorpay payment handlers
 *
 * Security model:
 *  - Subscription activation ONLY happens via verified webhook
 *  - verifyPayment (client-side) delegates to activateSubscription()
 *    which is idempotent — safe to call from both paths
 */

const Razorpay  = require("razorpay");
const crypto    = require("crypto");
const Payment   = require("../models/Payment");
const User      = require("../models/User");
const { asyncHandler, sendSuccess, sendError } = require("../utils/helpers");
const logger    = require("../utils/logger");

// ── Plan config ───────────────────────────────────────────────────
const PLANS = {
  monthly:  { price: 4900,  durationDays: 30,  label: "Monthly Plan"  },
  "6months":{ price: 24900, durationDays: 180, label: "6-Month Plan"  },
  yearly:   { price: 49900, durationDays: 365, label: "Yearly Plan"   },
};

const getRazorpay = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error("Razorpay keys not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env");
  }
  return new Razorpay({
    key_id:     process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
};

// ── Shared: activate subscription ─────────────────────────────────
// Idempotent — checks if already paid before applying changes.
async function activateSubscription(orderId, paymentId, signature) {
  const payment = await Payment.findOne({ orderId });
  if (!payment) {
    logger.warn(`[Payment] activateSubscription: order not found — ${orderId}`);
    return null;
  }

  // Idempotency guard
  if (payment.status === "paid") {
    logger.info(`[Payment] Skipping duplicate activation for order ${orderId}`);
    return payment;
  }

  // Mark payment as paid
  payment.paymentId = paymentId || payment.paymentId;
  payment.signature = signature || payment.signature;
  payment.status    = "paid";
  await payment.save();

  // Calculate subscription window
  const planConfig = PLANS[payment.plan];
  if (!planConfig) {
    logger.error(`[Payment] Unknown plan "${payment.plan}" for order ${orderId}`);
    return payment;
  }
  const now = new Date();
  const end = new Date(now.getTime() + planConfig.durationDays * 86400 * 1000);

  // Update user subscription
  const updatedUser = await User.findByIdAndUpdate(
    payment.userId,
    {
      plan:              payment.plan,
      isSubscribed:      true,
      subscriptionStart: now,
      subscriptionEnd:   end,
      storageLimit:      null, // unlimited
    },
    { new: true }
  );

  logger.info(`[Payment] Subscription activated: user=${payment.userId} plan=${payment.plan} until=${end.toISOString()}`);

  // Fire-and-forget confirmation email
  try {
    const { sendSubscriptionEmail } = require("../services/emailService");
    const planNames = {
      monthly:  "Monthly (Unlimited)",
      "6months":"6-Month (Unlimited)",
      yearly:   "Yearly (Unlimited)",
    };
    sendSubscriptionEmail(updatedUser.email, "", planNames[payment.plan] || payment.plan);
  } catch (emailErr) {
    logger.warn(`[Payment] Could not send subscription email: ${emailErr.message}`);
  }

  return payment;
}

// ── Create Razorpay order ─────────────────────────────────────────
exports.createOrder = asyncHandler(async (req, res) => {
  const { plan } = req.body;
  if (!PLANS[plan]) return sendError(res, "Invalid plan selected", 400);

  const planConfig = PLANS[plan];
  const razorpay   = getRazorpay();

  let order;
  try {
    order = await razorpay.orders.create({
      amount:   planConfig.price,
      currency: "INR",
      receipt:  `rcpt_${crypto.randomBytes(10).toString("hex")}`, // ≤ 40 chars
      notes:    { plan, userId: req.user._id.toString() },
    });
  } catch (err) {
    const errorMsg = err?.error?.description || err?.message || "Razorpay API error";
    return res.status(500).json({ success: false, message: errorMsg, data: null });
  }

  // Persist order record
  await Payment.create({
    userId:   req.user._id,
    orderId:  order.id,
    plan,
    amount:   planConfig.price,
    currency: "INR",
    status:   "created",
  });

  sendSuccess(res, {
    orderId:   order.id,
    amount:    planConfig.price,
    currency:  "INR",
    keyId:     process.env.RAZORPAY_KEY_ID,
    plan,
    planLabel: planConfig.label,
  }, "Order created");
});

// ── Verify payment (client-side fallback) ─────────────────────────
// Still validates the HMAC to prevent tampering, but delegates
// subscription activation to the shared idempotent helper.
exports.verifyPayment = asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return sendError(res, "Missing payment details", 400);
  }

  // HMAC verification against payment secret (client-side flow)
  const body     = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");

  if (expected !== razorpay_signature) {
    await Payment.findOneAndUpdate({ orderId: razorpay_order_id }, { status: "failed" });
    return sendError(res, "Payment verification failed — invalid signature", 400);
  }

  // Delegate to shared helper (idempotent)
  const payment = await activateSubscription(
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature
  );
  if (!payment) return sendError(res, "Order not found", 404);

  const planConfig = PLANS[payment.plan];
  const user       = await User.findById(payment.userId);

  sendSuccess(res, {
    plan:            payment.plan,
    subscriptionEnd: user?.subscriptionEnd,
  }, "Payment verified — subscription activated! 🎉");
});

// ── Webhook handler ───────────────────────────────────────────────
// POST /api/payments/webhook   (no auth, raw body, verified by HMAC)
exports.handleWebhook = async (req, res) => {
  // Always respond 200 first so Razorpay won't retry on our errors
  res.status(200).json({ received: true });

  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      logger.error("[Webhook] RAZORPAY_WEBHOOK_SECRET is not set — skipping verification!");
      return;
    }

    // req.body is a raw Buffer (registered before express.json)
    const rawBody  = req.body;
    const signature = req.headers["x-razorpay-signature"];

    if (!signature) {
      logger.warn("[Webhook] Missing X-Razorpay-Signature header");
      return;
    }

    // Verify HMAC
    const digest = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    if (digest !== signature) {
      logger.warn("[Webhook] Invalid signature — request rejected");
      return;
    }

    // Parse payload
    let payload;
    try {
      payload = JSON.parse(rawBody.toString());
    } catch {
      logger.error("[Webhook] Failed to parse webhook payload");
      return;
    }

    const eventId   = payload.event_id || null;
    const eventType = payload.event;
    logger.info(`[Webhook] Received event: ${eventType} (id=${eventId})`);

    // ── Handle events ────────────────────────────────────────────
    if (eventType === "payment.captured" || eventType === "order.paid") {
      let orderId, paymentId;

      if (eventType === "payment.captured") {
        paymentId = payload.payload?.payment?.entity?.id;
        orderId   = payload.payload?.payment?.entity?.order_id;
      } else {
        // order.paid — read from the order entity
        orderId   = payload.payload?.order?.entity?.id;
        paymentId = payload.payload?.payment?.entity?.id;
      }

      if (!orderId) {
        logger.warn(`[Webhook] Could not extract orderId from ${eventType}`);
        return;
      }

      // Idempotency: check if this specific event was already processed
      if (eventId) {
        const exists = await Payment.findOne({ webhookEventId: eventId });
        if (exists) {
          logger.info(`[Webhook] Duplicate event ${eventId} — skipping`);
          return;
        }
      }

      // Store raw payload for debugging
      await Payment.findOneAndUpdate(
        { orderId },
        { rawWebhookPayload: rawBody.toString(), ...(eventId ? { webhookEventId: eventId } : {}) }
      );

      // Activate subscription (also idempotent internally)
      await activateSubscription(orderId, paymentId, null);

    } else if (eventType === "payment.failed") {
      const orderId   = payload.payload?.payment?.entity?.order_id;
      const paymentId = payload.payload?.payment?.entity?.id;

      if (orderId) {
        await Payment.findOneAndUpdate(
          { orderId },
          {
            status:            "failed",
            paymentId,
            rawWebhookPayload: rawBody.toString(),
            ...(eventId ? { webhookEventId: eventId } : {}),
          }
        );
        logger.info(`[Webhook] Payment failed for order ${orderId}`);
      }
    } else {
      logger.info(`[Webhook] Unhandled event type: ${eventType}`);
    }

  } catch (err) {
    // Never crash on webhook — Razorpay already got 200
    logger.error(`[Webhook] Unexpected error: ${err.message}`);
  }
};

// ── GET payment status (for frontend polling) ─────────────────────
exports.getPaymentStatus = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const payment = await Payment.findOne({ orderId, userId: req.user._id })
    .select("orderId paymentId plan amount currency status createdAt updatedAt");
  if (!payment) return sendError(res, "Order not found", 404);
  sendSuccess(res, payment, "Payment status retrieved");
});

// ── GET current subscription info ─────────────────────────────────
exports.getSubscription = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  // Auto-expire check
  if (user.isSubscribed && user.subscriptionEnd && new Date() > user.subscriptionEnd) {
    await User.findByIdAndUpdate(user._id, {
      isSubscribed: false,
      plan:         "free",
      storageLimit: 10 * 1024 * 1024 * 1024,
    });
    user.isSubscribed  = false;
    user.plan          = "free";
    user.storageLimit  = 10 * 1024 * 1024 * 1024;
  }

  sendSuccess(res, {
    plan:              user.plan,
    isSubscribed:      user.isSubscribed,
    storageUsed:       user.storageUsed,
    storageLimit:      user.storageLimit,
    subscriptionStart: user.subscriptionStart,
    subscriptionEnd:   user.subscriptionEnd,
  }, "Subscription info retrieved");
});

// ── GET payment history ───────────────────────────────────────────
exports.getHistory = asyncHandler(async (req, res) => {
  const history = await Payment.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .select("-signature -userId -__v -rawWebhookPayload");
  sendSuccess(res, history, "Payment history retrieved");
});
