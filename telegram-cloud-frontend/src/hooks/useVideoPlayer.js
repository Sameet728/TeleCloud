import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AD_INIT_TIMEOUT_MS,
  FALLBACK_BANNER_SRC,
} from '../config/ads'
import {
  getAdsModeLabel,
  getIsDevMode,
  getVastTagSafe,
  isTestVastTag,
} from '../config/adConfig'

const AD_SKIP_DELAY_SECONDS = 10
const FALLBACK_COUNTDOWN_SECONDS = 3
const DOUBLE_TAP_WINDOW_MS = 280
const SEEK_OFFSET_SECONDS = 10
const RESUME_THRESHOLD_SECONDS = 5
const RESTART_THRESHOLD_SECONDS = 1.5
const PROGRESS_PREFIX = 'telecloud-video-progress'
const LOG_PREFIX = '[tc-ads]'
const DEV_AD_LOGGING = getIsDevMode()
const QUICK_FALLBACK_SECONDS = 1

let videoJsCorePromise = null
let adPluginBundlePromise = null
let imaSdkPromise = null

const loadImaSdk = async (timeoutMs = AD_INIT_TIMEOUT_MS) => {
  if (typeof window === 'undefined') return
  if (window.google?.ima) return
  if (!imaSdkPromise) {
    imaSdkPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-ima-sdk="true"]')

      if (existing) {
        existing.addEventListener('load', () => resolve(), { once: true })
        existing.addEventListener('error', () => reject(new Error('IMA SDK failed to load')), { once: true })
        return
      }

      const script = document.createElement('script')
      script.async = true
      script.src = 'https://imasdk.googleapis.com/js/sdkloader/ima3.js'
      script.dataset.imaSdk = 'true'
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('IMA SDK failed to load'))
      document.head.appendChild(script)
    }).catch((error) => {
      imaSdkPromise = null
      throw error
    })
  }

  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error('IMA SDK load timeout'))
    }, timeoutMs)

    Promise.resolve(imaSdkPromise)
      .then(() => {
        window.clearTimeout(timeoutId)
        resolve()
      })
      .catch((error) => {
        window.clearTimeout(timeoutId)
        reject(error)
      })
  })
}

const loadVideoJsCore = async () => {
  if (videoJsCorePromise) return videoJsCorePromise

  videoJsCorePromise = (async () => {
    const videojsModule = await import('video.js')
    return videojsModule.default || videojsModule
  })()

  return videoJsCorePromise
}

const loadAdPluginBundle = async () => {
  if (adPluginBundlePromise) return adPluginBundlePromise

  adPluginBundlePromise = (async () => {
    await import('videojs-contrib-ads')
    await import('videojs-ima')
  })().catch((error) => {
    adPluginBundlePromise = null
    throw error
  })

  return adPluginBundlePromise
}

const preparePrerollDependencies = async () => {
  const videojs = await loadVideoJsCore()
  let adStackReady = true

  try {
    await loadAdPluginBundle()
    await loadImaSdk(AD_INIT_TIMEOUT_MS)
  } catch (error) {
    adStackReady = false
    logAdStatus({
      state: 'ad_stack_preload_failed',
      message: error?.message || String(error),
    })
  }

  return { videojs, adStackReady }
}

const isTouchCapable = () =>
  typeof window !== 'undefined' &&
  ('ontouchstart' in window || navigator.maxTouchPoints > 0)

const now = () => Date.now()

const isAdPluginMode = (player) =>
  Boolean(player?.ads?.isInAdMode?.() || player?.ads?.inAdBreak?.())

const safeClearInterval = (ref) => {
  if (ref.current) {
    window.clearInterval(ref.current)
    ref.current = null
  }
}

const safeClearTimeout = (ref) => {
  if (ref.current) {
    window.clearTimeout(ref.current)
    ref.current = null
  }
}

export const createProgressKey = (resumeKey) => `${PROGRESS_PREFIX}:${resumeKey}`
export const resolveVastTagUrl = (overrideTagUrl) => overrideTagUrl ?? getVastTagSafe()
export const shouldAttemptPrerollOnOpen = (
  savedProgressSeconds = 0,
  forcePreroll = false
) => true
export const createPlayerSource = (src, mimeType) => ({
  src,
  type: mimeType || 'video/mp4',
})
export const createImaOptions = (adTagUrl) => ({
  adTagUrl,
  requestMode: 'onPlay',
  disableAdControls: false,
  showCountdown: true,
  preventLateAdStart: true,
  vastLoadTimeout: AD_INIT_TIMEOUT_MS,
  contribAdsSettings: {
    prerollTimeout: AD_INIT_TIMEOUT_MS,
    timeout: AD_INIT_TIMEOUT_MS,
  },
})
export const initializePlayerPreroll = (player, adTagUrl, source) => {
  player.ima?.(createImaOptions(adTagUrl))
  player.src?.(source)
}

