import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000',
  timeout: 0, // No timeout — large file uploads can take minutes
})

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Handle 401 globally (except for public routes which use 401 for password prompts)
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !err.config.url.includes('/public/')) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

// ── Auth ──────────────────────────────────────────────────────────
export const authAPI = {
  register:            (data) => api.post('/api/auth/register', data),
  login:               (data) => api.post('/api/auth/login', data),
  getMe:               ()     => api.get('/api/auth/me'),
  sendOTP:             (data) => api.post('/api/auth/telegram/send-otp', data),
  verifyOTP:           (data) => api.post('/api/auth/telegram/verify', data),
  disconnectTelegram:  ()     => api.post('/api/auth/telegram/disconnect'),
}

// ── Files ─────────────────────────────────────────────────────────
export const filesAPI = {
  list:       (params) => api.get('/api/files', { params }),
  initUpload: (data) => api.post('/api/files/upload/init', data),
  uploadChunk: (formData) => api.post('/api/files/upload/chunk', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 0,
  }),
  finalizeUpload: (data) => api.post('/api/files/upload/finalize', data),
  downloadUrl:(id) => `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/files/${id}/download?token=${localStorage.getItem('token')}`,
  preview:    (id) => `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/files/${id}/preview`,
  thumbnail:  (id) => `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/files/${id}/thumbnail?token=${localStorage.getItem('token')}`,
  delete:     (id) => api.delete(`/api/files/${id}`),
  update:     (id, d) => api.put(`/api/files/${id}`, d),
  bulkDelete: (fileIds) => api.post('/api/files/bulk-delete', { fileIds }),
  getZipToken:(data) => api.post('/api/files/zip-token', data),
  downloadZip:(token) => `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/files/download-zip?token=${token}`,
  move:       (data) => api.post('/api/files/move', data),
}

// ── Folders ───────────────────────────────────────────────────────
export const foldersAPI = {
  list:   (params) => api.get('/api/folders', { params }),
  create: (data)   => api.post('/api/folders', data),
  get:    (id)     => api.get(`/api/folders/${id}`),
  update: (id, d)  => api.put(`/api/folders/${id}`, d),
  delete: (id)     => api.delete(`/api/folders/${id}`),
}

// ── Share ─────────────────────────────────────────────────────────
export const shareAPI = {
  create: (data)    => api.post('/api/share', data),
  list:   ()        => api.get('/api/share'),
  revoke: (token)   => api.delete(`/api/share/${token}`),
}

// ── Telegram Import ───────────────────────────────────────────────
export const telegramAPI = {
  listFiles:   (limit = 20, offsetId = 0) =>
    api.get('/api/telegram/files', { params: { limit, offsetId } }),
  importFile:  (messageId) =>
    api.post('/api/telegram/import', { messageId }),
  syncFiles:   () => api.get('/api/telegram/sync'),
}

// ── Public ────────────────────────────────────────────────────────
export const publicAPI = {
  getInfo: (token, pwd) => axios.get(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/public/info/${token}`, {
    headers: { ...(pwd ? { 'X-Share-Password': pwd } : {}) }
  }),
}

// ── Dashboard / Search ────────────────────────────────────────────
export const dashboardAPI = { get:    () => api.get('/api/dashboard') }
export const searchAPI    = { search: (q) => api.get('/api/search', { params: { q } }) }
export const musicAPI     = {
  search: (q, limit = 20) => api.get('/api/music/search', { params: { q, limit } }),
  recommendations: (videoId, limit = 20) => api.get('/api/music/recommendations', { params: { videoId, limit } }),
  personalized: (limit = 12) => api.get('/api/music/personalized', { params: { limit } }),
  upNext: (videoId, limit = 12) => api.get('/api/music/upnext', { params: { videoId, limit } }),
  related: (videoId, limit = 12) => api.get('/api/music/related', { params: { videoId, limit } }),
  quickPicks: (videoId, limit = 10) => api.get('/api/music/quickpicks', { params: { videoId, limit } }),
  historyQuickPicks: (limit = 12) => api.get('/api/music/history-quickpicks', { params: { limit } }),
  categories: () => api.get('/api/music/categories'),
  readyPlaylists: () => api.get('/api/music/ready-playlists'),
  browsePlaylist: (playlistId, limit = 80, query = '') => api.get('/api/music/browse-playlist', { params: { playlistId, limit, query } }),
  trending: (limit = 20) => api.get('/api/music/trending', { params: { limit } }),
  lyrics: (videoId) => api.get('/api/music/lyrics', { params: { videoId } }),
  history: () => api.get('/api/music/history'),
  addHistory: (track) => api.post('/api/music/history', track),
  trackAnalytics: (payload) => api.post('/api/music/analytics', payload),
  favorites: () => api.get('/api/music/favorites'),
  liked: () => api.get('/api/music/liked'),
  like: (track) => api.post('/api/music/like', track),
  toggleLike: (track) => api.post('/api/music/like', track),
  toggleFavorite: (track) => api.post('/api/music/favorites/toggle', track),
  playlists: () => api.get('/api/music/playlist'),
  createPlaylist: (input) =>
    api.post('/api/music/playlist', typeof input === 'string' ? { name: input } : input),
  renamePlaylist: (id, name) => api.patch(`/api/music/playlist/${id}`, { name }),
  deletePlaylist: (id) => api.delete(`/api/music/playlist/${id}`),
  addToPlaylist: (id, track) => api.post(`/api/music/playlist/${id}/tracks`, track),
  removeFromPlaylist: (id, videoId) => api.delete(`/api/music/playlist/${id}/tracks/${encodeURIComponent(videoId)}`),
  
  // Telegram-cached streaming (database-first approach)
  // Includes auth token in URL for HTML5 audio element compatibility
  streamUrl: (videoId) => {
    const token = localStorage.getItem('token');
    return `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/music/cached/stream?videoId=${encodeURIComponent(videoId)}${token ? `&token=${token}` : ''}`;
  },
  
  // Alias kept for callers that still reference the legacy helper name
  legacyStreamUrl: (videoId) =>
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/music/cached/stream?videoId=${encodeURIComponent(videoId)}&token=${localStorage.getItem('token')}`,
  
  // Cached music endpoints (authenticated via API calls)
  getCachedSong: (videoId) => api.get(`/api/music/cached/song?videoId=${encodeURIComponent(videoId)}`),
  getSongStatus: (videoId) => api.get(`/api/music/cached/status?videoId=${encodeURIComponent(videoId)}`),
  searchCached: (query, limit = 20) => api.get(`/api/music/cached/search?q=${encodeURIComponent(query)}&limit=${limit}`),
  getCachedTrending: (limit = 20) => api.get(`/api/music/cached/trending?limit=${limit}`),
  getRecentlyAdded: (limit = 20) => api.get(`/api/music/cached/recent?limit=${limit}`),
  getMyUploads: (limit = 50) => api.get(`/api/music/cached/my-uploads?limit=${limit}`),
  deleteCachedSong: (videoId) => api.delete(`/api/music/cached/${encodeURIComponent(videoId)}`),
}
export const paymentsAPI  = {
  createOrder:     (plan) => api.post('/api/payments/create-order', { plan }),
  verify:          (data) => api.post('/api/payments/verify', data),
  getSubscription: ()     => api.get('/api/payments/subscription'),
  getHistory:      ()     => api.get('/api/payments/history'),
  getStatus:       (orderId) => api.get(`/api/payments/status/${orderId}`),
}

export default api
