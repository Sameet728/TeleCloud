import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Download, ZoomIn, ZoomOut, RotateCw, Volume2,
  ChevronLeft, ChevronRight, Maximize2
} from 'lucide-react'
import toast from 'react-hot-toast'
import { filesAPI } from '../services/api'
import { getMimeCategory, formatBytes, formatDate } from '../utils/helpers'
import FileIcon from '../utils/fileIcons'
import { useTheme } from '../context/ThemeContext'
import AdSlot, { useAdGuard } from './AdBanner'
import DownloadAdGate from './DownloadAdGate'
import UI_LAYERS from '../constants/uiLayers'

// Lazy-loaded viewers (code-split to minimize initial bundle)
const CodeViewer = lazy(() => import('./viewers/CodeViewer'))
const SpreadsheetViewer = lazy(() => import('./viewers/SpreadsheetViewer'))
const DocViewer = lazy(() => import('./viewers/DocViewer'))
const AudioPlayerPro = lazy(() => import('./viewers/AudioPlayerPro'))
const PdfViewerPro = lazy(() => import('./viewers/PdfViewerPro'))

// Lazy fallback spinner
const LazySpinner = ({ dark }) => (
  <div className="flex items-center justify-center h-64">
    <div className={`w-8 h-8 border-2 rounded-full animate-spin ${dark ? 'border-white/30 border-t-white' : 'border-gray-300 border-t-gray-600'}`}/>
  </div>
)

// ── per-type palette ──────────────────────────────────────────────────
const PALETTE = {
  image:        { accent: '#22c55e',  label: 'Image' },
  video:        { accent: '#a855f7',  label: 'Video' },
  audio:        { accent: '#ec4899',  label: 'Audio' },
  pdf:          { accent: '#ef4444',  label: 'PDF' },
  doc:          { accent: '#3b82f6',  label: 'Document' },
  sheet:        { accent: '#10b981',  label: 'Spreadsheet' },
  code:         { accent: '#6b7280',  label: 'Code' },
  presentation: { accent: '#f97316',  label: 'Presentation' },
  archive:      { accent: '#f59e0b',  label: 'Archive' },
  other:        { accent: '#8b5cf6',  label: 'File' },
}

