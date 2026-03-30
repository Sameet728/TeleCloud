import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Lock, Download, AlertCircle, LayoutGrid, 
  Archive, Folder as FolderIcon, Eye, ArrowRight, ShieldCheck 
} from 'lucide-react'
import { publicAPI, monetizationAPI } from '../services/api'
import FileIcon from '../utils/fileIcons'
import { formatBytes, formatDate } from '../utils/helpers'
import { getViewerSessionId } from '../utils/viewerSession'
import PreviewModal from '../components/PreviewModal'
import DownloadAdGate from '../components/DownloadAdGate'
import AdSlot, { useAdGuard } from '../components/AdBanner'

// Subtle background pattern
const CanvasBackground = () => (
  <div 
    className="fixed inset-0 z-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
    style={{
      backgroundImage: `radial-gradient(currentColor 1px, transparent 1px)`,
      backgroundSize: '24px 24px'
    }}
  />
)

const LoadingSpinner = () => (
  <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4 dark:bg-zinc-950">
    <div className="w-8 h-8 rounded-full border-[2px] border-zinc-200 dark:border-zinc-800 border-t-indigo-500 animate-spin mb-4" />
    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Decrypting Link</span>
  </div>
)

export default function PublicShare() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  
  const [password, setPassword] = useState('')
  const [needsPassword, setNeedsPassword] = useState(false)
  const [pwdError, setPwdError] = useState('')
  const [previewFile, setPreviewFile] = useState(null)
  const [gateOpen, setGateOpen] = useState(false)
  const [pendingFileId, setPendingFileId] = useState(null)
  const [viewerContextTokens, setViewerContextTokens] = useState({})
  const [pendingViewerContextToken, setPendingViewerContextToken] = useState(null)
  const canShowAds = useAdGuard()

  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

  const fetchInfo = async (pwd = password) => {
    setLoading(true)
    setPwdError('')
    try {
      const res = await publicAPI.getInfo(token, pwd)
      setData(res.data.data)
      setNeedsPassword(false)
    } catch (err) {
      if (err.response?.status === 401) {
        setNeedsPassword(true)
        if (pwd) setPwdError('Invalid decryption key')
      } else {
        setError(err.response?.data?.message || 'Link expired or destroyed')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchInfo() }, [token])

  const ensureViewerContextToken = useCallback(async (targetFile, source = 'public_share_view') => {
    if (!targetFile?._id) return null

    const existingToken = viewerContextTokens[targetFile._id] || targetFile._viewerContextToken
    if (existingToken) return existingToken

    try {
      const response = await monetizationAPI.trackView({
        shareToken: token,
        fileId: data?.type === 'folder' ? targetFile._id : undefined,
        source,
        viewerSessionId: getViewerSessionId(),
      })
      const nextToken = response?.data?.data?.viewerContextToken || null
      if (nextToken) {
        setViewerContextTokens(prev => ({ ...prev, [targetFile._id]: nextToken }))
      }
      return nextToken
    } catch {
      return null
    }
  }, [data?.type, token, viewerContextTokens])

  useEffect(() => {
    if (!data || data.type !== 'file') return
    ensureViewerContextToken(data.file, 'public_share_open')
  }, [data, ensureViewerContextToken])

  const doDownload = useCallback((fileId = null) => {
    let url = `${baseUrl}/public/download/${token}`
    const params = new URLSearchParams()
    if (password) params.append('pwd', password)
    if (fileId) params.append('fileId', fileId)
    if (params.toString()) url += `?${params.toString()}`
    window.location.href = url
  }, [baseUrl, token, password])

  const handleDownload = async (fileId = null) => {
    const targetFile = data?.type === 'folder'
      ? data.files.find((file) => file._id === fileId)
      : data?.file
    const contextToken = targetFile
      ? await ensureViewerContextToken(targetFile, 'public_share_download')
      : null
    setPendingViewerContextToken(contextToken)

    if (canShowAds) {
      setPendingFileId(fileId)
      setGateOpen(true)
    } else {
      doDownload(fileId)
    }
  }

  const openPublicVideo = useCallback(async (targetFile) => {
    if (!targetFile?._id) return
    await ensureViewerContextToken(targetFile, 'public_share_video_open')
    navigate(`/s/${token}/video/${targetFile._id}`, {
      state: { password }
    })
  }, [ensureViewerContextToken, navigate, password, token])

  // --- Rendering States ---

  if (loading && !data && !needsPassword && !error) return <LoadingSpinner />

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex items-center justify-center p-4 relative overflow-hidden text-zinc-900 dark:text-zinc-100">
        <CanvasBackground />
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative z-10 w-full max-w-sm rounded-[1.5rem] border border-red-100 bg-white p-6 text-center shadow-2xl dark:border-red-900/30 dark:bg-zinc-900">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[1rem] border border-red-100 bg-red-50 dark:border-red-500/20 dark:bg-red-500/10">
            <AlertCircle size={32} className="text-red-500" />
          </div>
          <h2 className="mb-2 text-lg font-bold text-gray-900 dark:text-white">Access Denied</h2>
          <p className="text-[13px] font-medium text-zinc-500 dark:text-zinc-400">{error}</p>
        </motion.div>
      </div>
    )
  }

  if (needsPassword) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex items-center justify-center p-4 relative overflow-hidden text-zinc-900 dark:text-zinc-100">
        <CanvasBackground />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[320px] w-[320px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/10 blur-[84px]" />
        
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative z-10 w-full max-w-sm rounded-[1.5rem] border border-gray-200/50 bg-white/60 p-6 shadow-xl backdrop-blur-xl dark:border-zinc-800/50 dark:bg-zinc-900/60">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-[1rem] border border-indigo-100 bg-indigo-50 text-indigo-600 shadow-inner dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400">
            <ShieldCheck size={32} />
          </div>
          <h2 className="mb-2 text-center text-xl font-bold tracking-tight">Secure Payload</h2>
          <p className="mb-6 text-center text-[13px] font-medium text-zinc-500">This asset is end-to-end encrypted. Enter the decryption key to proceed.</p>
          
          <div className="space-y-4">
            <div>
              <div className="relative group">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                  type="password" 
                  placeholder="Decryption Key" 
                  className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-[13px] font-medium tracking-wide transition-all placeholder:text-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:border-zinc-800 dark:bg-zinc-950/50" 
                  autoFocus
                  value={password} 
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && fetchInfo(password)} 
                />
              </div>
              {pwdError && <p className="text-xs font-bold text-red-500 mt-2 pl-1">{pwdError}</p>}
            </div>
              <button 
                onClick={() => fetchInfo(password)} 
                disabled={loading || !password} 
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-[13px] font-bold text-white shadow-[0_4px_14px_0_rgba(79,70,229,0.39)] transition-all hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
              {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Unlock Vault <ArrowRight size={16}/></>}
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  if (!data) return null;

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-gray-50 px-4 pb-20 pt-10 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <CanvasBackground />

      {previewFile && (
        <PreviewModal 
          open={true} 
          file={{...previewFile, _publicToken: token, _publicPwd: password }} 
          files={data.type === 'folder' ? data.files.map(f => ({...f, _publicToken: token, _publicPwd: password})) : []}
          ensureViewerContextToken={ensureViewerContextToken}
          onClose={() => setPreviewFile(null)} 
        />
      )}

      <div className="relative z-10 mx-auto max-w-[1400px] space-y-6">
        
        {data.type === 'file' ? (
          /* Single File View - Centered Premium Card */
          <div className="flex min-h-[56vh] flex-col items-center justify-center">
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-[320px] w-[320px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/10 blur-[90px]" />
            
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="relative w-full max-w-lg rounded-[1.6rem] border border-gray-200/50 bg-white/60 p-8 text-center shadow-2xl backdrop-blur-xl dark:border-zinc-800/50 dark:bg-zinc-900/60 md:p-10">
              <div className="mb-6 flex justify-center">
                <div className="flex h-24 w-24 items-center justify-center rounded-[1.4rem] border border-indigo-100 bg-indigo-50 shadow-inner dark:border-zinc-700/50 dark:bg-zinc-800">
                  <FileIcon mimeType={data.file.mimeType} size={56} />
                </div>
              </div>
              
              <h1 className="mb-3 break-all text-xl font-extrabold tracking-tight text-gray-900 dark:text-white md:text-[2rem]">
                {data.file.fileName}
              </h1>
              
              <div className="mb-8 flex items-center justify-center gap-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
                  {data.file.mimeType.split('/')[1] || 'BINARY'}
                </span>
                <span className="text-sm font-semibold text-zinc-500">{formatBytes(data.file.fileSize)}</span>
                {data.shareParams?.expiresAt && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-red-500/80">
                      Exp: {formatDate(data.shareParams.expiresAt)}
                    </span>
                  </>
                )}
              </div>

              <div className="flex flex-col sm:flex-row justify-center gap-3">
                {String(data.file.mimeType || '').startsWith('video/') ? (
                  <button
                    onClick={() => openPublicVideo(data.file)}
                    className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-2.5 text-[13px] font-bold shadow-sm transition-all hover:bg-gray-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700/80"
                  >
                    <Eye size={16} /> Open Player
                  </button>
                ) : (
                  <button 
                    onClick={() => setPreviewFile(data.file)} 
                    className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-2.5 text-[13px] font-bold shadow-sm transition-all hover:bg-gray-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700/80"
                  >
                    <Eye size={16} /> Preview
                  </button>
                )}
                {data.shareParams?.allowDownload && (
                  <button 
                    onClick={() => handleDownload()} 
                    className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-[13px] font-bold text-white shadow-[0_4px_14px_0_rgba(79,70,229,0.39)] transition-all hover:bg-indigo-500"
                  >
                    <Download size={16} /> Download Asset
                  </button>
                )}
              </div>
            </motion.div>

            {/* Centered Ad Slot */}
            {canShowAds && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative z-10 mt-6 flex w-full max-w-3xl justify-center">
                <div className="relative flex w-full justify-center overflow-hidden rounded-[1.25rem] border border-gray-200/50 bg-white/40 p-2 pt-4 shadow-sm backdrop-blur-sm dark:border-zinc-800/50 dark:bg-zinc-900/40">
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 bg-zinc-200 dark:bg-zinc-800 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-b shadow-sm text-zinc-500 dark:text-zinc-400 z-10">Advertisement</span>
                  <AdSlot
                    formatId="2018497"
                    tracking={viewerContextTokens[data.file._id] ? {
                      viewerContextToken: viewerContextTokens[data.file._id],
                      slotId: `public-share-file-${data.file._id}`,
                      source: 'public_share_single_file_ad',
                    } : null}
                  />
                </div>
              </motion.div>
            )}
          </div>
        ) : (
          /* Folder View - Dense Grid Mode */
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mx-auto max-w-[1400px] space-y-5">
            
            {/* Folder Header */}
            <div className="flex flex-col justify-between gap-4 rounded-[1.35rem] border border-gray-200 bg-white/60 p-4 backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-900/40 md:flex-row md:items-center">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-[0.95rem] border border-indigo-100 bg-indigo-50 dark:border-indigo-500/20 dark:bg-indigo-500/10">
                  <FolderIcon size={24} className="text-indigo-500" fill="currentColor" fillOpacity={0.2} />
                </div>
                <div>
                  <h1 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">{data.folder.name}</h1>
                  <p className="mt-0.5 flex items-center gap-2 text-[11px] font-semibold text-zinc-500">
                    {data.files?.length || 0} Assets
                    {data.shareParams?.expiresAt && (
                      <span className="text-[9px] uppercase tracking-widest text-red-500/80 bg-red-500/10 px-1.5 py-0.5 rounded">
                        Exp: {formatDate(data.shareParams.expiresAt)}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              {data.shareParams?.allowDownload && (
                <button 
                  onClick={() => window.location.href = `${baseUrl}/public/download-zip/${token}${password ? '?pwd='+encodeURIComponent(password) : ''}`} 
                  className="flex items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-[11px] font-bold text-white shadow-sm transition-transform active:scale-95 dark:bg-white dark:text-zinc-900"
                >
                  <Archive size={14} /> Fetch Directory Archive
                </button>
              )}
            </div>

            {/* Grid */}
            {data.files?.length === 0 ? (
              <div className="flex flex-col items-center rounded-[1.35rem] border border-dashed border-gray-200 bg-white/30 py-16 text-center dark:border-zinc-800 dark:bg-zinc-900/20">
                <LayoutGrid size={32} className="text-zinc-300 dark:text-zinc-700 mb-3" />
                <p className="text-sm font-bold text-gray-900 dark:text-zinc-300">Directory Empty</p>
                <p className="text-xs text-zinc-500 mt-1">No assets found in this shared space.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                <AnimatePresence>
                  {data.files.map((f, i) => (
                    <motion.div 
                      key={f._id} 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className="group relative flex flex-col items-center overflow-hidden rounded-[1rem] border border-gray-100 bg-white p-2.5 transition-all hover:border-indigo-500/50 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
                    >
                      <div className="mb-2.5 flex h-10 w-10 items-center justify-center rounded-[0.85rem] bg-gray-50 transition-transform group-hover:scale-110 dark:bg-zinc-800/50">
                        <FileIcon mimeType={f.mimeType} size={20} />
                      </div>
                      <p className="mb-0.5 w-full truncate text-center text-[11px] font-bold text-gray-900 dark:text-zinc-100" title={f.fileName}>{f.fileName}</p>
                      <p className="mb-1 text-[9px] font-medium text-zinc-500">{formatBytes(f.fileSize)}</p>
                      
                      {/* Hover Action Overlay */}
                      <div className="absolute inset-x-0 bottom-0 p-2 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all bg-gradient-to-t from-white via-white dark:from-zinc-900 dark:via-zinc-900 to-transparent pt-6 flex gap-1.5">
                        <button 
                          onClick={() => String(f.mimeType || '').startsWith('video/')
                            ? openPublicVideo(f)
                            : setPreviewFile(f)} 
                          className="flex-1 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-[10px] font-bold rounded-md transition-colors"
                        >
                          {String(f.mimeType || '').startsWith('video/') ? 'Open' : 'View'}
                        </button>
                        {data.shareParams?.allowDownload && (
                          <button 
                            onClick={() => handleDownload(f._id)} 
                            className="flex-1 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white flex items-center justify-center rounded-md transition-colors"
                          >
                            <Download size={12}/>
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
            
            {/* Inline Ad Banner for Folders */}
            {canShowAds && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center pt-3">
                <div className="flex w-full max-w-4xl justify-center overflow-hidden rounded-[1rem] border border-gray-200/50 bg-white/40 p-2 backdrop-blur-sm dark:border-zinc-800/50 dark:bg-zinc-900/40">
                  <AdSlot formatId="2018497" />
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </div>

      <DownloadAdGate
        open={gateOpen}
        onProceed={() => { setGateOpen(false); doDownload(pendingFileId) }}
        onClose={() => setGateOpen(false)}
        adTracking={pendingViewerContextToken ? {
          viewerContextToken: pendingViewerContextToken,
          slotId: `public-share-download-${pendingFileId || data?.file?._id || 'asset'}`,
          source: 'public_share_download_gate',
        } : null}
      />
    </div>
  )
}
