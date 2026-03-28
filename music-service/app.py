from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse
import json
import os
import random
import re
import time

from ytmusicapi import YTMusic
import yt_dlp


HOST = "0.0.0.0"
PORT = int(os.environ.get("PORT", 10000))
DEFAULT_COUNTRY = os.getenv("MUSIC_SERVICE_COUNTRY", "IN")

_CACHE = {}
_CACHE_MISS = object()

CATEGORY_QUERIES = [
    ("Hindi Trending", "Latest Hindi chart movers", "latest hindi songs playlist"),
    ("Punjabi Hits", "Punjabi bangers", "top punjabi songs playlist"),
    ("Marathi Hits", "Best of Marathi music", "latest marathi songs playlist"),
    ("English Top", "Global chart leaders", "top english songs 2025 playlist"),
    ("Bollywood Top 50", "Big-screen anthems", "top 50 bollywood songs playlist"),
    ("Lo-fi", "Chill beats and study vibes", "lofi beats playlist"),
    ("Workout", "Energy for the gym", "workout songs playlist"),
    ("Focus", "Instrumental concentration", "focus music playlist"),
    ("90s Bollywood", "Retro essentials and iconic hooks", "90s bollywood playlist"),
    ("Dance", "High-energy party starters", "dance hits playlist"),
    ("Romance", "Soft melodies and heart-on-sleeve songs", "romantic hindi songs playlist"),
    ("Devotional", "Soulful devotional listening", "devotional songs playlist"),
    ("Indie", "Fresh independent voices", "indie india playlist"),
    ("Chill", "Late-night unwind mode", "chill hits playlist"),
]

READY_PLAYLIST_QUERIES = [
    ("Top 50 India", "Top songs right now", "top 50 songs india 2025"),
    ("Top 100 India", "Most popular tracks", "top 100 bollywood songs"),
    ("Hindi Hits", "Latest Hindi chart toppers", "latest hindi songs 2025"),
    ("Punjabi Hits", "Top Punjabi bangers", "top punjabi songs 2025"),
    ("Marathi Hits", "Best Marathi songs", "best marathi songs"),
    ("English Hits", "Global chart leaders", "top english songs 2025"),
    ("Bollywood Top 50", "Biggest Bollywood tracks", "bollywood hits 2025"),
    ("Trending Now", "Viral hits right now", "trending songs india"),
    ("New Releases", "Fresh drops this week", "new songs this week"),
    ("Workout Energy", "High-intensity gym motivation", "workout gym music"),
    ("Sleep & Relax", "Peaceful sleep sounds", "sleep relaxation music"),
    ("Lo-fi Beats", "Chill study vibes", "lofi hip hop"),
    ("Romantic Songs", "Love and heartbreak", "romantic hindi songs"),
    ("Party Anthems", "Dance floor bangers", "party songs hindi"),
    ("90s Bollywood", "Classic Bollywood hits", "90s hindi songs"),
    ("Devotional", "Spiritual listening", "devotional songs"),
    ("Focus Music", "Concentration playlist", "focus study music"),
    ("Indie India", "Independent artists", "indie indian music"),
]


def _cache_key(*parts):
    return "|".join(str(part) for part in parts)


def _cache_get(key):
    cached = _CACHE.get(key)
    if not cached:
        return _CACHE_MISS

    if time.time() > cached["expires_at"]:
        _CACHE.pop(key, None)
        return _CACHE_MISS

    return cached["value"]


def _cache_get_stale(key, stale_ttl_seconds):
    cached = _CACHE.get(key)
    if not cached:
        return _CACHE_MISS

    if time.time() > cached["expires_at"] + max(stale_ttl_seconds, 0):
        return _CACHE_MISS

    return cached["value"]


def _cache_set(key, value, ttl_seconds):
    _CACHE[key] = {
        "value": value,
        "expires_at": time.time() + ttl_seconds,
    }
    return value


def _remember(key, ttl_seconds, factory, stale_ttl_seconds=0, fallback=None):
    cached = _cache_get(key)
    if cached is not _CACHE_MISS:
        return cached

    try:
        value = factory()
    except Exception as exc:
        stale_value = _cache_get_stale(key, stale_ttl_seconds)
        if stale_value is not _CACHE_MISS:
            print(f"[music-service] using stale cache for {key}: {exc}")
            return stale_value

        if fallback is not None:
            print(f"[music-service] using fallback for {key}: {exc}")
            return fallback() if callable(fallback) else fallback

        raise

    return _cache_set(key, value, ttl_seconds)


