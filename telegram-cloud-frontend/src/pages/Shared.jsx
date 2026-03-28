import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Link2, Trash2, Copy, CheckCheck, Clock, Download, ExternalLink, Folder as FolderIcon, AlertTriangle, ShieldAlert } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { shareAPI } from '../services/api'
import { formatDate, copyToClipboard, formatBytes } from '../utils/helpers'
import FileIcon from '../utils/fileIcons'
import EmptyState from '../components/EmptyState'
import { useSubscription } from '../store/useSubscription'

// Dense Animation Variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.03 } }
}

const itemVariants = {
  hidden: { y: 10, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 400, damping: 30 } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } }
}

export default function Shared() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { isExpired } = useSubscription()
  const [copiedToken, setCopied] = useState(null)
  
  const { data, isLoading } = useQuery({
    queryKey: ['shares'],
    queryFn: () => shareAPI.list().then(r => r.data.data),
  })

  const handleCopy = async (token) => {
    if (isExpired) return toast.error('Renew subscription to copy links')
    const url = `${window.location.origin}/s/${token}`
    if (await copyToClipboard(url)) {
      setCopied(token); toast.success('Link copied to clipboard')
      setTimeout(() => setCopied(null), 2000)
    }
  }

  const handleRevoke = async (token) => {
    if (isExpired) return toast.error('Renew subscription to manage links')
    try {
      await shareAPI.revoke(token)
      toast.success('Access revoked permanently')
      qc.invalidateQueries({ queryKey: ['shares'] })
    } catch { toast.error('Failed to revoke access') }
  }

  const shares = data || []

  return (
    <div className="app-page px-1 pt-1">
      {/* Expired Subscription Banner - SaaS Style */}
      {isExpired && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} 
          className="app-panel flex flex-col items-start justify-between gap-4 border-red-500/20 bg-red-500/10 p-4 sm:flex-row sm:items-center"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/20 shrink-0">
              <AlertTriangle className="text-red-500" size={18} />
            </div>
            <div>
              <p className="text-sm font-bold text-red-600 dark:text-red-400">Vault Locked: Subscription Expired</p>
              <p className="text-xs font-medium text-red-600/70 dark:text-red-400/70 mt-0.5">Renew to manage public access links.</p>
            </div>
          </div>
          <button onClick={() => navigate('/pricing')} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-lg transition-colors whitespace-nowrap shadow-sm shadow-red-500/20">
            Restore Access
          </button>
        </motion.div>
      )}

      {/* Header - Dense Layout */}
      <div className="app-hero">
        <div>
          <p className="app-kicker">Delivery</p>
          <h1 className="mt-2 flex items-center gap-2.5 text-[2rem] font-display font-bold tracking-tight text-gray-900 dark:text-white sm:text-[2.3rem]">
            Network Access
            <span className="rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-300">
              {shares.length} Active Node{shares.length !== 1 ? 's' : ''}
            </span>
          </h1>
          <p className="app-subtitle">Manage public links, link protection, and external asset distribution with a cleaner control surface.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 rounded-[1.5rem] bg-zinc-100 dark:bg-zinc-800/50 animate-pulse" />
          ))}
        </div>
      ) : shares.length === 0 ? (
        <EmptyState
          icon={Link2}
          title="Network Isolated"
          subtitle="Generate public links from the Workspace to distribute assets."
        />
      ) : (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="app-panel overflow-hidden">
          <div className="divide-y divide-gray-100 dark:divide-zinc-800/50">
            <AnimatePresence>
              {shares.map(share => {
                const url = `${window.location.origin}/s/${share.token}`
                const isFolder = !!share.folderId
                
                return (
                  <motion.div 
                    key={share._id}
                    variants={itemVariants}
                    layout
                    className="group flex flex-col justify-between gap-3 p-4 transition-colors hover:bg-indigo-50/60 dark:hover:bg-white/[0.03] sm:flex-row sm:items-center"
                  >
                    {/* File/Folder Info */}
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      {isFolder ? (
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50 dark:border-indigo-500/20 dark:bg-indigo-500/10">
                          <FolderIcon size={18} className="text-indigo-500" fill="currentColor" fillOpacity={0.2} />
                        </div>
                      ) : (
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gray-100 dark:bg-zinc-800">
                          <FileIcon mimeType={share.fileId?.mimeType} size={18} />
                        </div>
                      )}
                      
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-bold text-gray-900 dark:text-zinc-100 truncate">
                            {isFolder ? share.folderId?.name : (share.fileId?.fileName || 'Unknown Asset')}
                          </p>
                          {share.passwordProtected && (
                             <span title="Password Protected">
                               <ShieldAlert size={12} className="text-amber-500 shrink-0" />
                             </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-x-3 gap-y-1 mt-0.5 flex-wrap">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                            {isFolder ? 'DIR' : (share.fileId?.mimeType.split('/')[1] || 'BIN')}
                          </span>
                          {!isFolder && <span className="text-[11px] font-medium text-zinc-400">{formatBytes(share.fileId?.fileSize)}</span>}
                          
                          {/* Metrics Badges */}
                          <div className="flex items-center gap-2">
                            {share.expiresAt && (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-500/10 px-1.5 py-0.5 rounded">
                                <Clock size={10} /> Exp: {formatDate(share.expiresAt)}
                              </span>
                            )}
                            {share.maxDownloads && (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-500 bg-blue-50 dark:bg-blue-500/10 px-1.5 py-0.5 rounded">
                                <Download size={10} /> {share.downloadCount}/{share.maxDownloads}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Panel */}
                    <div className="flex items-center gap-2 shrink-0 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                      <button 
                        onClick={() => handleCopy(share.token)}
                        className={`flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-bold transition-colors ${
                          copiedToken === share.token 
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' 
                            : 'bg-white/80 dark:bg-zinc-900 border-gray-200 dark:border-zinc-700 hover:border-indigo-500 text-zinc-600 dark:text-zinc-300'
                        }`}
                      >
                        {copiedToken === share.token ? <CheckCheck size={14} /> : <Copy size={14} />}
                        <span className="hidden sm:inline">{copiedToken === share.token ? 'Copied' : 'Copy'}</span>
                      </button>
                      
                      <a 
                        href={url} target="_blank" rel="noreferrer"
                        className="rounded-full border border-gray-200 bg-white/80 p-2 text-zinc-600 transition-colors hover:border-indigo-500 hover:text-indigo-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                        title="Open Link"
                      >
                        <ExternalLink size={14} />
                      </a>
                      
                      <div className="w-px h-4 bg-gray-200 dark:bg-zinc-700 mx-1 hidden sm:block" />
                      
                      <button 
                        onClick={() => handleRevoke(share.token)}
                        className="rounded-full p-2 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                        title="Revoke Access"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </div>
  )
}
