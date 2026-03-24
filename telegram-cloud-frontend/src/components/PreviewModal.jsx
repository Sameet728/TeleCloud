import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Download, ZoomIn, ZoomOut, RotateCw, Volume2,
  ChevronLeft, ChevronRight
} from 'lucide-react'
import toast from 'react-hot-toast'
import { filesAPI } from '../services/api'
import { getMimeCategory, formatBytes, formatDate } from '../utils/helpers'
import FileIcon from '../utils/fileIcons'
import { useTheme } from '../context/ThemeContext'

// ── per-type palette ──────────────────────────────────────────────────
const PALETTE = {
  image:   { accent: '#22c55e',  label: 'Image' },
  video:   { accent: '#a855f7',  label: 'Video' },
  audio:   { accent: '#ec4899',  label: 'Audio' },
  pdf:     { accent: '#ef4444',  label: 'PDF' },
  doc:     { accent: '#3b82f6',  label: 'Document' },
  sheet:   { accent: '#10b981', label: 'Spreadsheet' },
  text:    { accent: '#6b7280',  label: 'Text' },
  archive: { accent: '#f59e0b',  label: 'Archive' },
  other:   { accent: '#8b5cf6',  label: 'File' },
}

// ── Image viewer with zoom/rotate ─────────────────────────────────────
function ImageViewer({ src, fileName, dark }) {
  const [scale, setScale]   = useState(1)
  const [rotate, setRotate] = useState(0)
  const [loading, setLoading] = useState(true)

  // Reset when source changes (new file in slider)
  useEffect(() => { setScale(1); setRotate(0); setLoading(true); }, [src])

  const toolBtn = `p-1.5 rounded-lg transition-colors
    ${dark
      ? 'hover:bg-white/20 text-white'
      : 'hover:bg-black/10 text-gray-700'}`

  return (
    <div className="flex flex-col items-center gap-3 h-full">
      <div className={`flex items-center gap-1 rounded-xl px-2 py-1
        ${dark ? 'bg-white/10 backdrop-blur' : 'bg-black/8 backdrop-blur border border-black/10'}`}>
        <button onClick={() => setScale(s => Math.max(0.25, s - 0.25))} className={toolBtn} title="Zoom out"><ZoomOut size={15}/></button>
        <span className={`text-xs w-10 text-center select-none ${dark ? 'text-white/70' : 'text-gray-500'}`}>
          {Math.round(scale * 100)}%
        </span>
        <button onClick={() => setScale(s => Math.min(4, s + 0.25))} className={toolBtn} title="Zoom in"><ZoomIn size={15}/></button>
        <div className={`w-px h-4 mx-1 ${dark ? 'bg-white/20' : 'bg-black/15'}`} />
        <button onClick={() => setRotate(r => (r + 90) % 360)} className={toolBtn} title="Rotate"><RotateCw size={15}/></button>
        <button onClick={() => { setScale(1); setRotate(0) }}
          className={`text-xs px-2 py-1 rounded-lg transition-colors
            ${dark ? 'text-white/50 hover:text-white hover:bg-white/20' : 'text-gray-400 hover:text-gray-700 hover:bg-black/10'}`}>
          Reset
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center w-full overflow-hidden relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className={`w-8 h-8 border-2 rounded-full animate-spin ${dark ? 'border-white/30 border-t-white' : 'border-gray-300 border-t-gray-600'}`}/>
          </div>
        )}
        <motion.img
          src={src} alt={fileName}
          onLoad={() => setLoading(false)}
          animate={{ scale, rotate }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          className={`max-w-full max-h-full object-contain rounded-lg shadow-2xl transition-opacity duration-300 ${loading ? 'opacity-0' : 'opacity-100'}`}
          style={{ cursor: scale > 1 ? 'zoom-out' : 'zoom-in' }}
          onClick={e => { e.stopPropagation(); setScale(s => s === 1 ? 2 : 1) }}
          draggable={false}
        />
      </div>
    </div>
  )
}

