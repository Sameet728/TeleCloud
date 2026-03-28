const { asyncHandler, sendSuccess, sendError } = require("../utils/helpers");
const axios = require("axios");
const logger = require("../utils/logger");
const {
  searchMusic,
  getRecommendations,
  getUpNext,
  getRelated,
  getQuickPicks,
  getCategories,
  getReadyPlaylists,
  getBrowsePlaylist,
  getTrending,
  getLyrics,
} = require("../services/musicService");
const songService = require("../services/songService");
const youtubeDownloadService = require("../services/youtubeDownloadService");
const telegramAudioService = require("../services/telegramAudioService");
const MusicHistory = require("../models/MusicHistory");
const MusicPlaylist = require("../models/MusicPlaylist");
const MusicFavorite = require("../models/MusicFavorite");
const MusicAnalytics = require("../models/MusicAnalytics");
const Song = require("../models/Song");

const LIKED_PLAYLIST_SLUG = "liked-songs";
const LIKED_PLAYLIST_NAME = "Liked Songs";
const LIKED_PLAYLIST_DESCRIPTION = "Every track you heart lands here automatically.";
const fallbackThumbnail = (videoId) =>
  videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : "";

const secondsToDuration = (value) => {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return "";
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  const hours = Math.floor(minutes / 60);
  const displayMinutes = hours ? minutes % 60 : minutes;
  return hours
    ? `${hours}:${String(displayMinutes).padStart(2, "0")}:${String(
        remainder
      ).padStart(2, "0")}`
    : `${displayMinutes}:${String(remainder).padStart(2, "0")}`;
};

const normalizeDuration = (track = {}) => {
  const directValue = [track.duration, track.length, track.durationText]
    .map((value) => String(value || "").trim())
    .find(Boolean);
  if (directValue) {
    if (/^\d+:\d{2}(?::\d{2})?$/.test(directValue)) return directValue;
    const fromNumericString = secondsToDuration(directValue);
    if (fromNumericString) return fromNumericString;
  }

  return (
    secondsToDuration(track.durationSeconds) ||
    secondsToDuration(track.duration_seconds) ||
    secondsToDuration(track.lengthSeconds) ||
    secondsToDuration(track.length_seconds)
  );
};

const clampLimit = (value, fallback, max) => {
  const parsed = parseInt(value || `${fallback}`, 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.max(1, Math.min(parsed, max));
};

const normalizeTrack = (track = {}) => ({
  videoId: String(track.videoId || "").trim(),
  title: String(track.title || "Unknown Title").trim() || "Unknown Title",
  artist: String(track.artist || "Unknown Artist").trim() || "Unknown Artist",
  thumbnail:
    String(track.thumbnail || "").trim() ||
    fallbackThumbnail(String(track.videoId || "").trim()),
  duration: normalizeDuration(track),
  album: String(track.album || "").trim(),
});

const resolveMusicVideoId = (rawVideoId = "") =>
  youtubeDownloadService.extractVideoId(String(rawVideoId || "").trim()) ||
  String(rawVideoId || "").trim();

const DIRECT_PROXY_HEADERS = [
  "accept-ranges",
  "cache-control",
  "content-disposition",
  "content-length",
  "content-range",
  "etag",
  "last-modified",
];

const proxyDirectStreamToResponse = async (videoId, streamInfo, req, res) => {
  const upstreamHeaders = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    Accept: req.headers.accept || "*/*",
  };

  if (req.headers.range) {
    upstreamHeaders.Range = req.headers.range;
  }

  const upstreamResponse = await axios.get(streamInfo.streamUrl, {
    responseType: "stream",
    timeout: 45000,
    maxRedirects: 5,
    validateStatus: () => true,
    headers: upstreamHeaders,
  });

  if (upstreamResponse.status >= 400) {
    throw new Error(`Direct stream upstream returned HTTP ${upstreamResponse.status}`);
  }

  res.status(upstreamResponse.status);
  DIRECT_PROXY_HEADERS.forEach((header) => {
    if (upstreamResponse.headers[header]) {
      res.setHeader(header, upstreamResponse.headers[header]);
    }
  });
  res.setHeader(
    "Content-Type",
    upstreamResponse.headers["content-type"] || streamInfo.mimeType || "audio/webm"
  );
  res.setHeader("X-Telecloud-Stream-Source", "direct-ytdlp");

  await new Promise((resolve, reject) => {
    let settled = false;
    const upstreamStream = upstreamResponse.data;

    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };

    const fail = (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };

    res.on("close", () => {
      try {
        upstreamStream.destroy();
      } catch (_) {}
      finish();
    });

    upstreamStream.on("error", fail);
    upstreamStream.on("end", finish);
    upstreamStream.pipe(res);
  });
};

