import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu, Search, Moon, Sun, X, Download } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { searchAPI, filesAPI } from '../services/api'
import { formatBytes, getMimeCategory } from '../utils/helpers'
import FileIcon from '../utils/fileIcons'
import { formatDateShort } from '../utils/helpers'
import PreviewModal from './PreviewModal'
import toast from 'react-hot-toast'

export default function Navbar({ onMenuClick }) {
  const { dark, toggle } = useTheme()
  const navigate         = useNavigate()
  const [q, setQ]        = useState('')
  const [results, setResults] = useState(null)
  const [searching, setSearching] = useState(false)
  const [previewFile, setPreviewFile] = useState(null)
  const timerRef = useRef(null)
  const inputRef = useRef(null)

  // Debounced search
  useEffect(() => {
    clearTimeout(timerRef.current)
    if (!q.trim()) { setResults(null); return }
    timerRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const { data } = await searchAPI.search(q)
        setResults(data.data?.results)
      } catch {} finally { setSearching(false) }
    }, 350)
    return () => clearTimeout(timerRef.current)
  }, [q])

  const clear = () => { setQ(''); setResults(null) }

  const handleFileClick = async (f) => {
    clear()
    const cat = getMimeCategory(f.mimeType)
    if (['image', 'video', 'pdf'].includes(cat)) {
      setPreviewFile(f)
    } else {
      // Non-previewable → download directly
      const tid = toast.loading('Preparing download...')
      try {
        const { data } = await filesAPI.download(f._id)
        const url = URL.createObjectURL(new Blob([data]))
        const a = document.createElement('a')
        a.href = url; a.download = f.fileName; a.click()
        URL.revokeObjectURL(url)
        toast.success('Download started', { id: tid })
      } catch { toast.error('Download failed', { id: tid }) }
    }
  }

  return (
    <>
      <header className="h-16 flex items-center gap-4 px-4 lg:px-6 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 shrink-0">
        {/* Mobile menu */}
        <button onClick={onMenuClick}
          className="lg:hidden p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800">
          <Menu size={20} />
        </button>

        {/* Search */}
        <div className="flex-1 max-w-lg relative">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              ref={inputRef}
              value={q} onChange={e => setQ(e.target.value)}
              placeholder="Search files and folders..."
              className="input pl-9 pr-9"
            />
            {q && (
              <button onClick={clear} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            )}
          </div>

          {/* Search dropdown */}
          {results && (
            <div className="absolute top-full mt-2 w-full card shadow-xl z-50 overflow-hidden">
              {results.files?.length === 0 && results.folders?.length === 0 ? (
                <p className="text-sm text-gray-400 p-4 text-center">No results for "{q}"</p>
              ) : (
                <div className="max-h-80 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800">
                  {results.folders?.map(f => (
                    <button key={f._id} onClick={() => { navigate(`/folder/${f._id}`); clear() }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 text-left">
                      <div className="w-8 h-8 bg-amber-50 dark:bg-amber-900/20 rounded-lg flex items-center justify-center shrink-0">
                        <span className="text-amber-500 text-sm">📁</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{f.name}</p>
                        <p className="text-xs text-gray-400">Folder</p>
                      </div>
                    </button>
                  ))}
                  {results.files?.map(f => {
                    const cat = getMimeCategory(f.mimeType)
                    const canPreview = ['image', 'video', 'pdf'].includes(cat)
                    return (
                      <button key={f._id} onClick={() => handleFileClick(f)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 text-left group">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-50 dark:bg-gray-800 shrink-0">
                          <FileIcon mimeType={f.mimeType} size={16} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{f.fileName}</p>
                          <p className="text-xs text-gray-400">{formatBytes(f.fileSize)} · {formatDateShort(f.createdAt)}</p>
                        </div>
                        {/* Action hint */}
                        <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 opacity-0 group-hover:opacity-100 transition-opacity
                          ${canPreview ? 'bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                          {canPreview ? 'Preview' : <><Download size={10} className="inline mr-1" />Download</>}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 ml-auto">
          <button onClick={toggle}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      {/* Preview modal mounted here so it works from any page */}
      <PreviewModal open={!!previewFile} file={previewFile} onClose={() => setPreviewFile(null)} />
    </>
  )
}

