import {
  DEFAULT_VAST_TAG,
  EXOCLICK_OFFICIAL_TEST_VAST_URL,
  EXOCLICK_TEST_VAST_URL,
  TEST_VAST_URL,
  getAdsModeLabel,
  getIsDevMode,
  getIsExoClickTestMode,
  getVastTag,
  getVastTagSafe,
  isTestVastTag,
} from './adConfig'

export const TEST_VAST_TAG = TEST_VAST_URL
export const VAST_TAG = DEFAULT_VAST_TAG
export const IS_TEST_VAST = isTestVastTag(VAST_TAG)
export const ADS_MODE_LABEL = getAdsModeLabel(VAST_TAG)
export const AD_INIT_TIMEOUT_MS = 5500
export const FALLBACK_BANNER_SRC = '/ad.html?f=2018497'

export {
  DEFAULT_VAST_TAG,
  EXOCLICK_OFFICIAL_TEST_VAST_URL,
  EXOCLICK_TEST_VAST_URL,
  TEST_VAST_URL,
  getAdsModeLabel,
  getIsDevMode,
  getIsExoClickTestMode,
  getVastTag,
  getVastTagSafe,
  isTestVastTag,
}