// ── Video player ──────────────────────────────────────────────────────
function VideoPlayer({ src, dark }) {
  const [loading, setLoading] = useState(true)
  useEffect(() => { setLoading(true); }, [src])

  return (
    <div className="w-full h-full flex items-center justify-center relative">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-10 transition-opacity">
          <div className={`w-8 h-8 border-2 rounded-full animate-spin ${dark ? 'border-white/30 border-t-white' : 'border-gray-300 border-t-gray-600'}`}/>
        </div>
      )}
      <video key={src} src={src} controls autoPlay
        onLoadedData={() => setLoading(false)}
        className={`max-w-full max-h-full rounded-xl shadow-2xl transition-opacity duration-300 ${loading ? 'opacity-0' : 'opacity-100'}`} style={{ maxHeight: '72vh' }}>
        Your browser does not support video.
      </video>
    </div>
  )
}

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
        className={`w-full rounded-xl shadow-2xl border-0 transition-opacity duration-300 ${loading ? 'opacity-0' : 'opacity-100'}`}
        style={{ height: '75vh' }} title="PDF Preview"/>
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
    <div className={`w-full max-h-[72vh] overflow-auto rounded-xl border
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
        const cat     = getMimeCategory(f.mimeType)
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
            style={isCur ? { ringColor: PALETTE[getMimeCategory(f.mimeType)]?.accent } : {}}
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
export default function PreviewModal({ open, file, files = [], onClose }) {
  const { dark } = useTheme()
  const token    = localStorage.getItem('token')

  // Find starting index from the files array
  const startIdx = file && files.length ? files.findIndex(f => f._id === file._id) : 0
  const [idx, setIdx] = useState(Math.max(0, startIdx))

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

  const current = files.length ? files[idx] : file
  const cat     = current ? getMimeCategory(current.mimeType) : ''
  const palette = PALETTE[cat] || PALETTE.other
  const src     = getPreviewUrl(current)

  const hasPrev = idx > 0
  const hasNext = idx < files.length - 1

  const goNext = () => hasNext && setIdx(i => i + 1)
  const goPrev = () => hasPrev && setIdx(i => i - 1)

  // Keyboard navigation
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (e.key === 'Escape')      onClose()
      if (e.key === 'ArrowRight')  goNext()
      if (e.key === 'ArrowLeft')   goPrev()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, idx, hasPrev, hasNext])

  const handleDownload = async () => {
    if (!current) return
    
    // Public download (no JWT, redirect to public API)
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
    const tid = toast.loading('Preparing download...')
    try {
      const { data } = await filesAPI.download(current._id)
      const url = URL.createObjectURL(new Blob([data]))
      const a = document.createElement('a')
      a.href = url; a.download = current.fileName; a.click()
      URL.revokeObjectURL(url)
      toast.success('Download started', { id: tid })
    } catch { toast.error('Download failed', { id: tid }) }
  }

  const renderContent = () => {
    if (!current) return null
    switch (cat) {
      case 'image':   return <ImageViewer src={src} fileName={current.fileName} dark={dark}/>
      case 'video':   return <VideoPlayer src={src} dark={dark}/>
      case 'audio':   return <AudioPlayer src={src} file={current} dark={dark}/>
      case 'pdf':     return <PdfViewer src={src} dark={dark}/>
      case 'text':    return <TextViewer src={src} dark={dark}/>
      default:        return <GenericPreview file={current} cat={cat} dark={dark} onDownload={handleDownload}/>
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
      {open && current && (
        <motion.div
          key="preview-overlay"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[100] flex flex-col"
          style={{ background: overlay, backdropFilter: 'blur(16px)' }}
          onClick={onClose}   // click backdrop → close
        >
          {/* Ambient blob */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[500px] h-[260px] rounded-full blur-[100px] opacity-20"
              style={{ background: palette.accent }}/>
          </div>

          {/* ── Top bar ───────────────────────────────────────────── */}
          <motion.div
            initial={{ y: -16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.05 }}
            className="relative z-10 flex items-center gap-3 px-4 py-2.5 shrink-0"
            style={{ background: barBg, backdropFilter: 'blur(24px)', borderBottom: `1px solid ${barBdr}` }}
            onClick={e => e.stopPropagation()}
          >
            {/* file info */}
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <FileIcon mimeType={current.mimeType} size={15}/>
              <div className="min-w-0">
                <p className={`text-sm font-semibold truncate leading-tight ${titleClr}`}>{current.fileName}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md"
                    style={{ background: palette.accent + '22', color: palette.accent }}>
                    {palette.label}
                  </span>
                  <span className={`text-xs ${subClr}`}>{formatBytes(current.fileSize)}</span>
                  {files.length > 1 && (
                    <span className={`text-xs ${subClr}`}>{idx + 1} / {files.length}</span>
                  )}
                </div>
              </div>
            </div>

            {/* actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button onClick={handleDownload}
                className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl border transition-all ${btnBase}`}>
                <Download size={13}/> Download
              </button>
              <button onClick={onClose}
                className={`p-1.5 rounded-xl transition-all ${btnBase}`}>
                <X size={17}/>
              </button>
            </div>
          </motion.div>

          {/* ── Content area ──────────────────────────────────────── */}
          <div className="relative z-10 flex-1 flex items-stretch overflow-hidden"
            onClick={e => e.stopPropagation()}>

            {/* Prev arrow */}
            <AnimatePresence>
              {hasPrev && (
                <motion.button
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                  onClick={goPrev}
                  className={`absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full flex items-center justify-center transition-all ${navBtn}`}
                  title="Previous (←)">
                  <ChevronLeft size={20}/>
                </motion.button>
              )}
            </AnimatePresence>

            {/* Next arrow */}
            <AnimatePresence>
              {hasNext && (
                <motion.button
                  initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                  onClick={goNext}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full flex items-center justify-center transition-all ${navBtn}`}
                  title="Next (→)">
                  <ChevronRight size={20}/>
                </motion.button>
              )}
            </AnimatePresence>

            {/* Content with slide animation */}
            <div className="flex-1 overflow-auto flex flex-col p-4 sm:p-6">
              <AnimatePresence mode="wait">
                <motion.div key={current._id}
                  initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.18 }}
                  className="flex-1 flex flex-col h-full">
                  {renderContent()}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* ── Thumbnail strip (bottom) ───────────────────────────── */}
          {files.length > 1 && (
            <motion.div
              initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
              className="relative z-10 shrink-0 pb-3"
              style={{ background: barBg, backdropFilter: 'blur(24px)', borderTop: `1px solid ${barBdr}` }}
              onClick={e => e.stopPropagation()}
            >
              <ThumbnailStrip files={files} currentIdx={idx} onSelect={setIdx} dark={dark}/>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
