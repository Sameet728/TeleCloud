import { getIsDevMode, getIsExoClickTestMode, getVastTagSafe } from './adConfig'

const LOG_PREFIX = '[tc-env]'

const normalizeEnvValue = (value) =>
  typeof value === 'string' ? value.trim() : ''

export const getAdsEnabled = () =>
  normalizeEnvValue(import.meta.env.VITE_ENABLE_ADS).toLowerCase() !== 'false'

export function validateEnv() {
  const isDev = getIsDevMode()
  const isExoClickTestMode = getIsExoClickTestMode()
  const adsEnabled = getAdsEnabled()
  const activeVastUrl = getVastTagSafe()
  const warnings = []

  if (!normalizeEnvValue(import.meta.env.VITE_ENABLE_ADS)) {
    warnings.push('VITE_ENABLE_ADS is missing; defaulting ads to enabled.')
  }

  if (!normalizeEnvValue(import.meta.env.VITE_DEV_MODE)) {
    warnings.push('VITE_DEV_MODE is missing; falling back to Vite mode detection.')
  }

  if (
    normalizeEnvValue(import.meta.env.VITE_API_BASE_URL) === 'https://your-api.com'
  ) {
    warnings.push('VITE_API_BASE_URL still uses the placeholder value; replace it before deploying.')
  }

  if (normalizeEnvValue(import.meta.env.VITE_VAST_URL)) {
    warnings.push('VITE_VAST_URL is deprecated and should be removed from env files.')
  }

  if (isDev) {
    if (!normalizeEnvValue(import.meta.env.VITE_VAST_TEST_URL)) {
      warnings.push('VITE_VAST_TEST_URL is missing in dev mode; using the built-in Google test VAST fallback.')
    }
  } else if (isExoClickTestMode) {
    warnings.push('VITE_EXOCLICK_TEST_MODE is enabled; disable it before live production monetization.')

    if (!normalizeEnvValue(import.meta.env.VITE_EXOCLICK_TEST_VAST_URL)) {
      warnings.push('VITE_EXOCLICK_TEST_VAST_URL is missing in ExoClick test mode; using ExoClick official test inventory.')
    }
  } else if (
    !normalizeEnvValue(import.meta.env.VITE_EXOCLICK_VAST_URL) &&
    !normalizeEnvValue(import.meta.env.VITE_EXOCLICK_ZONE_ID)
  ) {
    warnings.push('Production ads are missing VITE_EXOCLICK_VAST_URL or VITE_EXOCLICK_ZONE_ID; using the safe VAST fallback until fixed.')
  }

  warnings.forEach((warning) => console.warn(LOG_PREFIX, warning))

  console.info(LOG_PREFIX, 'Active mode:', isDev ? 'DEV' : 'PROD')
  console.info(LOG_PREFIX, 'ExoClick test mode:', isExoClickTestMode ? 'true' : 'false')
  console.info(LOG_PREFIX, 'Ads enabled:', adsEnabled ? 'true' : 'false')
  console.info(LOG_PREFIX, 'Active VAST URL:', activeVastUrl)

  return {
    mode: isDev ? 'DEV' : 'PROD',
    exoClickTestMode: isExoClickTestMode,
    adsEnabled,
    activeVastUrl,
    warnings,
  }
}
