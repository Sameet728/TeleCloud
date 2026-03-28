import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Download, Trash2, Share2, Eye, MoreVertical, CheckSquare, Square, Star } from 'lucide-react'
import toast from 'react-hot-toast'
import FileIcon from '../utils/fileIcons'
import { formatBytes, formatDateShort, truncate, getMimeCategory } from '../utils/helpers'
import { filesAPI } from '../services/api'
import useStore from '../store/useStore'
import DownloadAdGate from './DownloadAdGate'
import { useAdGuard } from './AdBanner'

export default function FileCard({ file, onPreview, onShare, onDelete, onDragStateChange, onToggleStar }) {
  const { selected, toggleSelect } = useStore()
  const isSelected = selected.has(file._id)
  const [menuOpen, setMenuOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [thumbError, setThumbError] = useState(false)
  const [gateOpen, setGateOpen] = useState(false)
  const canShowAds = useAdGuard()
  const menuRef = useRef(null)

  useEffect(() => {
    if (!menuOpen) return
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])
  
  const canPreview = ['image','video','pdf','audio','code','sheet','doc'].includes(getMimeCategory(file.mimeType, file.fileName))
  const isMedia = getMimeCategory(file.mimeType, file.fileName) === 'image'

  const doDownload = async () => {
    toast.success('Download starting...')
    window.location.href = filesAPI.downloadUrl(file._id)
  }

  const handleDownload = (e) => {
    e.stopPropagation()
    if (canShowAds) {
      setGateOpen(true)
    } else {
      doDownload()
    }
  }


  const handleDragStart = (e) => {
    // If this file is among the selected set, drag ALL selected files
    const fileIds = isSelected ? [...selected] : [file._id]
    e.dataTransfer.setData('fileId', file._id)            // kept for compat
    e.dataTransfer.setData('fileIds', JSON.stringify(fileIds))
    e.dataTransfer.effectAllowed = 'move'
    setIsDragging(true)
    onDragStateChange?.(true)
  }

  const handleDragEnd = () => { setIsDragging(false); onDragStateChange?.(false) }

  return (<>
    <motion.div
      layout
      data-file-id={file._id}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: isDragging ? 0.4 : 1, scale: isDragging ? 0.97 : 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ y: -6, transition: { type: 'spring', stiffness: 400, damping: 25 } }}
      className={`app-panel-muted h-full cursor-grab active:cursor-grabbing group relative select-none overflow-visible p-3.5 sm:p-4 transition-all
        ${isSelected ? 'ring-2 ring-indigo-500 border-indigo-500/50' : 'border-gray-200/60 dark:border-zinc-800/80'}
        ${isDragging ? 'opacity-40' : ''}
        ${menuOpen ? 'z-50' : 'z-0'}`}
      onClick={() => canPreview ? onPreview(file) : null}
    >
      {/* Select checkbox */}
      <button
        className="absolute left-3 top-3 z-10 rounded-xl p-1.5 opacity-100 transition-all hover:bg-gray-100 dark:hover:bg-zinc-800 md:opacity-0 md:group-hover:opacity-100"
        onClick={(e) => { e.stopPropagation(); toggleSelect(file._id) }}
      >
        {isSelected
          ? <CheckSquare size={18} className="text-indigo-500" />
          : <Square size={18} className="text-zinc-400" />
        }
      </button>

      {/* Menu & Actions */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1" ref={menuRef}>
        {onToggleStar && (
          <button
            className={`rounded-xl p-2 transition-all ${file.isStarred ? 'text-yellow-500 opacity-100 bg-yellow-50 dark:bg-yellow-500/10' : 'text-zinc-400 opacity-100 hover:bg-gray-100 dark:hover:bg-zinc-800 md:opacity-0 md:group-hover:opacity-100'}`}
            onClick={(e) => { e.stopPropagation(); onToggleStar(file) }}
          >
            <Star size={14} fill={file.isStarred ? 'currentColor' : 'none'} />
          </button>
        )}
        <button
          className="rounded-xl p-2 opacity-100 transition-all hover:bg-gray-100 dark:hover:bg-zinc-800 md:opacity-0 md:group-hover:opacity-100"
          onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen) }}
        >
          <MoreVertical size={14} className="text-zinc-500" />
        </button>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="app-panel absolute right-0 top-10 z-[70] w-40 overflow-hidden rounded-[1.25rem]"
            onClick={e => e.stopPropagation()}
          >
            {canPreview && (
              <button onClick={() => { onPreview(file); setMenuOpen(false) }}
                className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-800/60 transition-colors">
                <Eye size={16} /> Preview
              </button>
            )}
            <button onClick={(e) => { handleDownload(e); setMenuOpen(false) }}
              className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-800/60 transition-colors">
              <Download size={16} /> Download
            </button>
            <button onClick={() => { onShare(file); setMenuOpen(false) }}
              className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-800/60 transition-colors">
              <Share2 size={16} /> Share
            </button>
            <div className="h-px bg-gray-100 dark:bg-zinc-800 my-1" />
            <button onClick={() => { onDelete(file); setMenuOpen(false) }}
              className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
              <Trash2 size={16} /> Delete
            </button>
          </motion.div>
        )}
      </div>

      {/* Icon or Thumbnail */}
      <div className="relative mb-4 mt-3.5 flex h-[60px] items-center justify-center">
        {isMedia && !thumbError ? (
          <img 
            src={filesAPI.thumbnail(file._id)} 
            alt={file.fileName} 
            className="h-[60px] w-[60px] rounded-[1.15rem] bg-gray-50 object-cover shadow-md transition-transform duration-300 group-hover:scale-105 dark:bg-zinc-800"
            onError={() => setThumbError(true)}
            loading="lazy"
          />
        ) : (
          <div className="flex h-[60px] w-[60px] items-center justify-center rounded-[1.15rem] bg-gray-50 shadow-inner transition-transform duration-300 group-hover:scale-105 dark:bg-zinc-800/50">
            <FileIcon mimeType={file.mimeType} size={28} />
          </div>
        )}
      </div>

      {/* Info */}
      <p className="mb-1 text-center text-[13px] font-bold tracking-tight text-gray-900 dark:text-zinc-100 truncate">
        {truncate(file.fileName, 20)}
      </p>
      <p className="text-center text-[10px] font-medium text-zinc-400">
        {formatBytes(file.fileSize)} · {formatDateShort(file.createdAt)}
      </p>
      {file.source === 'telegram-import' && (
        <div className="flex justify-center mt-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-100 bg-purple-50 px-2.5 py-1 text-[10px] font-bold text-purple-600 dark:border-purple-500/20 dark:bg-purple-500/10 dark:text-purple-400">
            Telegram Imported
          </span>
        </div>
      )}
    </motion.div>

    {/* Download Ad Gate */}
    <DownloadAdGate
      open={gateOpen}
      onProceed={() => { setGateOpen(false); doDownload() }}
      onClose={() => setGateOpen(false)}
    />
  </>
  )
}