const handleCacheFirstStream = async (req, res) => {
  const videoId = resolveMusicVideoId(req.query.videoId);
  if (!videoId) return sendError(res, "videoId is required", 400);

  logger.info(`[music-cache][${videoId}] stream request received by user ${req.user._id}`);

  try {
    const streamResult = await songService.streamSong(
      videoId,
      req.user._id.toString()
    );

    if (streamResult.mode === "direct") {
      logger.info(
        `[music-cache][${videoId}] serving direct upstream stream | source=${streamResult.source}`
      );
      await proxyDirectStreamToResponse(videoId, streamResult.streamInfo, req, res);
      return;
    }

    const { song, streamOwnerId, source, isNew } = streamResult;
    logger.info(
      `[music-cache][${videoId}] serving from telegram | source=${source} cacheHit=${isNew ? "false" : "true"} owner=${streamOwnerId}`
    );

    await telegramAudioService.streamAudioToResponse(streamOwnerId, song, req, res);
  } catch (error) {
    logger.error(`[music-cache][${videoId}] stream failed: ${error.message}`);

    if (res.headersSent) {
      res.destroy(error);
      return;
    }

    if (error.retryAfterSeconds) {
      res.setHeader("Retry-After", String(error.retryAfterSeconds));
      return sendError(res, error.message, error.statusCode || 503, {
        retryAfterSeconds: error.retryAfterSeconds,
      });
    }

    if (error.message.includes("not found") || error.message.includes("Video not found")) {
      return sendError(res, "Song not found", 404);
    }

    if (error.message.includes("Telegram")) {
      return sendError(res, `Streaming service error: ${error.message}`, 502);
    }

    return sendError(res, error.message || "Streaming failed", 502);
  }
};

const dedupeTracks = (tracks = []) => {
  const seen = new Set();
  const result = [];

  tracks.forEach((track) => {
    const normalized = normalizeTrack(track);
    if (!normalized.videoId || seen.has(normalized.videoId)) return;
    seen.add(normalized.videoId);
    result.push(normalized);
  });

  return result;
};

const serializePlaylist = (playlistDoc) => {
  const playlist =
    typeof playlistDoc?.toObject === "function"
      ? playlistDoc.toObject()
      : { ...(playlistDoc || {}) };

  const tracks = dedupeTracks(playlist.tracks || []);
  const coverTrack = tracks[0] || null;

  return {
    ...playlist,
    tracks,
    cover: playlist.cover || coverTrack?.thumbnail || "",
    coverTrack,
    trackCount: tracks.length,
    isSystem: Boolean(playlist.isSystem),
    isLikedSongs: playlist.slug === LIKED_PLAYLIST_SLUG,
  };
};

const buildAnalyticsScoreMap = async (userId) => {
  const analytics = await MusicAnalytics.find({ userId })
    .select("videoId playCount skipCount watchSeconds")
    .lean();

  const scoreMap = new Map();

  analytics.forEach((entry) => {
    const score =
      (entry.playCount || 0) * 3 +
      (entry.watchSeconds || 0) / 45 -
      (entry.skipCount || 0) * 2;

    scoreMap.set(entry.videoId, score);
  });

  return scoreMap;
};

const personalizeTracks = (tracks, scoreMap = new Map(), excludeVideoId = "") =>
  dedupeTracks(tracks)
    .filter((track) => track.videoId && track.videoId !== excludeVideoId)
    .sort((a, b) => {
      const diff = (scoreMap.get(b.videoId) || 0) - (scoreMap.get(a.videoId) || 0);
      return diff;
    });

