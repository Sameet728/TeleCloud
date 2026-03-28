import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { 
  ArrowRight, Clock3, Heart, Music2, Play, 
  RefreshCcw, Sparkles, Disc3, Search 
} from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import LazySection from '../components/music/LazySection'
import {
  Artwork,
  EmptyMusicState,
  PlaylistCard,
  SectionHeader,
  SectionSkeleton,
  TrackListRow,
} from '../components/music/MusicCards'
import PlaylistModal from '../components/music/PlaylistModal'
import { musicAPI } from '../services/api'
import useStore from '../store/useStore'
import { formatTrackDuration, getTrackMetaLine } from '../utils/music'

// Subtle background pattern
const CanvasBackground = () => (
  <div 
    className="fixed inset-0 z-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
    style={{
      backgroundImage: `radial-gradient(currentColor 1px, transparent 1px)`,
      backgroundSize: '32px 32px'
    }}
  />
)

// Animation Variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
}

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 30 } }
}

const curatedSearchChips = ['Lo-fi', 'Workout', 'Hindi', 'Punjabi', 'Focus', 'Romance']

const dedupeTracks = (tracks = []) => {
  const seen = new Set()
  return tracks.filter((track) => {
    if (!track?.videoId || seen.has(track.videoId)) return false
    seen.add(track.videoId)
    return true
  })
}

const splitIntoColumns = (tracks = [], columnCount = 2) => {
  const columns = Array.from({ length: columnCount }, () => [])
  tracks.forEach((track, index) => {
    columns[index % columnCount].push(track)
  })
  return columns
}

// --- Polished Sub-Components ---

function ShowcaseRow({ track, onPlay, index = 0 }) {
  const durationText = formatTrackDuration(track.duration)

  return (
    <motion.button
      type="button"
      variants={itemVariants}
      whileHover={{ x: 4 }}
      onClick={onPlay}
      className="group w-full flex items-center gap-4 rounded-2xl px-3 py-2.5 text-left transition-all hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
    >
      <div className="relative overflow-hidden rounded-xl">
        <Artwork
          src={track.thumbnail}
          alt={track.title}
          seed={track.videoId || track.title}
          className="w-12 h-12 md:w-14 md:h-14 object-cover shrink-0 transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Play size={18} className="text-white fill-white" />
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm md:text-sm font-bold text-gray-900 dark:text-zinc-100 truncate tracking-tight">{track.title}</p>
        <p className="text-[11px] md:text-xs font-medium text-zinc-500 dark:text-zinc-400 truncate mt-0.5">{getTrackMetaLine(track) || track.artist}</p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {durationText !== '--:--' && (
          <span className="hidden md:block text-[11px] font-bold text-zinc-400">{durationText}</span>
        )}
      </div>
    </motion.button>
  )
}

function ShowcaseShelf({ title, subtitle, icon: Icon, tracks = [], action = null, onPlayTrack, onPlayAll }) {
  const columns = useMemo(() => splitIntoColumns(tracks.slice(0, 8), 2), [tracks])

  return (
    <div className="rounded-[2rem] border border-gray-200/60 dark:border-zinc-800/80 bg-white/60 dark:bg-zinc-900/40 shadow-xl shadow-gray-200/20 dark:shadow-none overflow-hidden backdrop-blur-2xl">
      <div className="px-6 py-6 border-b border-gray-200/50 dark:border-zinc-800/50 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          {Icon && (
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 shadow-inner">
              <Icon size={20} />
            </div>
          )}
          <div>
            <h2 className="text-xl md:text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">{title}</h2>
            {subtitle && <p className="text-xs font-medium text-zinc-500 mt-1">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {action}
          {tracks.length > 0 && (
            <button 
              type="button" 
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-[0_4px_14px_0_rgba(79,70,229,0.39)] active:scale-[0.98]" 
              onClick={onPlayAll}
            >
              <Play size={14} className="fill-current" /> Play All
            </button>
          )}
        </div>
      </div>

      {tracks.length ? (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid lg:grid-cols-2 gap-x-8 gap-y-2 px-6 py-5">
          {columns.map((column, columnIndex) => (
            <div key={`column-${columnIndex}`} className="space-y-1">
              {column.map((track, index) => (
                <ShowcaseRow
                  key={track.videoId}
                  track={track}
                  index={index}
                  onPlay={() => onPlayTrack(track)}
                />
              ))}
            </div>
          ))}
        </motion.div>
      ) : (
        <div className="px-6 py-10">
          <EmptyMusicState title="Nothing here yet" description="This shelf will fill up as your music data comes in." compact />
        </div>
      )}
    </div>
  )
}

