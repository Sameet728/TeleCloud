import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { FolderPlus, Trash2, Download, AlertTriangle, Cloud, X, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { filesAPI, foldersAPI } from '../services/api'
import TelegramImportModal from '../components/TelegramImportModal'
import FileCard from '../components/FileCard'
import FolderCard from '../components/FolderCard'
import UploadZone from '../components/UploadZone'
import CreateFolderModal from '../components/CreateFolderModal'
import DeleteConfirmModal from '../components/DeleteConfirmModal'
import ShareModal from '../components/ShareModal'
import PreviewModal from '../components/PreviewModal'
import EmptyState from '../components/EmptyState'
import { SkeletonList } from '../components/SkeletonCard'
import RubberBandSelect from '../components/RubberBandSelect'
import AdBanner, { useAdGuard } from '../components/AdBanner'
import useStore from '../store/useStore'
import { useSubscription } from '../store/useSubscription'

// Dense Animation Variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.02 } }
}

const itemVariants = {
  hidden: { y: 10, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 400, damping: 30 } }
}

export default function Files({ filter = null }) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { isExpired } = useSubscription()
  const { selected, clearSelected } = useStore()
  const canShowAds = useAdGuard()
  
  const [cfOpen, setCfOpen]     = useState(false)
  const [preview, setPreview]   = useState(null)
  const [shareFile, setShare]   = useState(null)
  const [toDelete, setToDelete] = useState(null)
  const [renameF, setRenameF]   = useState(null)
  const [delLoading, setDelLoading] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [largeFile, setLargeFile]   = useState(null) // { name, size } when >500MB detected

  const { data: foldersData, isLoading: fl } = useQuery({
    queryKey: ['folders', filter || 'root'],
    queryFn: () => foldersAPI.list({ 
      ...(filter === 'starred' ? { isStarred: 'true' } : { parentFolderId: null })
    }).then(r => r.data.data),
    enabled: filter !== 'images' && filter !== 'videos'
  })

  const { data: filesData, isLoading: fl2 } = useQuery({
    queryKey: ['files', filter || 'root'],
    queryFn: () => filesAPI.list({ 
      ...(filter === 'starred' ? { isStarred: 'true' } : {}),
      ...(filter === 'images' ? { type: 'image' } : {}),
      ...(filter === 'videos' ? { type: 'video' } : {}),
      ...(!filter ? { folderId: null } : {})
    }).then(r => r.data.data),
  })

  const folders = filter === 'images' || filter === 'videos' ? [] : (foldersData?.folders || [])
  const files   = filesData?.files    || []
  const loading = fl || fl2
  
  const getPageTitle = () => {
    switch (filter) {
      case 'starred': return 'Starred'
      case 'images': return 'Images'
      case 'videos': return 'Videos'
      default: return 'Workspace'
    }
  }

  // ... [Keep all your existing handler functions here exactly as they are: 
  // handleToggleStar, handleDelete, handleMove, handleFolderMove, 
  // handleBulkDelete, handleBulkDownload, handleFolderDownload]
  
  const handleToggleStar = async (item, isFolder = false) => {
    const tid = toast.loading(item.isStarred ? 'Removing star...' : 'Starring...')
    try {
      if (isFolder) await foldersAPI.update(item._id, { isStarred: !item.isStarred })
      else await filesAPI.update(item._id, { isStarred: !item.isStarred })
      toast.success(item.isStarred ? 'Star removed' : 'Starred', { id: tid })
      qc.invalidateQueries({ queryKey: ['files'] })
      qc.invalidateQueries({ queryKey: ['folders'] })
    } catch {
      toast.error('Failed to update star', { id: tid })
    }
  }

  const handleDelete = async () => {
    if (!toDelete) return
    setDelLoading(true)
    try {
      if (toDelete.type === 'folder') {
        await foldersAPI.delete(toDelete._id)
        toast.success('Directory destroyed')
        qc.invalidateQueries({ queryKey: ['folders'] })
      } else {
        await filesAPI.delete(toDelete._id)
        toast.success('Asset deleted')
        qc.invalidateQueries({ queryKey: ['files'] })
        qc.invalidateQueries({ queryKey: ['dashboard'] })
      }
      setToDelete(null)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed')
    } finally { setDelLoading(false) }
  }

  const handleMove = async (fileIds, targetFolderId) => {
    if (isExpired) return toast.error('Renew subscription to manage files')
    const ids = Array.isArray(fileIds) ? fileIds : [fileIds]
    const tid = toast.loading(`Moving ${ids.length} item(s)...`)
    try {
      await filesAPI.move({ fileIds: ids, targetFolderId })
      toast.success('Moved successfully', { id: tid })
      clearSelected()
      qc.invalidateQueries({ queryKey: ['files'] })
      qc.invalidateQueries({ queryKey: ['folders'] })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Move failed', { id: tid })
    }
  }

  const handleFolderMove = async (draggedFolderId, targetFolderId) => {
    if (isExpired) return toast.error('Renew subscription to manage files')
    if (draggedFolderId === targetFolderId) return
    const tid = toast.loading('Moving directory...')
    try {
      await foldersAPI.update(draggedFolderId, { parentFolderId: targetFolderId })
      toast.success('Directory moved', { id: tid })
      qc.invalidateQueries({ queryKey: ['folders'] })
    } catch (err) {
      toast.error('Failed to move directory', { id: tid })
    }
  }

  const handleBulkDelete = async () => {
    if (selected.size === 0) return
    try {
      await filesAPI.bulkDelete([...selected])
      toast.success(`${selected.size} items deleted`)
      clearSelected()
      qc.invalidateQueries({ queryKey: ['files'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    } catch (err) {
      toast.error('Bulk delete failed')
    }
  }

  const handleBulkDownload = async () => {
    if (isExpired) return toast.error('Renew subscription to download files')
    if (selected.size === 0) return;
    const items = Array.from(selected);
    const fileIds = items.filter(id => files.some(f => f._id === id));
    const folderIds = items.filter(id => folders.some(f => f._id === id));
    
    const tid = toast.loading('Building archive...');
    try {
      const { data } = await filesAPI.getZipToken({ fileIds, folderIds });
      const a = document.createElement('a');
      a.href = filesAPI.downloadZip(data.data.token);
      a.click();
      toast.success('Download queued', { id: tid });
      clearSelected();
    } catch (err) {
      toast.error('Failed to compile archive', { id: tid });
    }
  };

  const handleFolderDownload = async (folder) => {
    if (isExpired) return toast.error('Renew subscription to download files')
    const tid = toast.loading('Building archive...');
    try {
      const { data } = await filesAPI.getZipToken({ fileIds: [], folderIds: [folder._id] });
      const a = document.createElement('a');
      a.href = filesAPI.downloadZip(data.data.token);
      a.click();
      toast.success('Download queued', { id: tid });
    } catch (err) {
      toast.error('Failed to compile archive', { id: tid });
    }
  };

  const contentWrapper = (
    <div className="app-page px-1 pt-1">
      {/* Expired Subscription Banner - SaaS Style */}
      {isExpired && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} 
          className="app-panel flex flex-col items-start justify-between gap-4 border-red-500/20 bg-red-500/10 p-4 sm:flex-row sm:items-center"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/20 shrink-0">
              <AlertTriangle className="text-red-500" size={18} />
            </div>
            <div>
              <p className="text-sm font-bold text-red-600 dark:text-red-400">Vault Locked: Subscription Expired</p>
              <p className="text-xs font-medium text-red-600/70 dark:text-red-400/70 mt-0.5">Renew to restore upload, download, and streaming capabilities.</p>
            </div>
          </div>
          <button onClick={() => navigate('/pricing')} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-lg transition-colors whitespace-nowrap shadow-sm shadow-red-500/20">
            Restore Access
          </button>
        </motion.div>
      )}

      {/* Header & Controls - Dense Layout */}
      <div className="app-hero flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-zinc-500">
            <span>Telecloud</span>
            <ChevronRight size={12} />
            <span className="text-zinc-900 dark:text-zinc-300">{getPageTitle()}</span>
          </div>
          <p className="app-kicker">Workspace</p>
          <h1 className="mt-2 flex flex-wrap items-center gap-2.5 text-[2rem] font-display font-bold tracking-tight text-gray-900 dark:text-white sm:text-[2.35rem]">
            {getPageTitle()}
            <span className="rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-300">
              {folders.length} Nodes · {files.length} Assets
            </span>
          </h1>
          <p className="app-subtitle">
            Manage folders, upload new files, and keep your cloud workspace organized from one responsive control surface.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {selected.size > 0 && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mr-2 flex items-center gap-2">
              <span className="rounded-full bg-indigo-500/10 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-500">{selected.size} Selected</span>
              <button onClick={handleBulkDownload} className="app-button-secondary px-4 py-2 text-xs">
                <Download size={14} /> Fetch
              </button>
              <button onClick={handleBulkDelete} className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-600 transition-all hover:bg-red-100 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20">
                <Trash2 size={14} /> Purge
              </button>
            </motion.div>
          )}
          <button onClick={() => isExpired ? toast.error('Renew subscription to create folders') : setCfOpen(true)} 
            className="app-button-secondary px-4 py-2 text-xs group"
          >
            <FolderPlus size={14} className="group-hover:text-indigo-500 transition-colors" /> New Directory
          </button>
          <button onClick={() => setShowImport(true)} 
            className="app-button-primary px-4 py-2 text-xs"
          >
            <Cloud size={14} /> Import Data
          </button>
        </div>
      </div>

      {/* Large File Notice - Refined Inline Alert */}
      {largeFile && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden">
          <div className="app-panel mb-2 flex items-start gap-3 border-amber-200 bg-amber-50/90 p-3 dark:border-amber-500/20 dark:bg-amber-500/10">
            <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs font-bold text-amber-800 dark:text-amber-400 truncate">
                  Heavy Payload Detected ({(largeFile.size / 1024 / 1024).toFixed(0)} MB)
                </p>
                <button onClick={() => setLargeFile(null)} className="text-amber-500/70 hover:text-amber-500">
                  <X size={14} />
                </button>
              </div>
              <p className="text-[11px] font-medium text-amber-700/80 dark:text-amber-400/80 mt-1 leading-relaxed max-w-3xl">
                Upload in progress. For assets exceeding 500MB, forwarding directly to Telegram Saved Messages and utilizing the <strong>Import Data</strong> function yields significantly faster throughput.
              </p>
              <button onClick={() => { setLargeFile(null); setShowImport(true) }} className="mt-2 text-[10px] uppercase tracking-wider font-bold px-2 py-1 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded hover:bg-amber-500/30 transition-colors">
                Switch to Import Mode
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {loading ? <SkeletonList /> : (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
          {folders.length === 0 && files.length === 0 ? (
            <EmptyState title="Workspace Empty" subtitle="Drag and drop media here, or initialize a new directory." />
          ) : (
            <>
              {folders.length > 0 && (
                <section className="app-panel p-4 sm:p-5">
                  <h2 className="app-section-title mb-4 pl-1">Directories</h2>
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7">
                    <AnimatePresence>
                      {folders.map(f => (
                        <motion.div key={f._id} variants={itemVariants} layout>
                          <FolderCard folder={f}
                            onDelete={f => setToDelete({ ...f, type: 'folder' })}
                            onRename={f => setRenameF(f)}
                            onShare={f => isExpired ? toast.error('Renew subscription to share') : setShare({ ...f, type: 'folder' })}
                            onDownload={handleFolderDownload}
                            onFileDrop={handleMove}
                            onFolderDrop={handleFolderMove}
                            onToggleStar={handleToggleStar} />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </section>
              )}
              
              {files.length > 0 && (
                <section className="app-panel p-4 sm:p-5">
                  <h2 className="app-section-title mb-4 pl-1">Assets</h2>
                  <RubberBandSelect>
                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7">
                      <AnimatePresence>
                        {files.reduce((acc, f, i) => {
                          acc.push(
                            <motion.div key={f._id} variants={itemVariants} layout>
                              <FileCard file={f}
                                onPreview={f => isExpired ? toast.error('Renew subscription to preview files') : setPreview(f)}
                                onShare={f => isExpired ? toast.error('Renew subscription to share') : setShare(f)}
                                onDelete={f => setToDelete({ ...f, type: 'file' })}
                                onToggleStar={handleToggleStar} />
                            </motion.div>
                          )
                          if (canShowAds && (i + 1) % 12 === 0) {
                            acc.push(
                              <motion.div key={`ad-${i}`} variants={itemVariants} className="col-span-full py-2">
                                <div className="app-panel-muted p-3 flex justify-center">
                                  <AdBanner formatId="2018497" />
                                </div>
                              </motion.div>
                            )
                          }
                          return acc
                        }, [])}
                      </AnimatePresence>
                    </div>
                  </RubberBandSelect>
                </section>
              )}
            </>
          )}
        </motion.div>
      )}
    </div>
  )

  return (
    <>
      {isExpired ? contentWrapper : (
        <UploadZone folderId={null} onLargeFile={(file) => setLargeFile(file)}>
          {contentWrapper}
        </UploadZone>
      )}

      {/* Modals remain untouched to preserve functionality */}
      <CreateFolderModal open={cfOpen} parentFolderId={null} onClose={() => setCfOpen(false)} />
      <CreateFolderModal open={!!renameF} parentFolderId={null} existingFolder={renameF} onClose={() => setRenameF(null)} />
      <PreviewModal open={!!preview} file={preview} files={files} onClose={() => setPreview(null)} />
      <ShareModal open={!!shareFile} item={shareFile} isFolder={shareFile?.type === 'folder'} onClose={() => setShare(null)} />
      <DeleteConfirmModal
        open={!!toDelete} loading={delLoading}
        title={toDelete?.type === 'folder' ? 'Destroy Directory' : 'Delete Asset'}
        message={toDelete?.type === 'folder'
          ? `"${toDelete?.name}" and all internal nodes will be permanently destroyed.`
          : `"${toDelete?.fileName}" will be purged from the Telegram network.`}
        onConfirm={handleDelete} onClose={() => setToDelete(null)} />
      <TelegramImportModal open={showImport} onClose={() => setShowImport(false)} />
    </>
  )
}