const ensureLikedSongsPlaylist = async (userId) => {
  let playlist = await MusicPlaylist.findOne({
    userId,
    slug: LIKED_PLAYLIST_SLUG,
  });

  if (!playlist) {
    playlist = await MusicPlaylist.create({
      userId,
      name: LIKED_PLAYLIST_NAME,
      slug: LIKED_PLAYLIST_SLUG,
      description: LIKED_PLAYLIST_DESCRIPTION,
      cover: "",
      isSystem: true,
      tracks: [],
    });
  }

  let dirty = false;

  if (playlist.name !== LIKED_PLAYLIST_NAME) {
    playlist.name = LIKED_PLAYLIST_NAME;
    dirty = true;
  }

  if (playlist.slug !== LIKED_PLAYLIST_SLUG) {
    playlist.slug = LIKED_PLAYLIST_SLUG;
    dirty = true;
  }

  if (!playlist.isSystem) {
    playlist.isSystem = true;
    dirty = true;
  }

  if (playlist.description !== LIKED_PLAYLIST_DESCRIPTION) {
    playlist.description = LIKED_PLAYLIST_DESCRIPTION;
    dirty = true;
  }

  if (dirty) await playlist.save();

  return playlist;
};

const syncLikedSongsPlaylist = async (userId) => {
  const [favoriteDocs, playlist] = await Promise.all([
    MusicFavorite.find({ userId }).sort("-updatedAt").select("-__v").lean(),
    ensureLikedSongsPlaylist(userId),
  ]);

  const items = favoriteDocs.map(normalizeTrack);

  playlist.cover = items[0]?.thumbnail || "";
  playlist.tracks = items;
  await playlist.save();

  return {
    items,
    playlist: serializePlaylist(playlist),
  };
};

const listUserPlaylists = async (userId) => {
  await syncLikedSongsPlaylist(userId);

  const playlists = await MusicPlaylist.find({ userId })
    .sort({ isSystem: -1, updatedAt: -1 })
    .select("-__v");

  return playlists.map(serializePlaylist);
};

exports.search = asyncHandler(async (req, res) => {
  const q = String(req.query.q || "").trim();
  const limit = clampLimit(req.query.limit, 20, 50);

  if (!q) return sendError(res, "Search query (q) is required", 400);

  try {
    const results = dedupeTracks(await searchMusic(q, limit));
    return sendSuccess(
      res,
      { query: q, results, total: results.length },
      `Found ${results.length} song(s)`
    );
  } catch (err) {
    return sendError(res, err.message || "Music search failed", 502);
  }
});

exports.stream = asyncHandler(handleCacheFirstStream);

exports.recommendations = asyncHandler(async (req, res) => {
  const videoId = String(req.query.videoId || "").trim();
  const limit = clampLimit(req.query.limit, 20, 50);
  if (!videoId) return sendError(res, "videoId is required", 400);

  try {
    const [scoreMap, rawResults] = await Promise.all([
      buildAnalyticsScoreMap(req.user._id),
      getRecommendations(videoId, Math.min(limit * 2, 50)),
    ]);

    const results = personalizeTracks(rawResults, scoreMap, videoId).slice(0, limit);
    return sendSuccess(res, { sourceVideoId: videoId, results }, "Recommendations fetched");
  } catch (err) {
    return sendError(res, err.message || "Recommendations failed", 502);
  }
});

exports.trending = asyncHandler(async (req, res) => {
  const limit = clampLimit(req.query.limit, 20, 50);
  try {
    const results = dedupeTracks(await getTrending(limit));
    return sendSuccess(res, { results }, "Trending fetched");
  } catch (err) {
    return sendError(res, err.message || "Trending fetch failed", 502);
  }
});

exports.upNext = asyncHandler(async (req, res) => {
  const videoId = String(req.query.videoId || "").trim();
  const limit = clampLimit(req.query.limit, 12, 50);
  if (!videoId) return sendError(res, "videoId is required", 400);

  try {
    const [scoreMap, rawResults] = await Promise.all([
      buildAnalyticsScoreMap(req.user._id),
      getUpNext(videoId, Math.min(limit * 2, 50)),
    ]);

    const results = personalizeTracks(rawResults, scoreMap, videoId).slice(0, limit);
    return sendSuccess(res, { sourceVideoId: videoId, results }, "Up next fetched");
  } catch (err) {
    return sendError(res, err.message || "Up next fetch failed", 502);
  }
});

exports.related = asyncHandler(async (req, res) => {
  const videoId = String(req.query.videoId || "").trim();
  const limit = clampLimit(req.query.limit, 12, 50);
  if (!videoId) return sendError(res, "videoId is required", 400);

  try {
    const [scoreMap, rawResults] = await Promise.all([
      buildAnalyticsScoreMap(req.user._id),
      getRelated(videoId, Math.min(limit * 2, 50)),
    ]);

    const results = personalizeTracks(rawResults, scoreMap, videoId).slice(0, limit);
    return sendSuccess(
      res,
      { sourceVideoId: videoId, results },
      "Related songs fetched"
    );
  } catch (err) {
    return sendError(res, err.message || "Related songs fetch failed", 502);
  }
});

