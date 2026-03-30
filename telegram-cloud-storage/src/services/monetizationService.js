const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const env = require("../config/env");
const File = require("../models/File");
const Share = require("../models/Share");
const FileAnalyticsDaily = require("../models/FileAnalyticsDaily");
const MonetizationEvent = require("../models/MonetizationEvent");

const hashValue = (value) =>
  crypto.createHash("sha256").update(String(value || "")).digest("hex");

const getDateKey = (date = new Date()) => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: env.monetizationTimezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(date);
};

const getClientIp = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) return String(forwarded).split(",")[0].trim();
  return req.ip || req.socket?.remoteAddress || req.connection?.remoteAddress || "unknown";
};

const floorDateToBucket = (date = new Date(), minutes = 5) => {
  const bucketMs = minutes * 60 * 1000;
  return new Date(Math.floor(date.getTime() / bucketMs) * bucketMs);
};

const issueViewerContextToken = (payload) =>
  jwt.sign(
    {
      ...payload,
      purpose: "monetization_viewer_context",
    },
    env.jwtSecret,
    { expiresIn: env.viewerContextExpiresIn }
  );

const verifyViewerContextToken = (token) => {
  const decoded = jwt.verify(token, env.jwtSecret);
  if (decoded.purpose !== "monetization_viewer_context") {
    throw new Error("Invalid viewer context token");
  }
  return decoded;
};

const createAnalyticsDailySeed = (file, dateKey) => ({
  fileId: file._id,
  userId: file.userId,
  dateKey,
  fileName: file.fileName,
  uploadDate: file.createdAt,
});

const resolveTrackedFile = async ({ shareToken, fileId }) => {
  if (!shareToken) throw new Error("shareToken is required");

  const share = await Share.findOne({ token: shareToken })
    .populate("fileId")
    .populate("folderId");

  if (!share || !share.isActive) {
    throw new Error("Active share not found");
  }

  let file = null;
  if (share.fileId) {
    file = share.fileId;
  } else if (share.folderId) {
    if (!fileId) throw new Error("fileId is required for folder shares");
    file = await File.findOne({ _id: fileId, folderId: share.folderId._id });
  }

  if (!file) throw new Error("Tracked file not found");
  return { share, file };
};

const buildEventPayload = ({
  req,
  file,
  share,
  eventType,
  slotId = null,
  source,
  viewEventId = null,
}) => {
  const now = new Date();
  const dateKey = getDateKey(now);
  const minutes =
    eventType === "impression" || eventType === "click"
      ? env.impressionCooldownMinutes
      : env.viewCooldownMinutes;

  return {
    actorUserId: req.user?._id || null,
    bucketStart: floorDateToBucket(now, minutes),
    dateKey,
    eventType,
    fileId: file._id,
    hashedIp: hashValue(getClientIp(req)),
    ownerUserId: file.userId,
    shareId: share?._id || null,
    slotId,
    source,
    userAgentHash: hashValue(req.headers["user-agent"] || "unknown"),
    viewEventId,
    viewerSessionId: String(
      req.body?.viewerSessionId ||
        req.headers["x-viewer-session"] ||
        req.query?.viewerSessionId ||
        `anonymous-${hashValue(`${getClientIp(req)}:${req.headers["user-agent"] || ""}`)}`
    ),
  };
};

const findDuplicateEvent = async ({
  fileId,
  eventType,
  viewerSessionId,
  hashedIp,
  dateKey,
  bucketStart,
  slotId = null,
}) => {
  const query = {
    accepted: true,
    bucketStart,
    dateKey,
    eventType,
    fileId,
    hashedIp,
    viewerSessionId,
  };

  if (slotId) query.slotId = slotId;

  return MonetizationEvent.findOne(query);
};

const findDailyCount = async ({ fileId, eventType, dateKey, hashedIp }) =>
  MonetizationEvent.countDocuments({
    accepted: true,
    dateKey,
    eventType,
    fileId,
    hashedIp,
  });

const createEventRecord = async ({ payload, accepted, rejectionReason = null }) =>
  MonetizationEvent.create({
    ...payload,
    accepted,
    rejectionReason,
  });

