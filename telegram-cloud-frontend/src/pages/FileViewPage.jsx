import { useState, useEffect, lazy, Suspense } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Download, FileText, ExternalLink } from 'lucide-react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { filesAPI } from '../services/api'
import { getMimeCategory, formatBytes, formatDate } from '../utils/helpers'
import FileIcon from '../utils/fileIcons'
import { useTheme } from '../context/ThemeContext'
import AdSlot, { useAdGuard } from '../components/AdBanner'
import VideoPlayer from '../components/VideoPlayer'

// Lazy viewers
const CodeViewer = lazy(() => import('../components/viewers/CodeViewer'))
const SpreadsheetViewer = lazy(() => import('../components/viewers/SpreadsheetViewer'))
const DocViewer = lazy(() => import('../components/viewers/DocViewer'))
const AudioPlayerPro = lazy(() => import('../components/viewers/AudioPlayerPro'))
const PdfViewerPro = lazy(() => import('../components/viewers/PdfViewerPro'))

// Figma-style dot grid background for the canvas
const CanvasBackground = ({ dark }) => (
  <div 
    className="absolute inset-0 z-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
    style={{
      backgroundImage: `radial-gradient(${dark ? '#ffffff' : '#000000'} 1px, transparent 1px)`,
      backgroundSize: '24px 24px'
    }}
  />
)

function ImageViewer({ src, dark }) {
  return (
    <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-gray-50/50 p-6 dark:bg-zinc-950">
      <CanvasBackground dark={dark} />
      <motion.img 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        src={src} 
        alt="Preview" 
        className="relative z-10 max-w-full max-h-full object-contain rounded-lg shadow-2xl ring-1 ring-gray-900/5 dark:ring-white/10" 
        draggable={false}
        onContextMenu={e => e.preventDefault()}
      />
    </div>
  )
}

const LazySpinner = ({ dark }) => (
    <div className="flex flex-1 flex-col items-center justify-center gap-3.5 bg-gray-50 dark:bg-zinc-950">
    <div className={`w-8 h-8 rounded-full border-[2px] border-t-transparent animate-spin ${dark ? 'border-zinc-700 border-t-indigo-500' : 'border-gray-200 border-t-indigo-500'}`} />
    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Loading Module</span>
  </div>
)

const PALETTE = {
  image: '#10b981', video: '#8b5cf6', audio: '#f43f5e', pdf: '#ef4444',
  doc: '#3b82f6', sheet: '#059669', code: '#64748b', other: '#6366f1',
}