def _safe_int(raw, default, minimum, maximum):
    try:
        value = int(raw)
    except (TypeError, ValueError):
        value = default
    return max(minimum, min(value, maximum))


def _build_ytmusic():
    try:
        return YTMusic()
    except Exception:
        return YTMusic(language="en")


ytmusic = _build_ytmusic()


def _mime_type_from_ext(ext):
    ext = (ext or "").lower()
    if ext in {"m4a", "mp4"}:
        return "audio/mp4"
    if ext == "webm":
        return "audio/webm"
    if ext == "mp3":
        return "audio/mpeg"
    return f"audio/{ext}" if ext else "audio/webm"


def _video_thumbnail(video_id):
    return f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg" if video_id else ""


def _seconds_to_duration(seconds):
    try:
        total_seconds = int(float(seconds))
    except (TypeError, ValueError):
        return ""

    if total_seconds <= 0:
        return ""

    minutes, remainder = divmod(total_seconds, 60)
    hours, minutes = divmod(minutes, 60)
    if hours > 0:
        return f"{hours}:{minutes:02d}:{remainder:02d}"
    return f"{minutes}:{remainder:02d}"


def _extract_text(value):
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, dict):
        if isinstance(value.get("text"), str):
            return value.get("text", "").strip()
        runs = value.get("runs") or []
        text = "".join(run.get("text", "") for run in runs if isinstance(run, dict))
        return text.strip()
    if isinstance(value, list):
        return "".join(_extract_text(item) for item in value).strip()
    return ""


def _extract_duration(item):
    direct_candidates = [
        item.get("duration"),
        item.get("length"),
        item.get("lengthText"),
        item.get("durationText"),
    ]
    for candidate in direct_candidates:
        text = _extract_text(candidate)
        if text:
            match = re.search(r"\d+:\d{2}(?::\d{2})?", text)
            if match:
                return match.group(0)
            if re.fullmatch(r"\d+(?:\.\d+)?", text):
                formatted = _seconds_to_duration(text)
                if formatted:
                    return formatted

    numeric_candidates = [
        item.get("duration_seconds"),
        item.get("durationSeconds"),
        item.get("length_seconds"),
        item.get("lengthSeconds"),
    ]
    for candidate in numeric_candidates:
        formatted = _seconds_to_duration(candidate)
        if formatted:
            return formatted

    for column in item.get("fixedColumns") or []:
        text = _extract_text(column)
        if text:
            match = re.search(r"\d+:\d{2}(?::\d{2})?", text)
            if match:
                return match.group(0)

    return ""


def _extract_album_name(item):
    album = item.get("album") or {}
    if isinstance(album, dict):
        return album.get("name", "")
    if isinstance(album, str):
        return album
    return ""


def _pick_playlist_result(playlists, preferred_words=()):
    candidates = [playlist for playlist in playlists if playlist.get("browseId")]
    if not candidates:
        return None

    preferred_words = [word.lower() for word in preferred_words if word]
    if not preferred_words:
        return candidates[0]

    def _score(playlist):
        haystack = " ".join(
            [playlist.get("title", ""), _author_name(playlist)]
        ).lower()
        return sum(1 for word in preferred_words if word in haystack)

    return sorted(candidates, key=_score, reverse=True)[0]


def _author_name(item):
    author = item.get("author")
    if isinstance(author, dict):
        return author.get("name", "")
    if isinstance(author, str):
        return author

    artists = item.get("artists") or []
    names = [artist.get("name", "") for artist in artists if artist.get("name")]
    return ", ".join(names)


def _thumbnail_url(item):
    thumbnails = item.get("thumbnails") or []
    if not thumbnails:
        return _video_thumbnail(item.get("videoId", ""))
    # Get the highest quality thumbnail (last one in array)
    best_thumb = thumbnails[-1] if thumbnails else {}
    return best_thumb.get("url", "") or (thumbnails[0].get("url", "") if thumbnails else "")