export const isHandledNoFillError = (detail = {}) => {
  const code = Number(detail?.code)
  const message = String(detail?.message || '').toLowerCase()

  return (
    code === 303 ||
    message.includes('no ads vast response') ||
    message.includes('no fill')
  )
}

const isQuickFallbackReason = (reason, detail = {}) =>
  detail.noFill || reason === 'no_fill' || reason === 'play_request_rejected'

const isHandledFallbackReason = (reason, detail = {}) =>
  isQuickFallbackReason(reason, detail) || reason === 'no_preroll'

const normalizeProgressValue = (value) => {
  const nextValue = Number(value)
  return Number.isFinite(nextValue) && nextValue > 0 ? nextValue : 0
}

const logAdStatus = (payload) => {
  if (!DEV_AD_LOGGING) return
  console.log(`${LOG_PREFIX} status:`, payload)
}

const logAdWarn = (payload) => console.warn(`${LOG_PREFIX} warning:`, payload)

const describeAdError = (event, fallbackReason = 'ad_error') => {
  const adError = event?.data?.AdError || event?.AdError || event?.error || null
  const code =
    adError?.getErrorCode?.() ??
    adError?.getVastErrorCode?.() ??
    adError?.code ??
    null
  const message =
    adError?.getMessage?.() ??
    adError?.message ??
    event?.message ??
    fallbackReason
  const noFill = isHandledNoFillError({ code, message })

  return {
    code,
    message,
    noFill,
    reason: noFill ? 'no_fill' : (code ? `${fallbackReason}:${code}` : fallbackReason),
  }
}

