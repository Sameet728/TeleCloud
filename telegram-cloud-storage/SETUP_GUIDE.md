# Quick Setup Guide - Telegram-Cached Music Streaming

## Prerequisites ✅

Before using the cached music streaming feature, ensure:

### 1. yt-dlp Installed

The system uses `yt-dlp` to download audio from YouTube.

**Check if installed:**
```bash
yt-dlp --version
```

**Install if needed:**

**Windows:**
```powershell
choco install yt-dlp
# or download from https://github.com/yt-dlp/yt-dlp/releases
```

**Linux:**
```bash
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp
```

**macOS:**
```bash
brew install yt-dlp
```

### 2. Telegram Connection

Users must have Telegram connected to their account. The feature uploads files to Telegram "Saved Messages".

---

## Installation Steps

### Step 1: Verify Dependencies

All required npm packages are already installed:
- `telegram` (for Telegram API)
- `mongoose` (for MongoDB)
- `express` (for HTTP server)

No new npm packages needed!

### Step 2: Start Server

```bash
npm run dev
```

You should see:
```
🚀 Server running on port 5000 [development]
Background cleanup service initialized
```

### Step 3: Test the Feature

#### Test 1: First Download (will take time)

```bash
# Replace YOUR_TOKEN with actual JWT token
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:5000/api/music/cached/stream?videoId=dQw4w9WgXcQ" \
  --output song.webm

# This will:
# 1. Download from YouTube (~10-30 seconds)
# 2. Upload to Telegram
# 3. Save to MongoDB
# 4. Stream to you
```

#### Test 2: Cached Playback (should be instant)

```bash
time curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:5000/api/music/cached/stream?videoId=dQw4w9WgXcQ" \
  --output song2.webm

# Should complete in ~1-2 seconds (from Telegram cache)
```

#### Test 3: Check Status

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:5000/api/music/cached/status?videoId=dQw4w9WgXcQ" | jq

# Expected response:
# {
#   "success": true,
#   "data": {
#     "videoId": "dQw4w9WgXcQ",
#     "exists": true,
#     "status": "ready",
#     "statusMessage": "Ready to stream",
#     "title": "Song Title",
#     "playCount": 2
#   }
# }
```

---

## How It Works

### First User Request (Uncached Song)

```
User A clicks song
      ↓
Check MongoDB → Not found
      ↓
Mark as "downloading"
      ↓
Download from YouTube (yt-dlp) → Temp file
      ↓
Upload to Telegram → Get file_id
      ↓
Save to MongoDB with status "ready"
      ↓
Stream to User A
```

**Time:** 10-30 seconds (depends on song length & connection)

### Second User Request (Same Song)

```
User B clicks same song
      ↓
Check MongoDB → Found! ✓
      ↓
Stream from Telegram → User B
```

**Time:** 1-2 seconds ⚡

---

## API Endpoints Reference

### 🎵 Primary Streaming

```http
GET /api/music/cached/stream?videoId={youtube_video_id}
Authorization: Bearer {token}
```

Streams audio. Downloads from YouTube if first time, otherwise streams from Telegram cache.

### ℹ️ Get Song Details

```http
GET /api/music/cached/song?videoId={video_id}
Authorization: Bearer {token}
```

Returns metadata without streaming.

### 📊 Check Processing Status

```http
GET /api/music/cached/status?videoId={video_id}
Authorization: Bearer {token}
```

Returns: `not_found`, `downloading`, `uploading`, `ready`, or `failed`.

### 🔍 Search Cached Songs

```http
GET /api/music/cached/search?q={query}&limit=20
Authorization: Bearer {token}
```

Searches only cached songs in database.

### 🔥 Get Trending

```http
GET /api/music/cached/trending?limit=20
Authorization: Bearer {token}
```

Most played cached songs.

### 🆕 Recently Added

```http
GET /api/music/cached/recent?limit=20
Authorization: Bearer {token}
```

Most recently cached songs.

### 👤 My Uploads

```http
GET /api/music/cached/my-uploads?limit=50
Authorization: Bearer {token}
```

Songs uploaded by current user.

### 🗑️ Delete Song

```http
DELETE /api/music/cached/{videoId}
Authorization: Bearer {token}
```

Deletes from both Telegram and database.

---

## Monitoring

### Check Cleanup Service

```javascript
// In Node.js REPL or admin endpoint
const cleanupService = require('./src/services/cleanupService');
cleanupService.getStats().then(console.log);

