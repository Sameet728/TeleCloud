import { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu, Search, Moon, Sun, X, Download, Sparkles } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { searchAPI, filesAPI, musicAPI } from '../services/api'
import { formatBytes, getMimeCategory, formatDateShort } from '../utils/helpers'
import FileIcon from '../utils/fileIcons'
import PreviewModal from './PreviewModal'
import { Artwork } from './music/MusicCards'
import toast from 'react-hot-toast'
import AdSlot, { useAdGuard } from './AdBanner'
import { useSubscription } from '../store/useSubscription'
import UI_LAYERS from '../constants/uiLayers'

const routeMeta = [
  {
    match: (pathname) => pathname.startsWith('/dashboard'),
    kicker: 'Operations',
    title: 'Control center',
    hint: 'Monitor storage, activity, and connection health.',
  },
  {
    match: (pathname) => pathname.startsWith('/folder/'),
    kicker: 'Workspace',
    title: 'Folder explorer',
    hint: 'Move faster through nested folders and shared assets.',
  },
  {
    match: (pathname) => pathname.startsWith('/files'),
    kicker: 'Workspace',
    title: 'File explorer',
    hint: 'Browse, upload, and organize your personal cloud vault.',
  },
  {
    match: (pathname) => pathname.startsWith('/starred'),
    kicker: 'Library',
    title: 'Starred assets',
    hint: 'Keep important media and folders one tap away.',
  },
  {
    match: (pathname) => pathname.startsWith('/images'),
    kicker: 'Library',
    title: 'Image gallery',
    hint: 'Visual assets arranged for fast preview and sharing.',
  },
  {
    match: (pathname) => pathname.startsWith('/videos'),
    kicker: 'Library',
    title: 'Video library',
    hint: 'Preview and manage your saved streams and clips.',
  },
  {
    match: (pathname) => pathname.startsWith('/shared'),
    kicker: 'Delivery',
    title: 'Shared links',
    hint: 'Control external access with premium link management.',
  },
  {
    match: (pathname) => pathname.startsWith('/music'),
    kicker: 'Streaming',
    title: 'Music hub',
    hint: 'Search tracks, jump back in, and keep your queue flowing.',
  },
]

