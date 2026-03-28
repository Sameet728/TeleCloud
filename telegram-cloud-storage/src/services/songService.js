/**
 * services/songService.js - Cache-first song pipeline
 * Flow:
 * 1. Check MongoDB cache
 * 2. If cached, stream from Telegram
 * 3. If not cached, download with yt-dlp
 * 4. Upload to Telegram
 * 5. Save to MongoDB
 */

const Song = require("../models/Song");
const youtubeDownloadService = require("./youtubeDownloadService");
const telegramAudioService = require("./telegramAudioService");
const { getStreamInfo } = require("./musicService");
const logger = require("../utils/logger");

const PROCESSING_STATES = new Set(["downloading", "uploading"]);

const toIdString = (value) => {
  if (!value) return "";
  return typeof value === "string" ? value : value.toString();
};

const sanitizeFileName = (value, fallback = "audio") => {
  const safe = String(value || "")
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return safe || fallback;
};

const isReadySong = (song) =>
  Boolean(
    song &&
      song.status === "ready" &&
      String(song.telegramFileId || "").trim() &&
      Number(song.telegramMessageId || 0) > 0 &&
      song.uploadedByUserId
  );

const pipelineLog = (videoId, step, details = "") => {
  const message = `[music-cache][${videoId}] ${step}${details ? ` | ${details}` : ""}`;
  logger.info(message);
  console.log(message);
};

const buildRetryError = (message, retryAfterSeconds = 0) => {
  const error = new Error(message);
  error.retryAfterSeconds = retryAfterSeconds;
  error.statusCode = retryAfterSeconds > 0 ? 503 : 502;
  return error;
};

const buildCooldownMessage = (retryAfterSeconds = 0) =>
  `This song is temporarily unavailable after a recent upstream failure. Retry in about ${Math.max(
    Math.ceil(retryAfterSeconds / 60),
    1
  )} minute(s).`;

class SongService {
  constructor() {
    this.processingQueue = new Map();
    this.QUEUE_TIMEOUT_MS = 10 * 60 * 1000;
    this.WAIT_TIMEOUT_MS = 5 * 60 * 1000;
    this.WAIT_INTERVAL_MS = 2000;
  }

  isStale(song) {
    if (!song?.lastProcessedAt) return true;
    return Date.now() - new Date(song.lastProcessedAt).getTime() > this.QUEUE_TIMEOUT_MS;
  }

  getFailureCooldown(errorMessage = "", failureCount = 0) {
    const text = String(errorMessage || "").toLowerCase();
    if (text.includes("telegram upload failed") || text.includes("telegram")) {
      return 0;
    }
    if (text.includes("429") || text.includes("too many requests")) {
      return 15 * 60 * 1000;
    }
    if (
      text.includes("requested format is not available") ||
      text.includes("only images are available") ||
      text.includes("signature solving failed") ||
      text.includes("n challenge solving failed")
    ) {
      return 10 * 60 * 1000;
    }

    return Math.min((failureCount + 1) * 60 * 1000, 10 * 60 * 1000);
  }

  isRetryCoolingDown(song) {
    const errorText = String(song?.errorMessage || "").toLowerCase();
    if (errorText.includes("telegram upload failed") || errorText.includes("telegram")) {
      return false;
    }

    return Boolean(
      song?.status === "failed" &&
      song?.nextRetryAt &&
      new Date(song.nextRetryAt).getTime() > Date.now()
    );
  }

  getRetryAfterSeconds(song) {
    if (!song?.nextRetryAt) return 0;
    return Math.max(
      Math.ceil((new Date(song.nextRetryAt).getTime() - Date.now()) / 1000),
      0
    );
  }

  createCooldownError(song) {
    const retryAfterSeconds = this.getRetryAfterSeconds(song);
    return buildRetryError(buildCooldownMessage(retryAfterSeconds), retryAfterSeconds);
  }

  async touchPlay(songId) {
    await Song.updateOne(
      { _id: songId },
      {
        $inc: { playCount: 1 },
        $set: { lastPlayedAt: new Date() },
      }
    );
  }

  touchPlaySafe(videoId, songId) {
    if (!songId) return;
    this.touchPlay(songId).catch((error) =>
      logger.error(`[music-cache][${videoId}] play count update failed: ${error.message}`)
    );
  }