const incrementAnalyticsCounter = async ({ file, eventType, dateKey }) => {
  const field =
    eventType === "view" ? "views" : eventType === "impression" ? "impressions" : "clicks";

  await Promise.all([
    File.updateOne({ _id: file._id }, { $inc: { [field]: 1 } }),
    FileAnalyticsDaily.findOneAndUpdate(
      { fileId: file._id, dateKey },
      {
        $setOnInsert: createAnalyticsDailySeed(file, dateKey),
        $inc: { [field]: 1 },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    ),
  ]);
};

const recordView = async ({ req, shareToken, fileId, source = "public_share_view" }) => {
  const { share, file } = await resolveTrackedFile({ shareToken, fileId });

  if (req.user && String(req.user._id) === String(file.userId)) {
    return { tracked: false, viewerContextToken: null, fileSummary: file, reason: "owner_view" };
  }

  const payload = buildEventPayload({ req, file, share, eventType: "view", source });
  const dailyCount = await findDailyCount({
    fileId: file._id,
    eventType: "view",
    dateKey: payload.dateKey,
    hashedIp: payload.hashedIp,
  });

  if (dailyCount >= env.maxDailyViewsPerIpPerFile) {
    await createEventRecord({
      payload,
      accepted: false,
      rejectionReason: "ip_daily_view_limit",
    });
    return {
      tracked: false,
      viewerContextToken: null,
      fileSummary: file,
      reason: "ip_daily_view_limit",
    };
  }

  const duplicate = await findDuplicateEvent(payload);
  if (duplicate) {
    await createEventRecord({
      payload,
      accepted: false,
      rejectionReason: "cooldown_duplicate_view",
    });
    return {
      tracked: false,
      viewerContextToken: null,
      fileSummary: file,
      reason: "cooldown_duplicate_view",
    };
  }

  const event = await createEventRecord({ payload, accepted: true });
  await incrementAnalyticsCounter({ file, eventType: "view", dateKey: payload.dateKey });

  return {
    tracked: true,
    viewerContextToken: issueViewerContextToken({
      dateKey: payload.dateKey,
      fileId: String(file._id),
      ownerUserId: String(file.userId),
      shareId: share?._id ? String(share._id) : null,
      shareToken,
      source,
      viewEventId: String(event._id),
      viewerSessionId: payload.viewerSessionId,
    }),
    fileSummary: file,
    reason: null,
  };
};

const recordDerivedEvent = async ({
  req,
  viewerContextToken,
  slotId = null,
  eventType,
  source,
}) => {
  const decoded = verifyViewerContextToken(viewerContextToken);
  const viewEvent = await MonetizationEvent.findOne({
    _id: decoded.viewEventId,
    accepted: true,
    eventType: "view",
  });

  if (!viewEvent) {
    throw new Error("Eligible view event not found");
  }

  const file = await File.findById(decoded.fileId);
  if (!file) {
    throw new Error("Tracked file not found");
  }

  const payload = buildEventPayload({
    req,
    file,
    share: decoded.shareId ? { _id: decoded.shareId } : null,
    eventType,
    source,
    slotId,
    viewEventId: viewEvent._id,
  });

  if (payload.viewerSessionId !== decoded.viewerSessionId) {
    throw new Error("Viewer session mismatch");
  }

  if (payload.actorUserId && String(payload.actorUserId) === String(file.userId)) {
    return { tracked: false, reason: "owner_event" };
  }

  if (eventType === "impression") {
    const dailyCount = await findDailyCount({
      fileId: file._id,
      eventType: "impression",
      dateKey: payload.dateKey,
      hashedIp: payload.hashedIp,
    });

    if (dailyCount >= env.maxDailyImpressionsPerIpPerFile) {
      await createEventRecord({
        payload,
        accepted: false,
        rejectionReason: "ip_daily_impression_limit",
      });
      return { tracked: false, reason: "ip_daily_impression_limit" };
    }
  }

  const duplicate = await findDuplicateEvent(payload);
  if (duplicate) {
    await createEventRecord({
      payload,
      accepted: false,
      rejectionReason: `cooldown_duplicate_${eventType}`,
    });
    return { tracked: false, reason: `cooldown_duplicate_${eventType}` };
  }

  await createEventRecord({ payload, accepted: true });
  await incrementAnalyticsCounter({ file, eventType, dateKey: payload.dateKey });

  return { tracked: true, reason: null };
};

const getDateRangeKeys = ({ range = "30d", from = null, to = null }) => {
  if (from && to) {
    return { from, to };
  }

  const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;
  const end = new Date();
  const start = new Date(end.getTime() - (days - 1) * 24 * 60 * 60 * 1000);

  return {
    from: getDateKey(start),
    to: getDateKey(end),
  };
};

module.exports = {
  getDateKey,
  getDateRangeKeys,
  recordView,
  recordDerivedEvent,
  resolveTrackedFile,
};
