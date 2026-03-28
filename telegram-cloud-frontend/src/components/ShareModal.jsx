import { useState, useEffect } from 'react'
import { Share2, Copy, CheckCheck, Link, Trash2, Clock, Download, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import { shareAPI } from '../services/api'
import { copyToClipboard } from '../utils/helpers'
import ModalShell from './ui/ModalShell'
import AppButton from './ui/AppButton'

export default function ShareModal({ open, item, isFolder, onClose }) {
  const [shareUrl, setShareUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [expiry, setExpiry] = useState('')
  const [maxDl, setMaxDl] = useState('')
  const [password, setPassword] = useState('')
  const [token, setToken] = useState('')
  const [allowDownload, setAllowDownload] = useState(true)

  const reset = () => {
    setShareUrl('')
    setToken('')
    setExpiry('')
    setMaxDl('')
    setPassword('')
    setAllowDownload(true)
    setCopied(false)
    setLoading(false)
  }

  useEffect(() => {
    if (open) return
    reset()
  }, [open])

  const createLink = async () => {
    setLoading(true)
    try {
      const payload = {
        ...(isFolder ? { folderId: item._id } : { fileId: item._id }),
        ...(expiry ? { expiresInHours: parseInt(expiry, 10) } : {}),
        ...(maxDl ? { maxDownloads: parseInt(maxDl, 10) } : {}),
        ...(password ? { password } : {}),
        allowDownload,
      }

      const { data } = await shareAPI.create(payload)
      setShareUrl(data.data.shareUrl)
      setToken(data.data.share.token)
      toast.success('Share link created')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create link')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (await copyToClipboard(shareUrl)) {
      setCopied(true)
      toast.success('Copied!')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleRevoke = async () => {
    if (!token) return
    try {
      await shareAPI.revoke(token)
      setShareUrl('')
      setToken('')
      toast.success('Share link revoked')
    } catch {
      toast.error('Failed to revoke')
    }
  }

  return (
    <ModalShell
      open={open}
      onClose={() => {
        reset()
        onClose()
      }}
      icon={Share2}
      iconClassName="text-indigo-500 dark:text-indigo-300"
      title={`Share ${isFolder ? 'Folder' : 'File'}`}
      subtitle="Generate a polished secure link with expiry, download limits, and password protection."
      maxWidth="max-w-xl"
    >
      <div className="space-y-5">
        <div className="rounded-[1.7rem] border border-white/40 bg-white/60 p-4 dark:border-white/10 dark:bg-white/[0.04]">
          <p className="truncate text-sm font-bold text-gray-900 dark:text-zinc-100">
            {isFolder ? item?.name : item?.fileName}
          </p>
        </div>

        {!shareUrl ? (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 flex items-center gap-1.5 pl-1 text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">
                  <Clock size={12} /> Expires In
                </label>
                <input
                  value={expiry}
                  onChange={(event) => setExpiry(event.target.value)}
                  type="number"
                  placeholder="Never"
                  className="input text-sm"
                />
              </div>
              <div>
                <label className="mb-2 flex items-center gap-1.5 pl-1 text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">
                  <Download size={12} /> Max Downloads
                </label>
                <input
                  value={maxDl}
                  onChange={(event) => setMaxDl(event.target.value)}
                  type="number"
                  placeholder="Unlimited"
                  className="input text-sm"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 flex items-center gap-1.5 pl-1 text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">
                <Lock size={12} /> Password
              </label>
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="text"
                placeholder="Leave empty for public access"
                className="input text-sm"
              />
            </div>

            <label className="flex items-center gap-3 rounded-[1.4rem] border border-white/40 bg-white/55 px-4 py-3 dark:border-white/10 dark:bg-white/[0.04]">
              <input
                type="checkbox"
                checked={allowDownload}
                onChange={(event) => setAllowDownload(event.target.checked)}
                className="h-5 w-5 rounded-lg border-gray-300 bg-transparent text-indigo-600 focus:ring-indigo-500 dark:border-zinc-700"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-zinc-300">
                Allow visitors to download
              </span>
            </label>

            <div className="flex flex-col gap-3 sm:flex-row">
              <AppButton variant="secondary" fullWidth onClick={() => { reset(); onClose() }}>
                Cancel
              </AppButton>
              <AppButton
                fullWidth
                loading={loading}
                onClick={createLink}
                icon={Link}
              >
                Generate Secure Link
              </AppButton>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-[1.7rem] border border-indigo-200 bg-indigo-50/90 p-4 dark:border-indigo-500/20 dark:bg-indigo-500/10">
              <div className="flex items-center gap-3">
                <input
                  readOnly
                  value={shareUrl}
                  className="min-w-0 flex-1 bg-transparent text-sm font-medium text-indigo-700 outline-none dark:text-indigo-300"
                />
                <AppButton
                  variant="glass"
                  size="icon"
                  onClick={handleCopy}
                  className="h-10 w-10 rounded-2xl text-indigo-600 dark:text-indigo-300"
                >
                  {copied ? <CheckCheck size={16} /> : <Copy size={16} />}
                </AppButton>
              </div>
            </div>

            {password ? (
              <p className="flex items-center gap-2 px-2 text-sm font-medium text-indigo-600 dark:text-indigo-400">
                <Lock size={14} />
                Password: <span className="font-mono">{password}</span>
              </p>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row">
              <AppButton variant="danger" fullWidth onClick={handleRevoke} icon={Trash2}>
                Revoke Link
              </AppButton>
              <AppButton variant="secondary" fullWidth onClick={reset}>
                Create New
              </AppButton>
            </div>
          </div>
        )}
      </div>
    </ModalShell>
  )
}