def _normalize_song(item):
    video_id = item.get("videoId", "")
    artists = item.get("artists") or []
    artist_names = ", ".join(
        [artist.get("name", "") for artist in artists if artist.get("name")]
    ).strip()
    if not artist_names:
        artist_names = _author_name(item) or "Unknown Artist"

    return {
        "videoId": video_id,
        "title": item.get("title", "Unknown Title"),
        "artist": artist_names,
        "duration": _extract_duration(item),
        "thumbnail": _thumbnail_url(item) or _video_thumbnail(video_id),
        "album": _extract_album_name(item),
    }


def _dedupe_tracks(items, exclude_video_id=""):
    seen = set()
    results = []
    for item in items:
        song = _normalize_song(item)
        video_id = song.get("videoId", "")
        if not video_id or video_id == exclude_video_id or video_id in seen:
            continue
        seen.add(video_id)
        results.append(song)
    return results


def _watch_playlist(video_id, limit):
    cache_key = _cache_key("watch-playlist", video_id, limit)
    return _remember(
        cache_key,
        180,
        lambda: ytmusic.get_watch_playlist(videoId=video_id, limit=limit),
        stale_ttl_seconds=1800,
        fallback={"tracks": []},
    )


def _playlist_search(query):
    cache_key = _cache_key("playlist-search", query)
    return _remember(
        cache_key,
        900,
        lambda: ytmusic.search(query, filter="playlists") or [],
        stale_ttl_seconds=3600,
        fallback=[],
    )


def _playlist_id_candidates(playlist_id):
    candidates = [playlist_id]
    if playlist_id.startswith("VL") and len(playlist_id) > 2:
        candidates.append(playlist_id[2:])
    return list(dict.fromkeys([candidate for candidate in candidates if candidate]))


def search_songs(query, limit):
    cache_key = _cache_key("song-search", query.lower().strip(), limit)
    return _remember(
        cache_key,
        90,
        lambda: _dedupe_tracks(
            [
                entry
                for entry in (ytmusic.search(query, filter="songs", limit=limit) or [])
                if entry.get("videoId")
            ]
        )[:limit],
        stale_ttl_seconds=900,
        fallback=[],
    )


def extract_stream_info(video_id):
    cache_key = _cache_key("stream-info", video_id)

    def _factory():
        watch_url = f"https://www.youtube.com/watch?v={video_id}"
        options = {
            "quiet": True,
            "no_warnings": True,
            "skip_download": True,
            "format": "bestaudio/best",
            "noplaylist": True,
            "retries": 2,
            "fragment_retries": 2,
            "socket_timeout": 20,
            "extractor_args": {
                "youtube": {
                    "player_client": ["android", "ios", "web", "tv_embedded"],
                }
            },
            # Add user agent to appear more like a real browser
            "http_headers": {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-us,en;q=0.5",
                "Sec-Fetch-Mode": "navigate",
            },
        }

        with yt_dlp.YoutubeDL(options) as ydl:
            info = ydl.extract_info(watch_url, download=False)
            if not info:
                raise RuntimeError("Unable to extract stream info")

            ext = info.get("ext", "")
            return {
                "streamUrl": info.get("url"),
                "mimeType": _mime_type_from_ext(ext),
                "title": info.get("title", ""),
                "videoId": video_id,
            }

    return _remember(cache_key, 300, _factory)


def get_recommendations(video_id, limit):
    playlist = _watch_playlist(video_id, max(limit + 6, 24))
    tracks = playlist.get("tracks") or []
    return _dedupe_tracks(tracks, exclude_video_id=video_id)[:limit]


def get_trending(limit):
    cache_key = _cache_key("trending", DEFAULT_COUNTRY, limit)

    def _factory():
        charts = ytmusic.get_charts(country=DEFAULT_COUNTRY)
        songs = charts.get("songs") or []
        return _dedupe_tracks(songs)[:limit]

    return _remember(cache_key, 900, _factory, stale_ttl_seconds=3600, fallback=[])


def get_song_lyrics(video_id):
    cache_key = _cache_key("lyrics", video_id)

    def _factory():
        watch_playlist = _watch_playlist(video_id, 1)
        lyrics_token = watch_playlist.get("lyrics")
        if not lyrics_token:
            return ""
        lyrics_data = ytmusic.get_lyrics(lyrics_token)
        if not lyrics_data:
            return ""
        return (lyrics_data.get("lyrics") or "").strip()

    return _remember(cache_key, 600, _factory, stale_ttl_seconds=3600, fallback="")