exports.quickPicks = asyncHandler(async (req, res) => {
  const videoId = String(req.query.videoId || "").trim();
  const limit = clampLimit(req.query.limit, 10, 30);
  if (!videoId) return sendError(res, "videoId is required", 400);

  try {
    const [scoreMap, rawResults] = await Promise.all([
      buildAnalyticsScoreMap(req.user._id),
      getQuickPicks(videoId, Math.min(limit * 2, 30)),
    ]);

    const results = personalizeTracks(rawResults, scoreMap, videoId).slice(0, limit);
    return sendSuccess(res, { sourceVideoId: videoId, results }, "Quick picks fetched");
  } catch (err) {
    return sendError(res, err.message || "Quick picks fetch failed", 502);
  }
});

exports.historyQuickPicks = asyncHandler(async (req, res) => {
  const limit = clampLimit(req.query.limit, 12, 40);

  const history = await MusicHistory.find({ userId: req.user._id })
    .sort("-playedAt")
    .limit(6)
    .select("-__v")
    .lean();

  const seedTracks = dedupeTracks(history);
  if (!seedTracks.length) {
    return sendSuccess(
      res,
      { results: [], seeds: [] },
      "History quick picks fetched"
    );
  }

  try {
    const [scoreMap, responseSets] = await Promise.all([
      buildAnalyticsScoreMap(req.user._id),
      Promise.all(
        seedTracks.slice(0, 4).map((track) =>
          getQuickPicks(track.videoId, Math.min(limit, 8)).catch(() => [])
        )
      ),
    ]);

    const seedIds = new Set(seedTracks.map((track) => track.videoId));
    const merged = responseSets.flat();
    const results = personalizeTracks(merged, scoreMap)
      .filter((track) => !seedIds.has(track.videoId))
      .slice(0, limit);

    return sendSuccess(
      res,
      { results, seeds: seedTracks },
      "History quick picks fetched"
    );
  } catch (err) {
    return sendError(res, err.message || "History quick picks failed", 502);
  }
});

exports.categories = asyncHandler(async (_req, res) => {
  try {
    const results = await getCategories();
    return sendSuccess(res, { results }, "Categories fetched");
  } catch (err) {
    return sendError(res, err.message || "Categories fetch failed", 502);
  }
});

exports.readyPlaylists = asyncHandler(async (_req, res) => {
  try {
    const results = await getReadyPlaylists();
    return sendSuccess(res, { results }, "Ready playlists fetched");
  } catch (err) {
    return sendError(res, err.message || "Ready playlists fetch failed", 502);
  }
});

exports.browsePlaylist = asyncHandler(async (req, res) => {
  const playlistId = String(req.query.playlistId || "").trim();
  const query = String(req.query.query || "").trim();
  const limit = clampLimit(req.query.limit, 80, 200);
  if (!playlistId && !query) {
    return sendError(res, "playlistId or query is required", 400);
  }

  try {
    const playlist = await getBrowsePlaylist(playlistId, limit, query);
    if (!playlist) {
      // If playlist not found and we have a query, try trending as fallback
      if (query) {
        const trendingTracks = await getTrending(Math.min(limit, 50));
        return sendSuccess(
          res,
          {
            playlist: {
              playlistId: playlistId || "",
              browseId: playlistId || "",
              title: query || "Trending Now",
              description: "This playlist is currently unavailable. Showing trending songs instead.",
              author: "Telecloud Music",
              thumbnail: trendingTracks[0]?.thumbnail || "",
              trackCount: trendingTracks.length,
              tracks: trendingTracks,
              isExternal: true,
              isFallback: true,
            },
          },
          "Playlist fetched (fallback)"
        );
      }
      return sendError(res, "Playlist not found", 404);
    }

    const tracks = dedupeTracks(playlist.tracks || []);
    return sendSuccess(
      res,
      {
        playlist: {
          ...playlist,
          tracks,
          cover:
            String(playlist.thumbnail || "").trim() ||
            tracks[0]?.thumbnail ||
            "",
          trackCount: tracks.length || Number(playlist.trackCount || 0),
          isExternal: true,
        },
      },
      "Playlist fetched"
    );
  } catch (err) {
    // On error, try to provide trending as fallback if we have a query
    if (query) {
      try {
        const trendingTracks = await getTrending(Math.min(limit, 50));
        return sendSuccess(
          res,
          {
            playlist: {
              playlistId: playlistId || "",
              browseId: playlistId || "",
              title: query || "Trending Now",
              description: "This playlist is currently unavailable. Showing trending songs instead.",
              author: "Telecloud Music",
              thumbnail: trendingTracks[0]?.thumbnail || "",
              trackCount: trendingTracks.length,
              tracks: trendingTracks,
              isExternal: true,
              isFallback: true,
            },
          },
          "Playlist fetched (fallback)"
        );
      } catch (fallbackErr) {
        return sendError(res, err.message || "Playlist fetch failed", 502);
      }
    }
    return sendError(res, err.message || "Playlist fetch failed", 502);
  }
});

