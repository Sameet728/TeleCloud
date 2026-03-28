import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, Cloud } from 'lucide-react'
import toast from 'react-hot-toast'
import useUpload from '../hooks/useUpload'
import useStore from '../store/useStore'
import UI_LAYERS from '../constants/uiLayers'

export default function UploadZone({ folderId, children, onLargeFile }) {
  const [dragging, setDragging] = useState(false)
  const [isDesktop, setIsDesktop] = useState(() => (
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : false
  ))
  const inputRef   = useRef(null)
  const { upload } = useUpload(folderId)
  const currentTrack = useStore((s) => s.musicQueue[s.currentTrackIndex] || null)
  const isMusicPlaying = Boolean(currentTrack)
  const buttonBottom = isDesktop
    ? (isMusicPlaying ? 132 : 20)
    : (isMusicPlaying ? 156 : 84)

  const MAX_SIZE = 500 * 1024 * 1024 // 500 MB

  // Only treat as upload-drag if actual OS files are being dragged (not card moves)
  const isFileDrag = (e) => e.dataTransfer?.types?.includes('Files')

  useEffect(() => {
    const syncViewport = () => setIsDesktop(window.innerWidth >= 1024)
    syncViewport()
    window.addEventListener('resize', syncViewport)
    return () => window.removeEventListener('resize', syncViewport)
  }, [])

  const handleFiles = (files) => {
    const arr = Array.from(files)
    const large = arr.find(f => f.size > MAX_SIZE)
    if (large) {
      if (onLargeFile) onLargeFile({ name: large.name, size: large.size })
    }
    upload(arr)
  }

  const onDragOver = (e) => { e.preventDefault(); if (isFileDrag(e)) setDragging(true) }
  const onDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false)
  }
  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    if (isFileDrag(e)) handleFiles(e.dataTransfer.files)
  }

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className="relative"
    >
      {children}

      {/* Enhanced drag overlay */}
      <AnimatePresence>
        {dragging && (
          <motion.div
            key="upload-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-brand-500/10 dark:bg-brand-500/20 backdrop-blur-sm pointer-events-none"
            style={{ zIndex: UI_LAYERS.dragOverlay }}
          >
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-3 bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl px-8 py-7 rounded-[1.6rem] border-2 border-dashed border-brand-500/60 shadow-2xl"
            >
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="flex h-16 w-16 items-center justify-center rounded-[1.4rem] bg-gradient-to-br from-brand-400 to-brand-600 shadow-xl shadow-brand-500/30"
              >
                <Cloud size={30} className="text-white" />
              </motion.div>
              <div className="text-center">
                <p className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">Drop files to upload</p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Release to start uploading</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <input ref={inputRef} type="file" multiple className="hidden"
        onChange={e => { upload(e.target.files); e.target.value = '' }} />

      {/* Floating upload button */}
      <motion.button
        whileHover={{ scale: 1.05, y: -2 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => inputRef.current.click()}
        style={{ bottom: `${buttonBottom}px`, zIndex: UI_LAYERS.floating - 8 }}
        className="fixed right-4 flex items-center gap-2 rounded-[1.35rem] bg-gradient-to-r from-brand-500 to-brand-600 px-3.5 py-2.5 text-[13px] font-semibold text-white shadow-[0_22px_40px_-22px_rgba(99,102,241,0.65)] transition-all hover:shadow-[0_28px_46px_-20px_rgba(99,102,241,0.72)] sm:right-5 sm:px-4"
      >
        <Upload size={18} />
        <span className="hidden sm:inline">Upload Files</span>
        <span className="sm:hidden">Upload</span>
      </motion.button>
    </div>
  )
}