  buildTelegramStreamResult(song, requesterUserId, options = {}) {
    const { source = "telegram-cache", isNew = false } = options;
    const streamOwnerId = toIdString(song?.uploadedByUserId) || toIdString(requesterUserId);

    if (song?._id) {
      this.touchPlaySafe(song.videoId || "", song._id);
    }

    pipelineLog(
      song?.videoId || "unknown",
      "telegram stream ready",
      `owner=${streamOwnerId} cacheHit=${isNew ? "false" : "true"}`
    );

    return {
      mode: "telegram",
      song,
      streamOwnerId,
      isNew,
      source,
    };
  }

  async startBackgroundCaching(videoId, requesterUserId, existingSong = null) {
    if (this.processingQueue.has(videoId)) {
      pipelineLog(videoId, "background cache active", "in-memory queue already running");
      return this.processingQueue.get(videoId);
    }

    const currentSong = existingSong || (await Song.findOne({ videoId }));
    if (
      currentSong &&
      PROCESSING_STATES.has(currentSong.status) &&
      !this.isStale(currentSong)
    ) {
      pipelineLog(videoId, "background cache active", `status=${currentSong.status}`);
      return null;
    }

    const leaseAcquired = await this.acquireDatabaseProcessingLease(videoId, requesterUserId);
    if (!leaseAcquired) {
      pipelineLog(videoId, "background cache busy", "database lease already claimed");
      return null;
    }

    const processingPromise = this.processCacheMiss(videoId, requesterUserId)
      .catch((error) => {
        logger.error(`[music-cache][${videoId}] background cache failed: ${error.message}`);
        return null;
      })
      .finally(() => {
        this.processingQueue.delete(videoId);
      });

    this.processingQueue.set(videoId, processingPromise);
    pipelineLog(videoId, "background cache started", `requester=${requesterUserId}`);
    return processingPromise;
  }

  async checkCache(videoId, { silent = false } = {}) {
    const song = await Song.findOne({ videoId });

    if (isReadySong(song)) {
      if (!silent) {
        pipelineLog(videoId, "cache hit", `messageId=${song.telegramMessageId}`);
      }
      return song;
    }

    if (!song) {
      if (!silent) {
        pipelineLog(videoId, "cache miss", "no database record");
      }
      return null;
    }

    if (this.isRetryCoolingDown(song)) {
      if (!silent) {
        pipelineLog(
          videoId,
          "cache blocked",
          `failed cooldown active until ${new Date(song.nextRetryAt).toISOString()}`
        );
      }
      return null;
    }

    if (!silent) {
      pipelineLog(
        videoId,
        "cache miss",
        `record present but unusable (status=${song.status || "unknown"})`
      );
    }
    return null;
  }

