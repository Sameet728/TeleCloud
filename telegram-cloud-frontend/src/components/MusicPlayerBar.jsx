import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, Reorder } from 'framer-motion'
import { useLocation } from 'react-router-dom'
import {
  ChevronDown,
  GripVertical,
  Heart,
  ListMusic,
  Loader2,
  Pause,
  Play,
  Repeat,
  Shuffle,
  SkipBack,
  SkipForward,
  Trash2,
  Volume2,
  VolumeX,
  Volume1,
  X,
  Maximize2,
  Share2,
  MoreHorizontal,
  Mic2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import useStore from '../store/useStore'
import { musicAPI } from '../services/api'
import { useTheme } from '../context/ThemeContext'
import { Artwork } from './music/MusicCards'
import UI_LAYERS from '../constants/uiLayers'
import {
  formatTime,
  getActiveLyricIndex,
  getArtworkGradient,
  getTrackMetaLine,
  parseLyrics,
} from '../utils/music'

export default function MusicPlayerBar() {
  const audioRef = useRef(null)
  const preloadRef = useRef(null)
  const pendingAutoplayRef = useRef(false)
  const progressRef = useRef(0)
  const durationRef = useRef(0)
  const touchStartY = useRef(null)
  const lyricLineRefs = useRef(new Map())
  const location = useLocation()
  const volumeSliderRef = useRef(null)
  const playerContainerRef = useRef(null)

  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [lyrics, setLyrics] = useState('')
  const [lyricsLoading, setLyricsLoading] = useState(false)
  const [lyricsOpen, setLyricsOpen] = useState(false)
  const [floatingDockOpen, setFloatingDockOpen] = useState(false)
  const [draggingQueueId, setDraggingQueueId] = useState('')
  const [isHovering, setIsHovering] = useState(false)
  const [showVolumeSlider, setShowVolumeSlider] = useState(false)
  const { dark } = useTheme()

  // Store state
  const queue = useStore((state) => state.musicQueue)
  const currentIndex = useStore((state) => state.currentTrackIndex)
  const current = useMemo(() => queue[currentIndex] || null, [queue, currentIndex])
  const isPlaying = useStore((state) => state.isMusicPlaying)
  const loading = useStore((state) => state.musicLoading)
  const error = useStore((state) => state.musicError)
  const volume = useStore((state) => state.musicVolume)
  const muted = useStore((state) => state.musicMuted)
  const playbackRate = useStore((state) => state.playbackRate)
  const shuffleMode = useStore((state) => state.shuffleMode)
  const repeatMode = useStore((state) => state.repeatMode)
  const playerExpanded = useStore((state) => state.playerExpanded)
  const queuePanelOpen = useStore((state) => state.queuePanelOpen)
  const recommendations = useStore((state) => state.activeRecommendations)
  const likedSongs = useStore((state) => state.likedSongs)

  // Store actions
  const setPlaying = useStore((state) => state.setMusicPlaying)
  const setLoading = useStore((state) => state.setMusicLoading)
  const setError = useStore((state) => state.setMusicError)
  const setVolume = useStore((state) => state.setMusicVolume)
  const setMuted = useStore((state) => state.setMusicMuted)
  const setPlaybackRate = useStore((state) => state.setPlaybackRate)
  const setShuffleMode = useStore((state) => state.setShuffleMode)
  const setRepeatMode = useStore((state) => state.setRepeatMode)
  const setPlayerExpanded = useStore((state) => state.setPlayerExpanded)
  const setQueuePanelOpen = useStore((state) => state.setQueuePanelOpen)
  const removeFromQueueAt = useStore((state) => state.removeFromQueueAt)
  const reorderQueue = useStore((state) => state.reorderQueue)
  const clearQueue = useStore((state) => state.clearQueue)
  const nextTrack = useStore((state) => state.playNextTrack)
  const prevTrack = useStore((state) => state.playPrevTrack)
  const playTrackAt = useStore((state) => state.playTrackAt)
  const pushRecentlyPlayed = useStore((state) => state.pushRecentlyPlayed)
  const setLikedSongsLocal = useStore((state) => state.setLikedSongsLocal)
  const upsertPlaylistLocal = useStore((state) => state.upsertPlaylistLocal)

  // Parse lyrics
  const parsedLyrics = useMemo(() => parseLyrics(lyrics), [lyrics])
  const liveLyrics = useMemo(() => {
    if (!parsedLyrics.lines.length) return []
    if (parsedLyrics.hasSync) return parsedLyrics.lines

    const textLines = parsedLyrics.lines.filter((line) => line.text)
    if (!textLines.length || !duration) return parsedLyrics.lines

    const segment = duration / Math.max(textLines.length + 1, 1)
    return textLines.map((line, index) => ({
      ...line,
      time: Math.max(segment * index, 0),
    }))
  }, [duration, parsedLyrics.hasSync, parsedLyrics.lines])

  const activeLyricIndex = useMemo(
    () => getActiveLyricIndex(liveLyrics, progress),
    [liveLyrics, progress]
  )

  // Route detection
  const isMusicRoute = location.pathname.startsWith('/music')
  const showFloatingPlayer = !isMusicRoute && !playerExpanded && Boolean(current?.videoId)
  const showMiniPlayerBar = isMusicRoute && !playerExpanded && Boolean(current?.videoId)
  const floatingPlayerOpen =
    showFloatingPlayer && (floatingDockOpen || isHovering || queuePanelOpen || lyricsOpen)
  const isLiked = likedSongs.some((track) => track.videoId === current?.videoId)

  // Background styles
  const backdropStyle = current?.thumbnail
    ? {
        backgroundImage: `url(${current.thumbnail})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : getArtworkGradient(current?.videoId || current?.title)

  const accentStyle = getArtworkGradient(current?.videoId || current?.title)

  // Theme classes
  const themeClasses = {
    bg: dark ? 'bg-gray-900' : 'bg-white',
    bgSecondary: dark ? 'bg-gray-800' : 'bg-gray-100',
    bgTertiary: dark ? 'bg-gray-700' : 'bg-gray-50',
    text: dark ? 'text-white' : 'text-gray-900',
    textSecondary: dark ? 'text-gray-400' : 'text-gray-500',
    textMuted: dark ? 'text-gray-500' : 'text-gray-400',
    border: dark ? 'border-white/10' : 'border-gray-200',
    hover: dark ? 'hover:bg-white/10' : 'hover:bg-gray-200',
    accent: 'text-emerald-500',
    accentBg: 'bg-emerald-500',
    accentGradient: 'from-emerald-500 to-emerald-600',
  }

  // ============= EFFECTS =============

  // Auto-scroll lyrics
  useEffect(() => {
    if (activeLyricIndex < 0 || !lyricsOpen) return
    const node = lyricLineRefs.current.get(activeLyricIndex)
    if (node) {
      node.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
  }, [activeLyricIndex, lyricsOpen])

  // Clean up lyric refs when lyrics change
  useEffect(() => {
    return () => {
      lyricLineRefs.current.clear()
    }
  }, [lyrics])

  // Close floating dock on music route
  useEffect(() => {
    if (isMusicRoute) {
      setFloatingDockOpen(false)
      setIsHovering(false)
    }
  }, [isMusicRoute])

  // Reset panels when no track
  useEffect(() => {
    if (!current?.videoId) {
      setLyricsOpen(false)
      setFloatingDockOpen(false)
      setQueuePanelOpen(false)
      setPlayerExpanded(false)
      setIsHovering(false)
    }
  }, [current?.videoId, setPlayerExpanded, setQueuePanelOpen])

  // Body scroll lock when player expanded
  useEffect(() => {
    if (playerExpanded) {
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.width = '100%'
      document.body.style.top = `-${window.scrollY}px`
    } else {
      const scrollY = document.body.style.top
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
      document.body.style.top = ''
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY.replace('-', ''), 10))
      }
    }
    return () => {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
      document.body.style.top = ''
    }
  }, [playerExpanded])

  // Volume control
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.volume = muted ? 0 : volume
  }, [muted, volume])

  // Playback rate
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.playbackRate = playbackRate
  }, [playbackRate])

  // Play/Pause
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      audio.play()
        .then(() => setError(''))
        .catch(() => {
          setPlaying(false)
          setError('Playback was blocked. Tap play to try again.')
        })
    } else {
      audio.pause()
    }
  }, [isPlaying, setError, setPlaying])

  // Load track
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !current?.videoId) return undefined

    let cancelled = false
    const trackForCleanup = current

    setLoading(true)
    setError('')
    setProgress(0)
    setDuration(0)
    progressRef.current = 0
    durationRef.current = 0
    setLyrics('')
    setLyricsLoading(true)

    const loadTrack = async () => {
      try {
        audio.pause()
        pendingAutoplayRef.current = true
        
        const streamUrl = musicAPI.streamUrl(current.videoId)
        
        audio.src = streamUrl
        audio.preload = 'auto'
        audio.load()
        audio.volume = muted ? 0 : volume
        audio.playbackRate = playbackRate

        try {
          await audio.play()
        } catch (playError) {
          const playMessage = String(playError?.message || '').toLowerCase()
          const playName = String(playError?.name || '')
          const isDeferredPlayError =
            playName === 'AbortError' ||
            playName === 'NotAllowedError' ||
            playMessage.includes('interrupted') ||
            playMessage.includes('notallowed') ||
            playMessage.includes('user didn')

          if (!isDeferredPlayError) {
            throw playError
          }
        }

        if (cancelled) return
        pendingAutoplayRef.current = false

        setError('')
        setLoading(false)
        
        pushRecentlyPlayed(current)
        setPlaying(true)
        musicAPI.addHistory(current).catch(() => null)
        musicAPI.trackAnalytics({ videoId: current.videoId, eventType: 'play' }).catch(() => null)

        musicAPI.lyrics(current.videoId)
          .then((response) => {
            if (!cancelled) {
              setLyrics(response?.data?.data?.lyrics || '')
            }
          })
          .catch(() => {
            if (!cancelled) setLyrics('')
          })
          .finally(() => {
            if (!cancelled) setLyricsLoading(false)
          })
      } catch (loadError) {
        console.error('Cached stream failed:', loadError.message)

        if (!cancelled) {
          pendingAutoplayRef.current = false
          audio.pause()
          audio.removeAttribute('src')

          let nextErrorMessage = 'Failed to stream this song. Retry.'
          try {
            const statusResponse = await musicAPI.getSongStatus(current.videoId)
            const statusData = statusResponse?.data?.data
            if (statusData?.statusMessage) {
              nextErrorMessage = statusData.statusMessage
            }
          } catch (_statusError) {}

          setPlaying(false)
          setLoading(false)
          setError(nextErrorMessage)
          setLyricsLoading(false)
        }
        return
      }
    }

    loadTrack()

    return () => {
      cancelled = true
      pendingAutoplayRef.current = false
      const watched = Math.floor(progressRef.current || 0)
      const totalDuration = durationRef.current || 0

      if (trackForCleanup?.videoId && watched > 0) {
        musicAPI
          .trackAnalytics({
            videoId: trackForCleanup.videoId,
            eventType: 'progress',
            watchSeconds: watched,
          })
          .catch(() => null)

        if (watched > 8 && totalDuration > 0 && watched / totalDuration < 0.8) {
          musicAPI
            .trackAnalytics({
              videoId: trackForCleanup.videoId,
              eventType: 'skip',
            })
            .catch(() => null)
        }
      }
    }
  }, [current?.videoId, pushRecentlyPlayed, setError, setLoading, setPlaying, muted, volume])

  // Preload next track
  useEffect(() => {
    const nextCandidate =
      queue[currentIndex + 1] ||
      recommendations.upNext?.[0] ||
      recommendations.related?.[0] ||
      recommendations.quickPicks?.[0] ||
      null

    if (!nextCandidate?.videoId || nextCandidate.videoId === current?.videoId) return undefined

    let cancelled = false

    const preloadNextTrack = async () => {
      try {
        const statusResponse = await musicAPI.getSongStatus(nextCandidate.videoId)
        const statusData = statusResponse?.data?.data

        if (cancelled || !statusData?.exists || statusData?.status !== 'ready') {
          return
        }

        const nextAudio = new Audio()
        nextAudio.preload = 'auto'
        nextAudio.src = musicAPI.streamUrl(nextCandidate.videoId)
        nextAudio.load()
        preloadRef.current = nextAudio
      } catch (_error) {}
    }

    preloadNextTrack()

    return () => {
      cancelled = true
      if (preloadRef.current) {
        preloadRef.current.src = ''
        preloadRef.current = null
      }
    }
  }, [
    current?.videoId,
    currentIndex,
    queue,
    recommendations.quickPicks,
    recommendations.related,
    recommendations.upNext,
  ])

  // ============= HANDLERS =============

  const retryCurrent = useCallback(() => {
    if (!current?.videoId) return
    const audio = audioRef.current
    if (!audio) return

    setLoading(true)
    setError('')
    audio.src = musicAPI.streamUrl(current.videoId)
    audio.load()
    audio.play().catch(() => {
      setLoading(false)
      setError('Retry failed. Please try another track.')
    })
  }, [current?.videoId, setLoading, setError])

  const toggleLike = async () => {
    if (!current?.videoId) return

    try {
      const { data } = await musicAPI.toggleLike(current)
      setLikedSongsLocal(data?.data?.items || [])
      if (data?.data?.playlist) {
        upsertPlaylistLocal(data.data.playlist)
      }
      toast.success(isLiked ? 'Removed from Liked Songs' : 'Added to Liked Songs')
    } catch (toggleError) {
      toast.error(toggleError?.response?.data?.message || 'Could not update liked songs.')
    }
  }

  const toggleShuffle = () => {
    setShuffleMode(!shuffleMode)
    toast.success(shuffleMode ? 'Shuffle Off' : 'Shuffle On')
  }

  const toggleRepeat = () => {
    if (repeatMode === 'off') {
      setRepeatMode('all')
      toast.success('Repeat All')
    } else if (repeatMode === 'all') {
      setRepeatMode('one')
      toast.success('Repeat One')
    } else {
      setRepeatMode('off')
      toast.success('Repeat Off')
    }
  }

  const collapseFloatingDock = () => {
    setFloatingDockOpen(false)
    setIsHovering(false)
  }

  const openLyricsPanel = () => {
    setQueuePanelOpen(false)
    setLyricsOpen(true)
    if (showFloatingPlayer) setFloatingDockOpen(true)
  }

  const toggleQueuePanel = () => {
    setLyricsOpen(false)
    setQueuePanelOpen(!queuePanelOpen)
    if (showFloatingPlayer && !queuePanelOpen) setFloatingDockOpen(true)
  }

  const openFullscreenPlayer = () => {
    setLyricsOpen(false)
    setQueuePanelOpen(false)
    collapseFloatingDock()
    setPlayerExpanded(true)
  }

  const closeFullscreenPlayer = () => {
    setPlayerExpanded(false)
  }

  const seekTo = (value) => {
    const nextValue = Number(value)
    if (audioRef.current) audioRef.current.currentTime = nextValue
    setProgress(nextValue)
    progressRef.current = nextValue
  }

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value)
    setVolume(newVolume)
    if (newVolume > 0 && muted) {
      setMuted(false)
    }
  }

  const toggleMute = () => {
    setMuted(!muted)
  }

  const getVolumeIcon = () => {
    if (muted || volume === 0) return VolumeX
    if (volume < 0.5) return Volume1
    return Volume2
  }

  const handleKeyDown = (event) => {
    if (event.code === 'Space') {
      event.preventDefault()
      setPlaying(!isPlaying)
    } else if (event.code === 'ArrowRight' && audioRef.current) {
      audioRef.current.currentTime = Math.min(audioRef.current.currentTime + 10, duration || 0)
    } else if (event.code === 'ArrowLeft' && audioRef.current) {
      audioRef.current.currentTime = Math.max(audioRef.current.currentTime - 10, 0)
    } else if (event.code === 'ArrowUp') {
      event.preventDefault()
      setVolume(Math.min(volume + 0.1, 1))
    } else if (event.code === 'ArrowDown') {
      event.preventDefault()
      setVolume(Math.max(volume - 0.1, 0))
    }
  }

  if (!current) return null

  const VolumeIcon = getVolumeIcon()
  const portalRoot = typeof document !== 'undefined' ? document.body : null

  // ============= COMPONENTS =============

  const IconButton = ({ onClick, icon: Icon, active = false, size = 18, className = '', disabled = false }) => (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: disabled ? 1 : 1.08 }}
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      className={`
        relative h-9 w-9 rounded-full flex items-center justify-center
        transition-all duration-200
        ${active ? themeClasses.accent : themeClasses.textSecondary}
        ${active ? (dark ? 'bg-emerald-500/20' : 'bg-emerald-500/10') : ''}
        ${!disabled ? themeClasses.hover : 'opacity-50 cursor-not-allowed'}
        ${className}
      `}
    >
      <Icon size={size} className={active ? 'fill-current' : ''} />
      {active && (
        <motion.span
          className={`absolute inset-0 rounded-full ${themeClasses.accentBg} opacity-20`}
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
    </motion.button>
  )

  const PrimaryButton = ({ onClick, icon: Icon, loading = false, playing = false }) => (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.95 }}
      className={`
        h-12 w-12 md:h-14 md:w-14 rounded-full
        bg-gradient-to-br ${themeClasses.accentGradient}
        text-white flex items-center justify-center
        shadow-lg shadow-emerald-500/30
        hover:shadow-xl hover:shadow-emerald-500/40
        transition-all duration-200
      `}
    >
      {loading ? (
        <Loader2 size={22} className="animate-spin" />
      ) : playing ? (
        <Pause size={22} fill="currentColor" />
      ) : (
        <Play size={22} fill="currentColor" className="ml-1" />
      )}
    </motion.button>
  )

  // ============= RENDER =============

  return (
    <>
      {/* Audio Element */}
      <audio
        ref={audioRef}
        onLoadedMetadata={(event) => {
          const nextDuration = event.currentTarget.duration || 0
          durationRef.current = nextDuration
          setDuration(nextDuration)
          if (!current?.duration && nextDuration > 0) {
            musicAPI
              .addHistory({ ...current, duration: formatTime(nextDuration) })
              .catch(() => null)
          }
        }}
        onTimeUpdate={(event) => {
          const nextProgress = event.currentTarget.currentTime || 0
          progressRef.current = nextProgress
          durationRef.current = event.currentTarget.duration || durationRef.current
          setProgress(nextProgress)
        }}
        onEnded={() => {
          if (repeatMode === 'one' && audioRef.current) {
            audioRef.current.currentTime = 0
            audioRef.current.play().catch(() => null)
            return
          }
          nextTrack()
        }}
        onWaiting={() => setLoading(true)}
        onCanPlay={() => {
          const audio = audioRef.current
          if (!audio || !pendingAutoplayRef.current || !isPlaying) return
          audio.play().then(() => {
            pendingAutoplayRef.current = false
            setError('')
          }).catch(() => null)
        }}
        onPlaying={() => {
          pendingAutoplayRef.current = false
          setLoading(false)
          setPlaying(true)
        }}
        onPause={() => {
          if (!audioRef.current?.ended) setPlaying(false)
        }}
        onError={() => {
          setLoading(false)
          setPlaying(false)
          setError('Audio stream error. Try again.')
        }}
      />

      {/* ==================== FLOATING PLAYER ==================== */}
      <AnimatePresence initial={false} mode="wait">
        {showFloatingPlayer ? (
          <motion.div
            key="floating-player"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="fixed right-4 bottom-[5rem] md:right-5 md:bottom-4"
            style={{ zIndex: UI_LAYERS.floatingElevated + 12 }}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => {
              setIsHovering(false)
              if (!queuePanelOpen && !lyricsOpen) {
                setFloatingDockOpen(false)
              }
            }}
            onFocus={() => setFloatingDockOpen(true)}
            onBlur={(event) => {
              if (
                !event.currentTarget.contains(event.relatedTarget) &&
                !queuePanelOpen &&
                !lyricsOpen
              ) {
                collapseFloatingDock()
              }
            }}
            tabIndex={0}
            onKeyDown={handleKeyDown}
          >
            <motion.div
              initial={false}
              animate={{
                width: floatingPlayerOpen ? 'min(352px, calc(100vw - 1rem))' : 52,
                height: floatingPlayerOpen ? 140 : 52,
                borderRadius: floatingPlayerOpen ? 18 : 999,
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`
                relative overflow-hidden border shadow-2xl backdrop-blur-xl
                ${dark ? 'border-white/10 bg-gray-900/95' : 'border-gray-200 bg-white/95'}
              `}
            >
              {/* Background */}
              <div className="absolute inset-0 opacity-30" style={backdropStyle} />
              <div className={`absolute inset-0 ${dark ? 'bg-gradient-to-t from-gray-900 via-gray-900/80' : 'bg-gradient-to-t from-white via-white/80'} to-transparent`} />

              <AnimatePresence initial={false} mode="wait">
                {floatingPlayerOpen ? (
                  <motion.div
                    key="floating-expanded"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="relative flex h-full flex-col gap-1.5 p-2.5 sm:p-3"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <motion.button
                        type="button"
                        onClick={openFullscreenPlayer}
                        className="shrink-0"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Artwork
                          src={current.thumbnail}
                          alt={current.title}
                          seed={current.videoId || current.title}
                          className="h-10 w-10 rounded-[0.85rem] object-cover shadow-lg"
                        />
                      </motion.button>
                      <div className="min-w-0 flex-1">
                        <motion.button
                          type="button"
                          onClick={openFullscreenPlayer}
                          className="text-left w-full"
                        >
                          <p className={`text-[12px] font-semibold truncate ${themeClasses.text}`}>
                            {current.title}
                          </p>
                          <p className={`mt-0.5 truncate text-[10px] ${themeClasses.textSecondary}`}>
                            {getTrackMetaLine(current) || current.artist}
                          </p>
                        </motion.button>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <motion.button
                          type="button"
                          onClick={toggleLike}
                          whileHover={{ scale: 1.08 }}
                          whileTap={{ scale: 0.94 }}
                          className={`flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${
                            dark
                              ? 'border-white/10 bg-white/[0.05] hover:bg-white/10'
                              : 'border-gray-200 bg-white/70 hover:bg-gray-100'
                          }`}
                          title={isLiked ? 'Remove from liked songs' : 'Add to liked songs'}
                        >
                          <Heart
                            size={15}
                            className={isLiked ? 'text-emerald-500 fill-emerald-500' : themeClasses.textSecondary}
                          />
                        </motion.button>
                        <motion.button
                          type="button"
                          onClick={toggleQueuePanel}
                          whileHover={{ scale: 1.08 }}
                          whileTap={{ scale: 0.94 }}
                          className={`relative flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${
                            queuePanelOpen
                              ? dark
                                ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300'
                                : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600'
                              : dark
                              ? 'border-white/10 bg-white/[0.05] hover:bg-white/10'
                              : 'border-gray-200 bg-white/70 hover:bg-gray-100'
                          }`}
                          title="Show queue"
                        >
                          <ListMusic size={15} />
                          {queue.length > 1 ? (
                            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[9px] font-bold text-white shadow-sm">
                              {queue.length > 9 ? '9+' : queue.length}
                            </span>
                          ) : null}
                        </motion.button>
                        <motion.button
                          type="button"
                          onClick={openLyricsPanel}
                          whileHover={{ scale: 1.08 }}
                          whileTap={{ scale: 0.94 }}
                          className={`flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${
                            lyricsOpen
                              ? dark
                                ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300'
                                : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600'
                              : dark
                              ? 'border-white/10 bg-white/[0.05] hover:bg-white/10'
                              : 'border-gray-200 bg-white/70 hover:bg-gray-100'
                          }`}
                          title="Show lyrics"
                        >
                          <Mic2 size={15} />
                        </motion.button>
                        <motion.button
                          type="button"
                          onClick={openFullscreenPlayer}
                          whileHover={{ scale: 1.08 }}
                          whileTap={{ scale: 0.94 }}
                          className={`flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${
                            dark
                              ? 'border-white/10 bg-white/[0.05] hover:bg-white/10'
                              : 'border-gray-200 bg-white/70 hover:bg-gray-100'
                          } ${themeClasses.textSecondary}`}
                          title="Open full player"
                        >
                          <Maximize2 size={15} />
                        </motion.button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="flex items-center gap-2">
                      <span className={`w-7 text-right font-mono text-[9px] ${themeClasses.textMuted}`}>
                        {formatTime(progress)}
                      </span>
                      <div className="flex-1 relative group">
                        <input
                          type="range"
                          min={0}
                          max={duration || 0}
                          value={Math.min(progress, duration || 0)}
                          onChange={(event) => seekTo(event.target.value)}
                          className="w-full accent-emerald-500 h-1 rounded-full cursor-pointer appearance-none bg-gray-300 dark:bg-gray-700"
                        />
                      </div>
                      <span className={`w-7 font-mono text-[9px] ${themeClasses.textMuted}`}>
                        {formatTime(duration)}
                      </span>
                    </div>

                    {/* Controls */}
                    <div className="mt-auto flex items-center justify-center gap-2">
                      <IconButton
                        onClick={toggleShuffle}
                        icon={Shuffle}
                        active={shuffleMode}
                        size={18}
                        className="h-8 w-8"
                      />
                      <IconButton
                        onClick={prevTrack}
                        icon={SkipBack}
                        size={22}
                        className="h-9 w-9"
                      />
                      <PrimaryButton
                        onClick={() => setPlaying(!isPlaying)}
                        icon={isPlaying ? Pause : Play}
                        loading={loading}
                        playing={isPlaying}
                      />
                      <IconButton
                        onClick={nextTrack}
                        icon={SkipForward}
                        size={22}
                        className="h-9 w-9"
                      />
                      <IconButton
                        onClick={toggleRepeat}
                        icon={Repeat}
                        active={repeatMode !== 'off'}
                        size={18}
                        className="h-8 w-8"
                      />
                    </div>
                  </motion.div>
                ) : (
                  <motion.button
                    key="floating-compact"
                    type="button"
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.92 }}
                    className="relative w-full h-full flex items-center justify-center"
                    onClick={() => setFloatingDockOpen(true)}
                    title="Open music controls"
                  >
                    <motion.div
                      animate={isPlaying ? { rotate: 360 } : { rotate: 0 }}
                      transition={
                        isPlaying
                          ? { duration: 8, ease: 'linear', repeat: Infinity }
                          : { duration: 0.3 }
                      }
                      className="relative"
                    >
                      <Artwork
                        src={current.thumbnail}
                        alt={current.title}
                        seed={current.videoId || current.title}
                        className="h-12 w-12 rounded-full object-cover shadow-lg"
                      />
                      {isPlaying && (
                        <motion.div
                          animate={{ scale: [1, 1.3, 1], opacity: [0.8, 0, 0.8] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                          className="absolute inset-0 rounded-full border-2 border-emerald-500/60"
                        />
                      )}
                    </motion.div>
                  </motion.button>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        ) : showMiniPlayerBar ? (
          /* ==================== MINI PLAYER BAR ==================== */
          <motion.div
            key="full-player-bar"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 14 }}
            className="relative px-2 pb-2 pt-1.5 md:px-2.5"
            style={{ zIndex: UI_LAYERS.floatingElevated + 12 }}
            tabIndex={0}
            onKeyDown={handleKeyDown}
            onTouchStart={(event) => {
              touchStartY.current = event.changedTouches[0]?.clientY || null
            }}
            onTouchEnd={(event) => {
              const endY = event.changedTouches[0]?.clientY || null
              if (touchStartY.current !== null && endY !== null && touchStartY.current - endY > 50) {
                openFullscreenPlayer()
              }
              touchStartY.current = null
            }}
          >
            <div
              className={`
                mx-auto max-w-[96rem] rounded-[1.35rem] border px-2.5 py-2 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.35)] backdrop-blur-2xl md:px-4 md:py-2.5
                ${dark ? 'border-white/10 bg-gray-900/92' : 'border-white/80 bg-white/92'}
              `}
            >
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 md:grid-cols-[1.1fr_1fr_1.1fr]">
                {/* Track Info */}
                <div className="flex min-w-0 items-center gap-2">
                  <motion.button
                    type="button"
                    onClick={openFullscreenPlayer}
                    className="shrink-0"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Artwork
                      src={current.thumbnail}
                      alt={current.title}
                      seed={current.videoId || current.title}
                      className="h-10 w-10 rounded-[0.8rem] object-cover shadow-md"
                    />
                  </motion.button>
                  <div className="min-w-0">
                    <motion.button
                      type="button"
                      onClick={openFullscreenPlayer}
                      className="text-left"
                    >
                      <p className={`text-[12px] font-semibold truncate ${themeClasses.text}`}>
                        {current.title}
                      </p>
                      <p className={`mt-0.5 truncate text-[10px] ${themeClasses.textSecondary}`}>
                        {getTrackMetaLine(current) || current.artist}
                      </p>
                    </motion.button>
                    {error && (
                      <p className="text-xs text-red-500 mt-1">
                        {error}{' '}
                        <button type="button" className="underline font-medium" onClick={retryCurrent}>
                          Retry
                        </button>
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-1.5 md:hidden">
                  <motion.button
                    type="button"
                    onClick={toggleLike}
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.94 }}
                    className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${dark ? 'bg-white/[0.06] hover:bg-white/10' : 'bg-gray-100 hover:bg-gray-200'}`}
                  >
                    <Heart
                      size={15}
                      className={isLiked ? 'text-emerald-500 fill-emerald-500' : themeClasses.textSecondary}
                    />
                  </motion.button>
                  <PrimaryButton
                    onClick={() => setPlaying(!isPlaying)}
                    icon={isPlaying ? Pause : Play}
                    loading={loading}
                    playing={isPlaying}
                  />
                </div>

                <div className="col-span-2 flex items-center justify-between gap-1.5 md:hidden">
                  <div className="flex items-center gap-1">
                    <IconButton
                      onClick={prevTrack}
                      icon={SkipBack}
                      size={17}
                      className="h-9 w-9"
                    />
                    <IconButton
                      onClick={nextTrack}
                      icon={SkipForward}
                      size={17}
                      className="h-9 w-9"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <IconButton
                      onClick={openLyricsPanel}
                      icon={Mic2}
                      size={15}
                      className="h-9 w-9"
                    />
                    <IconButton
                      onClick={toggleQueuePanel}
                      icon={ListMusic}
                      size={15}
                      className="h-9 w-9"
                    />
                    <IconButton
                      onClick={openFullscreenPlayer}
                      icon={Maximize2}
                      size={15}
                      className="h-9 w-9"
                    />
                  </div>
                </div>

                {/* Center Controls */}
                <div className="hidden md:flex items-center justify-center gap-2.5">
                  <IconButton
                    onClick={toggleShuffle}
                    icon={Shuffle}
                    active={shuffleMode}
                    size={18}
                  />
                  <IconButton
                    onClick={prevTrack}
                    icon={SkipBack}
                    size={20}
                    className="h-10 w-10"
                  />
                  <PrimaryButton
                    onClick={() => setPlaying(!isPlaying)}
                    icon={isPlaying ? Pause : Play}
                    loading={loading}
                    playing={isPlaying}
                  />
                  <IconButton
                    onClick={nextTrack}
                    icon={SkipForward}
                    size={20}
                    className="h-10 w-10"
                  />
                  <IconButton
                    onClick={toggleRepeat}
                    icon={Repeat}
                    active={repeatMode !== 'off'}
                    size={16}
                  />
                </div>

                {/* Right Actions */}
                <div className="hidden md:flex items-center justify-end gap-2 pr-1">
                  {/* Volume Control */}
                  <div className="relative flex items-center gap-2">
                    <motion.button
                      type="button"
                      onClick={toggleMute}
                      onMouseEnter={() => setShowVolumeSlider(true)}
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.95 }}
                      className={`h-9 w-9 rounded-full flex items-center justify-center transition-colors ${dark ? 'hover:bg-white/10' : 'hover:bg-gray-200'} ${themeClasses.textSecondary}`}
                    >
                      <VolumeIcon size={16} />
                    </motion.button>
                    
                    {/* Horizontal Volume Slider */}
                    <AnimatePresence>
                      {showVolumeSlider && (
                        <motion.div
                          ref={volumeSliderRef}
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: 100 }}
                          exit={{ opacity: 0, width: 0 }}
                          transition={{ duration: 0.2 }}
                          className={`flex items-center gap-2 overflow-hidden rounded-full px-2.5 py-1.5 ${dark ? 'bg-gray-800' : 'bg-gray-100'}`}
                          onMouseLeave={() => setShowVolumeSlider(false)}
                        >
                          <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.01}
                            value={volume}
                            onChange={handleVolumeChange}
                            className="h-1 w-16 cursor-pointer appearance-none rounded-full bg-gray-300 accent-emerald-500 dark:bg-gray-600"
                          />
                          <span className={`text-xs font-mono min-w-[35px] ${themeClasses.textMuted}`}>
                            {Math.round(volume * 100)}%
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <IconButton
                    onClick={openLyricsPanel}
                    icon={Mic2}
                    size={16}
                  />
                  <IconButton
                    onClick={toggleQueuePanel}
                    icon={ListMusic}
                    size={16}
                  />
                  <IconButton
                    onClick={openFullscreenPlayer}
                    icon={Maximize2}
                    size={16}
                  />
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-2.5 flex items-center gap-2">
                <span className={`w-7 text-right font-mono text-[9px] ${themeClasses.textMuted}`}>
                  {formatTime(progress)}
                </span>
                <div className="flex-1 relative group">
                  <input
                    type="range"
                    min={0}
                    max={duration || 0}
                    value={Math.min(progress, duration || 0)}
                    onChange={(event) => seekTo(event.target.value)}
                    className="h-1 w-full cursor-pointer appearance-none rounded-full bg-gray-300 accent-emerald-500 transition-all group-hover:h-1.5 dark:bg-gray-700"
                  />
                </div>
                <span className={`w-7 font-mono text-[9px] ${themeClasses.textMuted}`}>
                  {formatTime(duration)}
                </span>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* ==================== QUEUE PANEL (PORTAL) ==================== */}
      {queuePanelOpen && portalRoot && createPortal(
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 ${dark ? 'bg-black/80' : 'bg-black/40'} backdrop-blur-sm`}
            style={{ zIndex: UI_LAYERS.overlayBackdrop }}
            onClick={() => setQueuePanelOpen(false)}
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 350, damping: 35 }}
            className={`
              fixed right-0 top-0 h-full w-full max-w-[21.5rem] 
              border-l shadow-2xl flex flex-col
              ${dark ? 'bg-gray-900 border-white/10' : 'bg-white border-gray-200'}
            `}
            style={{ zIndex: UI_LAYERS.modal }}
          >
            {/* Header */}
            <div className={`flex items-center justify-between gap-3 border-b px-3.5 py-3 ${dark ? 'border-white/10' : 'border-gray-200'}`}>
              <div>
                <h3 className={`text-base font-bold tracking-tight ${themeClasses.text}`}>Queue</h3>
                <p className={`mt-0.5 text-[11px] font-medium ${themeClasses.textSecondary}`}>
                  {queue.length} songs in queue
                </p>
              </div>
              <div className="flex items-center gap-2">
                <motion.button
                  type="button"
                  className="flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-[11px] font-semibold text-red-500 transition-colors hover:bg-red-500/10"
                  onClick={clearQueue}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Trash2 size={15} />
                  Clear
                </motion.button>
                <motion.button
                  type="button"
                  className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${dark ? 'hover:bg-white/10' : 'hover:bg-gray-200'} ${themeClasses.text}`}
                  onClick={() => setQueuePanelOpen(false)}
                  whileHover={{ scale: 1.05, rotate: 90 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <X size={19} />
                </motion.button>
              </div>
            </div>

            {/* Queue List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              <Reorder.Group
                axis="y"
                values={queue}
                onReorder={reorderQueue}
                className="space-y-1.5"
              >
                {queue.map((track, index) => (
                  <Reorder.Item
                    key={track.videoId}
                    value={track}
                    id={track.videoId}
                    onDragStart={() => setDraggingQueueId(track.videoId)}
                    onDragEnd={() => setDraggingQueueId('')}
                    whileDrag={{ 
                      scale: 1.02, 
                      boxShadow: dark 
                        ? '0 20px 50px rgba(0, 0, 0, 0.5)' 
                        : '0 20px 50px rgba(0, 0, 0, 0.2)'
                    }}
                    className={`
                      cursor-grab rounded-[16px] border p-2 transition-all active:cursor-grabbing
                      ${draggingQueueId === track.videoId
                        ? dark ? 'border-emerald-500/50 bg-emerald-500/20' : 'border-emerald-500/30 bg-emerald-500/10'
                        : index === currentIndex
                        ? dark ? 'border-emerald-500/30 bg-emerald-500/15' : 'border-emerald-500/20 bg-emerald-500/5'
                        : dark ? 'border-white/10 bg-white/5 hover:bg-white/10' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                      }
                    `}
                  >
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label="Reorder queue"
                        className={`h-7 w-7 shrink-0 rounded-lg flex items-center justify-center ${dark ? 'bg-white/10 text-gray-400' : 'bg-gray-200 text-gray-500'}`}
                      >
                        <GripVertical size={14} />
                      </button>
                      <motion.button
                        type="button"
                        onClick={() => playTrackAt(index)}
                        className="shrink-0"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Artwork
                          src={track.thumbnail}
                          alt={track.title}
                          seed={track.videoId || track.title}
                          className="h-9 w-9 rounded-[0.75rem] object-cover"
                        />
                      </motion.button>
                      <motion.button
                        type="button"
                        onClick={() => playTrackAt(index)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className={`text-[10px] uppercase tracking-wider mb-0.5 ${
                          index === currentIndex ? 'text-emerald-500 font-semibold' : themeClasses.textMuted
                        }`}>
                          {index === currentIndex
                            ? 'Now Playing'
                            : index > currentIndex
                            ? 'Up Next'
                            : 'Played'}
                        </p>
                        <p className={`text-[12px] font-semibold truncate ${themeClasses.text}`}>
                          {track.title}
                        </p>
                        <p className={`mt-0.5 truncate text-[11px] ${themeClasses.textSecondary}`}>
                          {track.artist}
                        </p>
                      </motion.button>
                      <motion.button
                        type="button"
                        className={`text-xs transition-colors p-2 ${dark ? 'text-gray-400 hover:text-red-400' : 'text-gray-500 hover:text-red-500'}`}
                        onClick={() => removeFromQueueAt(index)}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <X size={16} />
                      </motion.button>
                    </div>
                  </Reorder.Item>
                ))}
              </Reorder.Group>
            </div>
          </motion.aside>
        </>,
        portalRoot
      )}

      {/* ==================== LYRICS MODAL (PORTAL) ==================== */}
      {lyricsOpen && portalRoot && createPortal(
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 ${dark ? 'bg-black/90' : 'bg-black/60'} backdrop-blur-sm`}
            style={{ zIndex: UI_LAYERS.overlayBackdrop + 4 }}
            onClick={() => setLyricsOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: 'spring', stiffness: 350, damping: 35 }}
            className="fixed inset-0 flex items-end md:items-center md:justify-center"
            style={{ zIndex: UI_LAYERS.modal + 4 }}
          >
            <div className={`
              relative w-full md:mx-4 md:max-w-[42rem] md:rounded-[1.6rem] 
              border shadow-2xl overflow-hidden max-h-[90vh] md:max-h-[80vh]
              ${dark ? 'bg-gray-900 border-white/10' : 'bg-white border-gray-200'}
            `}>
              {/* Background */}
              <div className="absolute inset-0 opacity-20" style={backdropStyle} />
              <div className={`absolute inset-0 ${dark ? 'bg-gradient-to-b from-gray-900/80 to-gray-900' : 'bg-gradient-to-b from-white/80 to-white'}`} />

              {/* Header */}
              <div className={`relative flex items-center justify-between gap-4 border-b p-4 ${dark ? 'border-white/10' : 'border-gray-200'}`}>
                <div className="min-w-0">
                  <p className={`text-[11px] uppercase tracking-wider ${themeClasses.textMuted}`}>Lyrics</p>
                  <h3 className={`mt-1 line-clamp-1 text-base font-semibold ${themeClasses.text}`}>
                    {current.title}
                  </h3>
                </div>
                <motion.button
                  type="button"
                  className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${dark ? 'hover:bg-white/10' : 'hover:bg-gray-200'} ${themeClasses.text}`}
                  onClick={() => setLyricsOpen(false)}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X size={20} />
                </motion.button>
              </div>

              {/* Lyrics */}
              <div className="relative max-h-[58vh] overflow-y-auto space-y-3.5 p-5">
                {lyricsLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 size={24} className={`animate-spin ${themeClasses.textSecondary}`} />
                    <span className={`ml-3 text-sm ${themeClasses.textSecondary}`}>Fetching lyrics...</span>
                  </div>
                ) : liveLyrics.length ? (
                  liveLyrics.map((line, index) => (
                    <motion.p
                      key={`${line.text}-${index}`}
                      ref={(node) => {
                        if (node) lyricLineRefs.current.set(index, node)
                        else lyricLineRefs.current.delete(index)
                      }}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        scale: activeLyricIndex === index ? 1.05 : 1,
                      }}
                      transition={{ duration: 0.3 }}
                      className={`
                        cursor-pointer text-[17px] leading-relaxed transition-all duration-300
                        ${activeLyricIndex === index
                          ? `${themeClasses.text} font-semibold`
                          : `${themeClasses.textMuted} hover:${themeClasses.textSecondary}`
                        }
                      `}
                      onClick={() => seekTo(line.time || 0)}
                    >
                      {line.text}
                    </motion.p>
                  ))
                ) : (
                  <p className={`text-sm text-center py-8 ${themeClasses.textSecondary}`}>
                    Lyrics unavailable for this song
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        </>,
        portalRoot
      )}

      {/* ==================== FULL SCREEN PLAYER (PORTAL) ==================== */}
      {playerExpanded && portalRoot && createPortal(
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`
            fixed inset-0 overflow-hidden
            ${dark ? 'bg-gradient-to-b from-gray-900 via-gray-900 to-black' : 'bg-gradient-to-b from-gray-50 via-white to-gray-100'}
          `}
          style={{ zIndex: UI_LAYERS.fullscreen }}
        >
          {/* Dynamic Background */}
          <div className="fixed inset-0 opacity-30" style={backdropStyle} />
          <div className={`fixed inset-0 ${dark ? 'bg-gradient-to-b from-gray-900/80 via-gray-900/60 to-black' : 'bg-gradient-to-b from-gray-50/80 via-white/60 to-gray-100'}`} />
          <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-transparent to-transparent" />

          {/* Close Button */}
          <motion.button
            type="button"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className={`
              fixed top-4 left-4 h-10 w-10 rounded-full 
              backdrop-blur-md border flex items-center justify-center transition-all
              ${dark ? 'bg-white/10 border-white/10 hover:bg-white/20' : 'bg-black/5 border-gray-200 hover:bg-black/10'}
            `}
            style={{ zIndex: UI_LAYERS.fullscreenControls }}
            onClick={closeFullscreenPlayer}
          >
            <ChevronDown size={20} className={themeClasses.text} />
          </motion.button>

          {/* Top Actions */}
          <div className="fixed top-4 right-4 flex items-center gap-2" style={{ zIndex: UI_LAYERS.fullscreenControls }}>
            <motion.button
              type="button"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${dark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
              onClick={toggleLike}
            >
              <Heart
                size={20}
                className={isLiked ? 'text-emerald-500 fill-emerald-500' : themeClasses.text}
              />
            </motion.button>
            <motion.button
              type="button"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${dark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
            >
              <MoreHorizontal size={20} className={themeClasses.text} />
            </motion.button>
          </div>

          {/* Main Content */}
          <div className="relative h-full flex flex-col items-center justify-center px-5 py-16" style={{ zIndex: UI_LAYERS.fullscreen }}>
            <motion.div
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 60 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="flex w-full max-w-md flex-col items-center"
            >
              {/* Album Art */}
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 400, damping: 25 }}
                className="mb-6 aspect-square w-full max-w-[18.5rem] md:max-w-[20rem]"
              >
                <Artwork
                  src={current.thumbnail}
                  alt={current.title}
                  seed={current.videoId || current.title}
                  className="h-full w-full rounded-[1.25rem] object-cover shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)]"
                />
              </motion.div>

              {/* Track Info */}
              <div className="mb-6 w-full text-center">
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className={`line-clamp-2 text-[1.65rem] font-bold tracking-tight md:text-[2.05rem] ${themeClasses.text}`}
                >
                  {current.title}
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className={`mt-1.5 line-clamp-1 text-[13px] md:text-[15px] ${themeClasses.textSecondary}`}
                >
                  {getTrackMetaLine(current) || current.artist}
                </motion.p>
              </div>

              {/* Progress Bar */}
              <div className="mb-5 w-full">
                <input
                  type="range"
                  min={0}
                  max={duration || 0}
                  value={Math.min(progress, duration || 0)}
                  onChange={(event) => seekTo(event.target.value)}
                  className="w-full accent-emerald-500 h-1.5 rounded-full cursor-pointer appearance-none bg-gray-300 dark:bg-gray-700 hover:h-2 transition-all"
                />
                <div className={`flex justify-between mt-2 text-xs font-mono ${themeClasses.textMuted}`}>
                  <span>{formatTime(progress)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Main Controls */}
              <div className="mb-5 flex items-center justify-center gap-3.5 md:gap-5">
                <IconButton
                  onClick={toggleShuffle}
                  icon={Shuffle}
                  active={shuffleMode}
                  size={20}
                  className="h-10 w-10"
                />
                <IconButton
                  onClick={prevTrack}
                  icon={SkipBack}
                  size={24}
                  className="h-12 w-12"
                />
                <motion.button
                  type="button"
                  onClick={() => setPlaying(!isPlaying)}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.95 }}
                  className={`
                    h-16 w-16 rounded-full md:h-[4.5rem] md:w-[4.5rem]
                    bg-gradient-to-br ${themeClasses.accentGradient}
                    text-white flex items-center justify-center
                    shadow-lg shadow-emerald-500/40
                    hover:shadow-xl hover:shadow-emerald-500/50
                    transition-all duration-200
                  `}
                >
                  {loading ? (
                    <Loader2 size={28} className="animate-spin" />
                  ) : isPlaying ? (
                    <Pause size={28} fill="currentColor" />
                  ) : (
                    <Play size={28} fill="currentColor" className="ml-1" />
                  )}
                </motion.button>
                <IconButton
                  onClick={nextTrack}
                  icon={SkipForward}
                  size={24}
                  className="h-12 w-12"
                />
                <IconButton
                  onClick={toggleRepeat}
                  icon={Repeat}
                  active={repeatMode !== 'off'}
                  size={20}
                  className="h-10 w-10"
                />
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center justify-center gap-5 md:gap-6">
                <motion.button
                  type="button"
                  onClick={toggleQueuePanel}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`flex items-center gap-2 transition-colors ${themeClasses.textMuted} hover:${themeClasses.text}`}
                >
                  <ListMusic size={20} />
                  <span className="text-[12px]">Queue</span>
                </motion.button>
                <motion.button
                  type="button"
                  onClick={openLyricsPanel}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`flex items-center gap-2 transition-colors ${themeClasses.textMuted} hover:${themeClasses.text}`}
                >
                  <Mic2 size={20} />
                  <span className="text-[12px]">Lyrics</span>
                </motion.button>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`flex items-center gap-2 transition-colors ${themeClasses.textMuted} hover:${themeClasses.text}`}
                >
                  <Share2 size={20} />
                  <span className="text-[12px]">Share</span>
                </motion.button>
              </div>
            </motion.div>
          </div>
        </motion.div>,
        portalRoot
      )}
    </>
  )
}