def get_up_next(video_id, limit):
    data = _watch_playlist(video_id, max(limit + 8, 24))
    tracks = data.get("tracks") or []
    candidates = tracks[1 : limit + 8]
    return _dedupe_tracks(candidates, exclude_video_id=video_id)[:limit]


def get_related(video_id, limit):
    data = _watch_playlist(video_id, max(limit + 12, 30))
    tracks = data.get("tracks") or []
    related_slice = tracks[4 : limit + 12]
    related = _dedupe_tracks(related_slice, exclude_video_id=video_id)

    if len(related) < limit:
        fallback = get_recommendations(video_id, limit + 6)
        seen = {item["videoId"] for item in related}
        for item in fallback:
            if item["videoId"] in seen:
                continue
            seen.add(item["videoId"])
            related.append(item)
            if len(related) >= limit:
                break

    return related[:limit]


def get_categories():
    cache_key = _cache_key("categories")

    def _factory():
        results = []
        for name, subtitle, query in CATEGORY_QUERIES:
            playlists = _playlist_search(query)
            if not playlists:
                continue

            playlist = _pick_playlist_result(playlists, [name, subtitle]) or playlists[0]
            thumbnail_url = _thumbnail_url(playlist)
            results.append(
                {
                    "name": name,
                    "subtitle": subtitle,
                    "title": playlist.get("title", ""),
                    "query": query,
                    "playlistId": playlist.get("browseId", "")
                    or playlist.get("playlistId", ""),
                    "browseId": playlist.get("browseId", "")
                    or playlist.get("playlistId", ""),
                    "author": _author_name(playlist),
                    "count": playlist.get("itemCount", ""),
                    "thumbnail": thumbnail_url,
                    "thumbnails": playlist.get("thumbnails", []),
                }
            )
        return results

    return _remember(cache_key, 1800, _factory)


def get_ready_playlists():
    cache_key = _cache_key("ready-playlists")

    def _factory():
        results = []
        for label, subtitle, query in READY_PLAYLIST_QUERIES:
            playlists = _playlist_search(query)
            if not playlists:
                continue

            playlist = _pick_playlist_result(playlists, [label, subtitle]) or playlists[0]
            results.append(
                {
                    "label": label,
                    "subtitle": subtitle,
                    "query": query,
                    "title": playlist.get("title", ""),
                    "playlistId": playlist.get("browseId", "")
                    or playlist.get("playlistId", ""),
                    "browseId": playlist.get("browseId", "")
                    or playlist.get("playlistId", ""),
                    "author": _author_name(playlist),
                    "count": playlist.get("itemCount", ""),
                    "thumbnail": _thumbnail_url(playlist),
                    "thumbnails": playlist.get("thumbnails", []),
                }
            )
        return results

    return _remember(cache_key, 1800, _factory)


def get_quick_picks(video_id, limit):
    combined = []
    combined.extend(get_up_next(video_id, max(limit, 10)))
    combined.extend(get_related(video_id, max(limit, 10)))
    combined.extend(get_recommendations(video_id, max(limit, 10)))
    random.shuffle(combined)

    seen = set()
    picks = []
    for item in combined:
        video_id_value = item.get("videoId", "")
        if not video_id_value or video_id_value == video_id or video_id_value in seen:
            continue
        seen.add(video_id_value)
        picks.append(item)
        if len(picks) >= limit:
            break
    return picks


