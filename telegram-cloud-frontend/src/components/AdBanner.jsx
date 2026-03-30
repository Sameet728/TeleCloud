import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { monetizationAPI } from '../services/api'
import { useSubscription } from '../store/useSubscription'
import useStore from '../store/useStore'

export function useAdGuard() {
  const { isSubscribed } = useSubscription()
  const { uploads } = useStore()
  const location = useLocation()

  if (!import.meta.env.VITE_ENABLE_ADS) return false
  if (isSubscribed) return false
  if (Object.keys(uploads).length > 0) return false
  if (location.pathname.includes('/pricing')) return false
  return true
}

export default function AdSlot({
  formatId,
  style = {},
  className = '',
  refreshMs = 0,
  tracking = null,
}) {
  const [refreshKey, setRefreshKey] = useState(0)
  const [iframeLoaded, setIframeLoaded] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [impressionTracked, setImpressionTracked] = useState(false)
  const [clickTracked, setClickTracked] = useState(false)
  const containerRef = useRef(null)
  const blurArmRef = useRef(0)
  const iframeHeight = style.height ?? 100
  const slotId = tracking?.slotId || `${formatId}-${refreshKey}`

  useEffect(() => {
    if (!refreshMs) return undefined

    const intervalId = window.setInterval(() => {
      setRefreshKey((value) => value + 1)
    }, refreshMs)

    return () => window.clearInterval(intervalId)
  }, [formatId, refreshMs])

  useEffect(() => {
    setIframeLoaded(false)
    setIsVisible(false)
    setImpressionTracked(false)
    setClickTracked(false)
    blurArmRef.current = 0
  }, [tracking?.viewerContextToken, refreshKey])

  useEffect(() => {
    if (!tracking?.viewerContextToken || !containerRef.current) return undefined

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        setIsVisible(Boolean(entry?.isIntersecting && entry.intersectionRatio >= 0.5))
      },
      { threshold: [0.5] }
    )

    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [tracking?.viewerContextToken, refreshKey])

  useEffect(() => {
    if (!tracking?.viewerContextToken || !iframeLoaded || !isVisible || impressionTracked) {
      return undefined
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        await monetizationAPI.trackImpression({
          viewerContextToken: tracking.viewerContextToken,
          slotId,
          source: tracking.source || 'public_share_ad',
        })
        setImpressionTracked(true)
      } catch {}
    }, 800)

    return () => window.clearTimeout(timeoutId)
  }, [iframeLoaded, impressionTracked, isVisible, slotId, tracking])

  useEffect(() => {
    if (!tracking?.viewerContextToken || clickTracked) return undefined

    const handleBlur = () => {
      if (!blurArmRef.current || clickTracked) return
      if (Date.now() - blurArmRef.current > 1500) return

      blurArmRef.current = 0
      monetizationAPI.trackClick({
        viewerContextToken: tracking.viewerContextToken,
        slotId,
        source: tracking.source || 'public_share_ad_click',
      }).then(() => {
        setClickTracked(true)
      }).catch(() => {})
    }

    const handleFocus = () => {
      blurArmRef.current = 0
    }

    window.addEventListener('blur', handleBlur)
    window.addEventListener('focus', handleFocus)
    return () => {
      window.removeEventListener('blur', handleBlur)
      window.removeEventListener('focus', handleFocus)
    }
  }, [clickTracked, slotId, tracking])

  return (
    <div
      ref={containerRef}
      className={`ad-slot-container ${className}`}
      style={{
        display: 'block',
        textAlign: 'center',
        overflow: 'hidden',
        minHeight: 50,
        ...style,
      }}
      onPointerDown={() => {
        if (!tracking?.viewerContextToken || clickTracked) return
        blurArmRef.current = Date.now()
      }}
    >
      <iframe
        key={`${formatId}-${refreshKey}`}
        src={`/ad.html?f=${formatId}&r=${refreshKey}`}
        loading="lazy"
        onLoad={() => setIframeLoaded(true)}
        style={{
          border: 'none',
          width: '100%',
          height: iframeHeight,
          overflow: 'hidden',
          display: 'block',
        }}
        scrolling="no"
        frameBorder="0"
        title="Advertisement"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation"
      />
    </div>
  )
}
