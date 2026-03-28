import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle, AlertCircle, Upload } from 'lucide-react'
import useStore from '../store/useStore'
import { truncate } from '../utils/helpers'
import UI_LAYERS from '../constants/uiLayers'

export default function UploadProgress() {
  const uploads = useStore((s) => s.uploads)
  const currentTrack = useStore((s) => s.musicQueue[s.currentTrackIndex] || null)
  const isMusicPlaying = Boolean(currentTrack)
  const [isDesktop, setIsDesktop] = useState(() => (
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : false
  ))
  const uploadEntries = useMemo(() => Object.entries(uploads), [uploads])
  const uploadCount = uploadEntries.length
  const buttonBottom = isDesktop
    ? (isMusicPlaying ? 132 : 20)
    : (isMusicPlaying ? 156 : 84)
  const dockBottom = buttonBottom + (isDesktop ? 86 : 80)

  useEffect(() => {
    const syncViewport = () => setIsDesktop(window.innerWidth >= 1024)
    syncViewport()
    window.addEventListener('resize', syncViewport)
    return () => window.removeEventListener('resize', syncViewport)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 36, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1, bottom: dockBottom }}
      exit={{ opacity: 0, y: 28, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      className="fixed right-4 w-[min(20rem,calc(100vw-1.25rem))] overflow-hidden rounded-[1.4rem] border border-gray-200/70 bg-white/95 shadow-[0_24px_52px_-34px_rgba(15,23,42,0.28)] backdrop-blur-2xl dark:border-zinc-800/80 dark:bg-zinc-900/95 sm:right-5 sm:w-[19.5rem]"
      style={{ zIndex: UI_LAYERS.floating }}
    >
      <div className="flex items-center gap-3 border-b border-gray-100 px-3.5 py-3 dark:border-zinc-800/50">
        <div className="flex h-9 w-9 items-center justify-center rounded-[0.95rem] bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-[0_18px_30px_-20px_rgba(79,70,229,0.7)]">
          <Upload size={16} className="animate-pulse text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="truncate text-[13px] font-bold tracking-tight text-gray-900 dark:text-zinc-100">
            Uploading Files
          </p>
          <p className="mt-0.5 text-[11px] font-medium text-zinc-500">
            {uploadCount} {uploadCount === 1 ? 'upload' : 'uploads'} in progress
          </p>
        </div>
      </div>

      <div className="max-h-64 divide-y divide-gray-100 overflow-y-auto dark:divide-zinc-800/50">
        {uploadEntries.map(([id, upload]) => (
          <div
            key={id}
            className="px-3.5 py-2.5 transition-colors hover:bg-gray-50 dark:hover:bg-zinc-800/30"
          >
            <div className="mb-2 flex items-center gap-3">
              {upload.status === 'complete' ? (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.8rem] bg-emerald-50 dark:bg-emerald-500/10">
                  <CheckCircle size={16} className="text-emerald-500" />
                </div>
              ) : upload.status === 'error' ? (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.8rem] bg-red-50 dark:bg-red-500/10">
                  <AlertCircle size={16} className="text-red-500" />
                </div>
              ) : (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.8rem] bg-indigo-50 dark:bg-indigo-500/10">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-gray-900 dark:text-zinc-200">
                  {truncate(upload.name, 28)}
                </p>
                <p className="mt-0.5 text-[11px] font-medium text-zinc-500">
                  {upload.progress}% complete
                </p>
              </div>
            </div>

            {upload.speed && upload.status === 'uploading' ? (
              <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-indigo-500">
                Speed {upload.speed}
              </div>
            ) : null}

            <div className="h-2 overflow-hidden rounded-full bg-gray-100 shadow-inner dark:bg-zinc-800">
              <motion.div
                className={`h-full rounded-full ${
                  upload.status === 'error'
                    ? 'bg-red-500'
                    : upload.status === 'complete'
                      ? 'bg-emerald-500'
                      : 'bg-gradient-to-r from-indigo-500 to-purple-500'
                }`}
                animate={{ width: `${upload.progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