def get_playlist_details(playlist_id, limit, fallback_query=""):
    last_error = None
    tried_candidates = set()

    def _build_playlist_payload(data, candidate):
        tracks = _dedupe_tracks(data.get("tracks") or [])
        thumbnails = data.get("thumbnails") or []
        thumb = thumbnails[-1].get("url", "") if thumbnails else ""
        return {
            "playlistId": candidate,
            "browseId": playlist_id or candidate,
            "title": data.get("title", "Playlist"),
            "description": data.get("description", ""),
            "author": _author_name(data),
            "thumbnail": thumb or (tracks[0]["thumbnail"] if tracks else ""),
            "trackCount": len(tracks) or data.get("trackCount", 0),
            "tracks": tracks,
        }

    # Try direct playlist ID candidates
    for candidate in _playlist_id_candidates(playlist_id):
        tried_candidates.add(candidate)
        cache_key = _cache_key("playlist-details", candidate, limit)

        def _factory():
            return ytmusic.get_playlist(candidate, limit=limit)

        try:
            data = _remember(cache_key, 900, _factory)
            tracks = _dedupe_tracks(data.get("tracks") or [])
            if not tracks and data.get("trackCount"):
                continue
            return _build_playlist_payload(data, candidate)
        except Exception as exc:
            last_error = exc

    # Try searching for playlists with fallback query
    if fallback_query:
        try:
            playlists = _playlist_search(fallback_query)
            for playlist in playlists:
                candidate = playlist.get("browseId") or playlist.get("playlistId") or ""
                if not candidate or candidate in tried_candidates:
                    continue

                tried_candidates.add(candidate)
                try:
                    data = _remember(
                        _cache_key("playlist-details", candidate, limit),
                        900,
                        lambda candidate_id=candidate: ytmusic.get_playlist(
                            candidate_id, limit=limit
                        ),
                    )
                    tracks = _dedupe_tracks(data.get("tracks") or [])
                    if tracks or not data.get("trackCount"):
                        return _build_playlist_payload(data, candidate)
                except Exception as exc:
                    last_error = exc
        except Exception as exc:
            last_error = exc

    # Final fallback: search for songs directly
    if fallback_query:
        try:
            fallback_tracks = search_songs(fallback_query, min(limit, 50))
            if fallback_tracks:
                return {
                    "playlistId": playlist_id or "",
                    "browseId": playlist_id or "",
                    "title": fallback_query.title(),
                    "description": "Built from search results because the source playlist was unavailable.",
                    "author": "Telecloud Music",
                    "thumbnail": fallback_tracks[0]["thumbnail"],
                    "trackCount": len(fallback_tracks),
                    "tracks": fallback_tracks,
                }
        except Exception as exc:
            last_error = exc

    # If all else fails, return None instead of raising
    # This allows the backend to provide its own fallback
    return None


