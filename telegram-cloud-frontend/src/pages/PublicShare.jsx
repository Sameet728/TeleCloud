import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Lock, Download, AlertCircle, FileText, LayoutGrid, Archive } from 'lucide-react'
import { publicAPI } from '../services/api'
import FileIcon from '../utils/fileIcons'
import { formatBytes, formatDate } from '../utils/helpers'
import PreviewModal from '../components/PreviewModal'

export default function PublicShare() {
  const { token } = useParams()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  
  const [password, setPassword] = useState('')
  const [needsPassword, setNeedsPassword] = useState(false)
  const [pwdError, setPwdError] = useState('')
  const [previewFile, setPreviewFile] = useState(null)

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
        if (pwd) setPwdError('Incorrect password')
      } else {
        setError(err.response?.data?.message || 'Link expired or not found')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchInfo() }, [token])

  const handleDownload = (fileId = null) => {
    let url = `${baseUrl}/public/download/${token}`
    const params = new URLSearchParams()
    if (password) params.append('pwd', password)
    if (fileId) params.append('fileId', fileId)
    if (params.toString()) url += `?${params.toString()}`
    window.location.href = url
  }

  // --- Rendering Helpers ---
  if (loading && !data && !needsPassword && !error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <span className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="card max-w-sm w-full p-8 text-center text-red-500">
          <AlertCircle size={48} className="mx-auto mb-4 opacity-80" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{error}</p>
        </motion.div>
      </div>
    )
  }

  if (needsPassword) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="card max-w-sm w-full p-8">
          <div className="w-12 h-12 bg-brand-100 dark:bg-brand-900/30 text-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Lock size={24} />
          </div>
          <h2 className="text-xl font-bold text-center text-gray-900 dark:text-white mb-2">Protected link</h2>
          <p className="text-sm text-center text-gray-500 dark:text-gray-400 mb-6">Enter the password to access this file.</p>
          <div className="space-y-4">
            <div>
              <input type="password" placeholder="Password" className="input" autoFocus
                value={password} onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && fetchInfo(password)} />
              {pwdError && <p className="text-xs text-red-500 mt-1.5 ml-1">{pwdError}</p>}
            </div>
            <button onClick={() => fetchInfo(password)} disabled={loading || !password} className="btn-primary w-full justify-center">
              {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Unlock'}
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pt-10 pb-20 px-4">
      {/* Modals for previews (requires custom previewUrl construction because it's public) */}
      {previewFile && (
        <PreviewModal 
          open={true} 
          file={{...previewFile, _publicToken: token, _publicPwd: password }} 
          files={data.type === 'folder' ? data.files.map(f => ({...f, _publicToken: token, _publicPwd: password})) : []}
          onClose={() => setPreviewFile(null)} 
        />
      )}

      <div className="max-w-4xl mx-auto space-y-6">
        
        {data.type === 'file' ? (
          /* File View */
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="card p-8 md:p-12 text-center max-w-2xl mx-auto">
            <div className="flex justify-center mb-6">
              <div className="w-24 h-24 rounded-3xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center shadow-inner">
                <FileIcon mimeType={data.file.mimeType} size={48} />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3 break-all">{data.file.fileName}</h1>
            <div className="flex items-center justify-center gap-4 text-sm text-gray-500 mb-8 font-medium">
              <span>{formatBytes(data.file.fileSize)}</span>
              {data.shareParams?.expiresAt && <span>• Expires {formatDate(data.shareParams.expiresAt)}</span>}
            </div>
            <div className="flex justify-center gap-4">
              <button onClick={() => setPreviewFile(data.file)} className="btn-secondary px-8">Preview</button>
              {data.shareParams?.allowDownload && (
                <button onClick={() => handleDownload()} className="btn-primary px-8"><Download size={18} /> Download</button>
              )}
            </div>
          </motion.div>
        ) : (
          /* Folder View */
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
            <div className="card p-6 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: (data.folder.color || '#6366f1') + '22' }}>
                  <LayoutGrid size={28} style={{ color: data.folder.color || '#6366f1' }} fill={data.folder.color || '#6366f1'} fillOpacity={0.2} />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">{data.folder.name}</h1>
                  <p className="text-sm text-gray-500 mt-0.5">{data.files?.length || 0} items</p>
                </div>
              </div>
              {data.shareParams?.allowDownload && (
                <button 
                  onClick={() => window.location.href = `${baseUrl}/public/download-zip/${token}${password ? '?pwd='+encodeURIComponent(password) : ''}`} 
                  className="btn-primary"
                >
                  <Archive size={18} /> Download Folder
                </button>
              )}
            </div>

            {data.files?.length === 0 ? (
              <div className="card p-12 text-center text-gray-500">This folder is empty.</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {data.files.map(f => (
                  <div key={f._id} className="card p-4 hover:shadow-md transition-shadow group relative flex flex-col items-center">
                    <div className="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center mb-3">
                      <FileIcon mimeType={f.mimeType} size={28} />
                    </div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100 text-center w-full truncate mb-1" title={f.fileName}>{f.fileName}</p>
                    <p className="text-xs text-gray-400 mb-3">{formatBytes(f.fileSize)}</p>
                    
                    <div className="flex w-full gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setPreviewFile(f)} className="flex-1 btn-secondary text-xs py-1.5 px-0 justify-center">View</button>
                      {data.shareParams?.allowDownload && (
                        <button onClick={() => handleDownload(f._id)} className="flex-1 btn-primary text-xs py-1.5 px-0 justify-center"><Download size={14}/></button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

      </div>
    </div>
  )
}
