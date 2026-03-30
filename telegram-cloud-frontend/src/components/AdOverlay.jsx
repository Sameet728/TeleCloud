import { motion, AnimatePresence } from 'framer-motion'
import { Loader, Play, SkipForward, Sparkles } from 'lucide-react'

export default function AdOverlay({
  playbackState,
  adState,
  adBootstrapState = 'ready',
  isAdBootstrapReady = true,
  title,
  poster,
  isLarge = false,
  adSkipCountdown = 10,
  canSkipAd = false,
  adProgressPercent = 0,
  isTestAdsMode = false,
  adsModeLabel = '',
  isResumedPlayback = false,
  onStartPlayback,
  onSkipAd,
}) {
  const showIdleShell = playbackState === 'idle'
  const showLoadingVeil = playbackState === 'booting' || playbackState === 'loading_ad'
  const showAdHud = playbackState === 'playing_ad' && adState === 'playing_ad'
  const isPreparingShell = showIdleShell && !isAdBootstrapReady
  const isFailedShell = adBootstrapState === 'failed'

  const handleShellActivate = () => {
    if (!showIdleShell || !isAdBootstrapReady) return
    onStartPlayback?.()
  }

  return (
    <AnimatePresence mode="wait">
      {showIdleShell ? (
        <motion.div
          key="idle-shell"
          initial={{ opacity: 0, scale: 1.02 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.01 }}
          transition={{ duration: 0.24 }}
          role="button"
          tabIndex={0}
          aria-label={`Start ${title}`}
          aria-disabled={!isAdBootstrapReady}
          onClick={handleShellActivate}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              handleShellActivate()
            }
          }}
          className="absolute inset-0 z-[110] cursor-pointer overflow-hidden"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.2),transparent_32%),radial-gradient(circle_at_85%_22%,rgba(250,204,21,0.16),transparent_18%)]" />
          {poster ? (
            <>
              <img
                src={poster}
                alt={title}
                className="absolute inset-0 h-full w-full scale-105 object-cover opacity-30 blur-[32px]"
              />
              <img
                src={poster}
                alt={title}
                className="absolute inset-0 h-full w-full object-contain opacity-70"
              />
            </>
          ) : null}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_38%,rgba(0,0,0,0.5)_75%,rgba(0,0,0,0.9)_100%)]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-black/15" />

          <div className="relative z-10 flex h-full flex-col justify-between px-5 py-5 sm:px-8 sm:py-7">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center rounded-full border border-white/10 bg-black/35 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/80 backdrop-blur-xl">
                Dedicated Player
              </div>
              {isTestAdsMode && adsModeLabel ? (
                <div className="inline-flex items-center rounded-full border border-amber-300/20 bg-amber-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-100 backdrop-blur-xl">
                  {adsModeLabel}
                </div>
              ) : null}
              {isResumedPlayback ? (
                <div className="inline-flex items-center rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-100 backdrop-blur-xl">
                  Resume Ready
                </div>
              ) : null}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: 0.06 }}
              className="mx-auto flex w-full max-w-2xl flex-col items-center text-center"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-white/60">
                {isFailedShell ? 'Player Unavailable' : isPreparingShell ? 'Preparing Player' : 'Ready to Play'}
              </p>
              <h2 className="mt-3 line-clamp-2 text-2xl font-semibold tracking-tight text-white sm:text-4xl">
                {title}
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-6 text-white/72 sm:text-base">
                {isFailedShell
                  ? 'The player bootstrap did not finish correctly yet. Reload the page if this state persists.'
                  : isPreparingShell
                    ? 'Telecloud is warming the player and ad stack so playback can start inside the same click gesture.'
                    : isResumedPlayback
                      ? 'Tap once to start a fresh pre-roll, then Telecloud resumes from your saved position.'
                      : 'Tap once to start playback. We will request a pre-roll first, then continue directly into the main video.'}
              </p>
              {isLarge ? (
                <p className="mt-3 text-xs uppercase tracking-[0.18em] text-white/45">
                  Large stream detected, initial startup can take a moment.
                </p>
              ) : null}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: 0.12 }}
              className="flex items-end justify-between gap-4"
            >
              <div className="hidden text-left text-sm text-white/55 sm:block">
                <p>Single tap toggles playback</p>
                <p>Double tap left or right seeks 10 seconds</p>
              </div>

              <button
                onClick={(event) => {
                  event.stopPropagation()
                  if (!isAdBootstrapReady) return
                  onStartPlayback?.()
                }}
                disabled={!isAdBootstrapReady}
                className="inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/14 px-5 py-3 text-sm font-semibold text-white shadow-[0_22px_60px_-30px_rgba(0,0,0,0.8)] backdrop-blur-2xl transition-all hover:scale-[1.02] hover:bg-white/18 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100 disabled:hover:bg-white/14 sm:px-6 sm:py-3.5"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-zinc-950 shadow-[0_0_35px_rgba(255,255,255,0.22)]">
                  <Play size={18} fill="currentColor" />
                </span>
                <span className="text-left">
                  <span className="block text-[10px] uppercase tracking-[0.2em] text-white/55">
                    {isPreparingShell ? 'Warmup' : isFailedShell ? 'Unavailable' : 'Start'}
                  </span>
                  <span className="block text-sm text-white">
                    {isFailedShell
                      ? 'Player unavailable'
                      : isPreparingShell
                        ? 'Preparing player...'
                        : isResumedPlayback
                          ? 'Resume with Pre-roll'
                          : 'Play with Pre-roll'}
                  </span>
                </span>
              </button>
            </motion.div>
          </div>
        </motion.div>
      ) : null}

      {showLoadingVeil ? (
        <motion.div
          key={`loading-${playbackState}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="pointer-events-none absolute inset-0 z-[112] overflow-hidden"
        >
          {poster ? (
            <img
              src={poster}
              alt={title}
              className="absolute inset-0 h-full w-full scale-105 object-cover opacity-25 blur-[30px]"
            />
          ) : null}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.06),transparent_22%),radial-gradient(circle_at_top,rgba(59,130,246,0.18),transparent_28%)]" />

          <div className="relative flex h-full flex-col items-center justify-center gap-4 px-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/10 shadow-[0_0_30px_rgba(255,255,255,0.08)] backdrop-blur-2xl">
              <Loader size={24} className="animate-spin text-white" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/50">
                Preparing Pre-roll
              </p>
              <p className="mt-2 text-lg font-semibold text-white">
                Loading Ad...
              </p>
              <p className="mt-1 text-sm text-white/60">
                The video starts automatically as soon as the ad lifecycle is ready.
              </p>
            </div>
          </div>
        </motion.div>
      ) : null}

      {showAdHud ? (
        <motion.div
          key="ad-hud"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="pointer-events-none absolute inset-0 z-[115]"
        >
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/70 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/75 to-transparent" />

          <div className="absolute left-4 top-4 sm:left-5 sm:top-5">
            <div className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-amber-300/25 bg-black/45 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-200 backdrop-blur-xl">
              <Sparkles size={13} />
              Ad • 1 of 1
            </div>
          </div>

          <div className="absolute right-4 top-4 sm:right-5 sm:top-5">
            <div className="pointer-events-auto inline-flex items-center rounded-full border border-white/10 bg-black/45 px-3.5 py-2 text-xs font-semibold text-white backdrop-blur-xl">
              {canSkipAd ? 'Skip Ad' : `Skip in ${adSkipCountdown}s`}
            </div>
          </div>

          <motion.button
            onClick={onSkipAd}
            disabled={!canSkipAd}
            initial={{ opacity: 0, y: 20 }}
            animate={{
              opacity: canSkipAd ? 1 : 0.65,
              y: canSkipAd ? 0 : 16,
            }}
            transition={{ duration: 0.2 }}
            className="pointer-events-auto absolute bottom-5 right-4 inline-flex min-h-12 items-center gap-2 rounded-full border border-white/12 bg-black/55 px-4 py-3 text-sm font-semibold text-white shadow-[0_20px_50px_-30px_rgba(0,0,0,0.95)] backdrop-blur-2xl transition-all disabled:cursor-not-allowed disabled:opacity-70 sm:bottom-6 sm:right-6 sm:px-5"
          >
            <SkipForward size={16} />
            {canSkipAd ? 'Skip Ad >>' : `Skip in ${adSkipCountdown}s`}
          </motion.button>

          <div className="absolute inset-x-0 bottom-0 px-4 pb-0 sm:px-6">
            <div className="h-1.5 w-full overflow-hidden rounded-t-full bg-white/10">
              <motion.div
                className="h-full rounded-t-full bg-[linear-gradient(90deg,#facc15,#f59e0b)] shadow-[0_0_22px_rgba(250,204,21,0.55)]"
                animate={{ width: `${Math.max(0, Math.min(100, adProgressPercent))}%` }}
                transition={{ ease: 'linear', duration: 0.18 }}
              />
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
