import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Download, Trash2, Share2, Eye, MoreVertical, CheckSquare, Square, Star } from 'lucide-react'
import toast from 'react-hot-toast'
import { useQueryClient } from '@tanstack/react-query'
import FileIcon from '../utils/fileIcons'
import { formatBytes, formatDateShort, truncate, getMimeCategory } from '../utils/helpers'
import { filesAPI } from '../services/api'
import useStore from '../store/useStore'

export default function FileCard({ file, onPreview, onShare, onDelete, onDragStateChange, onToggleStar }) {
  const qc = useQueryClient()
  const { selected, toggleSelect } = useStore()
  const isSelected = selected.has(file._id)
  const [menuOpen, setMenuOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [thumbError, setThumbError] = useState(false)
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
  
  const canPreview = ['image','video','pdf'].includes(getMimeCategory(file.mimeType))
  const isMedia = getMimeCategory(file.mimeType) === 'image'

  const handleDownload = async (e) => {
    e.stopPropagation()
    const tid = toast.loading('Preparing download...')
    try {
      const { data } = await filesAPI.download(file._id)
      const url = URL.createObjectURL(new Blob([data]))
      const a   = document.createElement('a')
      a.href = url; a.download = file.fileName; a.click()
      URL.revokeObjectURL(url)
      toast.success('Download started', { id: tid })
    } catch { toast.error('Download failed', { id: tid }) }
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

  return (
    <motion.div
      layout
      data-file-id={file._id}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: isDragging ? 0.4 : 1, scale: isDragging ? 0.97 : 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ y: -2 }}
      className={`card p-4 cursor-grab active:cursor-grabbing group relative transition-shadow hover:shadow-md select-none
        ${isSelected ? 'ring-2 ring-brand-500' : ''}
        ${isDragging ? 'opacity-40' : ''}
        ${menuOpen ? 'z-50' : 'z-0'}`}
      onClick={() => canPreview ? onPreview(file) : null}
    >
      {/* Select checkbox */}
      <button
        className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity z-10"
        onClick={(e) => { e.stopPropagation(); toggleSelect(file._id) }}
      >
        {isSelected
          ? <CheckSquare size={16} className="text-brand-500" />
          : <Square size={16} className="text-gray-400" />
        }
      </button>

      {/* Menu & Actions */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1" ref={menuRef}>
        {onToggleStar && (
          <button
            className={`p-1.5 rounded-lg transition-colors ${file.isStarred ? 'text-yellow-400 opacity-100' : 'text-gray-400 opacity-0 group-hover:opacity-100 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
            onClick={(e) => { e.stopPropagation(); onToggleStar(file) }}
          >
            <Star size={15} fill={file.isStarred ? 'currentColor' : 'none'} />
          </button>
        )}
        <button
          className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100 dark:hover:bg-gray-800"
          onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen) }}
        >
          <MoreVertical size={15} className="text-gray-500" />
        </button>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="absolute right-0 top-8 w-40 card shadow-xl overflow-hidden z-20"
            onClick={e => e.stopPropagation()}
          >
            {canPreview && (
              <button onClick={() => { onPreview(file); setMenuOpen(false) }}
                className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800">
                <Eye size={14} /> Preview
              </button>
            )}
            <button onClick={(e) => { handleDownload(e); setMenuOpen(false) }}
              className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800">
              <Download size={14} /> Download
            </button>
            <button onClick={() => { onShare(file); setMenuOpen(false) }}
              className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800">
              <Share2 size={14} /> Share
            </button>
            <button onClick={() => { onDelete(file); setMenuOpen(false) }}
              className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
              <Trash2 size={14} /> Delete
            </button>
          </motion.div>
        )}
      </div>

      {/* Icon or Thumbnail */}
      <div className="flex justify-center mb-3 mt-1 h-[50.4px] items-center relative">
        {isMedia && !thumbError ? (
          <img 
            src={filesAPI.thumbnail(file._id)} 
            alt={file.fileName} 
            className="w-[50.4px] h-[50.4px] object-cover rounded-xl shadow-sm bg-gray-50 dark:bg-gray-800"
            onError={() => setThumbError(true)}
            loading="lazy"
          />
        ) : (
          <FileIcon mimeType={file.mimeType} size={28} />
        )}
      </div>

      {/* Info */}
      <p className="text-sm font-medium text-gray-800 dark:text-gray-100 text-center truncate mb-1">
        {truncate(file.fileName, 20)}
      </p>
      <p className="text-xs text-gray-400 text-center">
        {formatBytes(file.fileSize)} · {formatDateShort(file.createdAt)}
      </p>
    </motion.div>
  )
}
