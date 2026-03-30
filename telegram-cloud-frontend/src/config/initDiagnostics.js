const IGNORED_DIAGNOSTIC_PATTERNS = [
  'accelerometer',
  'deviceorientation',
  'devicemotion',
  'detectIncognito',
  'failed to query storage quota',
  'Cross-Origin-Opener-Policy',
  'origin was untrustworthy',
  "Blocked script execution in 'about:blank' because the document's frame is sandboxed",
  'No banner mount target id found',
  'VIDEOJS: adserror (Preroll)',
  'ads-preroll-error',
  'Unexpected skipLinearAdMode invocation',
  'AdError 303: No Ads VAST response',
  'AdsLoader error: AdError 303',
]

let diagnosticsInitialized = false

const normalizeDiagnosticArg = (value) => {
  if (typeof value === 'string') return value
  if (value instanceof Error) return `${value.name}: ${value.message}`

  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

export const flattenDiagnosticArgs = (args = []) =>
  args.map(normalizeDiagnosticArg).join(' ')

export const shouldIgnoreDiagnostic = (message = '') => {
  const normalized = String(message || '')
  return IGNORED_DIAGNOSTIC_PATTERNS.some((pattern) =>
    normalized.includes(pattern)
  )
}

export const createFilteredConsoleMethod = (originalMethod) => (...args) => {
  if (shouldIgnoreDiagnostic(flattenDiagnosticArgs(args))) {
    return
  }

  originalMethod(...args)
}

const handleFilteredWindowError = (event) => {
  const message =
    event?.message ||
    event?.error?.message ||
    event?.reason?.message ||
    ''

  if (!shouldIgnoreDiagnostic(message)) return
  event.preventDefault?.()
}

const handleFilteredRejection = (event) => {
  const message =
    event?.reason?.message ||
    event?.reason?.toString?.() ||
    ''

  if (!shouldIgnoreDiagnostic(message)) return
  event.preventDefault?.()
}

export const initDiagnostics = () => {
  if (diagnosticsInitialized || typeof window === 'undefined') {
    return
  }

  console.warn = createFilteredConsoleMethod(console.warn.bind(console))
  console.error = createFilteredConsoleMethod(console.error.bind(console))

  window.addEventListener('error', handleFilteredWindowError)
  window.addEventListener('unhandledrejection', handleFilteredRejection)

  diagnosticsInitialized = true
}
