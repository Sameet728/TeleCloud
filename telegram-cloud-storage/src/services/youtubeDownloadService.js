/**
 * services/youtubeDownloadService.js — YouTube audio download via yt-dlp
 * Downloads audio in streaming fashion for optimal user experience
 */

const { spawn } = require("child_process");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const logger = require("../utils/logger");
const { getStreamInfo } = require("./musicService");

// Generate UUID v4 using native crypto (Node.js 14.17+)
const uuidv4 = () => {
  return crypto.randomUUID ? crypto.randomUUID() : 
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
};

class YoutubeDownloadService {
  constructor() {
    this.tempDir = path.join(os.tmpdir(), "telecloud-music");
    this.MAX_RETRIES = 2;
    this.DOWNLOAD_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes
    
    // Ensure temp directory exists
    this.ensureTempDir();
  }

  /**
   * Ensure temp directory exists
   */
  ensureTempDir() {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Extract video ID from various YouTube URL formats
   */
  extractVideoId(url) {
    if (!url || typeof url !== "string") return null;

    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/, // Direct video ID
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  }

  buildYtDlpArgs(baseArgs = []) {
    const args = [...baseArgs, "--no-cookies"];

    args.push(
      "--add-header",
      "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      "--extractor-args",
      "youtube:player_client=android,ios,web,tv_embedded"
    );

    return args;
  }

  getErrorMessage(error) {
    return (
      error?.response?.data?.message ||
      error?.message ||
      String(error || "Unknown download error")
    );
  }

  isUpstreamBlockedError(error) {
    const text = this.getErrorMessage(error).toLowerCase();
    return (
      text.includes("429") ||
      text.includes("too many requests") ||
      text.includes("requested format is not available") ||
      text.includes("only images are available") ||
      text.includes("signature solving failed") ||
      text.includes("n challenge solving failed")
    );
  }

  async downloadFromResolvedStream(videoId, outputPath, options = {}) {
    const { onProgress, signal } = options;
    const streamInfo = await getStreamInfo(videoId);

    if (!streamInfo?.streamUrl) {
      throw new Error("Python music service did not return a playable stream URL");
    }

    logger.info(`[music-cache][${videoId}] python yt-dlp stream-info resolved`);

    const response = await axios.get(streamInfo.streamUrl, {
      responseType: "stream",
      timeout: 45000,
      signal,
      maxRedirects: 5,
      validateStatus: () => true,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      },
    });

    if (response.status >= 400) {
      throw new Error(`Resolved audio stream returned HTTP ${response.status}`);
    }

    const total = Number(response.headers["content-length"] || 0);
    let downloaded = 0;

    await new Promise((resolve, reject) => {
      const writer = fs.createWriteStream(outputPath);

      response.data.on("data", (chunk) => {
        downloaded += chunk.length;
        if (onProgress) {
          onProgress(downloaded, total || null);
        }
      });

      response.data.on("error", reject);
      writer.on("error", reject);
      writer.on("finish", resolve);
      response.data.pipe(writer);
    });

    return {
      title: streamInfo.title || "Unknown Title",
      mimeType: streamInfo.mimeType || "audio/webm",
    };
  }

  /**
   * Get video metadata without downloading (using yt-dlp --dump-json)
   */
  async getVideoMetadata(videoId) {
    return new Promise((resolve, reject) => {
      const url = `https://www.youtube.com/watch?v=${videoId}`;
      let stdout = "";
      let stderr = "";
      const args = this.buildYtDlpArgs([
        "--dump-json",
        "--no-download",
        "--no-warnings",
      ]);
      args.push(url);

      const process = spawn("yt-dlp", args);

      process.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      process.stderr.on("data", (data) => {
        const errorOutput = data.toString();
        stderr += errorOutput;
        logger.debug("yt-dlp metadata stderr:", errorOutput.trim());
      });

      process.on("close", (code) => {
        if (code === 0 && stdout) {
          try {
            const metadata = JSON.parse(stdout);
            resolve({
              videoId,
              title: metadata.title || "Unknown Title",
              artist:
                metadata.artist ||
                metadata.channel ||
                metadata.uploader ||
                "Unknown Artist",
              thumbnail: metadata.thumbnail || "",
              duration: metadata.duration || 0,
              viewCount: metadata.view_count || 0,
            });
            return;
          } catch (_parseError) {
            // fall through to rejection below
          }
        }

        reject(new Error(stderr.trim() || "Failed to fetch video metadata"));
      });

      process.on("error", (err) => {
        reject(
          new Error(
            `yt-dlp not found or error: ${err.message}. Ensure yt-dlp is installed.`
          )
        );
      });
    });
  }

