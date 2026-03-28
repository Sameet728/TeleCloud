import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useSubscription } from '../store/useSubscription'
import useStore from '../store/useStore'

/**
 * useAdGuard — returns true if banner ads should be rendered.
 */
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

/**
 * AdSlot — renders a MyBid banner ad using an isolated iframe.
 *
 * WHY IFRAME:
 * MyBid's scripts.js is designed for static HTML pages, not React SPAs.
 * It scans for mount target divs at init time and auto-loads ALL enabled
 * formats (In-page, Popunder, etc). In a React SPA:
 * - Mount divs don't exist when the script runs
 * - Re-running init() creates duplicate floating ads
 * - Multiple divs with same id cause only the first to receive the ad
 *
 * SOLUTION:
 * Each AdSlot loads /ad.html?f=FORMAT_ID in an iframe.
 * ad.html is a tiny static page that:
 * 1. Creates <div id="FORMAT_ID"> (the mount target)
 * 2. Loads the MyBid script AFTER the div exists
 * 3. MyBid finds the div and injects the banner
 *
 * Each iframe is fully isolated — its own DOM, its own MyBid instance,
 * no conflicts with the parent page, and no duplicate format loading.
 *
 * formatId:
 *   2018497 – Banner 300x100
 *   2018498 – Banner 300x250
 */
export default function AdSlot({ formatId, style = {}, className = '', refreshMs = 0 }) {
  const [refreshKey, setRefreshKey] = useState(0)
  const iframeHeight = style.height ?? 100

  useEffect(() => {
    if (!refreshMs) return undefined

    const intervalId = window.setInterval(() => {
      setRefreshKey((value) => value + 1)
    }, refreshMs)

    return () => window.clearInterval(intervalId)
  }, [formatId, refreshMs])

  return (
    <div
      className={`ad-slot-container ${className}`}
      style={{
        display: 'block',
        textAlign: 'center',
        overflow: 'hidden',
        minHeight: 50,
        ...style,
      }}
    >
      <iframe
        key={`${formatId}-${refreshKey}`}
        src={`/ad.html?f=${formatId}&r=${refreshKey}`}
        loading="lazy"
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
        sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      />
    </div>
  )
}
