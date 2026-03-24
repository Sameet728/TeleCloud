import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://telecloud-d0rd.onrender.com',
  timeout: 60000,
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
  upload:     (formData, uploadId, onProgress) =>
    api.post('/api/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data', 'X-Upload-Id': uploadId },
      onUploadProgress: onProgress,
    }),
  download:   (id) => api.get(`/api/files/${id}/download`, { responseType: 'blob' }),
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

// ── Public ────────────────────────────────────────────────────────
export const publicAPI = {
  getInfo: (token, pwd) => axios.get(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/public/info/${token}`, {
    headers: { ...(pwd ? { 'X-Share-Password': pwd } : {}) }
  }),
}

// ── Dashboard / Search ────────────────────────────────────────────
export const dashboardAPI = { get:    () => api.get('/api/dashboard') }
export const searchAPI    = { search: (q) => api.get('/api/search', { params: { q } }) }
export const paymentsAPI  = {
  createOrder:     (plan) => api.post('/api/payments/create-order', { plan }),
  verify:          (data) => api.post('/api/payments/verify', data),
  getSubscription: ()     => api.get('/api/payments/subscription'),
  getHistory:      ()     => api.get('/api/payments/history'),
  getStatus:       (orderId) => api.get(`/api/payments/status/${orderId}`),
}

export default api