// ── Image viewer with zoom/rotate/pan ─────────────────────────────────────
function ImageViewer({ src, fileName, dark }) {
  const [scale, setScale]   = useState(1)
  const [rotate, setRotate] = useState(0)
  const [flipH, setFlipH]   = useState(false)
  const [flipV, setFlipV]   = useState(false)
  const [loading, setLoading] = useState(true)
  const [dragStart, setDragStart] = useState(null)
  const [offset, setOffset] = useState({ x: 0, y: 0 })

  useEffect(() => { setScale(1); setRotate(0); setFlipH(false); setFlipV(false); setLoading(true); setOffset({ x: 0, y: 0 }); }, [src])

  // Keyboard shortcuts for image
  useEffect(() => {
    const handler = (e) => {
      if (e.key === '+' || e.key === '=') { e.preventDefault(); setScale(s => Math.min(5, s + 0.25)) }
      if (e.key === '-') { e.preventDefault(); setScale(s => Math.max(0.25, s - 0.25)) }
      if (e.key === 'r' || e.key === 'R') { e.preventDefault(); setRotate(r => (r + 90) % 360) }
      if (e.key === '0') { e.preventDefault(); setScale(1); setRotate(0); setOffset({ x: 0, y: 0 }) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Pan/drag handling
  const handleMouseDown = (e) => {
    if (scale <= 1) return
    e.preventDefault()
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y })
  }
  const handleMouseMove = (e) => {
    if (!dragStart) return
    setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y })
  }
  const handleMouseUp = () => setDragStart(null)

  const reset = () => { setScale(1); setRotate(0); setFlipH(false); setFlipV(false); setOffset({ x: 0, y: 0 }) }

  const ToolBtn = ({ onClick, title, children, active }) => (
    <button onClick={onClick} title={title}
      className={`p-2 rounded-lg transition-all text-white/80 hover:text-white hover:bg-white/20 active:scale-90 ${active ? 'bg-white/20 text-white' : ''}`}>
      {children}
    </button>
  )

  const previewTree = (
    <div className="flex flex-col items-center gap-3 h-full w-full"
         onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
      {/* HIGH CONTRAST FLOATING TOOLBAR — always dark for visibility */}
      <div className="flex items-center gap-1 rounded-2xl px-3 py-1.5 bg-black/70 backdrop-blur-xl shadow-2xl border border-white/10 z-20">
        <ToolBtn onClick={() => setScale(s => Math.max(0.25, s - 0.25))} title="Zoom out (-)">
          <ZoomOut size={16}/>
        </ToolBtn>
        <span className="text-xs w-12 text-center select-none text-white/70 font-mono tabular-nums">
          {Math.round(scale * 100)}%
        </span>
        <ToolBtn onClick={() => setScale(s => Math.min(5, s + 0.25))} title="Zoom in (+)">
          <ZoomIn size={16}/>
        </ToolBtn>
        <div className="w-px h-5 mx-1 bg-white/15"/>
        <ToolBtn onClick={() => setRotate(r => (r + 90) % 360)} title="Rotate (R)">
          <RotateCw size={16}/>
        </ToolBtn>
        <ToolBtn onClick={() => setFlipH(!flipH)} title="Flip horizontal" active={flipH}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v18M16 7l4 5-4 5M8 7l-4 5 4 5"/></svg>
        </ToolBtn>
        <ToolBtn onClick={() => setFlipV(!flipV)} title="Flip vertical" active={flipV}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M7 8L12 4l5 4M7 16l5 4 5-4"/></svg>
        </ToolBtn>
        <div className="w-px h-5 mx-1 bg-white/15"/>
        <ToolBtn onClick={() => {
          const el = document.querySelector('[data-image-container] img')
          if (el) el.requestFullscreen?.()
        }} title="Fullscreen">
          <Maximize2 size={16}/>
        </ToolBtn>
        <button onClick={reset}
          className="text-[11px] px-2.5 py-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/20 transition-all font-medium">
          Reset
        </button>
      </div>

      {/* Image display area */}
      <div data-image-container className="flex-1 flex items-center justify-center w-full overflow-hidden relative"
           style={{ cursor: scale > 1 ? (dragStart ? 'grabbing' : 'grab') : 'zoom-in' }}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
          </div>
        )}
        <motion.img
          src={src} alt={fileName}
          onLoad={() => setLoading(false)}
          onMouseDown={handleMouseDown}
          animate={{ scale, rotate, x: offset.x, y: offset.y, scaleX: flipH ? -scale : scale, scaleY: flipV ? -scale : scale }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          className={`max-w-full max-h-full object-contain rounded-lg shadow-2xl transition-opacity duration-300 select-none ${loading ? 'opacity-0' : 'opacity-100'}`}
          onClick={e => { e.stopPropagation(); if (!dragStart) setScale(s => s === 1 ? 2 : 1) }}
          draggable={false}
        />
      </div>

      {/* Keyboard hint */}
      <div className="flex items-center gap-3 text-[10px] text-white/25 font-mono pb-1">
        <span>+/- Zoom</span>
        <span>R Rotate</span>
        <span>0 Reset</span>
        <span>Click to 2×</span>
      </div>
    </div>
  )
}

// ── Video player (Delegated to external component) ─────────────