// Output:
// {
//   isRunning: true,
//   totalSongs: 150,
//   readySongs: 142,
//   processingSongs: 3,
//   failedSongs: 5,
//   nextCleanupIn: 3600000
// }
```

### Manual Cleanup

```javascript
// Force cleanup cycle
const cleanupService = require('./src/services/cleanupService');
await cleanupService.runCleanup();
```

---

## Troubleshooting

### ❌ "yt-dlp not found"

**Error:**
```
Error: yt-dlp execution error: spawn yt-dlp ENOENT
```

**Solution:**
Install yt-dlp (see Prerequisites section above).

### ❌ "Telegram account not connected"

**Error:**
```
Error: User Telegram account not connected
```

**Solution:**
User must connect Telegram account first through the main Telegram integration flow.

### ❌ Song stuck in "downloading" status

**Check:**
```bash
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:5000/api/music/cached/status?videoId=VIDEO_ID"
```

**Fix:**
Wait for cleanup service (runs hourly) or restart server to clear stale locks.

### ❌ Upload fails repeatedly

**Possible causes:**
1. Telegram session expired → Reconnect Telegram
2. API credentials invalid → Check `TELEGRAM_API_ID` and `TELEGRAM_API_HASH`
3. Network issues → Check server connectivity

---

## Storage Management

### Monitor Database Size

```javascript
// Check total cached songs
const Song = require('./src/models/Song');
const count = await Song.countDocuments({ status: 'ready' });
console.log(`Cached songs: ${count}`);

// Estimate storage (average 5MB per song)
const estimatedGB = (count * 5) / 1024;
console.log(`Estimated Telegram storage: ${estimatedGB.toFixed(2)} GB`);
```

### Clean Old Songs

```javascript
// Delete songs not played in 30 days
const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
const result = await Song.deleteMany({
  status: 'ready',
  lastPlayedAt: { $lt: thirtyDaysAgo },
});
console.log(`Deleted ${result.deletedCount} old songs`);
```

---

## Performance Tips

### 1. Pre-cache Popular Songs

```javascript
// Admin script to pre-cache trending songs
const songService = require('./src/services/songService');

const popularVideos = [
  'dQw4w9WgXcQ',
  'kJQP7kiw5Fk',
  '9bZkp7q19f0',
];

popularVideos.forEach(videoId => {
  // Trigger download (first request will cache it)
  songService.getOrCreateSong(videoId, ADMIN_USER_ID)
    .catch(err => console.error(`Failed to cache ${videoId}:`, err.message));
});
```

### 2. Monitor Cache Hit Rate

```javascript
// Track in analytics
let totalRequests = 0;
let cacheHits = 0;

// In streamCached controller
totalRequests++;
if (song.source === 'database') {
  cacheHits++;
}

const hitRate = (cacheHits / totalRequests * 100).toFixed(2);
console.log(`Cache hit rate: ${hitRate}%`);
```

**Target:** >80% hit rate for popular music

---

## Configuration Options

### Adjust Timeouts

Edit `src/services/songService.js`:

```javascript
// Max time for download + upload (default: 10 minutes)
this.QUEUE_TIMEOUT_MS = 15 * 60 * 1000; // Increase for slow connections
```

### Adjust Cleanup Frequency

Edit `src/services/cleanupService.js`:

```javascript
// Run cleanup every 30 minutes instead of 1 hour
this.CLEANUP_INTERVAL_MS = 30 * 60 * 1000;
```

### Adjust Lock Timeout

Edit `src/services/cleanupService.js`:

```javascript
// Clear locks after 5 minutes instead of 10
this.LOCK_TIMEOUT_MS = 5 * 60 * 1000;
```

---

## Frontend Integration Example

### React Component

```jsx
import { useState, useEffect } from 'react';

function MusicPlayer({ videoId }) {
  const [status, setStatus] = useState('checking');
  const [isPlaying, setIsPlaying] = useState(false);
  const [audio, setAudio] = useState(null);

  useEffect(() => {
    checkStatus();
  }, [videoId]);

  async function checkStatus() {
    try {
      const res = await fetch(`/api/music/cached/status?videoId=${videoId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setStatus(data.status);
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  }

  async function handlePlay() {
    try {
      setIsPlaying(true);
      
      const res = await fetch(`/api/music/cached/stream?videoId=${videoId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      const blob = await res.blob();
      const audioUrl = URL.createObjectURL(blob);
      const audioObj = new Audio(audioUrl);
      
      audioObj.play();
      setAudio(audioObj);
      
      audioObj.onended = () => setIsPlaying(false);
    } catch (err) {
      console.error('Playback failed:', err);
      setIsPlaying(false);
    }
  }

  return (
    <div className="music-player">
      <div className="status">
        {status === 'ready' && <span className="ready">✓ Cached</span>}
        {status === 'downloading' && <span className="loading">⏳ Downloading...</span>}
        {status === 'not_found' && <span className="new">Will download on play</span>}
      </div>
      
      <button onClick={handlePlay} disabled={isPlaying || status === 'downloading'}>
        {isPlaying ? 'Playing...' : 'Play'}
      </button>
    </div>
  );
}
```

---

## Security Considerations

### 1. Authentication Required

All endpoints require valid JWT token via `Authorization: Bearer {token}` header.

### 2. User Isolation

Users can only delete their own uploads (checked via `uploadedByUserId`).

### 3. Rate Limiting

Global rate limiter applies (2000 requests per 15 minutes).

### 4. Storage Quotas

Respects user storage limits from subscription plan.

---

## Support

For issues or questions:
1. Check logs: `logs/app.log`
2. Enable debug logging
3. Review `docs/MUSIC_CACHING_FEATURE.md` for detailed documentation

---

**Happy Streaming! 🎵**