export default function useVideoPlayer({
  src,
  file,
  poster = '',
  vastTagUrl,
  fallbackBannerSrc = FALLBACK_BANNER_SRC,
  resumeKey,
  isPublic = false,
  onAdStart,
  onAdComplete,
  onAdSkipped,
  onAdError,
  onVideoStart,
  onVideoComplete,
  onNext,
}) {
  const mountRef = useRef(null)
  const subtitleInputRef = useRef(null)
  const playerRef = useRef(null)
  const playerRootRef = useRef(null)
  const adsManagerRef = useRef(null)
  const warmedDependenciesRef = useRef(null)
  const playbackStateRef = useRef('idle')
  const playerReadyPromiseRef = useRef(null)
  const disposeFnsRef = useRef([])
  const recoveryTimeoutRef = useRef(null)
  const adTimeoutRef = useRef(null)
  const adHudIntervalRef = useRef(null)
  const fallbackIntervalRef = useRef(null)
  const singleTapTimeoutRef = useRef(null)
  const prerollReadyRef = useRef(false)
  const prerollInitializedRef = useRef(false)
  const adSettledRef = useRef(false)
  const onNextRef = useRef(onNext)
  const startedContentRef = useRef(false)
  const adStartedRef = useRef(false)
  const adSkippedRef = useRef(false)
  const adDurationRef = useRef(0)
  const pendingResumeTimeRef = useRef(0)
  const forcePrerollRef = useRef(false)
  const callbacksRef = useRef({
    onAdStart,
    onAdComplete,
    onAdSkipped,
    onAdError,
    onVideoStart,
    onVideoComplete,
  })
  const gestureStateRef = useRef({ lastTapAt: 0, lastTapX: 0 })

  const normalizedResumeKey = useMemo(
    () => resumeKey || file?._id || src,
    [file?._id, resumeKey, src]
  )
  const resolvedVastTagUrl = useMemo(
    () => resolveVastTagUrl(vastTagUrl),
    [vastTagUrl]
  )
  const adsModeLabel = useMemo(
    () => getAdsModeLabel(resolvedVastTagUrl),
    [resolvedVastTagUrl]
  )
  const isTestAdsMode = useMemo(
    () => isTestVastTag(resolvedVastTagUrl),
    [resolvedVastTagUrl]
  )

  const [playbackState, setPlaybackState] = useState('idle')
  const [adState, setAdState] = useState('idle')
  const [adBootstrapState, setAdBootstrapState] = useState('warming')
  const [userActive, setUserActive] = useState(true)
  const [adSkipCountdown, setAdSkipCountdown] = useState(AD_SKIP_DELAY_SECONDS)
  const [canSkipAd, setCanSkipAd] = useState(false)
  const [adProgressPercent, setAdProgressPercent] = useState(0)
  const [fallbackRemaining, setFallbackRemaining] = useState(FALLBACK_COUNTDOWN_SECONDS)
  const [isResumedPlayback, setIsResumedPlayback] = useState(false)
  const [hasCompletedPlayback, setHasCompletedPlayback] = useState(false)
  const isAdBootstrapReady = adBootstrapState === 'ready'

  useEffect(() => {
    onNextRef.current = onNext
  }, [onNext])

  useEffect(() => {
    callbacksRef.current = {
      onAdStart,
      onAdComplete,
      onAdSkipped,
      onAdError,
      onVideoStart,
      onVideoComplete,
    }
  }, [onAdComplete, onAdError, onAdSkipped, onAdStart, onVideoComplete, onVideoStart])

  useEffect(() => {
    playbackStateRef.current = playbackState
  }, [playbackState])

  useEffect(() => {
    let cancelled = false

    setAdBootstrapState('warming')
    warmedDependenciesRef.current = null
    logAdStatus({
      state: 'warmup_started',
      vast: resolvedVastTagUrl,
    })

    preparePrerollDependencies()
      .then((dependencies) => {
        if (cancelled) return

        warmedDependenciesRef.current = dependencies
        setAdBootstrapState('ready')
        logAdStatus({
          state: 'warmup_ready',
          adStackReady: dependencies.adStackReady,
          vast: resolvedVastTagUrl,
        })
      })
      .catch((error) => {
        if (cancelled) return

        warmedDependenciesRef.current = null
        setAdBootstrapState('failed')
        logAdWarn({
          state: 'warmup_failed',
          message: error?.message || String(error),
          vast: resolvedVastTagUrl,
        })
      })

    return () => {
      cancelled = true
    }
  }, [normalizedResumeKey, resolvedVastTagUrl])

  const clearAllTimers = useCallback(() => {
    safeClearTimeout(adTimeoutRef)
    safeClearTimeout(recoveryTimeoutRef)
    safeClearTimeout(singleTapTimeoutRef)
    safeClearInterval(adHudIntervalRef)
    safeClearInterval(fallbackIntervalRef)
  }, [])

  const clearProgress = useCallback(() => {
    if (typeof window === 'undefined' || !normalizedResumeKey) return
    window.localStorage.removeItem(createProgressKey(normalizedResumeKey))
  }, [normalizedResumeKey])

  const readPersistedProgress = useCallback(() => {
    if (typeof window === 'undefined' || !normalizedResumeKey) return 0
    return normalizeProgressValue(
      window.localStorage.getItem(createProgressKey(normalizedResumeKey))
    )
  }, [normalizedResumeKey])

  const persistProgress = useCallback(() => {
    if (typeof window === 'undefined' || !normalizedResumeKey) return

    const player = playerRef.current
    if (!player || isAdPluginMode(player)) return

    const currentTime = player.currentTime()
    const duration = player.duration() || 0

    if (currentTime <= 5) return

    if (duration && duration - currentTime < 10) {
      clearProgress()
      return
    }

    window.localStorage.setItem(
      createProgressKey(normalizedResumeKey),
      String(currentTime)
    )
  }, [clearProgress, normalizedResumeKey])

  const restoreProgress = useCallback(() => {
    const player = playerRef.current
    if (!player) return

    const value = normalizeProgressValue(
      pendingResumeTimeRef.current || readPersistedProgress()
    )

    if (value <= RESUME_THRESHOLD_SECONDS) return

    try {
      player.currentTime(value)
      pendingResumeTimeRef.current = value
      setIsResumedPlayback(true)
    } catch {}
  }, [readPersistedProgress])

  const ensureContentSource = useCallback((player) => {
    if (!player) return null

    const source = createPlayerSource(src, file?.mimeType)
    const currentSource =
      player.currentSrc?.() ||
      player.currentSource?.()?.src ||
      ''

    if (!currentSource) {
      player.src(source)
    }

    return source
  }, [file?.mimeType, src])

  const prepareMutedAutoplay = useCallback((player) => {
    if (!player) return

    try {
      player.muted(true)
      player.volume(0)
    } catch {}

    const innerVideo = playerRootRef.current?.querySelector('video')
    if (!innerVideo) return

    innerVideo.muted = true
    innerVideo.defaultMuted = true
    innerVideo.setAttribute('muted', 'true')
    innerVideo.setAttribute('playsinline', 'true')
    innerVideo.setAttribute('webkit-playsinline', 'true')
  }, [])

  const finishAdFlow = useCallback((outcome) => {
    if (adSettledRef.current) return

    adSettledRef.current = true
    safeClearTimeout(adTimeoutRef)
    safeClearInterval(adHudIntervalRef)

    if (outcome === 'complete' && !adSkippedRef.current) {
      logAdStatus({ state: 'ad_completed', vast: resolvedVastTagUrl })
      callbacksRef.current.onAdComplete?.()
    }

    if (outcome === 'skip') {
      logAdStatus({ state: 'ad_skipped', vast: resolvedVastTagUrl })
      callbacksRef.current.onAdSkipped?.()
    }

    setAdState(outcome === 'skip' ? 'ad_skipped' : 'ad_completed')
    if (
      playbackStateRef.current === 'loading_ad' ||
      playbackStateRef.current === 'playing_ad'
    ) {
      setPlaybackState('content_loading')
    }

    setCanSkipAd(false)
    setAdSkipCountdown(AD_SKIP_DELAY_SECONDS)
    setAdProgressPercent(outcome === 'complete' ? 100 : 0)
    adStartedRef.current = false
    adSkippedRef.current = outcome === 'skip'
    adDurationRef.current = 0
  }, [resolvedVastTagUrl])

  const playContent = useCallback(() => {
    const player = playerRef.current
    if (!player) return

    ensureContentSource(player)
    safeClearTimeout(adTimeoutRef)
    safeClearInterval(adHudIntervalRef)
    safeClearInterval(fallbackIntervalRef)
    setFallbackRemaining(FALLBACK_COUNTDOWN_SECONDS)
    setCanSkipAd(false)
    setAdSkipCountdown(AD_SKIP_DELAY_SECONDS)
    setAdProgressPercent(0)
    setPlaybackState('content_loading')

    try {
      player.ads?.skipLinearAdMode?.()
    } catch {}

    try {
      if (player.ads?.inAdBreak?.()) {
        player.ads.endLinearAdMode?.()
      }
    } catch {}

    Promise.resolve(player.play()).catch(() => {
      setPlaybackState('content_playing')
    })
  }, [ensureContentSource])

  const startFallback = useCallback((reason, detail = {}) => {
    const player = playerRef.current
    const fallbackDelaySeconds = isQuickFallbackReason(reason, detail)
      ? QUICK_FALLBACK_SECONDS
      : FALLBACK_COUNTDOWN_SECONDS

    safeClearTimeout(adTimeoutRef)
    safeClearInterval(adHudIntervalRef)

    if (
      playbackStateRef.current === 'fallback' ||
      playbackStateRef.current === 'content_loading' ||
      playbackStateRef.current === 'content_playing'
    ) {
      return
    }

    const payload = {
      state: 'fallback',
      reason,
      code: detail.code ?? null,
      message: detail.message || undefined,
      fallbackDelaySeconds,
      vast: resolvedVastTagUrl,
    }

    if (isHandledFallbackReason(reason, detail)) {
      logAdStatus(payload)
    } else {
      logAdWarn(payload)
    }
    adSettledRef.current = true
    callbacksRef.current.onAdError?.({ reason, ...detail })

    if (player && !player.paused()) {
      player.pause()
    }

    try {
      player?.ima?.reset?.()
    } catch {}

    try {
      player?.ads?.skipLinearAdMode?.()
    } catch {}

    try {
      if (player?.ads?.inAdBreak?.()) {
        player.ads.endLinearAdMode?.()
      }
    } catch {}

    setAdState('ad_failed')
    setPlaybackState('fallback')
    setAdProgressPercent(0)
    adDurationRef.current = 0
    setFallbackRemaining(fallbackDelaySeconds)

    fallbackIntervalRef.current = window.setInterval(() => {
      setFallbackRemaining((value) => {
        if (value <= 1) {
          safeClearInterval(fallbackIntervalRef)
          window.setTimeout(() => {
            playContent()
          }, 50)
          return 0
        }

        return value - 1
      })
    }, 1000)
  }, [playContent, resolvedVastTagUrl])

  const handleAdsManagerAvailable = useCallback((event) => {
    const nextAdsManager =
      event?.adsManager ||
      event?.target?.adsManager ||
      event?.adsManagerRef ||
      null

    if (!nextAdsManager || !window.google?.ima?.AdEvent) return

    adsManagerRef.current = nextAdsManager
    logAdStatus({ state: 'ads_manager_ready', vast: resolvedVastTagUrl })
    setAdState('loading_ad')

    const { AdEvent } = window.google.ima

    nextAdsManager.addEventListener(AdEvent.Type.STARTED, (adEvent) => {
      adSettledRef.current = false
      adStartedRef.current = true
      adSkippedRef.current = false
      safeClearTimeout(adTimeoutRef)
      setPlaybackState('playing_ad')
      setAdState('playing_ad')
      setAdSkipCountdown(AD_SKIP_DELAY_SECONDS)
      setCanSkipAd(false)
      setAdProgressPercent(0)
      logAdStatus({ state: 'playing_ad', vast: resolvedVastTagUrl })
      callbacksRef.current.onAdStart?.()

      const activeAd =
        adEvent?.getAd?.() ||
        nextAdsManager.getCurrentAd?.() ||
        null
      const duration = Number(activeAd?.getDuration?.())
      adDurationRef.current = Number.isFinite(duration) && duration > 0 ? duration : 0

      const adStartedAt = now()
      safeClearInterval(adHudIntervalRef)
      adHudIntervalRef.current = window.setInterval(() => {
        const elapsedMs = now() - adStartedAt
        const skipDelayMs = AD_SKIP_DELAY_SECONDS * 1000
        const skipRemaining = Math.max(
          0,
          Math.ceil((skipDelayMs - elapsedMs) / 1000)
        )

        setAdSkipCountdown(skipRemaining)
        if (elapsedMs >= skipDelayMs) {
          setCanSkipAd(true)
        }

        const durationSeconds = adDurationRef.current
        const remainingTime = Number(nextAdsManager.getRemainingTime?.())

        if (
          Number.isFinite(durationSeconds) &&
          durationSeconds > 0 &&
          Number.isFinite(remainingTime)
        ) {
          const percent = ((durationSeconds - remainingTime) / durationSeconds) * 100
          setAdProgressPercent(Math.max(0, Math.min(100, percent)))
        }
      }, 250)
    })

    nextAdsManager.addEventListener(AdEvent.Type.SKIPPED, () => {
      adSkippedRef.current = true
      finishAdFlow('skip')
    })

    nextAdsManager.addEventListener(AdEvent.Type.COMPLETE, () => {
      finishAdFlow('complete')
    })

    nextAdsManager.addEventListener(AdEvent.Type.ALL_ADS_COMPLETED, () => {
      finishAdFlow(adSkippedRef.current ? 'skip' : 'complete')
    })
  }, [finishAdFlow, resolvedVastTagUrl])

  const attachGestureLayer = useCallback((root, player) => {
    if (!root || !player || !isTouchCapable()) return

    const handleTouchEnd = (event) => {
      if (
        playbackStateRef.current === 'idle' ||
        playbackStateRef.current === 'booting' ||
        playbackStateRef.current === 'loading_ad' ||
        playbackStateRef.current === 'playing_ad' ||
        playbackStateRef.current === 'fallback'
      ) {
        return
      }

      const target = event.target
      if (target instanceof HTMLElement && target.closest('.vjs-control-bar')) {
        return
      }

      const touch = event.changedTouches?.[0]
      if (!touch) return

      const currentTapAt = now()
      const rect = root.getBoundingClientRect()
      const tapX = touch.clientX - rect.left
      const isDoubleTap =
        currentTapAt - gestureStateRef.current.lastTapAt < DOUBLE_TAP_WINDOW_MS &&
        Math.abs(tapX - gestureStateRef.current.lastTapX) < 120

      if (isDoubleTap) {
        safeClearTimeout(singleTapTimeoutRef)
        if (tapX > rect.width / 2) {
          player.currentTime(player.currentTime() + SEEK_OFFSET_SECONDS)
        } else {
          player.currentTime(Math.max(0, player.currentTime() - SEEK_OFFSET_SECONDS))
        }
        gestureStateRef.current = { lastTapAt: 0, lastTapX: 0 }
        return
      }

      gestureStateRef.current = { lastTapAt: currentTapAt, lastTapX: tapX }
      safeClearTimeout(singleTapTimeoutRef)
      singleTapTimeoutRef.current = window.setTimeout(() => {
        if (player.paused()) {
          player.play().catch(() => {})
        } else {
          player.pause()
        }
      }, 220)
    }

    root.addEventListener('touchend', handleTouchEnd, { passive: true })
    disposeFnsRef.current.push(() => root.removeEventListener('touchend', handleTouchEnd))
  }, [])

  const attachPlayerEvents = useCallback((player, root) => {
    player.on('useractive', () => setUserActive(true))
    player.on('userinactive', () => setUserActive(false))

    player.on('loadedmetadata', () => {
      const innerVideo = root?.querySelector('video')
      if (innerVideo) {
        innerVideo.setAttribute('crossorigin', 'anonymous')
        innerVideo.setAttribute('playsinline', 'true')
      }
      restoreProgress()
    })

    player.on('timeupdate', persistProgress)

    player.on('playing', () => {
      if (isAdPluginMode(player)) return

      if (!startedContentRef.current) {
        startedContentRef.current = true
        logAdStatus({ state: 'content_playing', vast: resolvedVastTagUrl })
        callbacksRef.current.onVideoStart?.()
      }

      setPlaybackState('content_playing')
      setHasCompletedPlayback(false)
    })

    player.on('ended', () => {
      if (isAdPluginMode(player)) return
      clearProgress()
      setHasCompletedPlayback(true)
      callbacksRef.current.onVideoComplete?.()
      onNextRef.current?.()
    })

    player.on('ads-manager', handleAdsManagerAvailable)
    player.on('adsready', () => {
      if (
        playbackStateRef.current === 'loading_ad' ||
        playbackStateRef.current === 'booting'
      ) {
        setAdState('loading_ad')
      }
    })
    player.on('ads-ad-started', () => {
      adStartedRef.current = true
      safeClearTimeout(adTimeoutRef)
      setPlaybackState('playing_ad')
      setAdState('playing_ad')
    })
    player.on('adtimeout', () => {
      if (!adStartedRef.current) {
        startFallback('ad_timeout')
      }
    })
    player.on('adserror', (event) => {
      const detail = describeAdError(event)
      startFallback(detail.reason, detail)
    })
    player.on('nopreroll', () => startFallback('no_preroll', {
      noFill: true,
      message: 'No preroll ad was returned',
    }))
    player.on('adskip', () => {
      adSkippedRef.current = true
      finishAdFlow('skip')
    })
    player.on('adend', () => {
      if (adStartedRef.current) {
        finishAdFlow(adSkippedRef.current ? 'skip' : 'complete')
      }
    })

    player.on('ratechange', () => {
      const innerVideo = root?.querySelector('video')
      if (innerVideo && innerVideo.playbackRate !== player.playbackRate()) {
        innerVideo.playbackRate = player.playbackRate()
      }
    })

    player.on('error', () => {
      const error = player.error()

      if (
        playbackStateRef.current === 'loading_ad' ||
        playbackStateRef.current === 'playing_ad'
      ) {
        startFallback(error?.message || 'ad_player_error', {
          message: error?.message || 'Ad player error',
        })
        return
      }

      if (!error || isAdPluginMode(player)) return

      if ([2, 3, 4].includes(error.code)) {
        const crashedTime = player.currentTime()
        player.error(null)
        setPlaybackState('content_loading')

        safeClearTimeout(recoveryTimeoutRef)
        recoveryTimeoutRef.current = window.setTimeout(() => {
          player.src(createPlayerSource(src, file?.mimeType))
          player.one('loadedmetadata', () => {
            try {
              player.currentTime(crashedTime)
            } catch {}
            player.play().catch(() => {})
          })
        }, 1000)
      }
    })

    const handleKeyDown = (event) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return

      if (playbackStateRef.current === 'idle' && (event.code === 'Space' || event.code === 'Enter')) {
        event.preventDefault()
        return
      }

      if (playbackStateRef.current !== 'content_playing' && playbackStateRef.current !== 'content_loading') return

      switch (event.code) {
        case 'Space':
          event.preventDefault()
          if (player.paused()) player.play().catch(() => {})
          else player.pause()
          break
        case 'ArrowRight':
          event.preventDefault()
          player.currentTime(player.currentTime() + SEEK_OFFSET_SECONDS)
          break
        case 'ArrowLeft':
          event.preventDefault()
          player.currentTime(Math.max(0, player.currentTime() - SEEK_OFFSET_SECONDS))
          break
        case 'ArrowUp':
          event.preventDefault()
          player.volume(Math.min(1, player.volume() + 0.1))
          break
        case 'ArrowDown':
          event.preventDefault()
          player.volume(Math.max(0, player.volume() - 0.1))
          break
        case 'KeyF':
          event.preventDefault()
          if (player.isFullscreen()) player.exitFullscreen()
          else player.requestFullscreen()
          break
        case 'KeyM':
          event.preventDefault()
          player.muted(!player.muted())
          break
        case 'KeyP':
          event.preventDefault()
          if (document.pictureInPictureElement) {
            document.exitPictureInPicture?.().catch(() => {})
          } else {
            player.requestPictureInPicture?.()
          }
          break
        default:
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    disposeFnsRef.current.push(() => document.removeEventListener('keydown', handleKeyDown))

    attachGestureLayer(root, player)
  }, [
    attachGestureLayer,
    clearProgress,
    file?.mimeType,
    finishAdFlow,
    handleAdsManagerAvailable,
    persistProgress,
    resolvedVastTagUrl,
    restoreProgress,
    src,
    startFallback,
  ])

  const createPlayer = useCallback(() => {
    if (playerRef.current) return playerRef.current

    const dependencies = warmedDependenciesRef.current
    const videojs = dependencies?.videojs

    if (!videojs) {
      return null
    }

    if (!mountRef.current) {
      throw new Error('Video player mount point is missing')
    }

    const root = document.createElement('div')
    root.className = 'tc-video-player__mount'

    const videoElement = document.createElement('video-js')
    videoElement.className = 'video-js vjs-big-play-centered vjs-telecloud-skin'
    videoElement.setAttribute('crossorigin', 'anonymous')
    videoElement.setAttribute('playsinline', 'true')
    videoElement.setAttribute('webkit-playsinline', 'true')
    videoElement.setAttribute('muted', 'true')

    root.appendChild(videoElement)
    mountRef.current.innerHTML = ''
    mountRef.current.appendChild(root)
    playerRootRef.current = root

    const player = videojs(videoElement, {
      autoplay: false,
      controls: true,
      responsive: true,
      fluid: false,
      fill: true,
      preload: 'auto',
      inactivityTimeout: 2200,
      playbackRates: [0.5, 1, 1.25, 1.5, 2],
      controlBar: {
        pictureInPictureToggle: true,
        playbackRateMenuButton: true,
      },
      html5: {
        vhs: { overrideNative: false },
        nativeAudioTracks: false,
        nativeVideoTracks: false,
      },
      poster,
    })

    playerRef.current = player
    attachPlayerEvents(player, root)
    prerollReadyRef.current = Boolean(
      dependencies.adStackReady &&
      typeof player.ads === 'function' &&
      typeof player.ima === 'function'
    )
    prerollInitializedRef.current = false

    if (!prerollReadyRef.current) {
      ensureContentSource(player)
    }

    logAdStatus({
      state: 'player_prepared',
      adStackReady: prerollReadyRef.current,
      vast: resolvedVastTagUrl,
    })

    return player
  }, [attachPlayerEvents, ensureContentSource, poster, resolvedVastTagUrl])

  const teardownPlayer = useCallback(() => {
    clearAllTimers()
    disposeFnsRef.current.forEach((dispose) => dispose())
    disposeFnsRef.current = []

    if (playerRef.current && !playerRef.current.isDisposed()) {
      playerRef.current.dispose()
    }

    playerRef.current = null
    adsManagerRef.current = null
    playerRootRef.current = null
    prerollReadyRef.current = false
    prerollInitializedRef.current = false
    adSettledRef.current = false
    startedContentRef.current = false
    adStartedRef.current = false
    adSkippedRef.current = false
    adDurationRef.current = 0

    if (mountRef.current) {
      mountRef.current.innerHTML = ''
    }
  }, [clearAllTimers])

  const startPlayback = useCallback(() => {
    if (playbackStateRef.current === 'fallback') {
      playContent()
      return
    }

    if (playbackStateRef.current !== 'idle') {
      const player = playerRef.current
      if (player && !isAdPluginMode(player)) {
        if (player.paused()) player.play().catch(() => {})
        else player.pause()
      }
      return
    }

    if (!isAdBootstrapReady) {
      return
    }

    const savedProgressSeconds = forcePrerollRef.current ? 0 : readPersistedProgress()
    const shouldResumeFromSavedProgress =
      Number.isFinite(savedProgressSeconds) &&
      savedProgressSeconds > RESUME_THRESHOLD_SECONDS
    forcePrerollRef.current = false

    pendingResumeTimeRef.current = shouldResumeFromSavedProgress ? savedProgressSeconds : 0
    setIsResumedPlayback(shouldResumeFromSavedProgress)
    setHasCompletedPlayback(false)
    setPlaybackState('booting')
    setAdState('loading_ad')
    logAdStatus({
      state: 'click_start_requested',
      hasResumePoint: shouldResumeFromSavedProgress,
      vast: resolvedVastTagUrl,
    })

    try {
      const player = createPlayer()
      if (!player || player !== playerRef.current) return

      prepareMutedAutoplay(player)

      if (!prerollReadyRef.current || typeof player.ima !== 'function') {
        startFallback('ad_stack_unavailable', {
          message: 'Ad stack unavailable',
        })
        return
      }

      if (!prerollInitializedRef.current) {
        try {
          initializePlayerPreroll(
            player,
            resolvedVastTagUrl,
            createPlayerSource(src, file?.mimeType)
          )
          prerollInitializedRef.current = true
          logAdStatus({
            state: 'preroll_initialized',
            vast: resolvedVastTagUrl,
          })
        } catch (error) {
          ensureContentSource(player)
          startFallback('ad_stack_initialization_failed', {
            message: error?.message || 'Failed to initialize preroll',
          })
          return
        }
      }

      if (typeof player.ima?.initializeAdDisplayContainer !== 'function') {
        startFallback('ad_stack_unavailable', {
          message: 'Ad stack unavailable after preroll initialization',
        })
        return
      }

      setPlaybackState('loading_ad')
      setAdState('loading_ad')
      adSettledRef.current = false
      adStartedRef.current = false
      adSkippedRef.current = false
      logAdStatus({
        state: 'ad_request_started',
        vast: resolvedVastTagUrl,
      })

      adTimeoutRef.current = window.setTimeout(() => {
        if (!adStartedRef.current) {
          startFallback('ad_init_timeout')
        }
      }, AD_INIT_TIMEOUT_MS)

      try {
        player.ima.initializeAdDisplayContainer()
      } catch (error) {
        startFallback('ad_display_container_failed', {
          message: error?.message || 'Failed to initialize ad display container',
        })
        return
      }

      Promise.resolve(player.play()).catch(() => {
        logAdStatus({
          state: 'play_request_rejected',
          vast: resolvedVastTagUrl,
        })
        startFallback('play_request_rejected', {
          message: 'Browser rejected the play request before ad start',
        })
      })
    } catch (error) {
      startFallback(error?.message || 'player_boot_failed', {
        message: error?.message || 'Player bootstrap failed',
      })
    }
  }, [
    createPlayer,
    ensureContentSource,
    file?.mimeType,
    isAdBootstrapReady,
    playContent,
    prepareMutedAutoplay,
    readPersistedProgress,
    resolvedVastTagUrl,
    src,
    startFallback,
  ])

  const skipCurrentAd = useCallback(() => {
    if (!canSkipAd) return

    const adsManager = adsManagerRef.current
    if (adsManager?.skip) {
      try {
        adsManager.skip()
        return
      } catch {}
    }

    const player = playerRef.current
    player?.trigger?.('adskip')
    playContent()
  }, [canSkipAd, playContent])

  const continueFromFallback = useCallback(() => {
    playContent()
  }, [playContent])

  const restartPlayback = useCallback(() => {
    clearProgress()
    pendingResumeTimeRef.current = 0
    forcePrerollRef.current = true
    playbackStateRef.current = 'idle'
    setIsResumedPlayback(false)
    setHasCompletedPlayback(false)
    setPlaybackState('idle')
    setAdState('idle')
    teardownPlayer()

    window.setTimeout(() => {
      startPlayback()
    }, 0)
  }, [clearProgress, startPlayback, teardownPlayer])

  const handleSubtitleUpload = useCallback((event) => {
    if (isPublic) return

    const fileEvent = event.target.files?.[0]
    if (!fileEvent || !playerRef.current) return

    const url = window.URL.createObjectURL(fileEvent)
    playerRef.current.addRemoteTextTrack(
      {
        kind: 'captions',
        label: fileEvent.name,
        srclang: 'en',
        src: url,
        default: true,
      },
      true
    )

    window.setTimeout(() => {
      const tracks = playerRef.current?.textTracks?.()
      if (!tracks) return

      for (let index = 0; index < tracks.length; index += 1) {
        if (tracks[index].label === fileEvent.name) {
          tracks[index].mode = 'showing'
        }
      }
    }, 80)
  }, [isPublic])

  useEffect(() => {
    return () => {
      teardownPlayer()
    }
  }, [teardownPlayer])

  useEffect(() => {
    playbackStateRef.current = 'idle'
    const hasResumePoint = readPersistedProgress() > RESUME_THRESHOLD_SECONDS
    setPlaybackState('idle')
    setAdState('idle')
    setUserActive(true)
    setCanSkipAd(false)
    setAdSkipCountdown(AD_SKIP_DELAY_SECONDS)
    setAdProgressPercent(0)
    setFallbackRemaining(FALLBACK_COUNTDOWN_SECONDS)
    setIsResumedPlayback(hasResumePoint)
    setHasCompletedPlayback(false)
    startedContentRef.current = false
    adStartedRef.current = false
    adSkippedRef.current = false
    pendingResumeTimeRef.current = 0
    forcePrerollRef.current = false
    teardownPlayer()
  }, [normalizedResumeKey, readPersistedProgress, src, teardownPlayer])

  return {
    mountRef,
    subtitleInputRef,
    phase: playbackState,
    playbackState,
    adState,
    adBootstrapState,
    isAdBootstrapReady,
    userActive,
    adSkipCountdown,
    canSkipAd,
    adProgressPercent,
    fallbackRemaining,
    fallbackBannerSrc,
    isPublic,
    isTestAdsMode,
    adsModeLabel,
    isResumedPlayback,
    hasCompletedPlayback,
    startPlayback,
    restartPlayback,
    skipCurrentAd,
    continueFromFallback,
    handleSubtitleUpload,
    poster,
    isLarge: (file?.fileSize || 0) > 200 * 1024 * 1024,
  }
}
