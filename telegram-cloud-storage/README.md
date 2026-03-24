# 📦 Telegram Cloud Storage — Backend API

A production-ready cloud storage REST API that uses **Telegram (via MTProto)** as the file backend.  
Built with **Node.js**, **Express**, **MongoDB**, and **gram-js**.

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy and fill in environment variables
cp .env.example .env
# Edit .env with your values

# 3. Start the server
npm start          # production
npm run dev        # development (nodemon)
```

---

## ⚙️ Environment Variables

| Variable | Description |
|---|---|
| `PORT` | HTTP port (default 5000) |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | JWT signing secret (min 32 chars) |
| `JWT_EXPIRES_IN` | Token lifetime (default `7d`) |
| `TELEGRAM_API_ID` | From https://my.telegram.org |
| `TELEGRAM_API_HASH` | From https://my.telegram.org |
| `MAX_FILE_SIZE_MB` | Max upload size in MB (default 2000) |
| `BCRYPT_ROUNDS` | bcrypt cost factor (default 12) |

---

## 📁 Folder Structure

```
src/
├── app.js                  # Express app factory
├── config/
│   ├── db.js               # MongoDB connection
│   └── env.js              # Validated env vars
├── models/
│   ├── User.js             # Users + Telegram sessions
│   ├── File.js             # File metadata
│   ├── Folder.js           # Folder hierarchy
│   └── Share.js            # Public share tokens
├── controllers/
│   ├── authController.js
│   ├── fileController.js
│   ├── folderController.js
│   ├── shareController.js
│   ├── dashboardController.js
│   └── searchController.js
├── routes/
│   ├── auth.js
│   ├── files.js
│   ├── folders.js
│   ├── share.js
│   ├── public.js           # No-auth routes
│   ├── dashboard.js
│   ├── search.js
│   └── progress.js         # SSE endpoint
├── middleware/
│   ├── auth.js             # JWT protect middleware
│   └── errorHandler.js     # Centralised error handler
└── utils/
    ├── telegram.js         # All Telegram operations
    ├── helpers.js          # Utilities (sanitize, format, etc.)
    ├── progressStore.js    # In-memory SSE progress store
    └── logger.js           # Winston logger
```

---

## 🔐 Authentication Flow

```
POST /api/auth/register        { email, password }
POST /api/auth/login           { email, password }  → { token }
GET  /api/auth/me              Authorization: Bearer <token>
```

### Link Telegram Account

```
POST /api/auth/telegram/send-otp    { phoneNumber: "+919..." }
POST /api/auth/telegram/verify      { phoneNumber, phoneCode, phoneCodeHash }
POST /api/auth/telegram/disconnect
```

---

## 📂 Files API

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/files/upload` | Upload file (multipart/form-data) |
| `GET` | `/api/files` | List files (query: `folderId`, `page`, `limit`) |
| `GET` | `/api/files/:id/download` | Download file |
| `GET` | `/api/files/:id/preview` | Inline preview |
| `DELETE` | `/api/files/:id` | Delete file |
| `POST` | `/api/files/bulk-delete` | `{ fileIds: [...] }` |
| `POST` | `/api/files/move` | `{ fileIds, targetFolderId }` |

**Upload with progress:**
1. `GET /api/progress/<uploadId>` — open SSE connection
2. `POST /api/files/upload` with header `X-Upload-Id: <uploadId>`

---

## 🗂️ Folders API

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/folders` | `{ name, parentFolderId? }` |
| `GET` | `/api/folders` | Root contents (`?parentFolderId=`) |
| `GET` | `/api/folders/:id` | Folder + sub-folders + files |
| `PUT` | `/api/folders/:id` | `{ name?, color? }` |
| `DELETE` | `/api/folders/:id` | Recursive delete |

---

## 🔗 Sharing API

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/share` | `{ fileId, expiresInHours?, maxDownloads? }` |
| `GET` | `/api/share` | List my share links |
| `DELETE` | `/api/share/:token` | Revoke link |
| `GET` | `/public/file/:token` | Public access (no auth) |
| `GET` | `/public/file/:token?preview=1` | Inline preview |

---

## 📊 Dashboard & Search

```
GET /api/dashboard           → stats + recent files + folder tree
GET /api/search?q=keyword    → search files and folders
```

---

## 📡 SSE Progress Events

```javascript
const es = new EventSource("/api/progress/<uploadId>", {
  headers: { Authorization: "Bearer <token>" }
});
es.onmessage = (e) => {
  const { progress, status } = JSON.parse(e.data);
  // status: connected | uploading | saving | complete | error
};
```

---

## 🌐 Response Format

All endpoints return:

```json
{
  "success": true,
  "message": "Human readable message",
  "data": { ... }
}
```

---

## 🏥 Health Check

```
GET /health  → { success: true, data: { uptime: 42.3 } }
```

---

## 🛡️ Security Features

- Helmet.js security headers
- bcrypt password hashing (configurable rounds)
- JWT authentication with expiry
- Rate limiting (global + auth endpoints)
- User ownership validation on all resources
- File name sanitisation
- Environment variable validation at startup
