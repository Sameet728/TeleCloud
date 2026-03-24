import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Folder } from 'lucide-react'
import toast from 'react-hot-toast'
import { useQueryClient } from '@tanstack/react-query'
import { foldersAPI } from '../services/api'

const COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#3b82f6','#ec4899','#8b5cf6','#14b8a6']

export default function CreateFolderModal({ open, parentFolderId, onClose, existingFolder }) {
  const qc      = useQueryClient()
  const [name, setName]   = useState(existingFolder?.name || '')
  const [color, setColor] = useState(existingFolder?.color || COLORS[0])
  const [loading, setLoading] = useState(false)
  const editing = !!existingFolder

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    try {
      if (editing) {
        await foldersAPI.update(existingFolder._id, { name, color })
        toast.success('Folder renamed')
      } else {
        await foldersAPI.create({ name, parentFolderId: parentFolderId || null, color })
        toast.success('Folder created')
      }
      qc.invalidateQueries({ queryKey: ['folders'] })
      qc.invalidateQueries({ queryKey: ['folder'] })
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed')
    } finally { setLoading(false) }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={e => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
            className="card w-full max-w-sm p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editing ? 'Rename folder' : 'New folder'}
              </h2>
              <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800">
                <X size={18} />
              </button>
            </div>

            {/* Preview */}
            <div className="flex justify-center mb-5">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: color + '22' }}>
                <Folder size={32} style={{ color }} fill={color} fillOpacity={0.3} />
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                value={name} onChange={e => setName(e.target.value)}
                className="input" placeholder="Folder name" autoFocus
              />
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 block">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setColor(c)}
                      className={`w-7 h-7 rounded-lg transition-transform ${color === c ? 'scale-125 ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-900' : 'hover:scale-110'}`}
                      style={{ background: c, ringColor: c }} />
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={loading || !name.trim()} className="btn-primary flex-1">
                  {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
                  {editing ? 'Save' : 'Create'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
