import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Folder, MoreVertical, Pencil, Trash2, Share2, Star, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import { useQueryClient } from '@tanstack/react-query'
import { foldersAPI } from '../services/api'
import { truncate, formatDateShort } from '../utils/helpers'

export default function FolderCard({ folder, onDelete, onRename, onShare, onDownload, onFileDrop, onFolderDrop, onToggleStar }) {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [dragOver, setDragOver] = useState(false)
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

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOver(true)
  }
  const handleDragLeave = () => setDragOver(false)
  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    e.stopPropagation()
    const fileIds = JSON.parse(e.dataTransfer.getData('fileIds') || 'null')
      || [e.dataTransfer.getData('fileId')]
    const sourceFolderId = e.dataTransfer.getData('source_folderId')

    if (fileIds?.length && fileIds[0] && onFileDrop) {
       onFileDrop(fileIds, folder._id)
    } else if (sourceFolderId && sourceFolderId !== folder._id && onFolderDrop) {
       onFolderDrop(sourceFolderId, folder._id)
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: dragOver ? 1.04 : 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ y: -2 }}
      draggable
      onDragStart={(e) => {
        e.stopPropagation()
        e.dataTransfer.setData('source_folderId', folder._id)
        e.dataTransfer.effectAllowed = 'move'
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`card p-4 cursor-pointer group relative hover:shadow-md transition-all select-none
        ${dragOver ? 'ring-2 ring-indigo-500 shadow-lg shadow-indigo-500/30 bg-indigo-50 dark:bg-indigo-900/20' : ''}
        ${menuOpen ? 'z-50' : 'z-0'}`}
      onDoubleClick={() => navigate(`/folder/${folder._id}`)}
    >
      {/* Menu & Actions */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1" ref={menuRef}>
        {onToggleStar && (
          <button
            className={`p-1.5 rounded-lg transition-colors ${folder.isStarred ? 'text-yellow-400 opacity-100' : 'text-gray-400 opacity-0 group-hover:opacity-100 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
            onClick={(e) => { e.stopPropagation(); onToggleStar(folder, true) }}
          >
            <Star size={15} fill={folder.isStarred ? 'currentColor' : 'none'} />
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
            className="absolute right-0 top-8 w-36 card shadow-xl overflow-hidden z-20"
            onClick={e => e.stopPropagation()}
          >
            <button onClick={() => { navigate(`/folder/${folder._id}`); setMenuOpen(false) }}
              className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800">
              <Folder size={14} /> Open
            </button>
            <button onClick={() => { onRename(folder); setMenuOpen(false) }}
              className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800">
              <Pencil size={14} /> Rename
            </button>
            <button onClick={() => { onShare && onShare(folder); setMenuOpen(false) }}
              className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800">
              <Share2 size={14} /> Share
            </button>
            {onDownload && (
              <button onClick={(e) => { e.stopPropagation(); onDownload(folder); setMenuOpen(false) }}
                className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800">
                <Download size={14} /> Download
              </button>
            )}
            <button onClick={() => { onDelete(folder); setMenuOpen(false) }}
              className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
              <Trash2 size={14} /> Delete
            </button>
          </motion.div>
        )}
      </div>

      {/* Icon */}
      <div className="flex justify-center mb-3 mt-1">
        <div className="w-14 h-14 rounded-xl flex items-center justify-center"
             style={{ background: folder.color + '22' }}>
          <Folder size={28} style={{ color: folder.color || '#6366f1' }} fill={folder.color || '#6366f1'} fillOpacity={0.2} />
        </div>
      </div>

      {/* Info */}
      <p className="text-sm font-medium text-gray-800 dark:text-gray-100 text-center truncate mb-1">
        {truncate(folder.name, 20)}
      </p>
      <p className="text-xs text-gray-400 text-center">{formatDateShort(folder.createdAt)}</p>
    </motion.div>
  )
}
