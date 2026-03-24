import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Share2, Copy, CheckCheck, Link, Trash2, Clock, Download, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import { shareAPI } from '../services/api'
import { copyToClipboard } from '../utils/helpers'

export default function ShareModal({ open, item, isFolder, onClose }) {
  const [shareUrl, setShareUrl] = useState('')
  const [loading, setLoading]   = useState(false)
  const [copied, setCopied]     = useState(false)
  const [expiry, setExpiry]     = useState('')
  const [maxDl, setMaxDl]       = useState('')
  const [password, setPassword] = useState('')
  const [token, setToken]       = useState('')
  const [allowDownload, setAllowDownload] = useState(true)

  const createLink = async () => {
    setLoading(true)
    try {
      const payload = {
        ...(isFolder ? { folderId: item._id } : { fileId: item._id }),
        ...(expiry ? { expiresInHours: parseInt(expiry) } : {}),
        ...(maxDl  ? { maxDownloads: parseInt(maxDl) }   : {}),
        ...(password ? { password } : {}),
        allowDownload
      }
      
      const { data } = await shareAPI.create(payload)
      setShareUrl(data.data.shareUrl)
      setToken(data.data.share.token)
      toast.success('Share link created')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create link')
    } finally { setLoading(false) }
  }

  const handleCopy = async () => {
    if (await copyToClipboard(shareUrl)) {
      setCopied(true); toast.success('Copied!')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleRevoke = async () => {
    if (!token) return
    try {
      await shareAPI.revoke(token)
      setShareUrl(''); setToken('')
      toast.success('Share link revoked')
    } catch { toast.error('Failed to revoke') }
  }

  const reset = () => { setShareUrl(''); setToken(''); setExpiry(''); setMaxDl(''); setPassword(''); setAllowDownload(true); setCopied(false) }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) { reset(); onClose() } }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
            className="card w-full max-w-md p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <Share2 size={18} className="text-brand-500" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Share {isFolder ? 'folder' : 'file'}</h2>
              </div>
              <button onClick={() => { reset(); onClose() }}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X size={18} />
              </button>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 mb-5">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate pr-2">
                {isFolder ? item?.name : item?.fileName}
              </p>
            </div>

            {!shareUrl ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1">
                      <Clock size={11} /> Expires in (hours)
                    </label>
                    <input value={expiry} onChange={e => setExpiry(e.target.value)}
                      type="number" placeholder="Never" className="input text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1">
                      <Download size={11} /> Max downloads
                    </label>
                    <input value={maxDl} onChange={e => setMaxDl(e.target.value)}
                      type="number" placeholder="Unlimited" className="input text-sm" />
                  </div>
                </div>
                
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1">
                    <Lock size={11} /> Password protection (optional)
                  </label>
                  <input value={password} onChange={e => setPassword(e.target.value)}
                    type="text" placeholder="Leave empty for public access" className="input text-sm" />
                </div>

                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                  <input type="checkbox" id="allowDl" checked={allowDownload} onChange={e => setAllowDownload(e.target.checked)} className="w-4 h-4 rounded text-brand-600 border-gray-300 focus:ring-brand-500 bg-transparent" />
                  <label htmlFor="allowDl" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                    Allow visitors to download
                  </label>
                </div>

                <button onClick={createLink} disabled={loading} className="btn-primary w-full justify-center mt-4">
                  {loading
                    ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <><Link size={15} /> Generate link</>}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 bg-brand-50 dark:bg-brand-900/20 rounded-xl p-3 border border-brand-200 dark:border-brand-800">
                  <input readOnly value={shareUrl}
                    className="flex-1 bg-transparent text-xs text-brand-700 dark:text-brand-300 outline-none min-w-0 font-mono" />
                  <button onClick={handleCopy}
                    className="shrink-0 p-1.5 rounded-lg bg-brand-100 dark:bg-brand-800 text-brand-600 dark:text-brand-300 hover:bg-brand-200 dark:hover:bg-brand-700">
                    {copied ? <CheckCheck size={15} /> : <Copy size={15} />}
                  </button>
                </div>
                {password && (
                  <p className="text-xs text-brand-600 dark:text-brand-400 font-medium px-2">
                    <Lock size={10} className="inline mr-1" /> Password: {password}
                  </p>
                )}
                <div className="flex gap-2">
                  <button onClick={handleRevoke} className="btn-secondary flex-1 text-red-500 border-red-200 dark:border-red-900 hover:bg-red-50">
                    <Trash2 size={14} /> Revoke
                  </button>
                  <button onClick={reset} className="btn-secondary flex-1">New link</button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
