# Telecloud Music Python Service

This microservice provides YouTube Music search and stream URL extraction.

## Endpoints

- `GET /health`
- `GET /search?q=<query>&limit=20`
- `GET /stream-info?videoId=<youtubeVideoId>`
- `GET /recommendations?videoId=<youtubeVideoId>&limit=20`
- `GET /trending?limit=20`
- `GET /lyrics?videoId=<youtubeVideoId>`

## Setup

```bash
pip install -r requirements.txt
python app.py
```

Default bind: `127.0.0.1:8001`

## Environment Variables

- `MUSIC_SERVICE_HOST` (default `127.0.0.1`)
- `MUSIC_SERVICE_PORT` (default `8001`)
