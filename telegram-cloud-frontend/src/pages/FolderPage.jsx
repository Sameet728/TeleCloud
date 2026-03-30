import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { 
  FolderPlus, Home, Trash2, ArrowLeft, Download, 
  AlertTriangle, ChevronRight, Folder as FolderIcon 
} from 'lucide-react'
import toast from 'react-hot-toast'
import { filesAPI, foldersAPI } from '../services/api'
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
import { useSubscription } from '../store/useSubscription'
import UI_LAYERS from '../constants/uiLayers'

// Dense Animation Variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.02 } }
}

const itemVariants = {
  hidden: { y: 10, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 400, damping: 30 } }
}

export default function FolderPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isExpired } = useSubscription()
  const qc     = useQueryClient()
  
  const [cfOpen, setCfOpen]     = useState(false)
  const [preview, setPreview]   = useState(null)
  const [shareFile, setShare]   = useState(null)
  const [toDelete, setToDelete] = useState(null)
  const [renameF, setRenameF]   = useState(null)
  const [delLoading, setDelLoading] = useState(false)
  const [isDraggingFile, setIsDraggingFile] = useState(false)
  const [rootDropOver, setRootDropOver] = useState(false)
  const [selected, setSelected] = useState(new Set())

  const clearSelected = () => setSelected(new Set())

  const { data, isLoading } = useQuery({
    queryKey: ['folder', id],
    queryFn: () => foldersAPI.get(id).then(r => r.data.data),
  })

  const folder     = data?.folder
  const subFolders = data?.subFolders || []
  const files      = data?.files      || []

  // ... [Keep all your existing handler functions here exactly as they are: 
  // handleToggleStar, handleDelete, handleBulkDelete, handleBulkDownload, 
  // handleMove, handleFolderMove, handleMoveToRoot, handleFolderDownload]

  const handleToggleStar = async (item, isFolder = false) => {
    const tid = toast.loading(item.isStarred ? 'Removing star...' : 'Starring...')
    try {
      if (isFolder) await foldersAPI.update(item._id, { isStarred: !item.isStarred })
      else await filesAPI.update(item._id, { isStarred: !item.isStarred })
      toast.success(item.isStarred ? 'Star removed' : 'Starred', { id: tid })
      qc.invalidateQueries({ queryKey: ['folder', id] })
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
      } else {
        await filesAPI.delete(toDelete._id)
        toast.success('Asset deleted')
      }
      qc.invalidateQueries({ queryKey: ['folder', id] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      setToDelete(null)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed')
    } finally { setDelLoading(false) }
  }

  const handleBulkDelete = async () => {
    if (selected.size === 0) return
    try {
      await filesAPI.bulkDelete([...selected])
      toast.success(`${selected.size} items deleted`)
      clearSelected()
      qc.invalidateQueries({ queryKey: ['folder', id] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Bulk delete failed')
    }
  }

  const handleBulkDownload = async () => {
    if (isExpired) return toast.error('Renew subscription to download files')
    if (selected.size === 0) return;
    const items = Array.from(selected);
    const fileIds = items.filter(fid => files.some(f => f._id === fid));
    const folderIds = items.filter(fid => subFolders.some(f => f._id === fid));
    
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

  const handleMove = async (fileIds, targetFolderId) => {
    if (isExpired) return toast.error('Renew subscription to move files')
    const ids = Array.isArray(fileIds) ? fileIds : [fileIds]
    const tid = toast.loading(`Moving ${ids.length} item(s)...`)
    try {
      await filesAPI.move({ fileIds: ids, targetFolderId })
      toast.success('Moved successfully', { id: tid })
      qc.invalidateQueries({ queryKey: ['folder', id] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Move failed', { id: tid })
    }
  }

  const handleFolderMove = async (draggedFolderId, targetFolderId) => {
    if (isExpired) return toast.error('Renew subscription to move folders')
    if (draggedFolderId === targetFolderId) return
    const tid = toast.loading('Moving directory...')
    try {
      await foldersAPI.update(draggedFolderId, { parentFolderId: targetFolderId })
      toast.success('Directory moved', { id: tid })
      qc.invalidateQueries({ queryKey: ['folder', id] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    } catch (err) {
      toast.error('Failed to move directory', { id: tid })
    }
  }

  const handleMoveToRoot = async (fileIds) => {
    if (isExpired) return toast.error('Renew subscription to move files')
    const ids = Array.isArray(fileIds) ? fileIds : [fileIds]
    const tid = toast.loading(`Moving ${ids.length} item(s) to root...`)
    try {
      await filesAPI.move({ fileIds: ids, targetFolderId: null })
      toast.success('Moved to root successfully', { id: tid })
      qc.invalidateQueries({ queryKey: ['folder', id] })
      qc.invalidateQueries({ queryKey: ['files'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    } catch (err) {
      toast.error('Move to root failed', { id: tid })
    }
  }

  const handleFolderDownload = async (f) => {
    if (isExpired) return toast.error('Renew subscription to download folders')
    const tid = toast.loading('Building archive...');
    try {
      const { data } = await filesAPI.getZipToken({ fileIds: [], folderIds: [f._id] });
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
        <div className="flex items-start gap-4">
          <button 
            onClick={() => navigate(folder?.parentFolderId ? `/folder/${folder.parentFolderId}` : '/files')}
            className="app-icon-button mt-1"
          >
            <ArrowLeft size={16} strokeWidth={2.5} />
          </button>
          
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-medium text-zinc-500 mb-1.5">
              <span className="cursor-pointer hover:text-indigo-500 transition-colors" onClick={() => navigate('/files')}>Workspace</span>
              <ChevronRight size={12} />
              <span className="text-zinc-900 dark:text-zinc-300 truncate max-w-[150px] sm:max-w-[300px]">{folder?.name || 'Loading...'}</span>
            </div>
            <h1 className="flex items-center gap-2.5 truncate max-w-[250px] text-[1.75rem] font-bold tracking-tight text-gray-900 dark:text-white sm:max-w-xl">
              <FolderIcon size={24} className="text-indigo-500 shrink-0" fill="currentColor" fillOpacity={0.2} />
              <span className="truncate">{folder?.name || 'Directory'}</span>
              <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800/50 px-2 py-0.5 rounded-md shrink-0 whitespace-nowrap hidden sm:inline-block">
                {subFolders.length} Nodes · {files.length} Assets
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {selected.size > 0 && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-2 mr-2">
              <span className="text-xs font-bold text-indigo-500 bg-indigo-500/10 px-2 py-1.5 rounded-lg">{selected.size} Selected</span>
              <button onClick={handleBulkDownload} className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold rounded-lg transition-all shadow-sm">
                <Download size={14} /> Fetch
              </button>
              <button onClick={handleBulkDelete} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold rounded-lg transition-all shadow-sm">
                <Trash2 size={14} /> Purge
              </button>
            </motion.div>
          )}
          <button onClick={() => isExpired ? toast.error('Renew subscription to create folders') : setCfOpen(true)} 
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 hover:border-indigo-500 hover:text-indigo-500 dark:text-zinc-300 text-xs font-semibold rounded-lg transition-all shadow-sm group"
          >
            <FolderPlus size={14} className="group-hover:text-indigo-500 transition-colors" /> New Sub-Directory
          </button>
        </div>
      </div>

      {isLoading ? <SkeletonList /> : (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
          {subFolders.length === 0 && files.length === 0 ? (
            <EmptyState title="Directory Empty" subtitle="Drag and drop media here, or initialize a sub-directory." />
          ) : (
            <>
              {subFolders.length > 0 && (
                <section className="app-panel p-4 sm:p-5">
                  <h2 className="app-section-title mb-4 pl-1">Directories</h2>
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7">
                    <AnimatePresence>
                      {subFolders.map(f => (
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
                        {files.map(f => (
                          <motion.div key={f._id} variants={itemVariants} layout>
                            <FileCard file={f}
                              onPreview={f => isExpired ? toast.error('Renew subscription to preview files') : setPreview(f)}
                              onOpenVideo={f => isExpired ? toast.error('Renew subscription to stream videos') : navigate(`/view/${f._id}`)}
                              onShare={f => isExpired ? toast.error('Renew subscription to share') : setShare(f)}
                              onDelete={f => setToDelete({ ...f, type: 'file' })}
                              onDragStateChange={setIsDraggingFile}
                              onToggleStar={handleToggleStar} />
                          </motion.div>
                        ))}
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
        <UploadZone folderId={id}>
          {contentWrapper}
        </UploadZone>
      )}

      {/* ── Move to Root drop zone (Premium SaaS Styling) ── */}
      <AnimatePresence>
        {isDraggingFile && (
          <motion.div
            key="root-drop"
            initial={{ y: 80, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 80, opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            onDragOver={(e) => { e.preventDefault(); setRootDropOver(true) }}
            onDragLeave={() => setRootDropOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setRootDropOver(false)
              setIsDraggingFile(false)
              const fileIds = JSON.parse(e.dataTransfer.getData('fileIds') || 'null')
                || [e.dataTransfer.getData('fileId')]
              if (fileIds?.length) handleMoveToRoot(fileIds)
            }}
            style={{ zIndex: UI_LAYERS.floatingElevated }}
            className={`fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3
              px-6 py-4 rounded-2xl cursor-default select-none
              transition-all duration-200 shadow-2xl backdrop-blur-xl border-2
              ${
                rootDropOver
                  ? 'bg-indigo-500/90 border-indigo-400 shadow-indigo-500/50 scale-105'
                  : 'bg-zinc-900/80 dark:bg-zinc-900/90 border-zinc-700/50 dark:border-zinc-700'
              }`}
          >
            <div className={`p-2 rounded-xl transition-colors ${rootDropOver ? 'bg-indigo-400/30' : 'bg-zinc-800'}`}>
              <Home size={20} className={rootDropOver ? 'text-white' : 'text-zinc-300'} />
            </div>
            <div className="flex flex-col">
              <span className={`text-sm font-bold tracking-tight ${
                rootDropOver ? 'text-white' : 'text-zinc-100'
              }`}>
                {rootDropOver ? 'Release to relocate' : 'Move to Workspace Root'}
              </span>
              <span className={`text-[10px] font-medium uppercase tracking-wider ${
                rootDropOver ? 'text-indigo-200' : 'text-zinc-400'
              }`}>
                Drop asset here
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <CreateFolderModal open={cfOpen} parentFolderId={id} onClose={() => setCfOpen(false)} />
      <CreateFolderModal open={!!renameF} existingFolder={renameF} onClose={() => setRenameF(null)} />
      <PreviewModal open={!!preview} file={preview} files={files} onClose={() => setPreview(null)} />
      <ShareModal open={!!shareFile} item={shareFile} isFolder={shareFile?.type === 'folder'} onClose={() => setShare(null)} />
      <DeleteConfirmModal
        open={!!toDelete} loading={delLoading}
        title={toDelete?.type === 'folder' ? 'Destroy Directory' : 'Delete Asset'}
        message={toDelete?.type === 'folder'
          ? `"${toDelete?.name}" and all internal nodes will be permanently destroyed.`
          : `"${toDelete?.fileName}" will be purged from the Telegram network.`}
        onConfirm={handleDelete} onClose={() => setToDelete(null)} />
    </>
  )
}
