import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ExternalLink } from 'lucide-react'
import AdSlot from './AdBanner'
import { useAdGuard } from './AdBanner'
import UI_LAYERS from '../constants/uiLayers'

/**
 * DownloadAdGate
 * Shows a full-screen ad interstitial before a download begins.
 * Props:
 *   open       — boolean to open the gate
 *   onProceed  — callback: fires when user can download (after countdown or close)
 *   onClose    — callback: cancel download entirely
 */
const COUNTDOWN = 5 // seconds before skip appears

export default function DownloadAdGate({ open, onProceed, onClose, adTracking = null }) {
  const canShow = useAdGuard()
  const [seconds, setSeconds] = useState(COUNTDOWN)
  const [canSkip, setCanSkip] = useState(false)

  useEffect(() => {
    if (!open || !canShow) {
      // If ads disabled or user is subscribed, proceed immediately
      if (open) onProceed?.()
      return
    }
    setSeconds(COUNTDOWN)
    setCanSkip(false)

    const tick = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) {
          clearInterval(tick)
          setCanSkip(true)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(tick)
  }, [open])

  // If no ads, fire proceed immediately (handled above via early return)
  if (!canShow) return null

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="download-ad-gate"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md"
          style={{ zIndex: UI_LAYERS.interstitial }}
        >
          {/* Top bar */}
          <div className="flex w-full max-w-lg items-center justify-between px-4 py-2.5">
            <span className="text-xs font-medium text-white/60">Your download is ready</span>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>

          {/* Ad block */}
          <div className="w-full max-w-lg overflow-hidden rounded-[1.35rem] border border-white/10 bg-gray-900 shadow-2xl">
            <div className="flex items-center justify-between bg-gray-800/60 px-4 py-2">
              <span className="text-xs text-gray-400 uppercase tracking-widest">Sponsored</span>
              <span className="text-xs text-gray-500">
                {seconds > 0 ? `Skip in ${seconds}s` : 'Ad complete'}
              </span>
            </div>
            <div className="flex min-h-[240px] items-center justify-center bg-gray-950 p-3.5">
              <AdSlot
                formatId="2018497"
                style={{ width: 300, height: 100 }}
                tracking={adTracking}
              />
            </div>
          </div>

          {/* Skip / Proceed button */}
          <div className="mt-5 flex items-center gap-4">
            {canSkip ? (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={onProceed}
                className="flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-brand-700"
              >
                <ExternalLink size={15} /> Start Download
              </motion.button>
            ) : (
              <div className="cursor-not-allowed select-none rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm text-white/40">
                Please wait {seconds}s…
              </div>
            )}
          </div>

          {/* Upgrade prompt */}
          <p className="mt-4 text-xs text-gray-600">
            <a href="/pricing" className="text-brand-400 hover:underline">Upgrade to Pro</a>
            {' '}to remove ads
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
