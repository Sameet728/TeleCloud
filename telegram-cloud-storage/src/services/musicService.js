const axios = require("axios");

const MUSIC_SERVICE_URL = process.env.MUSIC_SERVICE_URL || "http://127.0.0.1:8001";
const STREAM_INFO_TTL_MS = 5 * 60 * 1000;
const streamInfoCache = new Map();
const streamInfoInflight = new Map();
const responseCache = new Map();

const buildCacheKey = (path, params = {}) => {
  const normalizedParams = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .sort(([a], [b]) => a.localeCompare(b));

  return `${path}:${JSON.stringify(normalizedParams)}`;
};

const getCachedValue = (cache, key) => {
  const cached = cache.get(key);
  if (!cached) return null;
  if (Date.now() > cached.expiresAt) {
    cache.delete(key);
    return null;
  }
  return cached.value;
};

const setCachedValue = (cache, key, value, ttlMs) => {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
};

const getCachedStreamInfo = (videoId) => {
  return getCachedValue(streamInfoCache, videoId);
};

const setCachedStreamInfo = (videoId, value) => {
  setCachedValue(streamInfoCache, videoId, value, STREAM_INFO_TTL_MS);
};

const requestMusicService = async (
  path,
  {
    params = {},
    timeout = 15000,
    ttlMs = 0,
    transform = (data) => data,
  } = {}
) => {
  const cacheKey = ttlMs > 0 ? buildCacheKey(path, params) : null;

  if (cacheKey) {
    const cached = getCachedValue(responseCache, cacheKey);
    if (cached !== null) return cached;
  }

  const { data } = await axios.get(`${MUSIC_SERVICE_URL}${path}`, {
    params,
    timeout,
  });

  const value = transform(data);
  if (cacheKey) setCachedValue(responseCache, cacheKey, value, ttlMs);
  return value;
};

const searchMusic = async (query, limit = 20) => {
  return requestMusicService("/search", {
    params: { q: query, limit },
    ttlMs: 60 * 1000,
    transform: (data) => (Array.isArray(data?.results) ? data.results : []),
  });
};

const getRecommendations = async (videoId, limit = 20) => {
  return requestMusicService("/recommendations", {
    params: { videoId, limit },
    ttlMs: 3 * 60 * 1000,
    transform: (data) => (Array.isArray(data?.results) ? data.results : []),
  });
};

const getUpNext = async (videoId, limit = 12) => {
  return requestMusicService("/upnext", {
    params: { videoId, limit },
    ttlMs: 3 * 60 * 1000,
    transform: (data) => (Array.isArray(data?.results) ? data.results : []),
  });
};

const getRelated = async (videoId, limit = 12) => {
  return requestMusicService("/related", {
    params: { videoId, limit },
    ttlMs: 3 * 60 * 1000,
    transform: (data) => (Array.isArray(data?.results) ? data.results : []),
  });
};

const getQuickPicks = async (videoId, limit = 10) => {
  return requestMusicService("/quickpicks", {
    params: { videoId, limit },
    ttlMs: 3 * 60 * 1000,
    transform: (data) => (Array.isArray(data?.results) ? data.results : []),
  });
};

const getCategories = async () => {
  return requestMusicService("/categories", {
    ttlMs: 30 * 60 * 1000,
    transform: (data) => (Array.isArray(data?.results) ? data.results : []),
  });
};

const getReadyPlaylists = async () => {
  return requestMusicService("/ready-playlists", {
    ttlMs: 30 * 60 * 1000,
    transform: (data) => (Array.isArray(data?.results) ? data.results : []),
  });
};

const getBrowsePlaylist = async (playlistId, limit = 80, query = "") => {
  return requestMusicService("/playlist-details", {
    params: { playlistId, limit, query },
    ttlMs: 15 * 60 * 1000,
    transform: (data) => data?.playlist || null,
  });
};

const getTrending = async (limit = 20) => {
  return requestMusicService("/trending", {
    params: { limit },
    ttlMs: 15 * 60 * 1000,
    transform: (data) => (Array.isArray(data?.results) ? data.results : []),
  });
};

const getLyrics = async (videoId) => {
  return requestMusicService("/lyrics", {
    params: { videoId },
    ttlMs: 10 * 60 * 1000,
    transform: (data) => data?.lyrics || "",
  });
};

const getStreamInfo = async (videoId) => {
  const cached = getCachedStreamInfo(videoId);
  if (cached) return cached;

  if (streamInfoInflight.has(videoId)) {
    return streamInfoInflight.get(videoId);
  }

  const pendingRequest = (async () => {
    let data;
    try {
      const response = await axios.get(`${MUSIC_SERVICE_URL}/stream-info`, {
        params: { videoId },
        timeout: 12000,
      });
      data = response.data;
    } catch (error) {
      throw new Error(
        error?.response?.data?.message || error?.message || "Music stream URL not available"
      );
    }

    if (!data?.streamUrl) {
      throw new Error(data?.message || "Music stream URL not available");
    }

    const info = {
      streamUrl: data.streamUrl,
      mimeType: data.mimeType || "audio/webm",
      title: data.title || "",
    };
    setCachedStreamInfo(videoId, info);
    return info;
  })().finally(() => {
    streamInfoInflight.delete(videoId);
  });

  streamInfoInflight.set(videoId, pendingRequest);
  return pendingRequest;
};

module.exports = {
  searchMusic,
  getStreamInfo,
  getRecommendations,
  getUpNext,
  getRelated,
  getQuickPicks,
  getCategories,
  getReadyPlaylists,
  getBrowsePlaylist,
  getTrending,
  getLyrics,
};
