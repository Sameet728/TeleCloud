import { useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Download, CheckCircle, RefreshCw, ChevronDown, Cloud, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { telegramAPI } from '../services/api'
import UI_LAYERS from '../constants/uiLayers'

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '—'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function FileRow({ file, onImported }) {
  const [loading, setLoading] = useState(false)
  const [imported, setImported] = useState(file.alreadyImported || false)
  const qc = useQueryClient()

  const handleImport = async () => {
    if (imported || loading) return
    setLoading(true)
    try {
      await telegramAPI.importFile(file.messageId)
      setImported(true)
      toast.success(`${file.fileName} added to your Drive!`)
      qc.invalidateQueries({ queryKey: ['files'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      if (onImported) onImported(file.messageId)
    } catch (err) {
      const msg = err.response?.data?.message || 'Import failed'
      if (err.response?.status === 409) {
        setImported(true)
        toast.success('Already in your Drive')
      } else {
        toast.error(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors border-b border-gray-100 dark:border-zinc-800 last:border-0">
      <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-500/20 shadow-inner">
        <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
          {(file.fileName || '?').split('.').pop()?.slice(0, 3).toUpperCase()}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-900 dark:text-zinc-100 truncate tracking-tight">{file.fileName}</p>
        <p className="text-xs font-medium text-zinc-500 mt-1">
          {formatBytes(file.fileSize)} · {formatDate(file.date)}
        </p>
      </div>
      <button
        onClick={handleImport}
        disabled={imported || loading}
        className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
          imported
            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 cursor-default border border-emerald-100 dark:border-emerald-500/20'
            : loading
            ? 'bg-blue-50 text-blue-400 dark:bg-blue-500/10 cursor-wait border border-blue-100 dark:border-blue-500/20'
            : 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-500/20'
        }`}
      >
        {imported ? (
          <><CheckCircle size={14} /> In Drive</>
        ) : loading ? (
          <><RefreshCw size={14} className="animate-spin" /> Adding…</>
        ) : (
          <><Download size={14} /> Add to Drive</>
        )}
      </button>
    </div>
  )
}

export default function TelegramImportModal({ open, onClose }) {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [nextOffsetId, setNextOffsetId] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [fetched, setFetched] = useState(false)
  const portalRoot = typeof document !== 'undefined' ? document.body : null

  const fetchFiles = useCallback(async (offsetId = 0, append = false) => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await telegramAPI.listFiles(20, offsetId)
      const incoming = data.data?.files || []
      setFiles(prev => append ? [...prev, ...incoming] : incoming)
      setNextOffsetId(data.data?.nextOffsetId || 0)
      setHasMore(data.data?.hasMore || false)
      setFetched(true)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch files from Telegram')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleOpen = useCallback(() => {
    if (!fetched) fetchFiles(0)
  }, [fetched, fetchFiles])

  // Trigger fetch when modal opens
  useState(() => {
    if (open && !fetched) fetchFiles(0)
  })

  if (!open) return null

  const modalTree = (
    <AnimatePresence>
      <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: UI_LAYERS.modal }}>
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="relative w-full max-w-3xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl border border-gray-200/60 dark:border-zinc-800/80 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center gap-4 px-6 py-5 border-b border-gray-100 dark:border-zinc-800/50 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-500/10 dark:to-indigo-500/10">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Cloud size={20} className="text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">Import from Telegram</h2>
              <p className="text-xs font-medium text-zinc-500 mt-0.5">Your Saved Messages</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all"
            >
              <X size={20} className="text-zinc-500" />
            </button>
          </div>

          {/* Instructions Box */}
          <div className="px-6 py-4 bg-blue-50/60 dark:bg-blue-500/5 border-b border-gray-100 dark:border-zinc-800/50 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
              <AlertCircle size={20} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-blue-900 dark:text-blue-300 tracking-tight">Fast Upload via Telegram</p>
              <p className="text-xs font-medium text-blue-700/80 dark:text-blue-400/80 mt-1.5 leading-relaxed">
                Open Telegram and send any file, photo, or video to your <span className="font-bold">"Saved Messages"</span> conversation. Once sent, click the <button onClick={() => fetchFiles(0)} className="font-bold underline hover:text-blue-800 dark:hover:text-blue-300 cursor-pointer">Refresh button</button> below to see it instantly.
              </p>
            </div>
          </div>

          {/* Body */}
          <div className="overflow-y-auto flex-1 h-[50vh] min-h-[400px]">
            {loading && files.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <RefreshCw size={24} className="animate-spin text-blue-500" />
                <p className="text-sm text-gray-400">Fetching from Telegram…</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 px-6">
                <AlertCircle size={24} className="text-red-400" />
                <p className="text-sm text-center text-red-500">{error}</p>
                <button
                  onClick={() => fetchFiles(0)}
                  className="text-xs text-blue-500 hover:underline"
                >
                  Try again
                </button>
              </div>
            ) : files.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Cloud size={32} className="text-gray-300" />
                <p className="text-sm text-gray-400">No files found in your Saved Messages</p>
              </div>
            ) : (
              <>
                {files.map(file => (
                  <FileRow key={file.messageId} file={file} />
                ))}
                {hasMore && (
                  <div className="p-4 text-center">
                    <button
                      onClick={() => fetchFiles(nextOffsetId, true)}
                      disabled={loading}
                      className="flex items-center gap-2 mx-auto text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                    >
                      {loading ? (
                        <RefreshCw size={14} className="animate-spin" />
                      ) : (
                        <ChevronDown size={14} />
                      )}
                      Load more
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 dark:border-zinc-800/50 flex items-center justify-between bg-gray-50/50 dark:bg-zinc-900/50">
            <p className="text-xs font-medium text-zinc-500">{files.length} file(s) shown</p>
            <button
              onClick={() => fetchFiles(0)}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-xl transition-all disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )

  return portalRoot ? createPortal(modalTree, portalRoot) : modalTree
}
