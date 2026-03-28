import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Heart, Loader2, Pencil, Play, RefreshCcw, 
  Shuffle, Trash2, ListPlus, PlaySquare, X, Disc3, Music2
} from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Artwork, EmptyMusicState } from '../components/music/MusicCards'
import { musicAPI } from '../services/api'
import useStore from '../store/useStore'
import {
  formatTrackDuration,
  getArtworkGradient,
  getPlaylistTrackCountLabel,
  getTrackMetaLine,
} from '../utils/music'

// Premium background pattern
const CanvasBackground = () => (
  <div 
    className="fixed inset-0 z-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
    style={{
      backgroundImage: `radial-gradient(currentColor 1px, transparent 1px)`,
      backgroundSize: '32px 32px'
    }}
  />
)

// Fluid Animation Variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.03 } }
}

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 400, damping: 30 } }
}

const shuffleTracks = (tracks = []) => {
  const next = [...tracks]
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[next[index], next[swapIndex]] = [next[swapIndex], next[index]]
  }
  return next
}

const buildFallbackPlaylist = (query, tracks = [], playlistId = '') => {
  const safeTracks = Array.isArray(tracks) ? tracks.filter((track) => track?.videoId) : []
  if (!safeTracks.length) return null

  return {
    playlistId,
    browseId: playlistId,
    name: query,
    title: query,
    description: 'Built from matching songs because the original playlist source was unavailable.',
    author: 'Telecloud Music',
    cover: safeTracks[0]?.thumbnail || '',
    thumbnail: safeTracks[0]?.thumbnail || '',
    trackCount: safeTracks.length,
    tracks: safeTracks,
    isExternal: true,
  }
}

