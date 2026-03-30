import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Download, FileText, Keyboard, PictureInPicture2, Zap } from 'lucide-react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { filesAPI } from '../services/api'
import { formatBytes, getMimeCategory } from '../utils/helpers'
import { useTheme } from '../context/ThemeContext'
import AdSlot, { useAdGuard } from '../components/AdBanner'

const VideoPlayer = lazy(() => import('../components/VideoPlayer'))

function LoadingState({ dark, label = 'Loading video experience' }) {
  return (
    <div className={`flex min-h-screen items-center justify-center ${dark ? 'bg-zinc-950 text-white' : 'bg-gray-50 text-zinc-900'}`}>
      <div className="flex flex-col items-center gap-4">
        <div className={`h-10 w-10 animate-spin rounded-full border-2 border-t-transparent ${dark ? 'border-zinc-700 border-t-indigo-400' : 'border-gray-300 border-t-indigo-500'}`} />
        <p className="text-sm font-medium text-zinc-500">{label}</p>
      </div>
    </div>
  )
}

function ErrorState({ dark, title, description, onBack }) {
  return (
    <div className={`flex min-h-screen items-center justify-center px-4 ${dark ? 'bg-zinc-950 text-white' : 'bg-gray-50 text-zinc-900'}`}>
      <div className="w-full max-w-md rounded-[1.6rem] border border-red-200/70 bg-white/90 p-6 text-center shadow-xl dark:border-red-500/20 dark:bg-zinc-900/90">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[1rem] border border-red-200/70 bg-red-50 text-red-500 dark:border-red-500/20 dark:bg-red-500/10">
          <FileText size={24} />
        </div>
        <h2 className="mt-4 text-lg font-bold">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-500">{description}</p>
        <button
          type="button"
          onClick={onBack}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white dark:bg-white dark:text-zinc-900"
        >
          <ArrowLeft size={16} />
          Back to workspace
        </button>
      </div>
    </div>
  )
}

export default function FileViewPage() {
  const { id, fileId } = useParams()
  const activeFileId = id || fileId
  const navigate = useNavigate()
  const { dark } = useTheme()
  const canShowAds = useAdGuard()
  const token = localStorage.getItem('token')

  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    const fetchFile = async () => {
      setLoading(true)
      setError('')

      try {
        const response = await filesAPI.get(activeFileId)
        const nextFile = response?.data?.data?.file

        if (!nextFile) {
          throw new Error('Video asset not found in your workspace')
        }

        if (!cancelled) {
          setFile(nextFile)
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError.response?.data?.message || nextError.message || 'Failed to load video asset')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchFile()

    return () => {
      cancelled = true
    }
  }, [activeFileId, token])

  const category = useMemo(
    () => getMimeCategory(file?.mimeType, file?.fileName),
    [file?.fileName, file?.mimeType]
  )

  if (loading) {
    return <LoadingState dark={dark} />
  }

  if (error) {
    return (
      <ErrorState
        dark={dark}
        title="Video unavailable"
        description={error}
        onBack={() => navigate(-1)}
      />
    )
  }

  if (!file || category !== 'video') {
    return (
      <ErrorState
        dark={dark}
        title="Dedicated player only supports videos"
        description="This route is reserved for dedicated video playback. Open non-video files from the normal preview flow instead."
        onBack={() => navigate(-1)}
      />
    )
  }

  const previewSrc = `${filesAPI.preview(file._id)}?token=${token}`
  const posterSrc = filesAPI.thumbnail(file._id)

  const handleDownload = () => {
    toast.success('Download starting...')
    window.location.href = filesAPI.downloadUrl(file._id)
  }

  return (
    <div className={`min-h-screen ${dark ? 'bg-zinc-950 text-white' : 'bg-zinc-950 text-white'}`}>
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.3),transparent_42%),radial-gradient(circle_at_78%_18%,rgba(16,185,129,0.12),transparent_24%)]" />

        <header className="relative z-20 border-b border-white/10 bg-black/30 px-4 py-3 backdrop-blur-xl sm:px-5">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="rounded-xl border border-white/10 bg-white/5 p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              >
                <ArrowLeft size={16} />
              </button>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-200/80">Dedicated Player</p>
                <h1 className="truncate text-sm font-bold sm:text-base">{file.fileName}</h1>
                <p className="mt-1 text-[11px] text-zinc-400">{formatBytes(file.fileSize)}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-zinc-950"
            >
              <Download size={15} />
              Download
            </button>
          </div>
        </header>

        <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-5 lg:grid lg:grid-cols-[1.25fr_0.42fr] lg:items-start">
          <section className="overflow-hidden rounded-[1.8rem] border border-white/10 bg-black shadow-[0_40px_100px_-48px_rgba(0,0,0,0.95)]">
            <div className="aspect-video w-full bg-black">
              <Suspense fallback={<LoadingState dark={dark} label="Preparing dedicated player" />}>
                <VideoPlayer
                  src={previewSrc}
                  poster={posterSrc}
                  file={file}
                  dark={dark}
                  resumeKey={file._id}
                />
              </Suspense>
            </div>
          </section>

          <aside className="space-y-4">
            <section className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-200/80">Playback UX</p>
              <h2 className="mt-3 text-xl font-bold tracking-tight">Ad first, content always</h2>
              <p className="mt-3 text-sm leading-relaxed text-zinc-300">
                The first tap starts the pre-roll attempt. If the VAST ad fails, times out, or is blocked, the fallback overlay runs and the main video continues automatically.
              </p>
            </section>

            <section className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-indigo-200">
                  <Keyboard size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Shortcuts</h3>
                  <p className="text-xs text-zinc-400">Space, arrows, M, F, and P</p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-emerald-200">
                  <PictureInPicture2 size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Resume + PiP</h3>
                  <p className="text-xs text-zinc-400">Playback resumes automatically and supports picture-in-picture.</p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-amber-200">
                  <Zap size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Mobile gestures</h3>
                  <p className="text-xs text-zinc-400">Single tap toggles playback, double tap seeks by 10 seconds.</p>
                </div>
              </div>
            </section>

            {canShowAds ? (
              <section className="overflow-hidden rounded-[1.4rem] border border-white/10 bg-white/5 p-3 backdrop-blur-xl">
                <AdSlot formatId="2018497" style={{ width: '100%', minHeight: 90 }} />
              </section>
            ) : null}
          </aside>
        </main>
      </div>
    </div>
  )
}