function ReleaseCard({ playlist, onOpen }) {
  // Extract thumbnail from various possible structures
  let thumbnailSrc = null
  
  // Try thumbnails array first (YouTube Music API format) - this is the most reliable
  if (playlist.thumbnails && Array.isArray(playlist.thumbnails) && playlist.thumbnails.length > 0) {
    // Get the highest quality thumbnail (usually the last one)
    const thumb = playlist.thumbnails[playlist.thumbnails.length - 1]
    thumbnailSrc = thumb?.url || thumb?.src || (typeof thumb === 'string' ? thumb : null)
  }
  // Try direct string properties
  else if (playlist.thumbnail && typeof playlist.thumbnail === 'string') {
    thumbnailSrc = playlist.thumbnail
  } else if (playlist.cover && typeof playlist.cover === 'string') {
    thumbnailSrc = playlist.cover
  } else if (playlist.image && typeof playlist.image === 'string') {
    thumbnailSrc = playlist.image
  } else if (playlist.artwork && typeof playlist.artwork === 'string') {
    thumbnailSrc = playlist.artwork
  }
  // Try nested thumbnail object
  else if (playlist.thumbnail && typeof playlist.thumbnail === 'object') {
    thumbnailSrc = playlist.thumbnail.url || playlist.thumbnail.src
  }
  
  return (
    <motion.button
      type="button"
      whileHover={{ y: -8 }}
      onClick={onOpen}
      className="group w-full rounded-2xl border border-gray-200/50 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-900/60 overflow-hidden text-left shadow-lg hover:shadow-2xl transition-all backdrop-blur-xl"
    >
      <div className="relative p-2 pb-0">
        <div className="overflow-hidden rounded-xl shadow-md bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
          <Artwork
            src={thumbnailSrc}
            alt={playlist.title || playlist.label || playlist.name}
            seed={playlist.playlistId || playlist.browseId || playlist.title || playlist.label}
            className="w-full aspect-square object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
        <div className="absolute right-4 bottom-[-10px] w-10 h-10 rounded-full bg-indigo-500 text-white flex items-center justify-center shadow-[0_8px_20px_-6px_rgba(79,70,229,0.6)] opacity-0 translate-y-4 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0 z-10">
          <Play size={16} className="fill-current ml-0.5" />
        </div>
      </div>
      <div className="p-3 pt-4">
        <p className="text-xs font-bold text-gray-900 dark:text-zinc-100 line-clamp-2 leading-tight break-words">{playlist.title || playlist.label || playlist.name || 'Playlist'}</p>
        <p className="text-[10px] font-medium text-zinc-500 mt-1 line-clamp-1 break-words">{playlist.subtitle || playlist.author || playlist.description || 'Curated Playlist'}</p>
      </div>
    </motion.button>
  )
}

// --- Main Page Component ---

