/**
 * middleware/checkStorageLimit.js
 * Blocks upload if free user would exceed 10 GB.
 */

const checkStorageLimit = (req, res, next) => {
  const user = req.user;
  if (!user) return next();

  // Paid (subscribed) users have unlimited storage
  if (user.isSubscribed && user.subscriptionEnd && new Date() < user.subscriptionEnd) {
    return next();
  }

  // Free plan: check limit
  const limit = user.storageLimit || 10 * 1024 * 1024 * 1024; // 10 GB
  if (user.storageUsed >= limit) {
    return res.status(413).json({
      success: false,
      message: "Storage limit reached. Upgrade to a paid plan for unlimited storage.",
      data:    { storageUsed: user.storageUsed, storageLimit: limit },
    });
  }

  next();
};

module.exports = checkStorageLimit;
