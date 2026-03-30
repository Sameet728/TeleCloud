import 'video.js/dist/video-js.css'
import 'videojs-contrib-ads/dist/videojs.ads.css'
import 'videojs-ima/dist/videojs.ima.css'
import './VideoPlayer.css'

import { RotateCcw, Upload } from 'lucide-react'
import AdOverlay from './AdOverlay'
import FallbackAd from './FallbackAd'
import useVideoPlayer from '../hooks/useVideoPlayer'

export default function VideoPlayer({
  src,
  file,
  dark,
  onNext,
  poster = '',
  vastTagUrl,
  fallbackBannerSrc,
  resumeKey,
  isPublic = false,
  onAdStart,
  onAdComplete,
  onAdSkipped,
  onAdError,
  onVideoStart,
  onVideoComplete,
}) {
  const {
    mountRef,
    subtitleInputRef,
    playbackState,
    adState,
    adBootstrapState,
    isAdBootstrapReady,
    userActive,
    adSkipCountdown,
    canSkipAd,
    adProgressPercent,
    fallbackRemaining,
    isTestAdsMode,
    adsModeLabel,
    isResumedPlayback,
    hasCompletedPlayback,
    isLarge,
    startPlayback,
    restartPlayback,
    skipCurrentAd,
    continueFromFallback,
    handleSubtitleUpload,
  } = useVideoPlayer({
    src,
    file,
    poster,
    vastTagUrl,
    fallbackBannerSrc,
    resumeKey,
    isPublic,
    onAdStart,
    onAdComplete,
    onAdSkipped,
    onAdError,
    onVideoStart,
    onVideoComplete,
    onNext,
  })

  const showContentChrome =
    (playbackState === 'content_playing' || playbackState === 'content_loading') &&
    (userActive || hasCompletedPlayback)
  const showReplayAction =
    playbackState === 'content_playing' ||
    playbackState === 'content_loading' ||
    hasCompletedPlayback

  const title = file?.fileName || 'Video playback'

  return (
    <div
      className={`tc-video-player group relative flex h-full w-full items-center justify-center overflow-hidden ${
        dark ? 'bg-black text-white' : 'bg-zinc-950 text-white'
      }`}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div className="tc-video-player__cinematic-vignette" />
      <div className="tc-video-player__cinematic-glow" />
      <div ref={mountRef} data-vjs-player className="tc-video-player__surface h-full w-full" />

      {showContentChrome ? (
        <>
          <input
            ref={subtitleInputRef}
            type="file"
            accept=".vtt,.srt"
            className="hidden"
            onChange={handleSubtitleUpload}
          />

          <div className="pointer-events-none absolute right-4 top-4 z-[120] flex items-center gap-2 transition-all duration-300 sm:right-6 sm:top-6">
            {showReplayAction ? (
              <button
                type="button"
                onClick={restartPlayback}
                className="pointer-events-auto inline-flex items-center gap-2 rounded-xl border border-white/10 bg-black/45 px-3 py-2 text-xs font-semibold text-white/90 backdrop-blur-lg transition-all hover:bg-white/20"
              >
                <RotateCcw size={14} />
                Replay With Ad
              </button>
            ) : null}

            {!isPublic ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    window.alert(
                      "To enable Chrome's built-in Auto Captions:\n\n1. Open Chrome Settings\n2. Search for 'Live Caption'\n3. Toggle it on\n\nChrome will then generate live captions for TeleCloud videos."
                    )
                  }}
                  className="pointer-events-auto rounded-xl border border-white/15 bg-sky-500/85 px-3 py-2 text-xs font-bold text-white shadow-[0_0_15px_rgba(59,130,246,0.32)] backdrop-blur-lg transition-all hover:bg-sky-500"
                >
                  Auto CC
                </button>

                <button
                  type="button"
                  onClick={() => subtitleInputRef.current?.click()}
                  className="pointer-events-auto inline-flex items-center gap-2 rounded-xl border border-white/10 bg-black/45 px-3 py-2 text-xs font-semibold text-white/90 backdrop-blur-lg transition-all hover:bg-white/20"
                >
                  <Upload size={14} />
                  Load VTT
                </button>
              </>
            ) : null}
          </div>
        </>
      ) : null}

      {playbackState === 'content_loading' ? (
        <div className="pointer-events-none absolute inset-0 z-[105] flex items-end justify-center pb-8">
          <div className="flex items-center gap-3 rounded-full border border-white/10 bg-black/60 px-4 py-2 text-sm text-white backdrop-blur-xl">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
            Loading video stream
          </div>
        </div>
      ) : null}

      <AdOverlay
        playbackState={playbackState}
        adState={adState}
        adBootstrapState={adBootstrapState}
        isAdBootstrapReady={isAdBootstrapReady}
        title={title}
        poster={poster}
        isLarge={isLarge}
        adSkipCountdown={adSkipCountdown}
        canSkipAd={canSkipAd}
        adProgressPercent={adProgressPercent}
        isTestAdsMode={isTestAdsMode}
        adsModeLabel={adsModeLabel}
        isResumedPlayback={isResumedPlayback}
        onStartPlayback={startPlayback}
        onSkipAd={skipCurrentAd}
      />

      <FallbackAd
        open={playbackState === 'fallback'}
        bannerSrc={fallbackBannerSrc}
        secondsRemaining={fallbackRemaining}
        onContinue={continueFromFallback}
      />
    </div>
  )
}