exports.lyrics = asyncHandler(async (req, res) => {
  const videoId = String(req.query.videoId || "").trim();
  if (!videoId) return sendError(res, "videoId is required", 400);

  try {
    const lyrics = await getLyrics(videoId);
    return sendSuccess(res, { lyrics, available: Boolean(lyrics) }, "Lyrics fetched");
  } catch (err) {
    return sendError(res, err.message || "Lyrics fetch failed", 502);
  }
});

exports.addHistory = asyncHandler(async (req, res) => {
  const track = normalizeTrack(req.body || {});
  if (!track.videoId) return sendError(res, "videoId is required", 400);

  await MusicHistory.findOneAndUpdate(
    { userId: req.user._id, videoId: track.videoId },
    {
      $set: {
        title: track.title,
        artist: track.artist,
        thumbnail: track.thumbnail,
        duration: track.duration,
        album: track.album,
        playedAt: new Date(),
      },
      $setOnInsert: {
        userId: req.user._id,
        videoId: track.videoId,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return sendSuccess(res, { item: track }, "History updated");
});

exports.getHistory = asyncHandler(async (req, res) => {
  const items = await MusicHistory.find({ userId: req.user._id })
    .sort("-playedAt")
    .limit(24)
    .select("-__v")
    .lean();

  return sendSuccess(
    res,
    {
      items: items.map((item) => ({
        ...normalizeTrack(item),
        playedAt: item.playedAt,
      })),
    },
    "History fetched"
  );
});

exports.trackAnalytics = asyncHandler(async (req, res) => {
  const videoId = String(req.body?.videoId || "").trim();
  const eventType = String(req.body?.eventType || "").trim();
  const watchSeconds = Number(req.body?.watchSeconds || 0);

  if (!videoId || !eventType) {
    return sendError(res, "videoId and eventType are required", 400);
  }

  const update = {
    $setOnInsert: {
      userId: req.user._id,
      videoId,
    },
  };

  if (eventType === "play") update.$inc = { ...(update.$inc || {}), playCount: 1 };
  if (eventType === "skip") update.$inc = { ...(update.$inc || {}), skipCount: 1 };
  if (watchSeconds > 0) {
    update.$inc = {
      ...(update.$inc || {}),
      watchSeconds: Math.round(watchSeconds),
    };
  }

  await MusicAnalytics.findOneAndUpdate(
    { userId: req.user._id, videoId },
    update,
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return sendSuccess(res, null, "Analytics tracked");
});

exports.listPlaylists = asyncHandler(async (req, res) => {
  const playlists = await listUserPlaylists(req.user._id);
  return sendSuccess(res, { playlists }, "Playlists fetched");
});

exports.createPlaylist = asyncHandler(async (req, res) => {
  const name = String(req.body?.name || "").trim();
  const description = String(req.body?.description || "").trim();

  if (!name) return sendError(res, "Playlist name is required", 400);

  const playlist = await MusicPlaylist.create({
    userId: req.user._id,
    name,
    description,
    cover: "",
    tracks: [],
  });

  return sendSuccess(res, { playlist: serializePlaylist(playlist) }, "Playlist created", 201);
});

exports.renamePlaylist = asyncHandler(async (req, res) => {
  const name = String(req.body?.name || "").trim();
  if (!name) return sendError(res, "Playlist name is required", 400);

  const playlist = await MusicPlaylist.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!playlist) return sendError(res, "Playlist not found", 404);
  if (playlist.isSystem) return sendError(res, "System playlists cannot be renamed", 403);

  playlist.name = name;
  await playlist.save();

  return sendSuccess(res, { playlist: serializePlaylist(playlist) }, "Playlist renamed");
});

exports.deletePlaylist = asyncHandler(async (req, res) => {
  const playlist = await MusicPlaylist.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!playlist) return sendError(res, "Playlist not found", 404);
  if (playlist.isSystem) return sendError(res, "System playlists cannot be deleted", 403);

  await playlist.deleteOne();
  return sendSuccess(res, { id: req.params.id }, "Playlist deleted");
});

exports.addTrackToPlaylist = asyncHandler(async (req, res) => {
  const track = normalizeTrack(req.body || {});
  if (!track.videoId) return sendError(res, "videoId is required", 400);

  const playlist = await MusicPlaylist.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!playlist) return sendError(res, "Playlist not found", 404);
  if (playlist.isSystem) {
    return sendError(res, "Add songs to Liked Songs using the like button", 403);
  }

  playlist.tracks = [track, ...playlist.tracks.filter((item) => item.videoId !== track.videoId)];
  playlist.cover = playlist.tracks[0]?.thumbnail || playlist.cover || "";
  await playlist.save();

  return sendSuccess(res, { playlist: serializePlaylist(playlist) }, "Track added");
});

exports.removeTrackFromPlaylist = asyncHandler(async (req, res) => {
  const videoId = String(req.params.videoId || "").trim();
  const playlist = await MusicPlaylist.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!playlist) return sendError(res, "Playlist not found", 404);

  if (playlist.slug === LIKED_PLAYLIST_SLUG) {
    await MusicFavorite.findOneAndDelete({ userId: req.user._id, videoId });
    const synced = await syncLikedSongsPlaylist(req.user._id);
    return sendSuccess(
      res,
      { playlist: synced.playlist, liked: false, videoId },
      "Track removed from liked songs"
    );
  }

  playlist.tracks = playlist.tracks.filter((track) => track.videoId !== videoId);
  playlist.cover = playlist.tracks[0]?.thumbnail || "";
  await playlist.save();

  return sendSuccess(res, { playlist: serializePlaylist(playlist) }, "Track removed");
});

