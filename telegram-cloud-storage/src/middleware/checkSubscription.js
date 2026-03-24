/**
 * middleware/checkSubscription.js
 * Blocks file access for expired paid users.
 * Free-plan users are always let through (storage is enforced separately).
 */

const User = require("../models/User");

const checkSubscription = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) return next();

    // Free plan users: always allowed
    if (user.plan === "free") return next();

    // Paid plan: check expiry
    if (user.subscriptionEnd && new Date() > user.subscriptionEnd) {
      // Auto-expire in DB
      await User.findByIdAndUpdate(user._id, {
        isSubscribed: false,
        plan:         "free",
        storageLimit: 10 * 1024 * 1024 * 1024,
      });

      return res.status(403).json({
        success:   false,
        expired:   true,
        message:   "Subscription expired. Please renew your plan to access your files.",
        data:      null,
      });
    }

    next();
  } catch (err) {
    next(err);
  }
};

module.exports = checkSubscription;