  async markAsProcessing(videoId, userId, status = "downloading") {
    pipelineLog(videoId, "processing state", status);

    const update = {
      $setOnInsert: {
        videoId,
        title: "Pending song",
        artist: "",
        thumbnail: "",
        duration: 0,
      },
      $set: {
        status,
        uploadedByUserId: userId,
        lastProcessedAt: new Date(),
        errorMessage: "",
        nextRetryAt: null,
      },
    };

    if (status === "downloading") {
      update.$inc = { downloadAttempts: 1 };
    } else if (status === "uploading") {
      update.$inc = { uploadAttempts: 1 };
    }

    return Song.findOneAndUpdate({ videoId }, update, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    });
  }

  async acquireDatabaseProcessingLease(videoId, userId) {
    const staleBefore = new Date(Date.now() - this.QUEUE_TIMEOUT_MS);

    try {
      const song = await Song.findOneAndUpdate(
        {
          videoId,
          $or: [
            { status: { $exists: false } },
            {
              status: "failed",
              $or: [
                { nextRetryAt: null },
                { nextRetryAt: { $lte: new Date() } },
              ],
            },
            {
              status: { $in: ["downloading", "uploading"] },
              lastProcessedAt: { $lt: staleBefore },
            },
            {
              status: "ready",
              $or: [
                { telegramFileId: { $exists: false } },
                { telegramFileId: "" },
                { telegramMessageId: null },
                { uploadedByUserId: null },
              ],
            },
          ],
        },
        {
          $setOnInsert: {
            videoId,
            title: "Pending song",
            artist: "",
            thumbnail: "",
            duration: 0,
          },
          $set: {
            status: "downloading",
            uploadedByUserId: userId,
            lastProcessedAt: new Date(),
            errorMessage: "",
            nextRetryAt: null,
          },
          $inc: { downloadAttempts: 1 },
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        }
      );

      return Boolean(song);
    } catch (error) {
      if (error?.code === 11000) {
        return false;
      }
      throw error;
    }
  }

  async waitForProcessing(videoId) {
    const startedAt = Date.now();

    while (Date.now() - startedAt < this.WAIT_TIMEOUT_MS) {
      const cachedSong = await this.checkCache(videoId, { silent: true });
      if (cachedSong) return cachedSong;

      const song = await Song.findOne({ videoId });
      if (song?.status === "failed") {
        pipelineLog(videoId, "wait aborted", `status=failed error=${song.errorMessage || "unknown"}`);
        if (this.isRetryCoolingDown(song)) {
          throw this.createCooldownError(song);
        }
        return null;
      }

      if (song && PROCESSING_STATES.has(song.status) && this.isStale(song)) {
        pipelineLog(videoId, "stale lock detected", `status=${song.status}`);
        await this.markSongFailed(videoId, "Processing timed out while waiting");
        return null;
      }

      await this.sleep(this.WAIT_INTERVAL_MS);
    }

    throw new Error("Timeout waiting for cached song to finish processing");
  }

  async downloadAudio(videoId) {
    pipelineLog(videoId, "yt-dlp start");
    const downloadResult = await youtubeDownloadService.downloadAudio(videoId);
    pipelineLog(
      videoId,
      "yt-dlp success",
      `bytes=${downloadResult?.metadata?.fileSize || 0}`
    );
    return downloadResult;
  }

  async uploadToTelegram(ownerUserId, filePath, metadata = {}, videoId = "") {
    pipelineLog(videoId || metadata.videoId || "unknown", "telegram upload start", `owner=${ownerUserId}`);

    const fileName = `${sanitizeFileName(metadata.title, videoId || "audio")}.mp3`;
    const uploadResult = await telegramAudioService.uploadAudio(ownerUserId, filePath, {
      filename: fileName,
      title: metadata.title,
      duration: metadata.duration,
    });

    pipelineLog(
      videoId || metadata.videoId || "unknown",
      "telegram upload success",
      `fileId=${uploadResult.telegramFileId} messageId=${uploadResult.telegramMessageId}`
    );

    return uploadResult;
  }

  async saveToDB(videoId, ownerUserId, metadata = {}, uploadResult = {}) {
    pipelineLog(videoId, "db save start");

    const song = await Song.findOneAndUpdate(
      { videoId },
      {
        $set: {
          title: metadata.title || "Unknown Title",
          artist: metadata.artist || "Unknown Artist",
          thumbnail:
            metadata.thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          duration: Number(metadata.duration || 0),
          telegramFileId: String(uploadResult.telegramFileId || "").trim(),
          telegramMessageId: Number(uploadResult.telegramMessageId || 0) || null,
          telegramChatId: uploadResult.telegramChatId
            ? String(uploadResult.telegramChatId)
            : null,
          fileSize: Number(uploadResult.fileSize || metadata.fileSize || 0),
          mimeType: uploadResult.mimeType || metadata.mimeType || "audio/mpeg",
          uploadedByUserId: ownerUserId,
          status: "ready",
          lastProcessedAt: new Date(),
          errorMessage: "",
          failureCount: 0,
          nextRetryAt: null,
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    pipelineLog(videoId, "db save success", `songId=${song._id}`);
    return song;
  }

  async markSongFailed(videoId, errorMessage) {
    const existingSong = await Song.findOne({ videoId }).lean().catch(() => null);
    const failureCount = Number(existingSong?.failureCount || 0) + 1;
    const cooldownMs = this.getFailureCooldown(errorMessage, failureCount);
    const nextRetryAt = cooldownMs > 0 ? new Date(Date.now() + cooldownMs) : null;

    pipelineLog(
      videoId,
      "pipeline failed",
      nextRetryAt
        ? `${errorMessage} | retry after ${nextRetryAt.toISOString()}`
        : `${errorMessage} | retry immediately allowed`
    );

    try {
      await Song.updateOne(
        { videoId },
        {
          $set: {
            status: "failed",
            errorMessage,
            lastProcessedAt: new Date(),
            nextRetryAt,
          },
          $inc: {
            failureCount: 1,
          },
        }
      );
    } catch (error) {
      logger.error(`[music-cache][${videoId}] failed to persist failure state: ${error.message}`);
    }
  }

  async processCacheMiss(videoId, requesterUserId) {
    let tempFilePath = "";

    try {
      pipelineLog(videoId, "cache miss pipeline", `requester=${requesterUserId}`);

      const downloadResult = await this.downloadAudio(videoId);
      tempFilePath = downloadResult.filePath;
      const metadata = {
        videoId,
        ...downloadResult.metadata,
      };

      const readySongAfterDownload = await this.checkCache(videoId, { silent: true });
      if (readySongAfterDownload) {
        pipelineLog(videoId, "cache filled while downloading", "skipping duplicate upload");
        return {
          song: readySongAfterDownload,
          isNew: false,
          source: "telegram-cache",
        };
      }

      await this.markAsProcessing(videoId, requesterUserId, "uploading");
      const uploadResult = await this.uploadToTelegram(
        requesterUserId,
        tempFilePath,
        metadata,
        videoId
      );

      const song = await this.saveToDB(
        videoId,
        requesterUserId,
        metadata,
        uploadResult
      );

      pipelineLog(videoId, "pipeline complete", "yt-dlp -> telegram -> mongodb");
      return {
        song,
        isNew: true,
        source: "yt-dlp->telegram",
      };
    } catch (error) {
      await this.markSongFailed(videoId, error.message || "Unknown pipeline error");
      throw error;
    } finally {
      if (tempFilePath) {
        await youtubeDownloadService.cleanup(tempFilePath);
      }
    }
  }

  async ensureCachedSong(videoId, requesterUserId) {
    const cachedSong = await this.checkCache(videoId);
    if (cachedSong) {
      this.touchPlay(cachedSong._id).catch((error) =>
        logger.error(`[music-cache][${videoId}] play count update failed: ${error.message}`)
      );
      return {
        song: cachedSong,
        isNew: false,
        source: "telegram-cache",
      };
    }

    if (this.processingQueue.has(videoId)) {
      pipelineLog(videoId, "waiting on in-memory queue");
      const result = await this.processingQueue.get(videoId);
      if (result?.song?._id) {
        this.touchPlay(result.song._id).catch((error) =>
          logger.error(`[music-cache][${videoId}] play count update failed: ${error.message}`)
        );
      }
      return result;
    }

    const existingSong = await Song.findOne({ videoId });
    if (this.isRetryCoolingDown(existingSong)) {
      pipelineLog(
        videoId,
        "retry cooldown active",
        `retryAfter=${this.getRetryAfterSeconds(existingSong)}s`
      );
      throw this.createCooldownError(existingSong);
    }

    if (
      existingSong &&
      PROCESSING_STATES.has(existingSong.status) &&
      !this.isStale(existingSong)
    ) {
      pipelineLog(videoId, "waiting on database lock", `status=${existingSong.status}`);
      const waitedSong = await this.waitForProcessing(videoId);
      if (waitedSong) {
        this.touchPlay(waitedSong._id).catch((error) =>
          logger.error(`[music-cache][${videoId}] play count update failed: ${error.message}`)
        );
        return {
          song: waitedSong,
          isNew: false,
          source: "telegram-cache",
        };
      }

      const failedSong = await Song.findOne({ videoId });
      if (this.isRetryCoolingDown(failedSong)) {
        throw this.createCooldownError(failedSong);
      }
    }

    let leaseAcquired = await this.acquireDatabaseProcessingLease(videoId, requesterUserId);
    if (!leaseAcquired) {
      pipelineLog(videoId, "database lease busy", "waiting for the active processor");
      const waitedSong = await this.waitForProcessing(videoId);
      if (waitedSong) {
        this.touchPlay(waitedSong._id).catch((error) =>
          logger.error(`[music-cache][${videoId}] play count update failed: ${error.message}`)
        );
        return {
          song: waitedSong,
          isNew: false,
          source: "telegram-cache",
        };
      }

      const failedSong = await Song.findOne({ videoId });
      if (this.isRetryCoolingDown(failedSong)) {
        throw this.createCooldownError(failedSong);
      }

      leaseAcquired = await this.acquireDatabaseProcessingLease(videoId, requesterUserId);
      if (!leaseAcquired) {
        throw new Error("Song is already being processed. Please retry.");
      }
    }

    const processingPromise = this.processCacheMiss(videoId, requesterUserId)
      .finally(() => {
        this.processingQueue.delete(videoId);
      });

    this.processingQueue.set(videoId, processingPromise);

    const result = await processingPromise;
    if (result?.song?._id) {
      this.touchPlay(result.song._id).catch((error) =>
        logger.error(`[music-cache][${videoId}] play count update failed: ${error.message}`)
      );
    }
    return result;
  }

  async streamSong(videoId, requesterUserId) {
    const cachedSong = await this.checkCache(videoId);
    if (cachedSong) {
      return this.buildTelegramStreamResult(cachedSong, requesterUserId, {
        source: "telegram-cache",
        isNew: false,
      });
    }

    const existingSong = await Song.findOne({ videoId });
    if (this.isRetryCoolingDown(existingSong)) {
      pipelineLog(
        videoId,
        "retry cooldown active",
        `retryAfter=${this.getRetryAfterSeconds(existingSong)}s`
      );
      throw this.createCooldownError(existingSong);
    }

    try {
      const streamInfo = await getStreamInfo(videoId);
      pipelineLog(videoId, "direct stream ready", "serving upstream audio while telegram cache warms");

      this.startBackgroundCaching(videoId, requesterUserId, existingSong).catch((error) => {
        logger.error(`[music-cache][${videoId}] failed to start background cache: ${error.message}`);
      });

      return {
        mode: "direct",
        streamInfo,
        isNew: true,
        source: "direct-ytdlp",
      };
    } catch (error) {
      pipelineLog(videoId, "direct stream fallback", error.message || "unknown upstream error");

      await this.startBackgroundCaching(videoId, requesterUserId, existingSong).catch(() => null);

      if (this.processingQueue.has(videoId)) {
        const result = await this.processingQueue.get(videoId);
        if (result?.song) {
          return this.buildTelegramStreamResult(result.song, requesterUserId, {
            source: result.source || "telegram-cache",
            isNew: Boolean(result.isNew),
          });
        }
      }

      const waitedSong = await this.waitForProcessing(videoId).catch(() => null);
      if (waitedSong) {
        return this.buildTelegramStreamResult(waitedSong, requesterUserId, {
          source: "telegram-cache",
          isNew: false,
        });
      }

      const failedSong = await Song.findOne({ videoId });
      if (this.isRetryCoolingDown(failedSong)) {
        throw this.createCooldownError(failedSong);
      }

      throw error;
    }
  }

  async getSongDetails(videoId) {
    const song = await Song.findOne({ videoId });

    if (!song) {
      try {
        const metadata = await youtubeDownloadService.getVideoMetadata(videoId);
        return {
          ...metadata,
          existsInDatabase: false,
          willDownloadOnStream: true,
        };
      } catch (error) {
        throw new Error("Video not found");
      }
    }

    return {
      videoId: song.videoId,
      title: song.title,
      artist: song.artist,
      thumbnail: song.thumbnail,
      duration: song.duration,
      fileSize: song.fileSize,
      playCount: song.playCount,
      existsInDatabase: true,
      status: song.status,
      telegramFileId: song.telegramFileId,
      telegramMessageId: song.telegramMessageId,
    };
  }

  async getTrendingSongs(limit = 20) {
    return Song.find({ status: "ready" })
      .sort({ playCount: -1 })
      .limit(limit)
      .select("-__v")
      .lean();
  }

  async getRecentlyAdded(limit = 20) {
    return Song.find({ status: "ready" })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("-__v")
      .lean();
  }

  async searchCachedSongs(query, limit = 20) {
    const searchRegex = new RegExp(query, "i");

    return Song.find({
      status: "ready",
      $or: [{ title: searchRegex }, { artist: searchRegex }],
    })
      .limit(limit)
      .select("-__v")
      .lean();
  }

  async getUserUploads(userId, limit = 50) {
    return Song.find({ uploadedByUserId: userId, status: "ready" })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("-__v")
      .lean();
  }

  async deleteSong(videoId, userId) {
    const song = await Song.findOne({ videoId, uploadedByUserId: userId });

    if (!song) {
      throw new Error("Song not found or unauthorized");
    }

    try {
      await telegramAudioService.deleteFile(toIdString(song.uploadedByUserId), song.telegramMessageId);
    } catch (error) {
      logger.error(`[music-cache][${videoId}] failed to delete from telegram: ${error.message}`);
    }

    await Song.deleteOne({ _id: song._id });
    pipelineLog(videoId, "deleted cached song");
    return true;
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

module.exports = new SongService();
