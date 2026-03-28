const router = require("express").Router();
const { protect } = require("../middleware/auth");
const ctrl = require("../controllers/musicController");

router.use(protect);

// Original music routes (YouTube streaming)
router.get("/search", ctrl.search);
router.get("/stream", ctrl.stream);
router.get("/recommendations", ctrl.recommendations);
router.get("/personalized", ctrl.personalizedRecommendations);
router.get("/upnext", ctrl.upNext);
router.get("/related", ctrl.related);
router.get("/quickpicks", ctrl.quickPicks);
router.get("/history-quickpicks", ctrl.historyQuickPicks);
router.get("/categories", ctrl.categories);
router.get("/ready-playlists", ctrl.readyPlaylists);
router.get("/browse-playlist", ctrl.browsePlaylist);
router.get("/trending", ctrl.trending);
router.get("/lyrics", ctrl.lyrics);

// History & Analytics
router.get("/history", ctrl.getHistory);
router.post("/history", ctrl.addHistory);
router.post("/analytics", ctrl.trackAnalytics);

// Favorites & Playlists
router.get("/favorites", ctrl.listFavorites);
router.post("/favorites/toggle", ctrl.toggleFavorite);
router.get("/liked", ctrl.getLikedSongs);
router.post("/like", ctrl.likeSong);

router.get("/playlist", ctrl.listPlaylists);
router.post("/playlist", ctrl.createPlaylist);
router.patch("/playlist/:id", ctrl.renamePlaylist);
router.delete("/playlist/:id", ctrl.deletePlaylist);
router.post("/playlist/:id/tracks", ctrl.addTrackToPlaylist);
router.delete("/playlist/:id/tracks/:videoId", ctrl.removeTrackFromPlaylist);

// ============================================================================
// TELEGRAM-CACHED MUSIC ROUTES (Optimized - DB-first approach)
// Each YouTube video downloaded ONLY ONCE, stored in Telegram forever
// ============================================================================

// Streaming endpoint (uses Telegram cache)
router.get("/cached/stream", ctrl.streamCached);

// Song details & status
router.get("/cached/song", ctrl.getCachedSong);
router.get("/cached/status", ctrl.getSongStatus);

// Browse cached songs
router.get("/cached/search", ctrl.searchCached);
router.get("/cached/trending", ctrl.getCachedTrending);
router.get("/cached/recent", ctrl.getRecentlyAdded);
router.get("/cached/my-uploads", ctrl.getMyUploads);

// Management
router.delete("/cached/:videoId", ctrl.deleteCachedSong);

module.exports = router;
