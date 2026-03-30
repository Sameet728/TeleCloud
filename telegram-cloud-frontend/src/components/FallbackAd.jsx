import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, ShieldAlert } from 'lucide-react'
import { FALLBACK_BANNER_SRC } from '../config/ads'

export default function FallbackAd({
  open,
  bannerSrc = FALLBACK_BANNER_SRC,
  secondsRemaining = 3,
  onContinue,
}) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[130] flex items-center justify-center bg-black/82 p-4 backdrop-blur-2xl"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(250,204,21,0.09),transparent_22%),radial-gradient(circle_at_78%_20%,rgba(59,130,246,0.1),transparent_20%)]" />

          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.99 }}
            transition={{ type: 'spring', stiffness: 230, damping: 24 }}
            className="relative w-full max-w-4xl overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950/88 shadow-[0_40px_120px_-60px_rgba(0,0,0,0.95)]"
          >
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/6 to-transparent" />

            <div className="relative grid gap-5 p-5 sm:p-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
              <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                <iframe
                  src={bannerSrc}
                  title="Fallback advertisement"
                  className="h-[176px] w-full rounded-[1rem] bg-white"
                  frameBorder="0"
                  scrolling="no"
                  sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation"
                />
              </div>

              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/25 bg-amber-400/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-amber-100">
                  <ShieldAlert size={13} />
                  Ad Fallback
                </div>

                <div>
                  <h3 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                    Loading your video next
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-zinc-300 sm:text-[15px]">
                    The pre-roll could not start in time, so Telecloud switched to the guaranteed fallback placement. Playback resumes automatically when the short countdown ends.
                  </p>
                </div>

                <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400">
                    Continue In
                  </p>
                  <div className="mt-3 flex items-end gap-3">
                    <span className="text-5xl font-semibold leading-none tracking-tight text-white">
                      {secondsRemaining}
                    </span>
                    <span className="pb-1 text-sm text-zinc-400">
                      seconds
                    </span>
                  </div>
                </div>

                <button
                  onClick={onContinue}
                  disabled={secondsRemaining > 0}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white px-4 py-3 text-sm font-semibold text-zinc-950 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {secondsRemaining > 0 ? `Continue in ${secondsRemaining}s` : 'Continue to Video'}
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