export default function FileViewPage() {
  const { fileId } = useParams()
  const navigate = useNavigate()
  const { dark } = useTheme()
  const token = localStorage.getItem('token')
  const canShowAds = useAdGuard()

  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true); setError(null)
    fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/files`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          const found = res.data.find(f => f._id === fileId)
          if (found) { setFile(found); setLoading(false) }
          else { setError('Asset not found in workspace'); setLoading(false) }
        } else { setError(res.message); setLoading(false) }
      })
      .catch(() => { setError('Failed to establish connection'); setLoading(false) })
  }, [fileId, token])

  if (loading) return (
    <div className={`min-h-screen flex items-center justify-center ${dark ? 'bg-zinc-950' : 'bg-gray-50'}`}>
      <LazySpinner dark={dark} />
    </div>
  )

  if (error) return (
    <div className={`min-h-screen flex flex-col items-center justify-center gap-5 ${dark ? 'bg-zinc-950' : 'bg-gray-50'}`}>
      <div className="flex h-14 w-14 items-center justify-center rounded-[1rem] border border-red-100 bg-red-50 dark:border-red-500/20 dark:bg-red-500/10">
        <FileText size={24} className="text-red-500" />
      </div>
      <div className="text-center">
        <h2 className="mb-1 text-base font-bold text-gray-900 dark:text-white">Retrieval Failed</h2>
        <p className="text-[13px] text-zinc-500">{error}</p>
      </div>
      <button onClick={() => navigate(-1)} className="rounded-xl bg-zinc-900 px-4 py-2 text-[11px] font-bold text-white transition-transform active:scale-95 dark:bg-white dark:text-zinc-900">
        Return to Workspace
      </button>
    </div>
  )

  const cat = getMimeCategory(file.mimeType, file.fileName)
  const accent = PALETTE[cat] || PALETTE.other
  const src = `${filesAPI.preview(file._id)}?token=${token}`

  const handleDownload = () => {
    toast.success('Download initialized...', { icon: '📦' })
    window.location.href = filesAPI.downloadUrl(file._id)
  }

  const renderViewer = () => {
    switch (cat) {
      case 'image': return <ImageViewer src={src} dark={dark}/>
      case 'video': return <div className="flex-1 bg-black"><VideoPlayer src={src} file={file} dark={dark}/></div>
      case 'audio': return <Suspense fallback={<LazySpinner dark={dark}/>}><div className="flex-1 flex items-center justify-center bg-zinc-50 dark:bg-zinc-950"><AudioPlayerPro src={src} file={file} dark={dark}/></div></Suspense>
      case 'pdf':   return <Suspense fallback={<LazySpinner dark={dark}/>}><div className="flex-1 overflow-hidden bg-zinc-100/50 dark:bg-zinc-900"><PdfViewerPro src={src} dark={dark}/></div></Suspense>
      case 'code':  return <Suspense fallback={<LazySpinner dark={dark}/>}><div className="flex-1 overflow-hidden"><CodeViewer src={src} fileName={file.fileName} dark={dark}/></div></Suspense>
      case 'sheet': return <Suspense fallback={<LazySpinner dark={dark}/>}><div className="flex-1 overflow-hidden bg-white dark:bg-zinc-950"><SpreadsheetViewer src={src} fileName={file.fileName} dark={dark}/></div></Suspense>
      case 'doc':   return <Suspense fallback={<LazySpinner dark={dark}/>}><div className="flex-1 overflow-hidden bg-zinc-100/50 dark:bg-zinc-900"><DocViewer src={src} fileName={file.fileName} dark={dark}/></div></Suspense>
      default:
        return (
          <div className="relative flex-1 flex items-center justify-center bg-gray-50/50 dark:bg-zinc-950 overflow-hidden">
            <CanvasBackground dark={dark} />
            
            {/* Ambient Background Glow */}
            <div 
              className="pointer-events-none absolute left-1/2 top-1/2 h-[250px] w-[250px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20 blur-[84px]"
              style={{ background: accent }}
            />

            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="relative z-10 mx-4 flex w-full max-w-sm flex-col items-center rounded-[1.5rem] border border-gray-200/50 bg-white/60 p-6 text-center shadow-2xl backdrop-blur-xl dark:border-zinc-800/50 dark:bg-zinc-900/60"
            >
              <div 
                className="mb-5 flex h-16 w-16 items-center justify-center rounded-[1rem] shadow-inner" 
                style={{ background: `${accent}15`, border: `1px solid ${accent}30` }}
              >
                <FileIcon mimeType={file.mimeType} size={36} />
              </div>
              <h3 className="mb-1 w-full truncate text-base font-bold text-gray-900 dark:text-white">{file.fileName}</h3>
              
              <div className="flex items-center gap-2 mb-8">
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
                  {file.mimeType.split('/')[1] || 'BINARY'}
                </span>
                <span className="text-xs font-medium text-zinc-400">{formatBytes(file.fileSize)}</span>
              </div>

              <div className="w-full space-y-3">
                <button 
                  onClick={handleDownload} 
                  className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[11px] font-bold text-white shadow-lg transition-all hover:opacity-90 active:scale-[0.98]" 
                  style={{ background: accent, boxShadow: `0 8px 20px -6px ${accent}60` }}
                >
                  <Download size={16} /> Download Source File
                </button>
                <p className="text-[10px] font-medium text-zinc-500">
                  No native viewer available for this format.
                </p>
              </div>
            </motion.div>
          </div>
        )
    }
  }

  return (
    <div 
      className={`min-h-screen flex flex-col ${dark ? 'bg-zinc-950 text-white' : 'bg-white text-zinc-900'}`}
      onContextMenu={e => e.preventDefault()}
    >
      {/* Ultra-sleek Header */}
      <header className={`z-50 flex shrink-0 items-center justify-between border-b px-3.5 py-2.5 backdrop-blur-md
        ${dark ? 'bg-zinc-950/80 border-zinc-800/80' : 'bg-white/80 border-gray-100'}
      `}>
        <div className="flex items-center gap-3 min-w-0">
          <button 
            onClick={() => navigate(-1)}
            className={`rounded-lg border p-1.5 transition-colors ${dark ? 'border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white' : 'border-gray-200 hover:bg-gray-100 text-zinc-500 hover:text-zinc-900'}`}
          >
            <ArrowLeft size={16} strokeWidth={2.5} />
          </button>
          
          <div className="mx-1 hidden h-7 w-px bg-gray-200 dark:bg-zinc-800 sm:block" />
          
          <div className="flex items-center gap-3 min-w-0">
            <div className="hidden shrink-0 rounded-md bg-gray-100 p-1 dark:bg-zinc-900 sm:block">
              <FileIcon mimeType={file.mimeType} size={14} />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-[13px] font-bold leading-tight">{file.fileName}</h1>
              <p className="mt-0.5 flex items-center gap-1.5 text-[9px] font-medium text-zinc-500">
                <span>{formatBytes(file.fileSize)}</span>
                <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                <span>{formatDate(file.createdAt)}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 pl-4">
          <button 
            onClick={handleDownload}
            className="flex items-center gap-2 rounded-lg px-3.5 py-2 text-[11px] font-bold text-white shadow-sm transition-transform active:scale-95"
            style={{ background: accent }}
          >
            <Download size={14} strokeWidth={2.5} /> <span className="hidden sm:inline">Fetch</span>
          </button>
        </div>
      </header>

      {/* Viewer Mount Point */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {renderViewer()}
      </main>

      {canShowAds && (
        <div className={`flex shrink-0 justify-center border-t p-2 ${dark ? 'bg-zinc-950 border-zinc-900' : 'bg-gray-50 border-gray-200'}`}>
          <div className="w-full max-w-4xl overflow-hidden rounded-[0.95rem] border border-zinc-200 bg-white dark:border-zinc-800/50 dark:bg-zinc-900/30">
            <AdSlot formatId="2018497" />
          </div>
        </div>
      )}
    </div>
  )
}
