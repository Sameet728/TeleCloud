export const GOOGLE_TEST_VAST_URL =
  'https://pubads.g.doubleclick.net/gampad/ads?sz=640x480&iu=/124319096/external/single_ad_samples&ciu_szs=300x250&cust_params=deployment%3Ddevsite%26sample_ct%3Dskippablelinear&gdfp_req=1&env=vp&output=vast&unviewed_position_start=1&impl=s&correlator='
export const EXOCLICK_OFFICIAL_TEST_VAST_URL =
  'https://s.magsrv.com/v1/vast.php?idzone=2916384'

export const TEST_VAST_URL =
  import.meta.env.VITE_VAST_TEST_URL?.trim() || GOOGLE_TEST_VAST_URL
export const EXOCLICK_TEST_VAST_URL =
  import.meta.env.VITE_EXOCLICK_TEST_VAST_URL?.trim() || EXOCLICK_OFFICIAL_TEST_VAST_URL

const LOG_PREFIX = '[tc-ads]'

const getLegacyVastUrl = () => import.meta.env.VITE_VAST_URL?.trim() || ''

const getDerivedExoClickVastUrl = () => {
  const configuredVastUrl = import.meta.env.VITE_EXOCLICK_VAST_URL?.trim()
  if (configuredVastUrl) return configuredVastUrl

  const zoneId = import.meta.env.VITE_EXOCLICK_ZONE_ID?.trim()
  if (!zoneId) return ''

  return `https://s.magsrv.com/v1/vast.php?idzone=${zoneId}`
}

export const getIsDevMode = () => {
  const explicitMode = import.meta.env.VITE_DEV_MODE
  if (explicitMode === 'true') return true
  if (explicitMode === 'false') return false
  return Boolean(import.meta.env.DEV)
}

export const getIsExoClickTestMode = () =>
  import.meta.env.VITE_EXOCLICK_TEST_MODE === 'true'

export const isTestVastTag = (tag) => {
  const normalized = typeof tag === 'string' ? tag.trim() : ''
  return normalized === TEST_VAST_URL || normalized === EXOCLICK_TEST_VAST_URL
}

export const getVastTag = () => {
  if (typeof window !== 'undefined' && window.FORCE_TEST_ADS === true) {
    return TEST_VAST_URL
  }

  if (getIsDevMode()) {
    return TEST_VAST_URL
  }

  if (getIsExoClickTestMode()) {
    return EXOCLICK_TEST_VAST_URL
  }

  return getDerivedExoClickVastUrl() || getLegacyVastUrl() || TEST_VAST_URL
}

export const getVastTagSafe = () => {
  try {
    const tag = getVastTag()
    if (typeof tag !== 'string' || !tag.trim()) {
      throw new Error('Resolved VAST tag is empty')
    }

    return tag.trim()
  } catch (error) {
    console.warn(
      `${LOG_PREFIX} VAST config failed, using test fallback`,
      error?.message || error
    )
    return TEST_VAST_URL
  }
}

export const getAdsModeLabel = (tag = getVastTagSafe()) =>
  getIsDevMode() && tag === TEST_VAST_URL
    ? 'DEV MODE (Test Ads)'
    : getIsExoClickTestMode() && tag === EXOCLICK_TEST_VAST_URL
      ? 'EXOCLICK TEST MODE'
      : ''

export const DEFAULT_VAST_TAG = getVastTagSafe()
