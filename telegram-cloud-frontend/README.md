# TeleCloud Frontend

Modern React frontend for the Telegram Cloud Storage backend.

## Quick start

```bash
npm install
cp .env.example .env
npm run dev
```

## Environment variables

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Backend URL (default: http://localhost:5000) |

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