class MusicHandler(BaseHTTPRequestHandler):
    def _send_json(self, status_code, payload):
        data = json.dumps(payload).encode("utf-8")
        try:
            self.send_response(status_code)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
        except (BrokenPipeError, ConnectionAbortedError, ConnectionResetError, OSError):
            return

    def do_GET(self):
        parsed = urlparse(self.path)
        query = parse_qs(parsed.query)

        if parsed.path == "/health":
            return self._send_json(200, {"ok": True})

        if parsed.path == "/search":
            q = (query.get("q", [""])[0] or "").strip()
            limit = _safe_int(query.get("limit", ["20"])[0], 20, 1, 50)
            if not q:
                return self._send_json(
                    400,
                    {"success": False, "message": "q is required", "results": []},
                )
            try:
                return self._send_json(
                    200,
                    {"success": True, "results": search_songs(q, limit)},
                )
            except Exception as exc:
                return self._send_json(
                    500,
                    {"success": False, "message": str(exc), "results": []},
                )

        if parsed.path == "/stream-info":
            video_id = (query.get("videoId", [""])[0] or "").strip()
            if not video_id:
                return self._send_json(
                    400,
                    {"success": False, "message": "videoId is required"},
                )
            try:
                info = extract_stream_info(video_id)
                return self._send_json(200, {"success": True, **info})
            except Exception as exc:
                return self._send_json(
                    500,
                    {"success": False, "message": str(exc)},
                )

        if parsed.path == "/recommendations":
            video_id = (query.get("videoId", [""])[0] or "").strip()
            limit = _safe_int(query.get("limit", ["20"])[0], 20, 1, 50)
            if not video_id:
                return self._send_json(
                    400,
                    {"success": False, "message": "videoId is required", "results": []},
                )
            try:
                return self._send_json(
                    200,
                    {"success": True, "results": get_recommendations(video_id, limit)},
                )
            except Exception as exc:
                return self._send_json(
                    500,
                    {"success": False, "message": str(exc), "results": []},
                )

        if parsed.path == "/trending":
            limit = _safe_int(query.get("limit", ["20"])[0], 20, 1, 50)
            try:
                return self._send_json(
                    200,
                    {"success": True, "results": get_trending(limit)},
                )
            except Exception as exc:
                return self._send_json(
                    500,
                    {"success": False, "message": str(exc), "results": []},
                )

        if parsed.path == "/lyrics":
            video_id = (query.get("videoId", [""])[0] or "").strip()
            if not video_id:
                return self._send_json(
                    400,
                    {"success": False, "message": "videoId is required", "lyrics": ""},
                )
            try:
                return self._send_json(
                    200,
                    {"success": True, "lyrics": get_song_lyrics(video_id)},
                )
            except Exception as exc:
                return self._send_json(
                    500,
                    {"success": False, "message": str(exc), "lyrics": ""},
                )

        if parsed.path == "/upnext":
            video_id = (query.get("videoId", [""])[0] or "").strip()
            limit = _safe_int(query.get("limit", ["12"])[0], 12, 1, 50)
            if not video_id:
                return self._send_json(
                    400,
                    {"success": False, "message": "videoId is required", "results": []},
                )
            try:
                return self._send_json(
                    200,
                    {"success": True, "results": get_up_next(video_id, limit)},
                )
            except Exception as exc:
                return self._send_json(
                    500,
                    {"success": False, "message": str(exc), "results": []},
                )

        if parsed.path == "/related":
            video_id = (query.get("videoId", [""])[0] or "").strip()
            limit = _safe_int(query.get("limit", ["12"])[0], 12, 1, 50)
            if not video_id:
                return self._send_json(
                    400,
                    {"success": False, "message": "videoId is required", "results": []},
                )
            try:
                return self._send_json(
                    200,
                    {"success": True, "results": get_related(video_id, limit)},
                )
            except Exception as exc:
                return self._send_json(
                    500,
                    {"success": False, "message": str(exc), "results": []},
                )

        if parsed.path == "/quickpicks":
            video_id = (query.get("videoId", [""])[0] or "").strip()
            limit = _safe_int(query.get("limit", ["10"])[0], 10, 1, 30)
            if not video_id:
                return self._send_json(
                    400,
                    {"success": False, "message": "videoId is required", "results": []},
                )
            try:
                return self._send_json(
                    200,
                    {"success": True, "results": get_quick_picks(video_id, limit)},
                )
            except Exception as exc:
                return self._send_json(
                    500,
                    {"success": False, "message": str(exc), "results": []},
                )

        if parsed.path == "/categories":
            try:
                return self._send_json(
                    200,
                    {"success": True, "results": get_categories()},
                )
            except Exception as exc:
                return self._send_json(
                    500,
                    {"success": False, "message": str(exc), "results": []},
                )

        if parsed.path == "/ready-playlists":
            try:
                return self._send_json(
                    200,
                    {"success": True, "results": get_ready_playlists()},
                )
            except Exception as exc:
                return self._send_json(
                    500,
                    {"success": False, "message": str(exc), "results": []},
                )

        if parsed.path == "/playlist-details":
            playlist_id = (query.get("playlistId", [""])[0] or "").strip()
            fallback_query = (query.get("query", [""])[0] or "").strip()
            limit = _safe_int(query.get("limit", ["80"])[0], 80, 1, 200)
            if not playlist_id and not fallback_query:
                return self._send_json(
                    400,
                    {
                        "success": False,
                        "message": "playlistId or query is required",
                    },
                )
            try:
                playlist = get_playlist_details(
                    playlist_id, limit, fallback_query=fallback_query
                )
                if playlist is None:
                    return self._send_json(
                        404,
                        {"success": False, "message": "Playlist not found"},
                    )
                return self._send_json(
                    200,
                    {
                        "success": True,
                        "playlist": playlist,
                    },
                )
            except Exception as exc:
                return self._send_json(
                    500,
                    {"success": False, "message": str(exc)},
                )

        return self._send_json(404, {"success": False, "message": "Not found"})

    def log_message(self, _format, *_args):
        return


if __name__ == "__main__":
    server = ThreadingHTTPServer((HOST, PORT), MusicHandler)
    print(f"Music service running on http://{HOST}:{PORT}")
    server.serve_forever()
