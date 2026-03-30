const { sendError, sendSuccess, asyncHandler } = require("../utils/helpers");
const {
  recordView,
  recordDerivedEvent,
} = require("../services/monetizationService");

exports.trackView = asyncHandler(async (req, res) => {
  const { shareToken, fileId, source } = req.body || {};

  if (!shareToken) {
    return sendError(res, "shareToken is required", 400);
  }

  try {
    const result = await recordView({
      req,
      shareToken,
      fileId,
      source: source || "public_share_view",
    });

    return sendSuccess(
      res,
      result,
      result.tracked ? "View tracked" : "View not eligible"
    );
  } catch (err) {
    return sendError(res, err.message || "Failed to track view", 400);
  }
});

exports.trackImpression = asyncHandler(async (req, res) => {
  const { viewerContextToken, slotId, source } = req.body || {};
  if (!viewerContextToken) {
    return sendError(res, "viewerContextToken is required", 400);
  }

  try {
    const result = await recordDerivedEvent({
      req,
      viewerContextToken,
      slotId: slotId || "default-slot",
      eventType: "impression",
      source: source || "public_share_ad",
    });

    return sendSuccess(
      res,
      result,
      result.tracked ? "Impression tracked" : "Impression not eligible"
    );
  } catch (err) {
    return sendError(res, err.message || "Failed to track impression", 400);
  }
});

exports.trackClick = asyncHandler(async (req, res) => {
  const { viewerContextToken, slotId, source } = req.body || {};
  if (!viewerContextToken) {
    return sendError(res, "viewerContextToken is required", 400);
  }

  try {
    const result = await recordDerivedEvent({
      req,
      viewerContextToken,
      slotId: slotId || "default-slot",
      eventType: "click",
      source: source || "public_share_ad_click",
    });

    return sendSuccess(
      res,
      result,
      result.tracked ? "Click tracked" : "Click not eligible"
    );
  } catch (err) {
    return sendError(res, err.message || "Failed to track click", 400);
  }
});