// ── Audio player ──────────────────────────────────────────────────────
function AudioPlayer({ src, file, dark }) {
  return (
    <div className="flex flex-col items-center justify-center gap-8 py-8">
      <div className="w-48 h-48 rounded-2xl flex items-center justify-center relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg,#ec4899,#8b5cf6)' }}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          className="w-36 h-36 rounded-full border-8 border-white/20 flex items-center justify-center">
          <Volume2 size={40} className="text-white"/>
        </motion.div>
        <div className="absolute w-4 h-4 rounded-full bg-white/80"/>
      </div>
      <div className="text-center">
        <p className={`font-semibold text-lg mb-1 ${dark ? 'text-white' : 'text-gray-900'}`}>{file.fileName}</p>
        <p className={`text-sm ${dark ? 'text-white/50' : 'text-gray-400'}`}>{formatBytes(file.fileSize)}</p>
      </div>
      <audio key={src} src={src} controls autoPlay className="w-80 accent-pink-500"/>
    </div>
  )
}

// ── PDF viewer ────────────────────────────────────────────────────────
function PdfViewer({ src, dark }) {
  const [loading, setLoading] = useState(true)
  useEffect(() => { setLoading(true); }, [src])

  return (
    <div className="w-full h-full flex items-center justify-center relative">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-10 transition-opacity">
          <div className={`w-8 h-8 border-2 rounded-full animate-spin ${dark ? 'border-white/30 border-t-white' : 'border-gray-300 border-t-gray-600'}`}/>
        </div>
      )}
      <iframe key={src} src={src} onLoad={() => setLoading(false)} 
        className={`w-full h-full rounded-xl shadow-2xl border-0 transition-opacity duration-300 ${loading ? 'opacity-0' : 'opacity-100'}`}
        title="PDF Preview"/>
    </div>
  )
}