  /**
   * Download audio from YouTube using yt-dlp
   * Streams to a temporary file with progress tracking
   * @param {string} videoId - YouTube video ID
   * @param {object} options - Download options
   * @returns {Promise<{filePath: string, metadata: object}>}
   */
  async downloadAudio(videoId, options = {}) {
    const {
      onProgress,
      signal,
    } = options;

    let lastError;
    
    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        logger.info(`Download attempt ${attempt}/${this.MAX_RETRIES} for video ${videoId}`);
        
        const tempFilePath = path.join(this.tempDir, `${uuidv4()}.webm`);
        
        let metadata = null;

        // First, get metadata
        try {
          metadata = await this.getVideoMetadata(videoId);
        } catch (metaErr) {
          logger.warn("Could not fetch metadata, continuing with download:", metaErr.message);
          metadata = {
            videoId,
            title: "Unknown Title",
            artist: "Unknown Artist",
            thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
            duration: 0,
          };
        }

        let resolvedInfo = null;
        let primaryError = null;

        try {
          resolvedInfo = await this.downloadFromResolvedStream(videoId, tempFilePath, {
            onProgress: (downloaded, total) => {
              if (onProgress && total > 0) {
                onProgress({
                  downloaded,
                  total,
                  percent: ((downloaded / total) * 100).toFixed(2),
                });
              }
            },
            signal,
          });
        } catch (streamInfoError) {
          primaryError = new Error(this.getErrorMessage(streamInfoError));
          logger.warn(
            `[music-cache][${videoId}] python stream download failed, falling back to local yt-dlp: ${primaryError.message}`
          );

          if (this.isUpstreamBlockedError(primaryError)) {
            throw primaryError;
          }

          const url = `https://www.youtube.com/watch?v=${videoId}`;
          const downloadResult = await this.executeYtDlp(url, tempFilePath, {
            onProgress: (downloaded, total) => {
              if (onProgress && total > 0) {
                onProgress({
                  downloaded,
                  total,
                  percent: ((downloaded / total) * 100).toFixed(2),
                });
              }
            },
            signal,
          });

          if (!downloadResult.success) {
            throw new Error(
              `${downloadResult.error || "Download failed"}${
                primaryError ? ` | python-stream=${primaryError.message}` : ""
              }`
            );
          }
        }

        // Verify file was created
        const stats = await fs.promises.stat(tempFilePath);
        if (stats.size === 0) {
          throw new Error("Downloaded file is empty");
        }

        logger.info(`Download completed: ${tempFilePath} (${stats.size} bytes)`);

        return {
          filePath: tempFilePath,
          metadata: {
            ...metadata,
            title: metadata.title !== "Unknown Title" ? metadata.title : resolvedInfo?.title || metadata.title,
            mimeType: resolvedInfo?.mimeType || "audio/mpeg",
            fileSize: stats.size,
          },
          success: true,
        };
      } catch (error) {
        lastError = error;
        logger.error(`Download attempt ${attempt} failed:`, this.getErrorMessage(error));

        if (this.isUpstreamBlockedError(error)) {
          logger.warn(
            `[music-cache][${videoId}] upstream rate-limit/challenge detected; skipping extra download retries`
          );
          break;
        }
        
        if (attempt < this.MAX_RETRIES) {
          await this.sleep(1000 * attempt);
        }
      }
    }

    throw new Error(
      `Download failed after ${this.MAX_RETRIES} attempts: ${this.getErrorMessage(lastError)}`
    );
  }

  /**
   * Execute yt-dlp with progress tracking
   */
  executeYtDlp(url, outputPath, options = {}) {
    const { onProgress, signal } = options;

    return new Promise((resolve, reject) => {
      let aborted = false;
      const baseArgs = [
        "--extract-audio",
        "--audio-format", "mp3",
        "--audio-quality", "0",
        "--output", outputPath,
        "--no-playlist",
        "--newline",
        "--retries", "3",
        "--fragment-retries", "3",
        "--socket-timeout", "30",
      ];
      const args = this.buildYtDlpArgs(baseArgs);
      args.push(url);

      logger.info(`Executing yt-dlp with args: ${args.join(' ')}`);

      const process = spawn("yt-dlp", args);
      let stderr = "";
      let stdout = "";
      let isComplete = false;

      const timeoutId = setTimeout(() => {
        if (!isComplete) {
          process.kill("SIGKILL");
          reject(new Error("Download timeout exceeded"));
        }
      }, this.DOWNLOAD_TIMEOUT_MS);

      const abortHandler = () => {
        aborted = true;
        process.kill("SIGKILL");
        clearTimeout(timeoutId);
        reject(new Error("Download aborted"));
      };

      if (signal) {
        signal.addEventListener("abort", abortHandler, { once: true });
      }

      process.stdout.on("data", (data) => {
        const output = data.toString();
        stdout += output;
        logger.debug("yt-dlp stdout:", output.trim());

        const progressMatch = output.match(/\[(.*?)\]\s+(\d+\.?\d*)%\s+of\s+(\d+\.?\d*)([KM]?)iB/i);
        if (progressMatch) {
          let downloaded = parseFloat(progressMatch[3]);
          const unit = progressMatch[4];

          if (unit === "K") downloaded *= 1024;
          else if (unit === "M") downloaded *= 1024 * 1024;

          if (onProgress) {
            onProgress(Math.floor(downloaded), null);
          }
        }
      });

      process.stderr.on("data", (data) => {
        const errorOutput = data.toString();
        stderr += errorOutput;
        logger.error("yt-dlp stderr:", errorOutput.trim());
      });

      process.on("close", (code) => {
        clearTimeout(timeoutId);
        isComplete = true;
        if (signal) {
          signal.removeEventListener("abort", abortHandler);
        }

        logger.info(`yt-dlp closed with code ${code}`);

        if (code === 0) {
          resolve({ success: true });
          return;
        }

        const errorMsg = stderr.trim() || stdout.trim() || `Process exited with code ${code}`;
        logger.error(`yt-dlp failed: ${errorMsg}`);
        resolve({ success: false, error: errorMsg });
      });

      process.on("error", (err) => {
        clearTimeout(timeoutId);
        isComplete = true;
        if (signal) {
          signal.removeEventListener("abort", abortHandler);
        }
        const errMsg = `yt-dlp execution error: ${err.message}. Ensure yt-dlp is installed and in PATH.`;
        logger.error(errMsg);
        reject(new Error(errMsg));
      });
    });
  }

  /**
   * Clean up temporary file
   */
  async cleanup(filePath) {
    try {
      if (filePath && fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        logger.debug(`Cleaned up temp file: ${filePath}`);
        return true;
      }
    } catch (error) {
      logger.error("Failed to cleanup temp file:", error.message);
    }
    return false;
  }

  /**
   * Clean up all temp files (periodic maintenance)
   */
  async cleanupAll() {
    try {
      if (fs.existsSync(this.tempDir)) {
        const files = await fs.promises.readdir(this.tempDir);
        for (const file of files) {
          await fs.promises.unlink(path.join(this.tempDir, file));
        }
        logger.info("Cleaned up all temp files");
      }
    } catch (error) {
      logger.error("Failed to cleanup temp directory:", error.message);
    }
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
const youtubeDownloadService = new YoutubeDownloadService();

module.exports = youtubeDownloadService;
