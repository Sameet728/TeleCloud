const VIEWER_SESSION_KEY = 'telecloud-viewer-session-id'

export function getViewerSessionId() {
  if (typeof window === 'undefined') return 'server-viewer'

  let value = window.localStorage.getItem(VIEWER_SESSION_KEY)
  if (!value) {
    value = window.crypto?.randomUUID?.() || `viewer-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    window.localStorage.setItem(VIEWER_SESSION_KEY, value)
  }

  return value
}