export default function Navbar({ onMenuClick }) {
  const { dark, toggle } = useTheme()
  const { isFreePlan } = useSubscription()
  const navigate = useNavigate()
  const location = useLocation()
  const canShowAds = useAdGuard()
  const timerRef = useRef(null)
  const inputRef = useRef(null)

  const [q, setQ] = useState('')
  const [searching, setSearching] = useState(false)
  const [fileResults, setFileResults] = useState(null)
  const [musicResults, setMusicResults] = useState([])
  const [previewFile, setPreviewFile] = useState(null)

  const isMusicRoute = location.pathname.startsWith('/music')
  const musicQuery = useMemo(
    () => new URLSearchParams(location.search).get('q') || '',
    [location.search]
  )
  const pageMeta =
    routeMeta.find((entry) => entry.match(location.pathname)) || routeMeta[0]
  const showFreeNavbarAd = isFreePlan && canShowAds

  useEffect(() => {
    if (isMusicRoute) {
      setQ(musicQuery)
      setFileResults(null)
    } else {
      setQ('')
      setMusicResults([])
      setFileResults(null)
    }
  }, [isMusicRoute, musicQuery])

  useEffect(() => {
    clearTimeout(timerRef.current)

    if (!q.trim()) {
      setFileResults(null)
      setMusicResults([])
      return
    }

    timerRef.current = setTimeout(async () => {
      setSearching(true)

      try {
        if (isMusicRoute) {
          const { data } = await musicAPI.search(q, 6)
          setMusicResults(data?.data?.results || [])
        } else {
          const { data } = await searchAPI.search(q)
          setFileResults(data?.data?.results || null)
        }
      } catch {
        if (isMusicRoute) setMusicResults([])
        else setFileResults(null)
      } finally {
        setSearching(false)
      }
    }, 320)

    return () => clearTimeout(timerRef.current)
  }, [isMusicRoute, q])

  const clear = () => {
    setQ('')
    setFileResults(null)
    setMusicResults([])
    if (isMusicRoute) navigate(location.pathname)
  }

  const handleFileClick = (file) => {
    clear()
    const cat = getMimeCategory(file.mimeType, file.fileName)

    if (['image', 'video', 'pdf', 'audio', 'code', 'sheet', 'doc'].includes(cat)) {
      setPreviewFile(file)
      return
    }

    toast.success('Download starting...')
    window.location.href = filesAPI.downloadUrl(file._id)
  }

  const handleMusicTrackClick = (track) => {
    setMusicResults([])
    navigate(`/music?q=${encodeURIComponent(track.title)}&pick=${encodeURIComponent(track.videoId)}`)
  }

  const submitSearch = (event) => {
    if (!isMusicRoute) return
    event.preventDefault()
    const nextQuery = q.trim()
    if (!nextQuery) return
    navigate(`/music?q=${encodeURIComponent(nextQuery)}`)
  }

  const menuButton = (
    <button
      type="button"
      onClick={onMenuClick}
      className="inline-flex app-icon-button lg:hidden"
      aria-label="Open menu"
    >
      <Menu size={18} />
    </button>
  )

  const themeButton = (
    <motion.button
      whileHover={{ scale: 1.05, rotate: dark ? 180 : 0 }}
      whileTap={{ scale: 0.95 }}
      onClick={toggle}
      className="app-icon-button shrink-0"
      aria-label="Toggle theme"
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </motion.button>
  )

  const searchSurface = (
    <div className="relative min-w-0 flex-1" style={{ zIndex: UI_LAYERS.search }}>
      <form className="relative" onSubmit={submitSearch}>
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
        />
        <input
          ref={inputRef}
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder={
            isMusicRoute
              ? 'Search songs, artists, albums...'
              : 'Search files and folders...'
          }
          className="app-input-surface h-8 pl-9 pr-9"
        />
        {q ? (
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            type="button"
            onClick={clear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 transition-colors hover:text-zinc-700 dark:hover:text-zinc-200"
          >
            <X size={15} />
          </motion.button>
        ) : null}
      </form>

      <AnimatePresence>
        {isMusicRoute && q.trim() ? (
          <motion.div
            key="music-search"
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 360, damping: 30 }}
            className="app-panel absolute left-0 right-0 top-full mt-1.5 overflow-hidden"
            style={{ zIndex: UI_LAYERS.searchDropdown }}
          >
            {searching && !musicResults.length ? (
              <p className="p-3 text-center text-[11px] text-zinc-400">Searching songs...</p>
            ) : musicResults.length ? (
              <div className="max-h-64 overflow-y-auto divide-y divide-black/5 dark:divide-white/5">
                {musicResults.map((track) => (
                  <motion.button
                    key={track.videoId}
                    type="button"
                    onClick={() => handleMusicTrackClick(track)}
                    whileHover={{ backgroundColor: 'rgba(99,102,241,0.06)' }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors"
                  >
                    <Artwork
                      src={track.thumbnail}
                      alt={track.title}
                      seed={track.videoId || track.title}
                      className="h-9 w-9 shrink-0 rounded-[0.9rem] bg-gray-100 object-cover shadow-sm dark:bg-gray-800"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-gray-900 dark:text-white">
                        {track.title}
                      </p>
                      <p className="mt-0.5 truncate text-[10px] text-zinc-500 dark:text-zinc-400">
                        {track.artist}
                      </p>
                    </div>
                  </motion.button>
                ))}
              </div>
            ) : (
              <p className="p-3 text-center text-[11px] text-zinc-400">No songs for "{q}"</p>
            )}
          </motion.div>
        ) : null}

        {!isMusicRoute && fileResults ? (
          <motion.div
            key="file-search"
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 360, damping: 30 }}
            className="app-panel absolute left-0 right-0 top-full mt-1.5 overflow-hidden"
            style={{ zIndex: UI_LAYERS.searchDropdown }}
          >
            {fileResults.files?.length === 0 && fileResults.folders?.length === 0 ? (
              <p className="p-3 text-center text-[11px] text-zinc-400">No results for "{q}"</p>
            ) : (
              <div className="max-h-64 overflow-y-auto divide-y divide-black/5 dark:divide-white/5">
                {fileResults.folders?.map((folder) => (
                  <motion.button
                    key={folder._id}
                    onClick={() => {
                      navigate(`/folder/${folder._id}`)
                      clear()
                    }}
                    whileHover={{ backgroundColor: 'rgba(99,102,241,0.06)' }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.85rem] bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-sm">
                      <span className="text-xs font-semibold">F</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-gray-900 dark:text-white">
                        {folder.name}
                      </p>
                      <p className="mt-0.5 text-[10px] text-zinc-500 dark:text-zinc-400">Folder</p>
                    </div>
                  </motion.button>
                ))}
                {fileResults.files?.map((file) => {
                  const cat = getMimeCategory(file.mimeType, file.fileName)
                  const canPreview = ['image', 'video', 'pdf', 'audio', 'code', 'sheet', 'doc'].includes(cat)

                  return (
                    <motion.button
                      key={file._id}
                      onClick={() => handleFileClick(file)}
                      whileHover={{ backgroundColor: 'rgba(99,102,241,0.06)' }}
                      className="group flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.85rem] bg-gray-100/90 dark:bg-white/[0.04]">
                        <FileIcon mimeType={file.mimeType} size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-gray-900 dark:text-white">
                          {file.fileName}
                        </p>
                        <p className="mt-0.5 text-[10px] text-zinc-500 dark:text-zinc-400">
                          {formatBytes(file.fileSize)} • {formatDateShort(file.createdAt)}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold opacity-0 transition-opacity group-hover:opacity-100 ${
                          canPreview
                            ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-300'
                            : 'bg-zinc-200/80 text-zinc-600 dark:bg-white/[0.06] dark:text-zinc-400'
                        }`}
                      >
                        {canPreview ? (
                          'Preview'
                        ) : (
                          <>
                            <Download size={11} className="mr-1 inline" />
                            Download
                          </>
                        )}
                      </span>
                    </motion.button>
                  )
                })}
              </div>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )

  return (
    <>
      <header className="relative shrink-0 overflow-visible px-1.5 pt-1.5 sm:px-2 lg:px-3 lg:pt-2" style={{ zIndex: UI_LAYERS.navbar }}>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ zIndex: UI_LAYERS.navbarPanel }}
          className={`relative app-panel overflow-visible ${isFreePlan ? 'px-2 py-2 sm:px-2.5 sm:py-2.5 lg:px-3 lg:py-2.5' : 'px-2 py-2 sm:px-2.5 sm:py-2'}`}
        >
          {isFreePlan ? (
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              {menuButton}
              <div className="min-w-0 flex-[1.05]">
                {searchSurface}
              </div>
              {showFreeNavbarAd ? (
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="min-w-0 flex-1"
                >
                  <div className="h-[54px] overflow-hidden rounded-[0.9rem] border border-black/5 bg-white/65 px-1.5 py-1.5 shadow-[0_16px_32px_-28px_rgba(15,23,42,0.2)] backdrop-blur-xl dark:border-white/8 dark:bg-white/[0.04] sm:px-2">
                    <AdSlot
                      formatId="2018497"
                      refreshMs={30000}
                      style={{ width: '100%', height: 40, minHeight: 40 }}
                    />
                  </div>
                </motion.div>
              ) : (
                <div className="min-w-0 flex-1" />
              )}
              {themeButton}
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5">
                {menuButton}

                <div className="hidden min-w-[160px] md:block">
                  <p className="app-kicker">{pageMeta.kicker}</p>
                  <p className="mt-0.5 text-[11px] font-bold tracking-tight text-gray-900 dark:text-white">
                    {pageMeta.title}
                  </p>
                </div>

                {searchSurface}

                <div className="flex items-center gap-1.5">
                  <div className="hidden xl:flex items-center gap-1.5 rounded-full border border-black/5 bg-white/60 px-2 py-0.5 text-[8px] font-medium text-zinc-500 dark:border-white/8 dark:bg-white/[0.04] dark:text-zinc-400">
                    <Sparkles size={12} className="text-indigo-500 dark:text-indigo-300" />
                    {pageMeta.hint}
                  </div>
                  {themeButton}
                </div>
              </div>

              {canShowAds ? (
                <div className="hidden xl:block">
                  <div className="overflow-hidden rounded-[0.9rem] border border-black/5 bg-white/60 px-2 py-1 dark:border-white/8 dark:bg-white/[0.04]">
                    <AdSlot formatId="2018497" style={{ width: '100%', maxWidth: 728, minHeight: 68 }} />
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </motion.div>
      </header>

      <PreviewModal open={!!previewFile} file={previewFile} onClose={() => setPreviewFile(null)} />
    </>
  )
}