export default function Music() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [libraryLoading, setLibraryLoading] = useState(true)
  const [libraryError, setLibraryError] = useState('')
  const [discoveryLoading, setDiscoveryLoading] = useState(true)
  
  const [historyQuickPicks, setHistoryQuickPicks] = useState([])
  const [quickPickSeeds, setQuickPickSeeds] = useState([])
  const [personalizedTracks, setPersonalizedTracks] = useState([])
  const [personalizedSeeds, setPersonalizedSeeds] = useState([])
  const [readyPlaylists, setReadyPlaylists] = useState([])
  
  const [showAllHistory, setShowAllHistory] = useState(false)
  const [playlistModalOpen, setPlaylistModalOpen] = useState(false)
  const [selectedTrackForPlaylist, setSelectedTrackForPlaylist] = useState(null)
  const [playlistName, setPlaylistName] = useState('')
  const [playlistDescription, setPlaylistDescription] = useState('')
  const [playlistLoading, setPlaylistLoading] = useState(false)
  const [playlistError, setPlaylistError] = useState('')

  const searchCacheRef = useRef(new Map())
  const requestRef = useRef(0)

  const query = (searchParams.get('q') || '').trim()
  const pickVideoId = (searchParams.get('pick') || '').trim()

  const currentTrack = useStore((state) => state.musicQueue[state.currentTrackIndex] || null)
  const currentTrackIndex = useStore((state) => state.currentTrackIndex)
  const musicQueue = useStore((state) => state.musicQueue)
  const recentlyPlayed = useStore((state) => state.recentlyPlayed)
  const likedSongs = useStore((state) => state.likedSongs)
  const playlists = useStore((state) => state.playlists)
  const recommendations = useStore((state) => state.activeRecommendations)
  
  const addRecentSearch = useStore((state) => state.addRecentSearch)
  const startPlayback = useStore((state) => state.startPlayback)
  const addToQueue = useStore((state) => state.addToQueue)
  const playNextNow = useStore((state) => state.playNextNow)
  const appendQueueTracks = useStore((state) => state.appendQueueTracks)
  const toggleLikedSongLocal = useStore((state) => state.toggleLikedSongLocal)
  const setLikedSongsLocal = useStore((state) => state.setLikedSongsLocal)
  const setPlaylistsLocal = useStore((state) => state.setPlaylistsLocal)
  const upsertPlaylistLocal = useStore((state) => state.upsertPlaylistLocal)
  const setRecentlyPlayedLocal = useStore((state) => state.setRecentlyPlayedLocal)
  const setRecommendationsState = useStore((state) => state.setRecommendationsState)
  const clearRecommendations = useStore((state) => state.clearRecommendations)
  const hydrateRecommendationsFromCache = useStore((state) => state.hydrateRecommendationsFromCache)
  const cacheRecommendations = useStore((state) => state.cacheRecommendations)

  const likedSongIds = useMemo(() => new Set(likedSongs.map((track) => track.videoId)), [likedSongs])
  const recommendedTracks = useMemo(
    () => dedupeTracks([...(recommendations.upNext || []), ...(recommendations.related || []), ...(recommendations.quickPicks || [])]),
    [recommendations.quickPicks, recommendations.related, recommendations.upNext]
  )
  const historyTracks = showAllHistory ? recentlyPlayed : recentlyPlayed.slice(0, 6)
  const upcomingTrackCount = Math.max(musicQueue.length - (currentTrackIndex + 1), 0)

  const updateSearchParams = (updates = {}) => {
    const next = new URLSearchParams(searchParams)
    Object.entries(updates).forEach(([key, value]) => {
      if (!value) next.delete(key)
      else next.set(key, value)
    })
    setSearchParams(next)
  }

  const runSearch = async (value, { remember = false } = {}) => {
    const nextQuery = String(value || '').trim()
    if (!nextQuery) {
      setSearchResults([])
      setSearchError('')
      setSearchLoading(false)
      return
    }

    if (remember) addRecentSearch(nextQuery)

    const cacheKey = nextQuery.toLowerCase()
    if (searchCacheRef.current.has(cacheKey)) {
      setSearchResults(searchCacheRef.current.get(cacheKey))
      setSearchError('')
      setSearchLoading(false)
      return
    }

    const requestId = ++requestRef.current
    setSearchLoading(true)
    setSearchError('')

    try {
      const { data } = await musicAPI.search(nextQuery, 24)
      const results = data?.data?.results || []
      searchCacheRef.current.set(cacheKey, results)
      if (requestId !== requestRef.current) return
      setSearchResults(results)
    } catch (error) {
      if (requestId !== requestRef.current) return
      setSearchResults([])
      setSearchError(error?.response?.data?.message || 'Search failed. Try again.')
    } finally {
      if (requestId === requestRef.current) setSearchLoading(false)
    }
  }

  const loadLibrary = async ({ silent = false } = {}) => {
    if (!silent) setLibraryLoading(true)
    setLibraryError('')

    try {
      const [historyRes, likedRes, playlistsRes] = await Promise.all([
        musicAPI.history(),
        musicAPI.liked(),
        musicAPI.playlists(),
      ])

      setRecentlyPlayedLocal(historyRes?.data?.data?.items || [])
      setLikedSongsLocal(likedRes?.data?.data?.items || [])
      setPlaylistsLocal(playlistsRes?.data?.data?.playlists || [])
    } catch (error) {
      const message = error?.response?.data?.message || 'Unable to load your music library.'
      setLibraryError(message)
      if (silent) toast.error(message)
    } finally {
      if (!silent) setLibraryLoading(false)
    }
  }

  const loadDiscovery = async ({ silent = false } = {}) => {
    if (!silent) setDiscoveryLoading(true)

    try {
      const [quickPicksRes, personalizedRes, readyPlaylistsRes] = await Promise.all([
        musicAPI.historyQuickPicks(8),
        musicAPI.personalized(12),
        musicAPI.readyPlaylists(),
      ])

      const playlists = readyPlaylistsRes?.data?.data?.results || []

      setHistoryQuickPicks(quickPicksRes?.data?.data?.results || [])
      setQuickPickSeeds(quickPicksRes?.data?.data?.seeds || [])
      setPersonalizedTracks(personalizedRes?.data?.data?.results || [])
      setPersonalizedSeeds(personalizedRes?.data?.data?.seeds || [])
      setReadyPlaylists(playlists)
    } catch (error) {
      if (!silent) toast.error('Discovery shelves are unavailable right now.')
    } finally {
      if (!silent) setDiscoveryLoading(false)
    }
  }

  useEffect(() => {
    loadLibrary()
    loadDiscovery()
  }, [])

  useEffect(() => {
    if (!recentlyPlayed.length) return
    const timeoutId = window.setTimeout(() => {
      loadDiscovery({ silent: true })
    }, 550)
    return () => window.clearTimeout(timeoutId)
  }, [recentlyPlayed[0]?.videoId])

  useEffect(() => {
    if (!query) {
      setSearchResults([])
      setSearchLoading(false)
      setSearchError('')
      return
    }
    runSearch(query, { remember: true })
  }, [query])

  useEffect(() => {
    if (!pickVideoId || !searchResults.length) return
    const index = searchResults.findIndex((track) => track.videoId === pickVideoId)
    if (index < 0) return
    startPlayback(searchResults, index)
    updateSearchParams({ pick: '' })
  }, [pickVideoId, searchResults, startPlayback])

  useEffect(() => {
    const videoId = currentTrack?.videoId
    if (!videoId) {
      clearRecommendations()
      return
    }

    if (hydrateRecommendationsFromCache(videoId)) return

    let cancelled = false
    setRecommendationsState({
      sourceVideoId: videoId,
      loading: true,
      error: '',
      upNext: [],
      related: [],
      quickPicks: [],
    })

    Promise.all([
      musicAPI.upNext(videoId, 12),
      musicAPI.related(videoId, 12),
      musicAPI.quickPicks(videoId, 12),
    ])
      .then(([upNextRes, relatedRes, quickPicksRes]) => {
        if (cancelled) return
        cacheRecommendations(videoId, {
          upNext: upNextRes?.data?.data?.results || [],
          related: relatedRes?.data?.data?.results || [],
          quickPicks: quickPicksRes?.data?.data?.results || [],
        })
      })
      .catch((error) => {
        if (cancelled) return
        setRecommendationsState({
          sourceVideoId: videoId,
          loading: false,
          error: error?.response?.data?.message || 'Recommendations are unavailable right now.',
          upNext: [],
          related: [],
          quickPicks: [],
        })
      })

    return () => { cancelled = true }
  }, [cacheRecommendations, clearRecommendations, currentTrack?.videoId, hydrateRecommendationsFromCache, setRecommendationsState])

  useEffect(() => {
    if (!currentTrack?.videoId || !recommendedTracks.length) return
    if (upcomingTrackCount < 3) {
      appendQueueTracks(recommendedTracks)
    }
  }, [appendQueueTracks, currentTrack?.videoId, recommendedTracks, upcomingTrackCount])

  const playCollection = (tracks, index = 0) => {
    startPlayback(tracks, index)
  }

  const toggleLike = async (track) => {
    toggleLikedSongLocal(track)
    try {
      const { data } = await musicAPI.toggleLike(track)
      setLikedSongsLocal(data?.data?.items || [])
      if (data?.data?.playlist) upsertPlaylistLocal(data.data.playlist)
    } catch (error) {
      toggleLikedSongLocal(track)
      toast.error('Could not update liked songs.')
    }
  }

  const openPlaylistModal = (track = null) => {
    setSelectedTrackForPlaylist(track)
    setPlaylistModalOpen(true)
    setPlaylistError('')
  }

  const closePlaylistModal = () => {
    setPlaylistModalOpen(false)
    setSelectedTrackForPlaylist(null)
    setPlaylistName('')
    setPlaylistDescription('')
    setPlaylistLoading(false)
    setPlaylistError('')
  }

  const createPlaylist = async () => {
    const name = playlistName.trim()
    if (!name) return

    setPlaylistLoading(true)
    setPlaylistError('')
    try {
      const { data } = await musicAPI.createPlaylist({
        name,
        description: playlistDescription.trim(),
      })

      let playlist = data?.data?.playlist
      if (playlist) upsertPlaylistLocal(playlist)

      if (selectedTrackForPlaylist && playlist?._id) {
        const addRes = await musicAPI.addToPlaylist(playlist._id, selectedTrackForPlaylist)
        playlist = addRes?.data?.data?.playlist || playlist
        if (playlist) upsertPlaylistLocal(playlist)
      }

      toast.success(selectedTrackForPlaylist ? 'Song saved to new playlist.' : 'Playlist created.', { icon: '🎵' })
      closePlaylistModal()
    } catch (error) {
      setPlaylistError(error?.response?.data?.message || 'Could not create playlist.')
    } finally {
      setPlaylistLoading(false)
    }
  }

  const addSongToPlaylist = async (playlist) => {
    if (!selectedTrackForPlaylist?.videoId) return
    try {
      const { data } = await musicAPI.addToPlaylist(playlist._id, selectedTrackForPlaylist)
      if (data?.data?.playlist) upsertPlaylistLocal(data.data.playlist)
      toast.success(`Added to ${playlist.name}.`, { icon: '✅' })
      closePlaylistModal()
    } catch (error) {
      setPlaylistError(error?.response?.data?.message || 'Could not add song to playlist.')
    }
  }

  const openEditorialPlaylist = (playlist) => {
    const next = new URLSearchParams()
    if (playlist.playlistId || playlist.browseId) {
      next.set('browseId', playlist.playlistId || playlist.browseId)
    }
    if (playlist.query) next.set('query', playlist.query)
    navigate(`/music/playlists?${next.toString()}`)
  }

  return (
    <div className="relative min-h-screen bg-gray-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-x-hidden">
      <CanvasBackground />
      
      {/* Ambient glows */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-1/2 left-0 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none -translate-x-1/2" />

      <div className="relative z-10 mx-auto max-w-[92rem] space-y-8 pb-20 pt-4 px-3 sm:px-4">
        
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="relative overflow-hidden rounded-[1.6rem] border border-white/70 bg-gradient-to-br from-white/85 via-white/70 to-indigo-50/70 px-5 py-5 shadow-[0_22px_56px_-40px_rgba(99,102,241,0.35)] backdrop-blur-2xl dark:border-white/10 dark:from-zinc-900/85 dark:via-zinc-900/72 dark:to-indigo-500/10 md:px-6 md:py-6"
        >
          <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-indigo-200/35 via-indigo-100/10 to-transparent dark:from-indigo-500/15 dark:via-indigo-500/5" />
          <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-xl">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.28em] text-indigo-500 mb-3">
                <Disc3 size={14} className="animate-spin-slow" /> Telecloud Streaming
              </div>
              <h1 className="text-[2rem] md:text-[2.4rem] font-extrabold tracking-tight text-gray-900 dark:text-white">Your Library</h1>
              <p className="mt-2.5 max-w-lg text-[13px] font-medium leading-5.5 text-zinc-500 dark:text-zinc-400">
                High-fidelity audio streaming. Search for tracks, resume recent plays, and build an infinite queue.
              </p>
            </div>

            <div className="relative w-full xl:w-auto xl:max-w-[40rem]">
              <div className="flex flex-wrap items-center gap-1.5 rounded-[1.25rem] border border-white/80 bg-white/75 p-2 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.18)] backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/45 dark:shadow-none xl:justify-end">
                {curatedSearchChips.map((chip, idx) => (
                  <motion.button
                    key={chip}
                    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.05 }}
                    type="button"
                    onClick={() => updateSearchParams({ q: chip, pick: '' })}
                    className="rounded-[1rem] border border-transparent bg-zinc-50/95 px-3 py-2 text-[11px] font-bold text-zinc-600 shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-500/30 hover:bg-white hover:text-indigo-600 hover:shadow-[0_12px_30px_-22px_rgba(99,102,241,0.8)] active:scale-95 dark:bg-zinc-900/90 dark:text-zinc-300 dark:hover:border-indigo-400/40 dark:hover:bg-zinc-900 dark:hover:text-indigo-300"
                  >
                    {chip}
                  </motion.button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {libraryError && (
          <div className="bg-red-50/80 dark:bg-red-500/10 backdrop-blur-md border border-red-200 dark:border-red-500/20 rounded-2xl p-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-red-800 dark:text-red-400">Library Sync Failed</p>
              <p className="text-xs font-medium text-red-600/80 dark:text-red-400/80 mt-1">{libraryError}</p>
            </div>
            <button type="button" className="px-4 py-2 bg-white dark:bg-zinc-900 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-300 border border-gray-200 dark:border-zinc-700 hover:bg-gray-50 flex items-center gap-2 shadow-sm" onClick={() => loadLibrary()}>
              <RefreshCcw size={14} /> Retry Sync
            </button>
          </div>
        )}

        <AnimatePresence mode="wait">
          {query && (
            <motion.section
              key={`search-${query}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20, height: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-gray-200/50 dark:border-zinc-800/50">
                <div>
                  <h2 className="text-xl font-bold tracking-tight">Search Results</h2>
                  <p className="text-xs font-medium text-zinc-500 mt-1">Showing matches for "{query}"</p>
                </div>
                <button type="button" className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors px-3 py-1.5 bg-gray-100 dark:bg-zinc-800/50 rounded-lg" onClick={() => updateSearchParams({ q: '', pick: '' })}>
                  Clear Search
                </button>
              </div>

              {searchLoading ? (
                <SectionSkeleton variant="rows" count={5} />
              ) : searchError ? (
                <EmptyMusicState title="Search hit a snag" description={searchError} compact action={
                  <button type="button" className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold flex items-center gap-2" onClick={() => runSearch(query, { remember: true })}>
                    <RefreshCcw size={14} /> Retry Search
                  </button>
                } />
              ) : !searchResults.length ? (
                <EmptyMusicState title="No tracks matched" description="Try another spelling, artist name, or use the quick mood chips." compact />
              ) : (
                <motion.div variants={containerVariants} initial="hidden" animate="visible" className="bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-gray-200/50 dark:border-zinc-800/50 rounded-2xl p-2">
                  {searchResults.map((track, index) => (
                    <motion.div key={track.videoId} variants={itemVariants}>
                      <TrackListRow
                        track={track}
                        index={index}
                        isLiked={likedSongIds.has(track.videoId)}
                        onPlay={() => playCollection(searchResults, index)}
                        onToggleLike={() => toggleLike(track)}
                        onPlayNext={() => playNextNow(track)}
                        onAddToQueue={() => addToQueue(track)}
                        onAddToPlaylist={() => openPlaylistModal(track)}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </motion.section>
          )}
        </AnimatePresence>

        <LazySection placeholder={<SectionSkeleton variant="rows" count={4} />}>
          <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-200/50 dark:border-zinc-800/50">
              <div>
                <h2 className="text-xl font-bold tracking-tight">Continue Listening</h2>
                <p className="text-xs font-medium text-zinc-500 mt-1">Resume from your recent sessions.</p>
              </div>
              {recentlyPlayed.length > 6 && (
                <button type="button" className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-indigo-500 hover:text-indigo-600 transition-colors px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg" onClick={() => setShowAllHistory((v) => !v)}>
                  <Clock3 size={14} /> {showAllHistory ? 'Collapse' : 'View All'}
                </button>
              )}
            </div>

            {libraryLoading ? (
              <SectionSkeleton variant="rows" count={5} />
            ) : historyTracks.length ? (
              <div className="bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-gray-200/50 dark:border-zinc-800/50 rounded-2xl p-2 space-y-1">
                {historyTracks.map((track, index) => (
                  <TrackListRow
                    key={track.videoId}
                    track={track}
                    index={index}
                    isLiked={likedSongIds.has(track.videoId)}
                    onPlay={() => playCollection(recentlyPlayed, recentlyPlayed.findIndex((item) => item.videoId === track.videoId))}
                    onToggleLike={() => toggleLike(track)}
                    onPlayNext={() => playNextNow(track)}
                    onAddToQueue={() => addToQueue(track)}
                    onAddToPlaylist={() => openPlaylistModal(track)}
                  />
                ))}
              </div>
            ) : (
              <EmptyMusicState title="No listening history" description="Play a few tracks and your recent sessions will appear here." />
            )}
          </motion.section>
        </LazySection>

        <LazySection placeholder={<SectionSkeleton variant="rows" count={4} />}>
          <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }}>
            {discoveryLoading ? (
              <SectionSkeleton variant="rows" count={6} />
            ) : (
              <ShowcaseShelf
                title="Quick Picks"
                subtitle={quickPickSeeds.length ? `Algorithmically mixed from ${quickPickSeeds[0]?.title}.` : 'Curated based on your listening habits.'}
                icon={Sparkles}
                tracks={historyQuickPicks}
                onPlayTrack={(track) => playCollection(historyQuickPicks, historyQuickPicks.findIndex((item) => item.videoId === track.videoId))}
                onPlayAll={() => playCollection(historyQuickPicks, 0)}
              />
            )}
          </motion.section>
        </LazySection>

        <LazySection placeholder={<SectionSkeleton variant="rows" count={4} />}>
          <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }}>
            {discoveryLoading ? (
              <SectionSkeleton variant="rows" count={6} />
            ) : (
              <ShowcaseShelf
                title="Recommended For You"
                subtitle={personalizedSeeds.length ? `Based on your love for ${personalizedSeeds[0]?.title} and more.` : 'Personalized picks powered by your listening patterns.'}
                icon={Heart}
                tracks={personalizedTracks}
                onPlayTrack={(track) => playCollection(personalizedTracks, personalizedTracks.findIndex((item) => item.videoId === track.videoId))}
                onPlayAll={() => playCollection(personalizedTracks, 0)}
              />
            )}
          </motion.section>
        </LazySection>

        <LazySection placeholder={<SectionSkeleton />} rootMargin="320px 0px">
          <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} className="space-y-4">
            <div className="pb-2 border-b border-gray-200/50 dark:border-zinc-800/50 flex items-center justify-between">
              <div>
                <h2 className="text-xl md:text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">Playlists</h2>
                <p className="text-xs font-medium text-zinc-500 mt-1">Curated collections for every mood and moment.</p>
              </div>
            </div>

            {discoveryLoading ? (
              <SectionSkeleton />
            ) : readyPlaylists.length ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {readyPlaylists.map((playlist) => (
                  <ReleaseCard
                    key={`${playlist.playlistId}-${playlist.title}`}
                    playlist={playlist}
                    onOpen={() => openEditorialPlaylist(playlist)}
                  />
                ))}
              </div>
            ) : (
              <EmptyMusicState title="Playlists unavailable" description="Curated playlists are syncing. Check back shortly." compact />
            )}
          </motion.section>
        </LazySection>

        <LazySection placeholder={<SectionSkeleton />}>
          <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-200/50 dark:border-zinc-800/50">
              <div>
                <h2 className="text-xl font-bold tracking-tight">Your Playlists</h2>
                <p className="text-xs font-medium text-zinc-500 mt-1">Private collections and saved tracks.</p>
              </div>
              <button type="button" className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-sm active:scale-[0.98]" onClick={() => openPlaylistModal()}>
                <Music2 size={14} /> New Playlist
              </button>
            </div>

            {libraryLoading ? (
              <SectionSkeleton />
            ) : playlists.length ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                {playlists.map((playlist) => (
                  <PlaylistCard
                    key={playlist._id}
                    playlist={playlist}
                    onOpen={() => navigate(`/music/playlists?playlist=${playlist._id}`)}
                    onPlay={() => {
                      if (!(playlist.tracks || []).length) {
                        toast.error('This playlist is empty.')
                        return
                      }
                      playCollection(playlist.tracks || [], 0)
                    }}
                  />
                ))}
              </div>
            ) : (
              <EmptyMusicState title="No playlists yet" description="Create a playlist to start organizing your library." />
            )}
          </motion.section>
        </LazySection>

        <PlaylistModal
          open={playlistModalOpen}
          track={selectedTrackForPlaylist}
          playlists={playlists.filter((playlist) => !playlist.isSystem)}
          playlistName={playlistName}
          playlistDescription={playlistDescription}
          loading={playlistLoading}
          error={playlistError}
          onNameChange={setPlaylistName}
          onDescriptionChange={setPlaylistDescription}
          onCreate={createPlaylist}
          onPickPlaylist={addSongToPlaylist}
          onClose={closePlaylistModal}
        />
      </div>
    </div>
  )
}
