import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Link2, Trash2, Copy, CheckCheck, Clock, Download, ExternalLink, Folder as FolderIcon, AlertTriangle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { shareAPI } from '../services/api'
import { formatDate, copyToClipboard, formatBytes } from '../utils/helpers'
import FileIcon from '../utils/fileIcons'
import EmptyState from '../components/EmptyState'
import { useSubscription } from '../store/useSubscription'

export default function Shared() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { isExpired } = useSubscription()
  const [copiedToken, setCopied] = useState(null)
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

  const { data, isLoading } = useQuery({
    queryKey: ['shares'],
    queryFn: () => shareAPI.list().then(r => r.data.data),
  })

  const handleCopy = async (token) => {
    if (isExpired) return toast.error('Renew subscription to copy links')
    const url = `${window.location.origin}/s/${token}`
    if (await copyToClipboard(url)) {
      setCopied(token); toast.success('Link copied!')
      setTimeout(() => setCopied(null), 2000)
    }
  }

  const handleRevoke = async (token) => {
    if (isExpired) return toast.error('Renew subscription to manage links')
    try {
      await shareAPI.revoke(token)
      toast.success('Share link revoked')
      qc.invalidateQueries({ queryKey: ['shares'] })
    } catch { toast.error('Failed to revoke') }
  }

  const shares = data || []

  return (
    <div className="space-y-5 pb-10">
      {isExpired && (
        <div className="mb-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center shrink-0">
              <AlertTriangle className="text-red-500" size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-red-700 dark:text-red-300">Your subscription has expired</p>
              <p className="text-xs text-red-600/80 dark:text-red-400/80">Renew to regain access to your files. Uploads, downloads, shares, and previews are disabled.</p>
            </div>
          </div>
          <button onClick={() => navigate('/pricing')} className="btn-primary py-2 text-sm whitespace-nowrap">Renew Now</button>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Shared files</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{shares.length} active share link{shares.length !== 1 ? 's' : ''}</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-1/3" />
                  <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : shares.length === 0 ? (
        <EmptyState
          icon={Link2}
          title="No shared links"
          subtitle="Share a file from My Files to create a public link"
        />
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {shares.map(share => {
              const url = `${window.location.origin}/s/${share.token}`
              const isFolder = !!share.folderId
              
              return (
                <motion.div key={share._id}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  className="card p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-4 flex-wrap">
                    {/* File info */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {isFolder ? (
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
                          <FolderIcon size={20} className="text-indigo-500" />
                        </div>
                      ) : (
                        <FileIcon mimeType={share.fileId?.mimeType} size={18} />
                      )}
                      
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                          {isFolder ? share.folderId?.name : (share.fileId?.fileName || 'Unknown file')}
                        </p>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                          <span className="text-xs text-gray-400">{formatBytes(share.fileId?.fileSize)}</span>
                          {share.expiresAt && (
                            <span className="flex items-center gap-1 text-xs text-amber-500">
                              <Clock size={10} /> Expires {formatDate(share.expiresAt)}
                            </span>
                          )}
                          {share.maxDownloads && (
                            <span className="flex items-center gap-1 text-xs text-blue-500">
                              <Download size={10} /> {share.downloadCount}/{share.maxDownloads}
                            </span>
                          )}
                          <span className="text-xs text-gray-400">Created {formatDate(share.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => handleCopy(share.token)}
                        className="btn-secondary text-xs py-1.5 px-3">
                        {copiedToken === share.token ? <CheckCheck size={13} /> : <Copy size={13} />}
                        Copy link
                      </button>
                      <a href={url} target="_blank" rel="noreferrer"
                        className="btn-secondary text-xs py-1.5 px-3">
                        <ExternalLink size={13} />
                      </a>
                      <button onClick={() => handleRevoke(share.token)}
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
