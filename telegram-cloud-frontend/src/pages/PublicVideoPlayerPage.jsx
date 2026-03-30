import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Lock, ShieldCheck } from 'lucide-react'
import { motion } from 'framer-motion'
import { monetizationAPI, publicAPI } from '../services/api'
import { formatBytes, getMimeCategory } from '../utils/helpers'
import { getViewerSessionId } from '../utils/viewerSession'

const VideoPlayer = lazy(() => import('../components/VideoPlayer'))

const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

function LoadingState({ label = 'Decrypting link' }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-700 border-t-indigo-400" />
        <p className="text-sm text-zinc-400">{label}</p>
      </div>
    </div>
  )
}

export default function PublicVideoPlayerPage() {
  const { token, fileId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()

  const [shareData, setShareData] = useState(null)
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [password, setPassword] = useState(() => location.state?.password || '')
  const [needsPassword, setNeedsPassword] = useState(false)
  const [passwordError, setPasswordError] = useState('')

  const resolveVideoFile = useCallback((payload) => {
    if (!payload) return null
    if (payload.type === 'file') return payload.file
    return payload.files?.find((entry) => entry._id === fileId) || null
  }, [fileId])

  const fetchShare = useCallback(async (nextPassword = password) => {
    setLoading(true)
    setPasswordError('')
    setError('')

    try {
      const response = await publicAPI.getInfo(token, nextPassword)
      const payload = response.data.data
      const targetFile = resolveVideoFile(payload)

      if (!targetFile) {
        throw new Error('Shared video not found')
      }

      if (getMimeCategory(targetFile.mimeType, targetFile.fileName) !== 'video') {
        throw new Error('This dedicated route only supports shared videos')
      }

      setShareData(payload)
      setFile(targetFile)
      setNeedsPassword(false)
    } catch (nextError) {
      if (nextError.response?.status === 401) {
        setNeedsPassword(true)
        if (nextPassword) {
          setPasswordError('Invalid decryption key')
        }
      } else {
        setError(nextError.response?.data?.message || nextError.message || 'Failed to load shared video')
      }
    } finally {
      setLoading(false)
    }
  }, [password, resolveVideoFile, token])

  useEffect(() => {
    fetchShare()
  }, [fetchShare])

  useEffect(() => {
    if (!file?._id) return

    monetizationAPI.trackView({
      shareToken: token,
      fileId: file._id,
      source: 'public_share_dedicated_video',
      viewerSessionId: getViewerSessionId(),
    }).catch(() => {})
  }, [file?._id, token])

  const previewSrc = useMemo(() => {
    if (!file?._id) return ''

    const params = new URLSearchParams({ preview: '1', fileId: file._id })
    if (password) params.set('pwd', password)

    return `${baseUrl}/public/download/${token}?${params.toString()}`
  }, [file?._id, password, token])

  if (loading && !file && !needsPassword && !error) {
    return <LoadingState />
  }

  if (needsPassword) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-950 px-4 text-white">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[320px] w-[320px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/12 blur-[100px]" />
        <motion.div
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative z-10 w-full max-w-sm rounded-[1.6rem] border border-white/10 bg-white/8 p-6 shadow-2xl backdrop-blur-xl"
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[1rem] border border-indigo-400/20 bg-indigo-500/10 text-indigo-300">
            <ShieldCheck size={28} />
          </div>
          <h1 className="mt-5 text-center text-xl font-bold tracking-tight">Secure video payload</h1>
          <p className="mt-2 text-center text-sm leading-relaxed text-zinc-300">
            Enter the decryption key to unlock this shared video and continue into the dedicated player.
          </p>

          <div className="mt-6 space-y-4">
            <div className="relative">
              <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                autoFocus
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && password) {
                    fetchShare(password)
                  }
                }}
                className="h-11 w-full rounded-xl border border-white/10 bg-black/30 pl-10 pr-4 text-sm text-white placeholder:text-zinc-500 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/30"
                placeholder="Decryption key"
              />
            </div>

            {passwordError ? (
              <p className="text-xs font-semibold text-red-400">{passwordError}</p>
            ) : null}

            <button
              type="button"
              onClick={() => fetchShare(password)}
              disabled={!password}
              className="w-full rounded-xl bg-indigo-500 px-4 py-3 text-sm font-bold text-white transition-all disabled:cursor-not-allowed disabled:opacity-50"
            >
              Unlock dedicated player
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  if (error || !file) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 text-white">
        <div className="w-full max-w-md rounded-[1.6rem] border border-white/10 bg-white/6 p-6 text-center backdrop-blur-xl">
          <h1 className="text-xl font-bold tracking-tight">Shared video unavailable</h1>
          <p className="mt-3 text-sm text-zinc-300">{error || 'We could not open this shared video.'}</p>
          <button
            type="button"
            onClick={() => navigate(`/s/${token}`)}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-zinc-950"
          >
            <ArrowLeft size={16} />
            Back to share
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="border-b border-white/10 bg-black/30 px-4 py-3 backdrop-blur-xl sm:px-5">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(`/s/${token}`)}
              className="rounded-xl border border-white/10 bg-white/5 p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              <ArrowLeft size={16} />
            </button>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-200/80">Shared Video</p>
              <h1 className="truncate text-sm font-bold sm:text-base">{file.fileName}</h1>
              <p className="mt-1 text-[11px] text-zinc-400">{formatBytes(file.fileSize)}</p>
            </div>
          </div>
          <div className="hidden text-right text-[11px] text-zinc-400 sm:block">
            {shareData?.shareParams?.expiresAt ? `Expires ${shareData.shareParams.expiresAt}` : 'Secure share link'}
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-5 lg:grid lg:grid-cols-[1.22fr_0.45fr] lg:items-start">
        <section className="overflow-hidden rounded-[1.8rem] border border-white/10 bg-black shadow-[0_40px_100px_-48px_rgba(0,0,0,0.95)]">
          <div className="aspect-video w-full bg-black">
            <Suspense fallback={<LoadingState label="Preparing shared video player" />}>
              <VideoPlayer
                src={previewSrc}
                file={file}
                dark
                resumeKey={`${token}:${file._id}`}
                isPublic
              />
            </Suspense>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-200/80">Playback Rules</p>
            <h2 className="mt-3 text-xl font-bold tracking-tight">Secure share, same guaranteed flow</h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-300">
              The dedicated shared player attempts the in-stream ad first. If it fails, times out, or is blocked, fallback runs and the main content still starts automatically.
            </p>
          </section>

          <section className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-200/80">Mobile First</p>
            <p className="mt-3 text-sm leading-relaxed text-zinc-300">
              First tap starts playback, double tap seeks by 10 seconds, and the player keeps shared-video playback isolated from ad-tracking failures.
            </p>
          </section>
        </aside>
      </main>
    </div>
  )
}
