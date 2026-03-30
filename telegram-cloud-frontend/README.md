# TeleCloud Frontend

Modern React frontend for the Telegram Cloud Storage backend.

## Quick start

```bash
npm install
npm run dev
```

## Environment variables

| Variable | Description |
|---|---|
| `VITE_ENABLE_ADS` | Enables ad surfaces in the UI (default: `true` in local examples) |
| `VITE_DEV_MODE` | Explicit ad-mode switch. `true` uses test ads, `false` uses production ads. |
| `VITE_VAST_TEST_URL` | Google test VAST used in local/dev mode. |
| `VITE_EXOCLICK_TEST_MODE` | Forces production-style Telecloud playback to use ExoClick's official test inventory instead of your live zone. |
| `VITE_EXOCLICK_TEST_VAST_URL` | Optional override for the ExoClick official test VAST tag. |
| `VITE_EXOCLICK_ZONE_ID` | Optional ExoClick zone id used to derive the production VAST URL. |
| `VITE_EXOCLICK_VAST_URL` | Explicit production ExoClick VAST URL. |
| `VITE_API_BASE_URL` | Backend URL for the active environment file. |
| `VITE_VAST_URL` | Deprecated legacy override kept only for backward compatibility during migration. Remove it from local env files. |

## Ad environments

- Base config lives in `.env` and should contain shared toggles only, such as `VITE_ENABLE_ADS=true`.
- Local development should use `.env.development` with `VITE_DEV_MODE=true` and the Google test VAST.
- To validate the production ExoClick code path without using your live monetization zone, set `VITE_DEV_MODE=false` and `VITE_EXOCLICK_TEST_MODE=true`. Telecloud will use ExoClick's official test inventory instead of your live zone.
- Production hosting should use `.env.production` or deployment environment variables with `VITE_DEV_MODE=false` plus either `VITE_EXOCLICK_VAST_URL` or `VITE_EXOCLICK_ZONE_ID`.
- `window.FORCE_TEST_ADS = true` can be used for runtime debugging without changing the deployed build configuration.
- On startup, Telecloud validates the active env, logs the active mode, whether ads are enabled, and the resolved VAST URL.
- The player keeps its fallback overlay behavior, so failed VAST requests still continue into the main video instead of blocking playback.

## Production deploy checklist

1. Set `VITE_API_BASE_URL` to your real backend URL.
2. Set `VITE_DEV_MODE=false`.
3. Set `VITE_EXOCLICK_TEST_MODE=false`.
4. Set either `VITE_EXOCLICK_VAST_URL` or `VITE_EXOCLICK_ZONE_ID` for your live ExoClick zone.
5. Deploy over HTTPS on the real domain configured in ExoClick.
6. Make sure the ExoClick site/zone is configured for that live domain before expecting monetized fill.
7. Use `VITE_EXOCLICK_TEST_MODE=true` only for temporary production-path validation, then turn it back off before launch.

## Routes

| Route | Page |
|---|---|
| `/` | Landing page |
| `/login` | Login |
| `/register` | Register |
| `/connect-telegram` | Telegram auth flow |
| `/dashboard` | Dashboard with stats |
| `/files` | File browser |
| `/folder/:id` | Folder contents |
| `/shared` | Shared links manager |

## Tech stack

- React 18 + Vite
- Tailwind CSS (dark mode supported)
- Framer Motion (animations)
- React Query (data fetching/caching)
- Zustand (upload progress state)
- Axios (API + interceptors)
- React Hot Toast (notifications)
- Lucide React (icons)
