/**
 * services/telegramAudioService.js - Telegram storage helpers for cached music
 */

const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const { Api } = require("telegram");
const fs = require("fs");
const env = require("../config/env");
const logger = require("../utils/logger");
const User = require("../models/User");
const telegramUtils = require("../utils/telegram");

class TelegramAudioService {
  constructor() {
    this.clients = new Map();
    this.MAX_RETRIES = 3;
    this.RETRY_DELAY_MS = 2000;
  }

  async getClientForUser(userId) {
    if (this.clients.has(userId)) {
      return this.clients.get(userId);
    }

    const user = await User.findById(userId).select("+telegramSession").lean();
    if (!user || !user.telegramSession || !user.isTelegramConnected) {
      throw new Error("User Telegram account not connected");
    }

    const stringSession = new StringSession(user.telegramSession);
    const client = new TelegramClient(stringSession, env.telegramApiId, env.telegramApiHash, {
      connectionRetries: 5,
      timeout: 60000,
      useWSS: false,
    });

    await client.connect();

    if (!(await client.isUserAuthorized())) {
      throw new Error("Telegram session no longer authorized");
    }

    this.clients.set(userId, client);
    logger.info(`[music-cache][telegram] client initialized for user ${userId}`);
    return client;
  }

  async uploadAudio(userId, filePath, metadata = {}) {
    let lastError = null;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt += 1) {
      try {
        logger.info(
          `[music-cache][telegram] upload attempt ${attempt}/${this.MAX_RETRIES} for ${filePath}`
        );

        const client = await this.getClientForUser(userId);
        const stats = await fs.promises.stat(filePath);
        if (!stats.isFile()) {
          throw new Error("File path does not point to a file");
        }

        const entity = await client.getEntity("me");
        const attributes = [];

        if (metadata.duration) {
          attributes.push(
            new Api.DocumentAttributeAudio({
              duration: Math.max(Math.floor(Number(metadata.duration || 0)), 0),
              title: metadata.title || undefined,
              performer: metadata.artist || undefined,
              voice: false,
            })
          );
        }

        const message = await client.sendFile(entity, {
          file: filePath,
          fileName: metadata.filename || `audio_${Date.now()}.mp3`,
          caption: metadata.title ? `Music cache: ${metadata.title}` : "",
          forceDocument: true,
          attributes: attributes.length ? attributes : undefined,
          progressCallback: (uploaded, total) => {
            const percent = total > 0 ? ((uploaded / total) * 100).toFixed(2) : "0.00";
            logger.debug(
              `[music-cache][telegram] upload progress ${percent}% (${uploaded}/${total})`
            );
          },
        });

        const document = message?.media?.document;
        if (!document?.id || !message?.id) {
          throw new Error("Telegram did not return a valid document/message id");
        }

        return {
          telegramFileId: document.id.toString(),
          telegramMessageId: message.id,
          telegramChatId: entity.id?.toString?.() || null,
          fileSize: stats.size,
          mimeType: document.mimeType || "audio/mpeg",
          success: true,
        };
      } catch (error) {
        lastError = error;
        logger.error(
          `[music-cache][telegram] upload attempt ${attempt} failed: ${error.message}`
        );

        this.clearClient(userId);

        if (attempt < this.MAX_RETRIES) {
          await this.sleep(this.RETRY_DELAY_MS * attempt);
        }
      }
    }

    throw new Error(
      `Telegram upload failed after ${this.MAX_RETRIES} attempts: ${lastError?.message || "Unknown error"}`
    );
  }

  async downloadAudioStream(userId, songDoc) {
    const client = await this.getClientForUser(userId);

    try {
      return await telegramUtils.createTelegramReadable(client, songDoc.telegramMessageId);
    } catch (error) {
      logger.error(`[music-cache][telegram] download stream failed: ${error.message}`);
      throw new Error(`Telegram download failed: ${error.message}`);
    }
  }

  async getFileStream(userId, songDoc) {
    return this.downloadAudioStream(userId, songDoc);
  }

  async streamAudioToResponse(userId, songDoc, req, res) {
    const client = await this.getClientForUser(userId);
    const fileName = `${songDoc.title || songDoc.videoId || "audio"}.mp3`;

    return telegramUtils.streamFile(
      client,
      songDoc.telegramMessageId,
      res,
      songDoc.mimeType || "audio/mpeg",
      fileName,
      true,
      req,
      songDoc.fileSize || 0
    );
  }

  async deleteFile(userId, telegramMessageId) {
    try {
      const client = await this.getClientForUser(userId);
      const entity = await client.getEntity("me");

      await client.deleteMessages(entity, [telegramMessageId], { revoke: true });
      logger.info(`[music-cache][telegram] deleted telegram message ${telegramMessageId}`);
      return true;
    } catch (error) {
      logger.error(`[music-cache][telegram] delete failed: ${error.message}`);
      return false;
    }
  }

  clearClient(userId) {
    this.clients.delete(userId);
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

module.exports = new TelegramAudioService();