// ── Text viewer ───────────────────────────────────────────────────────
function TextViewer({ src, dark }) {
  const [content, setContent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(false)

  useEffect(() => {
    setLoading(true); setError(false); setContent(null)
    fetch(src).then(r => r.text()).then(t => { setContent(t); setLoading(false) })
      .catch(() => { setError(true); setLoading(false) })
  }, [src])

  if (loading) return <div className="flex items-center justify-center h-64">
    <div className={`w-8 h-8 border-2 rounded-full animate-spin
      ${dark ? 'border-white/30 border-t-white' : 'border-gray-300 border-t-gray-600'}`}/>
  </div>
  if (error) return <div className={`flex items-center justify-center h-64 text-sm
    ${dark ? 'text-white/40' : 'text-gray-400'}`}>Could not load text file.</div>

  return (
    <div className={`w-full h-full overflow-auto rounded-xl border
      ${dark ? 'bg-black/40 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
      <pre className={`p-5 text-sm font-mono whitespace-pre-wrap break-words leading-relaxed
        ${dark ? 'text-gray-200' : 'text-gray-800'}`}>
        {content}
      </pre>
    </div>
  )
}

// ── Generic fallback ──────────────────────────────────────────────────
function GenericPreview({ file, cat, dark, onDownload }) {
  const palette = PALETTE[cat] || PALETTE.other
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-12">
      <div className="relative">
        <div className="w-32 h-32 rounded-3xl flex items-center justify-center"
          style={{ background: palette.accent + '22', border: `2px solid ${palette.accent}44` }}>
          <FileIcon mimeType={file.mimeType} size={48}/>
        </div>
        <div className="absolute inset-0 rounded-3xl blur-2xl opacity-30" style={{ background: palette.accent }}/>
      </div>
      <div className="text-center space-y-1">
        <p className={`font-semibold text-xl ${dark ? 'text-white' : 'text-gray-900'}`}>{file.fileName}</p>
        <p className={dark ? 'text-white/40 text-sm' : 'text-gray-400 text-sm'}>{formatBytes(file.fileSize)} · {palette.label}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
        {[
          { label: 'Size',     value: formatBytes(file.fileSize) },
          { label: 'Type',     value: palette.label },
          { label: 'Uploaded', value: formatDate(file.createdAt) },
          { label: 'Format',   value: file.mimeType?.split('/')[1]?.toUpperCase() || 'Unknown' },
        ].map(({ label, value }) => (
          <div key={label} className={`rounded-xl p-3 border
            ${dark ? 'bg-white/5 border-white/10' : 'bg-gray-100 border-gray-200'}`}>
            <p className={`text-xs mb-0.5 ${dark ? 'text-white/40' : 'text-gray-400'}`}>{label}</p>
            <p className={`text-sm font-medium truncate ${dark ? 'text-white' : 'text-gray-800'}`}>{value}</p>
          </div>
        ))}
      </div>
      <button onClick={onDownload}
        className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium text-sm text-white transition-all hover:scale-105 active:scale-95"
        style={{ background: palette.accent }}>
        <Download size={16}/> Download File
      </button>
    </div>
  )
}

function VideoRoutePrompt({ file, dark, onOpenPlayer }) {
  return (
    <div className="flex w-full max-w-lg flex-col items-center justify-center gap-6 px-5 py-10 text-center">
      <div className="rounded-[1.7rem] border border-white/10 bg-white/5 p-5 shadow-[0_25px_70px_-38px_rgba(0,0,0,0.8)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1rem] bg-violet-500/15 text-violet-200">
          <FileIcon mimeType={file.mimeType} size={32} />
        </div>
        <h3 className={`mt-5 text-xl font-bold tracking-tight ${dark ? 'text-white' : 'text-gray-900'}`}>
          Open in dedicated player
        </h3>
        <p className={`mt-3 text-sm leading-relaxed ${dark ? 'text-white/55' : 'text-gray-500'}`}>
          Videos now use the dedicated playback route so the pre-roll ad attempt, fallback overlay, resume state, and gesture controls all stay in one place.
        </p>
        <button
          type="button"
          onClick={onOpenPlayer}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-zinc-950 transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          Open video player
        </button>
      </div>
    </div>
  )
}

// ── Thumbnail strip ───────────────────────────────────────────────────
function ThumbnailStrip({ files, currentIdx, onSelect, dark }) {
  const token = localStorage.getItem('token')
  const stripRef = useRef(null)

  // Keep current thumb centred
  useEffect(() => {
    const el = stripRef.current?.children[currentIdx]
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [currentIdx])

  return (
    <div ref={stripRef}
      className={`flex gap-2 overflow-x-auto px-4 py-2 scrollbar-hide
        ${dark ? '' : ''}`}
      style={{ scrollbarWidth: 'none' }}>
      {files.map((f, i) => {
        const cat     = getMimeCategory(f.mimeType, f.fileName)
        const isImage = cat === 'image'
        const isCur   = i === currentIdx
        const getPreviewUrl = (file) => {
          if (!file) return '';
          if (file._publicToken) {
            let url = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/public/download/${file._publicToken}?preview=1`;
            if (file._publicPwd) url += `&pwd=${encodeURIComponent(file._publicPwd)}`;
            if (file._id) url += `&fileId=${file._id}`;
            return url;
          }
          return `${filesAPI.preview(file._id)}?token=${token}`;
        }
        
        const src     = isImage ? getPreviewUrl(f) : null

        return (
          <button key={f._id} onClick={() => onSelect(i)}
            className={`shrink-0 relative w-14 h-14 rounded-xl overflow-hidden transition-all
              ${isCur
                ? 'ring-2 scale-110 shadow-lg ring-offset-1'
                : dark
                  ? 'opacity-50 hover:opacity-80 ring-1 ring-white/10'
                  : 'opacity-50 hover:opacity-80 ring-1 ring-black/10'}
              ${dark ? 'ring-offset-black' : 'ring-offset-white'}`}
            style={isCur ? { ringColor: PALETTE[getMimeCategory(f.mimeType, f.fileName)]?.accent } : {}}
          >
            {isImage
              ? <img src={src} alt={f.fileName} className="w-full h-full object-cover"/>
              : <div className={`w-full h-full flex items-center justify-center
                  ${dark ? 'bg-white/8' : 'bg-gray-100'}`}>
                  <FileIcon mimeType={f.mimeType} size={14}/>
                </div>
            }
            {isCur && (
              <div className="absolute inset-0 rounded-xl"
                style={{ boxShadow: `inset 0 0 0 2px ${PALETTE[cat]?.accent || '#6366f1'}` }}/>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ── Main modal ────────────────────────────────────────────────────────
export default function PreviewModal({
  open,
  file,
  files = [],
  onClose,
  ensureViewerContextToken = null,
}) {
  const navigate = useNavigate()
  const { dark } = useTheme()
  const token    = localStorage.getItem('token')
  const canShowAds = useAdGuard()
  const [gateOpen, setGateOpen] = useState(false)
  const [audioMiniMode, setAudioMiniMode] = useState(false)
  const [bgAudioFile, setBgAudioFile] = useState(null)
  const [forceAudioOpen, setForceAudioOpen] = useState(false)
  const [publicViewerContextToken, setPublicViewerContextToken] = useState(file?._viewerContextToken || null)

  // Find starting index from the files array
  const startIdx = file && files.length ? files.findIndex(f => f._id === file._id) : 0
  const [idx, setIdx] = useState(Math.max(0, startIdx))

  const current = files.length ? files[idx] : file

  useEffect(() => {
    let cancelled = false

    if (current?._publicToken && ensureViewerContextToken) {
      ensureViewerContextToken(current, 'public_share_preview')
        .then((contextToken) => {
          if (!cancelled) setPublicViewerContextToken(contextToken || null)
        })
        .catch(() => {
          if (!cancelled) setPublicViewerContextToken(null)
        })
    } else {
      setPublicViewerContextToken(current?._viewerContextToken || null)
    }

    return () => {
      cancelled = true
    }
  }, [current, ensureViewerContextToken])

  // Whenever we open a new audio file, it becomes the background audio
  useEffect(() => {
    if (open && current && getMimeCategory(current.mimeType, current.fileName) === 'audio') {
      setBgAudioFile(current)
      setAudioMiniMode(false)
      setForceAudioOpen(false)
    }
  }, [open, current])

  // Auto-hide controls
  const [controlsVisible, setControlsVisible] = useState(true)
  const idleTimerRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const handleActivity = () => {
      setControlsVisible(true)
      clearTimeout(idleTimerRef.current)
      idleTimerRef.current = setTimeout(() => setControlsVisible(false), 2500)
    }
    handleActivity()
    window.addEventListener('mousemove', handleActivity)
    window.addEventListener('keydown', handleActivity)
    window.addEventListener('touchstart', handleActivity)
    return () => {
      window.removeEventListener('mousemove', handleActivity)
      window.removeEventListener('keydown', handleActivity)
      window.removeEventListener('touchstart', handleActivity)
      clearTimeout(idleTimerRef.current)
    }
  }, [open])


  // Sync index whenever the triggering file prop changes
  useEffect(() => {
    if (!open) return
    const i = file && files.length ? files.findIndex(f => f._id === file._id) : 0
    setIdx(Math.max(0, i))
  }, [open, file])

  const getPreviewUrl = (f) => {
    if (!f) return '';
    if (f._publicToken) {
      let url = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/public/download/${f._publicToken}?preview=1`;
      if (f._publicPwd) url += `&pwd=${encodeURIComponent(f._publicPwd)}`;
      if (f._id) url += `&fileId=${f._id}`;
      return url;
    }
    return `${filesAPI.preview(f._id)}?token=${token}`;
  }

  // Active viewing logic
  const activeFile = (open && current) ? current : (bgAudioFile || current)
  const cat     = activeFile ? getMimeCategory(activeFile.mimeType, activeFile.fileName) : ''
  const palette = PALETTE[cat] || PALETTE.other
  const src     = getPreviewUrl(activeFile)
  const activeViewerContextToken = activeFile?._publicToken
    ? publicViewerContextToken
    : (activeFile?._viewerContextToken || null)

  const openDedicatedPlayer = () => {
    if (!activeFile?._id) return

    if (activeFile._publicToken) {
      navigate(`/s/${activeFile._publicToken}/video/${activeFile._id}`, {
        state: {
          password: activeFile._publicPwd || '',
        },
      })
    } else {
      navigate(`/view/${activeFile._id}`)
    }

    if (forceAudioOpen) setForceAudioOpen(false)
    if (open) onClose()
  }

  // Modal is visible if the user explicitly opened a file (open = true) or expanded audio (forceAudioOpen = true),
  // AND they haven't minimized the CURRENTLY actively viewed file (if it's the background audio)
  const isViewingBgAudio = bgAudioFile && activeFile?._id === bgAudioFile._id
  const isModalVisible = (open || forceAudioOpen) && !(audioMiniMode && isViewingBgAudio)

  const hasPrev = idx > 0
  const hasNext = idx < files.length - 1

  const goNext = () => hasNext && setIdx(i => i + 1)
  const goPrev = () => hasPrev && setIdx(i => i - 1)

  // Keyboard navigation
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight')  goNext()
      if (e.key === 'ArrowLeft')   goPrev()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, idx, hasPrev, hasNext, current])

  const handleDownload = async () => {
    if (!current) return
    
    if (canShowAds) {
      setGateOpen(true)
      return
    }
    await doDownload()
  }

  const doDownload = async () => {
    if (!current) return

    if (current._publicToken) {
      let url = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/public/download/${current._publicToken}`;
      const params = new URLSearchParams();
      if (current._publicPwd) params.append('pwd', current._publicPwd);
      if (current._id) params.append('fileId', current._id);
      if (params.toString()) url += `?${params.toString()}`;
      window.location.href = url;
      return;
    }

    // Authenticated download
    toast.success('Download starting...')
    window.location.href = filesAPI.downloadUrl(current._id)
  }

  const renderContent = () => {
    if (!activeFile) return null
    if (cat === 'audio') return null // Handled permanently below so it doesn't unmount
    switch (cat) {
      case 'image':   return <ImageViewer src={src} fileName={activeFile.fileName} dark={dark}/>
      case 'video':   return <VideoRoutePrompt file={activeFile} dark={dark} onOpenPlayer={openDedicatedPlayer} />
      case 'pdf':     return <Suspense fallback={<LazySpinner dark={dark}/>}><PdfViewerPro src={src} dark={dark}/></Suspense>
      case 'code':    return <Suspense fallback={<LazySpinner dark={dark}/>}><CodeViewer src={src} fileName={activeFile.fileName} dark={dark}/></Suspense>
      case 'sheet':   return <Suspense fallback={<LazySpinner dark={dark}/>}><SpreadsheetViewer src={src} fileName={activeFile.fileName} dark={dark}/></Suspense>
      case 'doc':     return <Suspense fallback={<LazySpinner dark={dark}/>}><DocViewer src={src} fileName={activeFile.fileName} dark={dark}/></Suspense>
      default:        return <GenericPreview file={activeFile} cat={cat} dark={dark} onDownload={handleDownload}/>
    }
  }

  // ── theme tokens ──────────────────────────────────────────────────
  const overlay  = dark ? 'rgba(0,0,0,0.88)' : 'rgba(15,23,42,0.65)'
  const barBg    = dark ? 'rgba(12,12,16,0.85)'  : 'rgba(255,255,255,0.92)'
  const barBdr   = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'
  const titleClr = dark ? 'text-white' : 'text-gray-900'
  const subClr   = dark ? 'text-white/40' : 'text-gray-400'
  const btnBase  = dark
    ? 'text-white/70 hover:text-white border-white/15 hover:border-white/30 hover:bg-white/10'
    : 'text-gray-600 hover:text-gray-900 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
  const navBtn   = dark
    ? 'bg-white/10 hover:bg-white/20 text-white'
    : 'bg-white hover:bg-gray-50 text-gray-700 shadow-md'

  return (
    <AnimatePresence>
      {(open || bgAudioFile) && (activeFile || bgAudioFile) && (
        <motion.div
          key="preview-overlay"
          initial={{ opacity: 0 }} 
          animate={{ opacity: isModalVisible ? 1 : 0 }} 
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={`fixed inset-0 flex flex-col ${isModalVisible ? '' : 'pointer-events-none'}`}
          style={{ 
            zIndex: UI_LAYERS.preview,
            background: isModalVisible ? overlay : 'transparent', 
            backdropFilter: isModalVisible ? 'blur(16px)' : 'none'
          }}
          onClick={() => {
            if (forceAudioOpen) setForceAudioOpen(false)
            if (open) onClose()
          }}   // click backdrop → close
        >
          {/* Ambient blob */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[500px] h-[260px] rounded-full blur-[100px] opacity-20"
              style={{ background: palette.accent }}/>
          </div>

          {/* ── Top bar ───────────────────────────────────────────── */}
          <motion.div
            initial={{ y: -16, opacity: 0 }}
            animate={{ y: controlsVisible ? 0 : -32, opacity: controlsVisible ? 1 : 0 }}
            transition={{ duration: 0.2 }}
            className={`absolute left-0 right-0 top-0 z-50 flex items-center gap-3 px-3.5 py-2 transition-opacity ${!controlsVisible ? 'pointer-events-none' : ''}`}
            style={{ background: barBg, backdropFilter: 'blur(24px)', borderBottom: `1px solid ${barBdr}` }}
            onClick={e => e.stopPropagation()}
            onMouseEnter={() => { setControlsVisible(true); clearTimeout(idleTimerRef.current) }}
          >
            {/* file info */}
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <FileIcon mimeType={activeFile?.mimeType} size={15}/>
              <div className="min-w-0">
                <p className={`text-[13px] font-semibold leading-tight truncate ${titleClr}`}>{activeFile?.fileName || 'Preview'}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {activeFile && (
                    <>
                      <span className="rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                        style={{ background: palette.accent + '22', color: palette.accent }}>
                        {palette.label}
                      </span>
                      <span className={`text-[11px] ${subClr}`}>{formatBytes(activeFile.fileSize)}</span>
                    </>
                  )}
                  {open && files.length > 1 && (
                    <span className={`text-[11px] ${subClr}`}>{idx + 1} / {files.length}</span>
                  )}
                </div>
              </div>
            </div>

            {/* actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button onClick={handleDownload}
                className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-[11px] font-medium transition-all ${btnBase}`}>
                <Download size={12}/> Download
              </button>
              <button onClick={() => {
                if (forceAudioOpen) setForceAudioOpen(false)
                if (open) onClose()
              }}
                className={`rounded-xl p-1 transition-all ${btnBase}`}>
                <X size={16}/>
              </button>
            </div>
          </motion.div>

          {/* ── Content area ──────────────────────────────────────── */}
          <div className="absolute inset-0 z-10 flex items-stretch overflow-hidden"
            onClick={e => e.stopPropagation()}>

            {/* Prev arrow */}
            <AnimatePresence>
              {open && hasPrev && (
                <motion.button
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                  onClick={goPrev}
                  className={`absolute left-3 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full transition-all ${navBtn}`}
                  title="Previous (←)">
                  <ChevronLeft size={18}/>
                </motion.button>
              )}
            </AnimatePresence>

            {/* Next arrow */}
            <AnimatePresence>
              {open && hasNext && (
                <motion.button
                  initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                  onClick={goNext}
                  className={`absolute right-3 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full transition-all ${navBtn}`}
                  title="Next (→)">
                  <ChevronRight size={18}/>
                </motion.button>
              )}
            </AnimatePresence>

              {/* Center content + Bottom Ad placement */}
              <motion.div 
                animate={{ 
                  paddingTop: controlsVisible ? 64 : 20,
                  paddingBottom: controlsVisible ? (files.length > 1 ? 88 : 32) : 20
                }}
                transition={{ duration: 0.2 }}
                className="relative flex h-full w-full flex-1 flex-col items-center justify-center overflow-x-hidden overflow-y-auto px-3 sm:px-5">
                
                <AnimatePresence mode="wait">
                  <motion.div key={current._id}
                    initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="flex flex-col items-center justify-center w-full min-h-0 flex-1 relative z-20">
                    
                    {/* Main Content Area */}
                    <div className="flex-1 overflow-hidden relative w-full h-full min-h-0 flex items-center justify-center" onContextMenu={e => e.preventDefault()}>
                      {renderContent()}
                    </div>

                    {canShowAds && (
                      <div className="relative mb-2 mt-5 w-full max-w-[42rem] shrink-0 rounded-[1.25rem] bg-gradient-to-r from-transparent via-white/5 dark:via-white/5 to-transparent p-2">
                        <div className="absolute top-0 right-0 left-0 flex justify-center -mt-2">
                          <span className="bg-black/40 backdrop-blur px-2 py-0.5 rounded text-[8px] uppercase tracking-widest text-white/50 border border-white/10">Advertisement</span>
                        </div>
                        <AdSlot
                          formatId="2018497"
                          style={{ width: '100%', margin: '0 auto', maxWidth: 728, minHeight: 86 }}
                          tracking={activeViewerContextToken ? {
                            viewerContextToken: activeViewerContextToken,
                            slotId: `preview-${activeFile?._id || 'asset'}`,
                            source: 'public_share_preview_ad',
                          } : null}
                        />
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>

                {/* Permanently Mounted Audio Player (Outside Keyed Animation) */}
                {bgAudioFile && (
                  <div className="absolute inset-0 z-30" style={{ pointerEvents: 'none', opacity: cat === 'audio' ? 1 : 0 }}>
                    <div style={{ display: 'flex', width: '100%', height: '100%', alignItems: cat === 'audio' ? 'center' : 'flex-end', justifyContent: 'center', pointerEvents: (cat === 'audio' && isModalVisible) ? 'auto' : 'none' }}>
                      <Suspense fallback={<LazySpinner dark={dark}/>}>
                        <AudioPlayerPro 
                          src={getPreviewUrl(bgAudioFile)} 
                          file={bgAudioFile} 
                          dark={dark} 
                          onMinimize={() => setAudioMiniMode(true)} 
                          onExpand={() => {
                            setAudioMiniMode(false)
                            if (!open) setForceAudioOpen(true)
                          }}
                          onClose={() => { 
                            setAudioMiniMode(false)
                            setForceAudioOpen(false)
                            setBgAudioFile(null)
                            if (activeFile && bgAudioFile._id === activeFile._id && open) {
                              onClose()
                            }
                          }} 
                        />
                      </Suspense>
                    </div>
                  </div>
                )}
              </motion.div>
          </div>


          {/* ── Thumbnail strip (bottom) ───────────────────────────── */}
          {files.length > 1 && (
            <motion.div
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: controlsVisible ? 0 : 32, opacity: controlsVisible ? 1 : 0 }}
              transition={{ duration: 0.2 }}
              className={`absolute bottom-0 left-0 right-0 z-50 pb-2 transition-opacity ${!controlsVisible ? 'pointer-events-none' : ''}`}
              style={{ background: barBg, backdropFilter: 'blur(24px)', borderTop: `1px solid ${barBdr}` }}
              onClick={e => e.stopPropagation()}
              onMouseEnter={() => { setControlsVisible(true); clearTimeout(idleTimerRef.current) }}
            >
              <ThumbnailStrip files={files} currentIdx={idx} onSelect={setIdx} dark={dark}/>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Download Ad Gate — renders outside the preview overlay */}
      <DownloadAdGate
        open={gateOpen}
        onProceed={() => { setGateOpen(false); doDownload() }}
        onClose={() => setGateOpen(false)}
        adTracking={activeViewerContextToken ? {
          viewerContextToken: activeViewerContextToken,
          slotId: `download-gate-${current?._id || 'asset'}`,
          source: 'public_share_download_gate',
        } : null}
      />
    </AnimatePresence>
  )
}