export default function MusicPlaylists() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [libraryLoading, setLibraryLoading] = useState(true)
  const [libraryError, setLibraryError] = useState('')
  const [browseLoading, setBrowseLoading] = useState(false)
  const [browseError, setBrowseError] = useState('')
  const [externalPlaylist, setExternalPlaylist] = useState(null)
  
  const [renameOpen, setRenameOpen] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [busyId, setBusyId] = useState('')
  const [deleteBusy, setDeleteBusy] = useState(false)

  const browseId = searchParams.get('browseId') || ''
  const browseQuery = searchParams.get('query') || ''
  const requestedPlaylistId = browseId || browseQuery ? '' : searchParams.get('playlist') || ''

  const playlists = useStore((state) => state.playlists)
  const likedSongs = useStore((state) => state.likedSongs)
  const currentTrack = useStore((state) => state.musicQueue[state.currentTrackIndex] || null)
  const setLikedSongsLocal = useStore((state) => state.setLikedSongsLocal)
  const setPlaylistsLocal = useStore((state) => state.setPlaylistsLocal)
  const upsertPlaylistLocal = useStore((state) => state.upsertPlaylistLocal)
  const removePlaylistLocal = useStore((state) => state.removePlaylistLocal)
  const selectedPlaylistId = useStore((state) => state.selectedPlaylistId)
  const setSelectedPlaylistId = useStore((state) => state.setSelectedPlaylistId)
  const startPlayback = useStore((state) => state.startPlayback)
  const addToQueue = useStore((state) => state.addToQueue)
  const playNextNow = useStore((state) => state.playNextNow)

  const likedSongIds = useMemo(
    () => new Set(likedSongs.map((track) => track.videoId)),
    [likedSongs]
  )

  const activePlaylistId = useMemo(() => {
    const candidates = [requestedPlaylistId, selectedPlaylistId, playlists[0]?._id].filter(Boolean)
    return candidates.find((id) => playlists.some((playlist) => playlist._id === id)) || ''
  }, [playlists, requestedPlaylistId, selectedPlaylistId])

  const activePlaylist = useMemo(
    () => playlists.find((playlist) => playlist._id === activePlaylistId) || null,
    [activePlaylistId, playlists]
  )

  const displayPlaylist = browseId || browseQuery ? externalPlaylist : activePlaylist
  const displayTracks = displayPlaylist?.tracks || []
  const isExternalPlaylist = Boolean(browseId || browseQuery)
  const mainLoading = isExternalPlaylist ? browseLoading : libraryLoading
  const mainError = isExternalPlaylist ? browseError : libraryError

  const updateSearchParams = (updates = {}) => {
    const next = new URLSearchParams(searchParams)
    Object.entries(updates).forEach(([key, value]) => {
      if (!value) next.delete(key)
      else next.set(key, value)
    })
    setSearchParams(next)
  }

  const loadLibrary = async () => {
    setLibraryLoading(true)
    setLibraryError('')

    try {
      const [playlistsRes, likedRes] = await Promise.all([
        musicAPI.playlists(),
        musicAPI.liked(),
      ])

      const nextPlaylists = playlistsRes?.data?.data?.playlists || []
      setPlaylistsLocal(nextPlaylists)
      setLikedSongsLocal(likedRes?.data?.data?.items || [])

      const fallbackId = [requestedPlaylistId, selectedPlaylistId, nextPlaylists[0]?._id]
        .filter(Boolean)
        .find((id) => nextPlaylists.some((playlist) => playlist._id === id)) || ''

      if (fallbackId) {
        setSelectedPlaylistId(fallbackId)
        if (!browseId && !browseQuery) updateSearchParams({ playlist: fallbackId })
      }
    } catch (loadError) {
      setLibraryError(loadError?.response?.data?.message || 'Unable to load playlists.')
    } finally {
      setLibraryLoading(false)
    }
  }

  const loadBrowsePlaylist = async () => {
    if (!browseId && !browseQuery) {
      setExternalPlaylist(null)
      setBrowseError('')
      return
    }

    setBrowseLoading(true)
    setBrowseError('')

    try {
      const { data } = await musicAPI.browsePlaylist(browseId, 80, browseQuery)
      const playlist = data?.data?.playlist || null
      if (playlist?.tracks?.length) {
        setExternalPlaylist({
          ...playlist,
          cover:
            playlist.cover ||
            playlist.thumbnail ||
            playlist.tracks?.[0]?.thumbnail ||
            '',
        })
        return
      }
      throw new Error('Playlist did not contain playable songs.')
    } catch (loadError) {
      if (browseQuery) {
        try {
          const searchRes = await musicAPI.search(browseQuery, 30)
          const fallbackPlaylist = buildFallbackPlaylist(
            browseQuery,
            searchRes?.data?.data?.results || [],
            browseId
          )

          if (fallbackPlaylist) {
            setExternalPlaylist(fallbackPlaylist)
            setBrowseError('')
            return
          }
        } catch (_fallbackError) { }
      }

      setExternalPlaylist(null)
      setBrowseError(loadError?.response?.data?.message || loadError?.message || 'Unable to open this playlist.')
    } finally {
      setBrowseLoading(false)
    }
  }

  useEffect(() => { loadLibrary() }, [])
  useEffect(() => { loadBrowsePlaylist() }, [browseId, browseQuery])

  useEffect(() => {
    if (browseId || browseQuery) return
    if (activePlaylistId && requestedPlaylistId !== activePlaylistId) {
      updateSearchParams({ playlist: activePlaylistId })
    }
    if (activePlaylistId) setSelectedPlaylistId(activePlaylistId)
  }, [activePlaylistId, browseId, browseQuery, requestedPlaylistId, setSelectedPlaylistId])

  useEffect(() => {
    if (!browseId && !browseQuery && activePlaylist && !renameOpen) {
      setRenameValue(activePlaylist.name || '')
    }
  }, [activePlaylist?._id, browseId, browseQuery, renameOpen])

  const openPlaylist = (playlistId) => {
    setSelectedPlaylistId(playlistId)
    setRenameOpen(false)
    updateSearchParams({ playlist: playlistId, browseId: '', query: '' })
  }

  const playAll = () => {
    if (!displayTracks.length) return toast.error('This playlist is empty.')
    startPlayback(displayTracks, 0)
  }

  const shufflePlay = () => {
    if (!displayTracks.length) return toast.error('This playlist is empty.')
    startPlayback(shuffleTracks(displayTracks), 0)
  }

  const renamePlaylist = async () => {
    if (!activePlaylist || activePlaylist.isSystem || isExternalPlaylist) return
    const nextName = renameValue.trim()
    if (!nextName) return

    setBusyId(activePlaylist._id)
    try {
      const { data } = await musicAPI.renamePlaylist(activePlaylist._id, nextName)
      if (data?.data?.playlist) upsertPlaylistLocal(data.data.playlist)
      setRenameOpen(false)
      toast.success('Playlist renamed.', { icon: '✏️' })
    } catch (renameError) {
      toast.error(renameError?.response?.data?.message || 'Could not rename playlist.')
    } finally {
      setBusyId('')
    }
  }

  const toggleLike = async (track) => {
    try {
      const { data } = await musicAPI.toggleLike(track)
      setLikedSongsLocal(data?.data?.items || [])
      if (data?.data?.playlist) upsertPlaylistLocal(data.data.playlist)
    } catch (toggleError) {
      toast.error(toggleError?.response?.data?.message || 'Could not update liked songs.')
    }
  }

  const removeTrack = async (videoId) => {
    if (!activePlaylist?._id || isExternalPlaylist) return

    setBusyId(videoId)
    try {
      const { data } = await musicAPI.removeFromPlaylist(activePlaylist._id, videoId)
      if (data?.data?.playlist) upsertPlaylistLocal(data.data.playlist)
      if (activePlaylist.isLikedSongs) {
        const nextLiked = likedSongs.filter((track) => track.videoId !== videoId)
        setLikedSongsLocal(nextLiked)
      }
      toast.success(activePlaylist.isLikedSongs ? 'Removed from liked songs.' : 'Removed from playlist.')
    } catch (removeError) {
      toast.error(removeError?.response?.data?.message || 'Could not remove track.')
    } finally {
      setBusyId('')
    }
  }

  const deletePlaylist = async () => {
    if (!activePlaylist || activePlaylist.isSystem || isExternalPlaylist) return
    const confirmed = window.confirm(`Delete "${activePlaylist.name}"?`)
    if (!confirmed) return

    setDeleteBusy(true)
    try {
      await musicAPI.deletePlaylist(activePlaylist._id)
      removePlaylistLocal(activePlaylist._id)
      const nextId = playlists.find((playlist) => playlist._id !== activePlaylist._id)?._id || ''
      if (nextId) {
        openPlaylist(nextId)
      } else {
        updateSearchParams({ playlist: '', browseId: '' })
        setSelectedPlaylistId('')
      }
      toast.success('Playlist deleted.')
    } catch (deleteError) {
      toast.error(deleteError?.response?.data?.message || 'Could not delete playlist.')
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <div className="relative min-h-screen bg-gray-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-x-hidden pt-6 pb-24">
      <CanvasBackground />

      <div className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-6 flex flex-col space-y-6">
        
        {/* --- COMPACT HORIZONTAL COLLECTIONS STRIP --- */}
        <div className="w-full">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Your Collections</h2>
            <button onClick={loadLibrary} className="text-zinc-400 hover:text-indigo-500 transition-colors" title="Sync Library">
              <RefreshCcw size={14} />
            </button>
          </div>
          
          {libraryLoading ? (
            <div className="flex gap-3 overflow-hidden">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="w-32 h-10 rounded-full bg-gray-200 dark:bg-zinc-800/50 animate-pulse shrink-0" />
              ))}
            </div>
          ) : playlists.length ? (
            <div className="flex items-center gap-3 overflow-x-auto pb-4 pt-1 custom-scrollbar snap-x">
              {playlists.map((playlist) => {
                const isActive = !browseId && playlist._id === activePlaylistId
                return (
                  <button
                    key={playlist._id}
                    type="button"
                    onClick={() => openPlaylist(playlist._id)}
                    className={`flex items-center gap-2.5 p-1 pr-4 rounded-full transition-all snap-start shrink-0 shadow-sm
                      ${isActive
                        ? 'bg-indigo-600 text-white shadow-indigo-500/30 border-transparent'
                        : 'bg-white dark:bg-zinc-900/60 border border-gray-200 dark:border-zinc-800 hover:border-indigo-500/50 hover:shadow-md text-gray-900 dark:text-zinc-200 backdrop-blur-md'
                      }`}
                  >
                    <Artwork
                      src={playlist.cover} alt={playlist.name} seed={playlist.name}
                      className="w-8 h-8 rounded-full object-cover shrink-0"
                    />
                    <span className="text-xs font-bold truncate max-w-[120px]">
                      {playlist.name}
                    </span>
                    {playlist.isLikedSongs && <Heart size={12} className={`shrink-0 ${isActive ? 'text-pink-300 fill-pink-300' : 'text-pink-500 fill-pink-500'}`} />}
                  </button>
                )
              })}
            </div>
          ) : (
             <p className="text-xs font-medium text-zinc-500">No private collections found.</p>
          )}
        </div>

        {/* --- MAIN FULLSCREEN PLAYLIST VIEW --- */}
        <section className="flex-1 w-full min-w-0">
          {mainLoading ? (
            <div className="h-[50vh] rounded-[2.5rem] bg-gray-200/50 dark:bg-zinc-900/50 animate-pulse" />
          ) : mainError ? (
            <EmptyMusicState title="Playlist view unavailable" description={mainError} action={<button type="button" className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold shadow-md" onClick={isExternalPlaylist ? loadBrowsePlaylist : loadLibrary}>Retry Connection</button>} />
          ) : !displayPlaylist ? (
            <EmptyMusicState title="No workspace selected" description="Select a collection from your library to view its contents." />
          ) : (
            <div className="flex flex-col gap-6">
              
              {/* MASSIVE IMMERSIVE HEADER */}
              <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="relative overflow-hidden rounded-[2.5rem] border border-white/40 dark:border-zinc-700/50 shadow-2xl shadow-indigo-500/5 dark:shadow-none"
              >
                {/* Dynamic Background Blur */}
                <div className="absolute inset-0 opacity-50 dark:opacity-70" style={getArtworkGradient(displayPlaylist.playlistId || displayPlaylist.name)} />
                <div className="absolute inset-0 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-3xl" />

                <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center md:items-end p-8 md:p-12">
                  <Artwork
                    src={displayPlaylist.cover || displayPlaylist.thumbnail}
                    alt={displayPlaylist.name || displayPlaylist.title}
                    seed={displayPlaylist.playlistId || displayPlaylist.name}
                    className="w-56 h-56 md:w-64 md:h-64 lg:w-72 lg:h-72 rounded-[2rem] object-cover shadow-[0_20px_50px_-12px_rgba(0,0,0,0.6)] border border-white/20 dark:border-white/5 shrink-0"
                  />

                  <div className="space-y-5 text-center md:text-left flex-1 min-w-0">
                    <div>
                      <p className="text-[10px] md:text-xs font-bold uppercase tracking-[0.3em] text-indigo-600 dark:text-indigo-400 mb-2 md:mb-3">
                        {isExternalPlaylist ? 'Curated Feed' : displayPlaylist.isLikedSongs ? 'System Collection' : 'Private Playlist'}
                      </p>
                      <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight text-gray-900 dark:text-white truncate">
                        {displayPlaylist.name || displayPlaylist.title}
                      </h1>
                      <p className="text-sm md:text-base font-medium text-zinc-700 dark:text-zinc-300 mt-4 max-w-3xl leading-relaxed line-clamp-3">
                        {displayPlaylist.description || (isExternalPlaylist ? 'Explore this curated feed with shuffle and infinite playback.' : 'A custom queue-ready collection built for continuous listening.')}
                      </p>
                    </div>

                    {/* Meta Tags */}
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                      <span className="px-3 py-1.5 bg-black/5 dark:bg-white/10 rounded-full text-xs font-bold text-gray-800 dark:text-zinc-200 backdrop-blur-md">
                        {getPlaylistTrackCountLabel(displayPlaylist.trackCount)}
                      </span>
                      {displayPlaylist.author && (
                        <span className="px-3 py-1.5 bg-black/5 dark:bg-white/10 rounded-full text-xs font-bold text-gray-800 dark:text-zinc-200 backdrop-blur-md">
                          {displayPlaylist.author}
                        </span>
                      )}
                      {isExternalPlaylist && (
                        <span className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400 flex items-center gap-1 backdrop-blur-md">
                          <Disc3 size={12} /> External Source
                        </span>
                      )}
                    </div>

                    {/* Action Bar */}
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
                      <button type="button" className="flex items-center gap-2 px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold shadow-[0_8px_20px_-6px_rgba(79,70,229,0.5)] transition-all active:scale-95" onClick={playAll}>
                        <Play size={18} className="fill-current" /> Play Queue
                      </button>
                      <button type="button" className="flex items-center gap-2 px-6 py-3.5 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-md border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white rounded-xl text-sm font-bold hover:bg-white dark:hover:bg-zinc-700 transition-all shadow-sm active:scale-95" onClick={shufflePlay}>
                        <Shuffle size={18} /> Shuffle
                      </button>
                      
                      {!isExternalPlaylist && !displayPlaylist.isSystem && (
                        <>
                          <div className="w-px h-8 bg-gray-300 dark:bg-zinc-700/50 mx-2 hidden sm:block" />
                          <button type="button" className="p-3.5 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-md border border-gray-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-xl hover:text-indigo-500 dark:hover:text-indigo-400 transition-all shadow-sm" onClick={() => setRenameOpen((v) => !v)} title="Rename Playlist">
                            <Pencil size={18} />
                          </button>
                          <button type="button" className="p-3.5 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-md border border-gray-200 dark:border-zinc-700 text-red-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 transition-all shadow-sm" disabled={deleteBusy} onClick={deletePlaylist} title="Delete Playlist">
                            {deleteBusy ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                          </button>
                        </>
                      )}
                    </div>

                    {/* Inline Rename Form */}
                    <AnimatePresence>
                      {renameOpen && !isExternalPlaylist && !displayPlaylist.isSystem && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="pt-4 overflow-hidden">
                          <div className="flex items-center gap-3 bg-white/50 dark:bg-zinc-900/50 p-2 rounded-xl border border-gray-200 dark:border-zinc-700 backdrop-blur-md max-w-md">
                            <input
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              className="flex-1 bg-transparent px-3 py-2 text-sm font-bold focus:outline-none placeholder:text-zinc-500 text-gray-900 dark:text-white"
                              placeholder="New playlist name..."
                              autoFocus
                            />
                            <button type="button" className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-xs font-bold disabled:opacity-50 flex items-center gap-2" disabled={busyId === displayPlaylist._id || !renameValue.trim()} onClick={renamePlaylist}>
                              {busyId === displayPlaylist._id ? <Loader2 size={14} className="animate-spin" /> : 'Save'}
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>

              {/* TRACKS LIST (Edge-to-Edge inside container) */}
              {displayTracks.length ? (
                <div className="w-full">
                  <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-1.5">
                    {displayTracks.map((track, index) => {
                      const durationText = formatTrackDuration(track.duration)
                      const isPlaying = currentTrack?.videoId === track.videoId

                      return (
                        <motion.div
                          key={`${track.videoId}-${index}`}
                          variants={itemVariants}
                          className={`group relative flex items-center gap-3 md:gap-4 p-2 md:p-3 rounded-2xl transition-all
                            ${isPlaying 
                              ? 'bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 shadow-sm' 
                              : 'bg-white/40 dark:bg-zinc-900/20 border border-transparent hover:border-gray-200/80 dark:hover:border-zinc-700/80 hover:bg-white dark:hover:bg-zinc-800/60 backdrop-blur-md'
                            }
                          `}
                        >
                          {/* Track Number / Play Button */}
                          <button type="button" onClick={() => startPlayback(displayTracks, index)} className="relative w-10 h-10 shrink-0 flex items-center justify-center text-sm font-bold text-zinc-400 dark:text-zinc-500">
                            <span className="group-hover:opacity-0 transition-opacity">{index + 1}</span>
                            <div className="absolute inset-0 bg-indigo-600 text-white rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100 shadow-md">
                              <Play size={16} className="fill-current ml-0.5" />
                            </div>
                          </button>

                          {/* Artwork */}
                          <Artwork src={track.thumbnail} alt={track.title} seed={track.videoId || track.title} className="w-12 h-12 md:w-14 md:h-14 rounded-xl object-cover shrink-0 shadow-sm" />

                          {/* Info */}
                          <div className="min-w-0 flex-1 cursor-pointer" onClick={() => startPlayback(displayTracks, index)}>
                            <p className={`text-sm md:text-base font-bold truncate ${isPlaying ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-900 dark:text-zinc-100'}`}>
                              {track.title}
                            </p>
                            <p className="text-[11px] md:text-xs font-medium text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                              {getTrackMetaLine(track) || track.artist}
                            </p>
                          </div>

                          {/* Hover Action Menu */}
                          <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                            <button type="button" className="p-2 text-zinc-400 hover:text-pink-500 hover:bg-pink-50 dark:hover:bg-pink-500/10 rounded-lg transition-colors" onClick={() => toggleLike(track)} title={likedSongIds.has(track.videoId) ? 'Unlike' : 'Like'}>
                              <Heart size={18} className={likedSongIds.has(track.videoId) ? 'text-pink-500 fill-pink-500' : ''} />
                            </button>
                            <button type="button" className="hidden sm:block p-2 text-zinc-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors" onClick={() => playNextNow(track)} title="Play Next">
                              <PlaySquare size={18} />
                            </button>
                            <button type="button" className="hidden sm:block p-2 text-zinc-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors" onClick={() => addToQueue(track)} title="Add to Queue">
                              <ListPlus size={18} />
                            </button>
                            {!isExternalPlaylist && (
                              <button type="button" className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors" disabled={busyId === track.videoId} onClick={() => removeTrack(track.videoId)} title="Remove from Playlist">
                                {busyId === track.videoId ? <Loader2 size={18} className="animate-spin text-red-500" /> : <X size={18} />}
                              </button>
                            )}
                          </div>

                          {/* Duration */}
                          {durationText !== '--:--' && (
                            <span className="hidden sm:block text-xs font-bold text-zinc-400 shrink-0 w-12 text-right">
                              {durationText}
                            </span>
                          )}
                        </motion.div>
                      )
                    })}
                  </motion.div>
                </div>
              ) : (
                <EmptyMusicState title="This collection is empty" description={displayPlaylist.isLikedSongs ? 'Like a song anywhere in the app and it appears here instantly.' : 'Add songs from the music home page to build this playlist.'} />
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}