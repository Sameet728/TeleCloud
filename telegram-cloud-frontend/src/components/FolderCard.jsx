import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Folder, MoreVertical, Pencil, Trash2, Share2, Star, Download } from 'lucide-react'
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
      whileHover={{ y: -6, transition: { type: 'spring', stiffness: 400, damping: 25 } }}
      draggable
      onDragStart={(e) => {
        e.stopPropagation()
        e.dataTransfer.setData('source_folderId', folder._id)
        e.dataTransfer.effectAllowed = 'move'
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`app-panel-muted cursor-pointer group relative select-none overflow-visible p-3.5 sm:p-4 transition-all
        ${dragOver ? 'ring-2 ring-indigo-500 shadow-xl shadow-indigo-500/20 bg-indigo-50/80 dark:bg-indigo-900/30 border-indigo-500/50' : 'border-gray-200/60 dark:border-zinc-800/80'}
        ${menuOpen ? 'z-50' : 'z-0'}`}
      onDoubleClick={() => navigate(`/folder/${folder._id}`)}
    >
      {/* Menu & Actions */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1" ref={menuRef}>
        {onToggleStar && (
          <button
            className={`rounded-xl p-2 transition-all ${folder.isStarred ? 'text-yellow-500 opacity-100 bg-yellow-50 dark:bg-yellow-500/10' : 'text-zinc-400 opacity-100 hover:bg-gray-100 dark:hover:bg-zinc-800 md:opacity-0 md:group-hover:opacity-100'}`}
            onClick={(e) => { e.stopPropagation(); onToggleStar(folder, true) }}
          >
            <Star size={14} fill={folder.isStarred ? 'currentColor' : 'none'} />
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
            <button onClick={() => { navigate(`/folder/${folder._id}`); setMenuOpen(false) }}
              className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-800/60 transition-colors">
              <Folder size={16} /> Open
            </button>
            <button onClick={() => { onRename(folder); setMenuOpen(false) }}
              className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-800/60 transition-colors">
              <Pencil size={16} /> Rename
            </button>
            <button onClick={() => { onShare && onShare(folder); setMenuOpen(false) }}
              className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-800/60 transition-colors">
              <Share2 size={16} /> Share
            </button>
            {onDownload && (
              <button onClick={(e) => { e.stopPropagation(); onDownload(folder); setMenuOpen(false) }}
                className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-800/60 transition-colors">
                <Download size={16} /> Download
              </button>
            )}
            <div className="h-px bg-gray-100 dark:bg-zinc-800 my-1" />
            <button onClick={() => { onDelete(folder); setMenuOpen(false) }}
              className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
              <Trash2 size={16} /> Delete
            </button>
          </motion.div>
        )}
      </div>

      {/* Icon */}
      <div className="mb-4 mt-3.5 flex justify-center">
        <div className="flex h-[62px] w-[62px] items-center justify-center rounded-[1.2rem] transition-transform duration-300 group-hover:scale-110 shadow-inner"
             style={{ background: `linear-gradient(135deg, ${folder.color}15, ${folder.color}30)` }}>
          <Folder size={28} style={{ color: folder.color || '#6366f1' }} fill={folder.color || '#6366f1'} fillOpacity={0.25} />
        </div>
      </div>

      {/* Info */}
      <p className="mb-1 text-center text-[13px] font-bold tracking-tight text-gray-900 dark:text-zinc-100 truncate">
        {truncate(folder.name, 20)}
      </p>
      <p className="text-center text-[10px] font-medium text-zinc-400">{formatDateShort(folder.createdAt)}</p>
    </motion.div>
  )
}