exports.listFavorites = asyncHandler(async (req, res) => {
  const synced = await syncLikedSongsPlaylist(req.user._id);
  return sendSuccess(
    res,
    { items: synced.items, playlist: synced.playlist },
    "Favorites fetched"
  );
});

exports.toggleFavorite = asyncHandler(async (req, res) => {
  const track = normalizeTrack(req.body || {});
  if (!track.videoId) return sendError(res, "videoId is required", 400);

  const existing = await MusicFavorite.findOne({
    userId: req.user._id,
    videoId: track.videoId,
  });

  if (existing) {
    await existing.deleteOne();
    const synced = await syncLikedSongsPlaylist(req.user._id);
    return sendSuccess(
      res,
      {
        liked: false,
        favorite: false,
        items: synced.items,
        playlist: synced.playlist,
        track,
      },
      "Removed from liked songs"
    );
  }

  await MusicFavorite.findOneAndUpdate(
    { userId: req.user._id, videoId: track.videoId },
    {
      $set: {
        title: track.title,
        artist: track.artist,
        thumbnail: track.thumbnail,
        duration: track.duration,
        album: track.album,
      },
      $setOnInsert: {
        userId: req.user._id,
        videoId: track.videoId,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const synced = await syncLikedSongsPlaylist(req.user._id);
  return sendSuccess(
    res,
    {
      liked: true,
      favorite: true,
      items: synced.items,
      playlist: synced.playlist,
      track,
    },
    "Added to liked songs"
  );
});

exports.likeSong = exports.toggleFavorite;
exports.getLikedSongs = exports.listFavorites;


exports.personalizedRecommendations = asyncHandler(async (req, res) => {
  const limit = clampLimit(req.query.limit, 12, 40);

  // Get user's listening history and analytics
  const [history, analytics, favorites] = await Promise.all([
    MusicHistory.find({ userId: req.user._id })
      .sort("-playedAt")
      .limit(20)
      .select("-__v")
      .lean(),
    MusicAnalytics.find({ userId: req.user._id })
      .sort("-playCount")
      .limit(10)
      .select("-__v")
      .lean(),
    MusicFavorite.find({ userId: req.user._id })
      .sort("-updatedAt")
      .limit(10)
      .select("-__v")
      .lean(),
  ]);

  // If no history, return trending songs
  if (!history.length && !favorites.length) {
    try {
      const trending = await getTrending(limit);
      return sendSuccess(
        res,
        { results: dedupeTracks(trending), seeds: [] },
        "Personalized recommendations fetched"
      );
    } catch (err) {
      return sendError(res, err.message || "Recommendations failed", 502);
    }
  }

  // Build weighted seed tracks based on analytics
  const scoreMap = new Map();
  analytics.forEach((entry) => {
    const score =
      (entry.playCount || 0) * 3 +
      (entry.watchSeconds || 0) / 45 -
      (entry.skipCount || 0) * 2;
    scoreMap.set(entry.videoId, score);
  });

  // Combine history and favorites with weights
  const allSeeds = [
    ...history.map((track) => ({ ...track, weight: scoreMap.get(track.videoId) || 1 })),
    ...favorites.map((track) => ({ ...track, weight: 5 })), // Favorites get higher weight
  ];

  // Sort by weight and get top seeds
  const topSeeds = allSeeds
    .sort((a, b) => (b.weight || 0) - (a.weight || 0))
    .slice(0, 5);

  if (!topSeeds.length) {
    return sendSuccess(
      res,
      { results: [], seeds: [] },
      "Personalized recommendations fetched"
    );
  }

  try {
    // Get recommendations from multiple seed tracks
    const recommendationSets = await Promise.all(
      topSeeds.map((seed) =>
        getRecommendations(seed.videoId, Math.min(limit, 10)).catch(() => [])
      )
    );

    // Flatten and deduplicate
    const seedIds = new Set(topSeeds.map((track) => track.videoId));
    const merged = recommendationSets.flat();
    
    // Score recommendations based on frequency across different seeds
    const frequencyMap = new Map();
    merged.forEach((track) => {
      if (!track.videoId || seedIds.has(track.videoId)) return;
      frequencyMap.set(
        track.videoId,
        (frequencyMap.get(track.videoId) || 0) + 1
      );
    });

    // Deduplicate and sort by frequency (songs appearing in multiple recommendation sets rank higher)
    const results = dedupeTracks(merged)
      .filter((track) => !seedIds.has(track.videoId))
      .sort((a, b) => {
        const freqDiff = (frequencyMap.get(b.videoId) || 0) - (frequencyMap.get(a.videoId) || 0);
        if (freqDiff !== 0) return freqDiff;
        // Secondary sort by analytics score if available
        return (scoreMap.get(b.videoId) || 0) - (scoreMap.get(a.videoId) || 0);
      })
      .slice(0, limit);

    return sendSuccess(
      res,
      {
        results,
        seeds: topSeeds.slice(0, 3).map(normalizeTrack),
      },
      "Personalized recommendations fetched"
    );
  } catch (err) {
    return sendError(res, err.message || "Recommendations failed", 502);
  }
});

// ============================================================================
// TELEGRAM-CACHED MUSIC STREAMING ENDPOINTS
// Optimized: Each YouTube video downloaded ONLY ONCE, stored in Telegram
// ============================================================================

/**
 * Stream audio from Telegram cache (database-first approach)
 * Query params: videoId (YouTube video ID or URL)
 */
exports.streamCached = asyncHandler(async (req, res) => {
  return handleCacheFirstStream(req, res);
});

/**
 * Get song details (metadata without streaming)
 * Query params: videoId
 */
exports.getCachedSong = asyncHandler(async (req, res) => {
  const videoId = resolveMusicVideoId(req.query.videoId);
  if (!videoId) {
    return sendError(res, "videoId is required", 400);
  }

  try {
    const details = await songService.getSongDetails(videoId);
    return sendSuccess(res, details, "Song details fetched");
  } catch (error) {
    if (error.message.includes("not found")) {
      return sendError(res, "Song not found", 404);
    }
    return sendError(res, error.message || "Failed to fetch song details", 500);
  }
});

/**
 * Search cached songs in database
 * Query params: q (search query), limit
 */
exports.searchCached = asyncHandler(async (req, res) => {
  const query = String(req.query.q || "").trim();
  const limit = clampLimit(req.query.limit, 20, 100);

  if (!query) {
    return sendError(res, "Search query (q) is required", 400);
  }

  try {
    const results = await songService.searchCachedSongs(query, limit);
    return sendSuccess(
      res,
      { query, results, total: results.length, source: "cached" },
      `Found ${results.length} cached song(s)`
    );
  } catch (error) {
    return sendError(res, error.message || "Search failed", 500);
  }
});

/**
 * Get trending cached songs
 * Query params: limit
 */
exports.getCachedTrending = asyncHandler(async (req, res) => {
  const limit = clampLimit(req.query.limit, 20, 100);

  try {
    const results = await songService.getTrendingSongs(limit);
    return sendSuccess(
      res,
      { results, total: results.length },
      "Trending cached songs fetched"
    );
  } catch (error) {
    return sendError(res, error.message || "Failed to fetch trending", 500);
  }
});

/**
 * Get recently added cached songs
 * Query params: limit
 */
exports.getRecentlyAdded = asyncHandler(async (req, res) => {
  const limit = clampLimit(req.query.limit, 20, 100);

  try {
    const results = await songService.getRecentlyAdded(limit);
    return sendSuccess(
      res,
      { results, total: results.length },
      "Recently added songs fetched"
    );
  } catch (error) {
    return sendError(res, error.message || "Failed to fetch recent songs", 500);
  }
});

/**
 * Get user's uploaded songs
 * Query params: limit
 */
exports.getMyUploads = asyncHandler(async (req, res) => {
  const limit = clampLimit(req.query.limit, 20, 100);

  try {
    const results = await songService.getUserUploads(req.user._id, limit);
    return sendSuccess(
      res,
      { results, total: results.length },
      "Your uploads fetched"
    );
  } catch (error) {
    return sendError(res, error.message || "Failed to fetch uploads", 500);
  }
});

/**
 * Delete a song (only if user uploaded it)
 * Params: videoId
 */
exports.deleteCachedSong = asyncHandler(async (req, res) => {
  const videoIdParam = String(req.params?.videoId || req.body?.videoId || "").trim();
  
  if (!videoIdParam) {
    return sendError(res, "videoId is required", 400);
  }

  const videoId = youtubeDownloadService.extractVideoId(videoIdParam) || videoIdParam;

  try {
    await songService.deleteSong(videoId, req.user._id);
    return sendSuccess(res, { videoId }, "Song deleted successfully");
  } catch (error) {
    if (error.message.includes("not found") || error.message.includes("unauthorized")) {
      return sendError(res, error.message, 404);
    }
    return sendError(res, error.message || "Failed to delete song", 500);
  }
});

/**
 * Get download/processing status for a song
 * Query params: videoId
 */
exports.getSongStatus = asyncHandler(async (req, res) => {
  const videoIdParam = String(req.query.videoId || "").trim();
  if (!videoIdParam) {
    return sendError(res, "videoId is required", 400);
  }

  const videoId = youtubeDownloadService.extractVideoId(videoIdParam) || videoIdParam;

  try {
    const song = await Song.findOne({ videoId });
    
    if (!song) {
      return sendSuccess(
        res,
        { 
          videoId, 
          exists: false,
          status: "not_found",
          message: "Song will be downloaded on first stream request"
        },
        "Song status fetched"
      );
    }

    let statusMessage = "Ready to stream";
    if (song.status === "downloading") statusMessage = "Downloading from YouTube...";
    else if (song.status === "uploading") statusMessage = "Uploading to Telegram...";
    else if (song.status === "failed") {
      statusMessage = song.nextRetryAt && new Date(song.nextRetryAt).getTime() > Date.now()
        ? `Temporarily blocked after upstream failure. Retry after ${new Date(song.nextRetryAt).toLocaleString()}.`
        : `Failed: ${song.errorMessage}`;
    }

    return sendSuccess(
      res,
      {
        videoId,
        exists: true,
        status: song.status,
        statusMessage,
        title: song.title,
        progress: song.downloadAttempts > 0 ? "Processing started" : "Not started",
        errorMessage: song.errorMessage || null,
        nextRetryAt: song.nextRetryAt || null,
        failureCount: song.failureCount || 0,
        playCount: song.playCount,
        createdAt: song.createdAt,
      },
      "Song status fetched"
    );
  } catch (error) {
    return sendError(res, error.message || "Failed to fetch status", 500);
  }
});
