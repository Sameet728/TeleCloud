import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence } from 'framer-motion'
import { FolderPlus, Home, Trash2, ArrowUp, ArrowLeft, Download, AlertTriangle } from 'lucide-react'
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
import Breadcrumb from '../components/Breadcrumb'
import { SkeletonList } from '../components/SkeletonCard'
import RubberBandSelect from '../components/RubberBandSelect'
import { useSubscription } from '../store/useSubscription'

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
  const toggleSelected = (itemId) => {
    setSelected(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }

  const { data, isLoading } = useQuery({
    queryKey: ['folder', id],
    queryFn: () => foldersAPI.get(id).then(r => r.data.data),
  })

  const folder     = data?.folder
  const subFolders = data?.subFolders || []
  const files      = data?.files      || []

  const handleToggleStar = async (item, isFolder = false) => {
    const tid = toast.loading(item.isStarred ? 'Removing star...' : 'Starring...')
    try {
      if (isFolder) {
        await foldersAPI.update(item._id, { isStarred: !item.isStarred })
      } else {
        await filesAPI.update(item._id, { isStarred: !item.isStarred })
      }
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
        toast.success('Folder deleted')
      } else {
        await filesAPI.delete(toDelete._id)
        toast.success('File deleted')
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
      toast.success(`${selected.size} files deleted`)
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
    
    const tid = toast.loading('Preparing archive...');
    try {
      const { data } = await filesAPI.getZipToken({ fileIds, folderIds });
      const a = document.createElement('a');
      a.href = filesAPI.downloadZip(data.data.token);
      a.click();
      toast.success('Download started', { id: tid });
      clearSelected();
    } catch (err) {
      toast.error('Failed to prepare download', { id: tid });
    }
  };

  const handleMove = async (fileIds, targetFolderId) => {
    if (isExpired) return toast.error('Renew subscription to move files')
    const ids = Array.isArray(fileIds) ? fileIds : [fileIds]
    const tid = toast.loading(`Moving ${ids.length > 1 ? ids.length + ' files' : 'file'}...`)
    try {
      await filesAPI.move({ fileIds: ids, targetFolderId })
      toast.success(ids.length > 1 ? `${ids.length} files moved!` : 'File moved!', { id: tid })
      qc.invalidateQueries({ queryKey: ['folder', id] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Move failed', { id: tid })
    }
  }

  const handleFolderMove = async (draggedFolderId, targetFolderId) => {
    if (isExpired) return toast.error('Renew subscription to move folders')
    if (draggedFolderId === targetFolderId) return
    const tid = toast.loading('Moving folder...')
    try {
      await foldersAPI.update(draggedFolderId, { parentFolderId: targetFolderId })
      toast.success('Folder moved', { id: tid })
      qc.invalidateQueries({ queryKey: ['folder', id] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to move folder', { id: tid })
    }
  }

  const handleMoveToRoot = async (fileIds) => {
    if (isExpired) return toast.error('Renew subscription to move files')
    const ids = Array.isArray(fileIds) ? fileIds : [fileIds]
    const tid = toast.loading(`Moving ${ids.length > 1 ? ids.length + ' files' : 'file'} to root...`)
    try {
      await filesAPI.move({ fileIds: ids, targetFolderId: null })
      toast.success(ids.length > 1 ? `${ids.length} files moved to root!` : 'Moved to root!', { id: tid })
      qc.invalidateQueries({ queryKey: ['folder', id] })
      qc.invalidateQueries({ queryKey: ['files'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Move failed', { id: tid })
    }
  }

  const handleFolderDownload = async (f) => {
    if (isExpired) return toast.error('Renew subscription to download folders')
    const tid = toast.loading('Preparing archive...');
    try {
      const { data } = await filesAPI.getZipToken({ fileIds: [], folderIds: [f._id] });
      const a = document.createElement('a');
      a.href = filesAPI.downloadZip(data.data.token);
      a.click();
      toast.success('Download started', { id: tid });
    } catch (err) {
      toast.error('Failed to prepare download', { id: tid });
    }
  };

  if (isLoading) return <div className="p-8"><SkeletonList /></div>

  const contentWrapper = (
        <div className="space-y-5 pb-24">
          {isExpired && (
            <div className="mb-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center shrink-0">
                  <AlertTriangle className="text-red-500" size={20} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-red-700 dark:text-red-300">Your subscription has expired</p>
                  <p className="text-xs text-red-600/80 dark:text-red-400/80">Renew to regain access to your files. Uploads, downloads, shares, and previews are disabled.</p>
                </div>
              </div>
              <button onClick={() => navigate('/pricing')} className="btn-primary py-2 text-sm whitespace-nowrap">Renew Now</button>
            </div>
          )}

          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(folder?.parentFolderId ? `/folder/${folder.parentFolderId}` : '/files')}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-500">
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white truncate max-w-[200px] sm:max-w-md">
                  {folder?.name || '...'}
                </h1>
                <p className="text-sm text-gray-500 mt-0.5">{subFolders.length} folders · {files.length} files</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {selected.size > 0 && (
                <>
                  <button onClick={handleBulkDownload} className="btn-secondary text-sm">
                    <Download size={14} /> Download {selected.size}
                  </button>
                  <button onClick={handleBulkDelete} className="btn-danger text-sm">
                    <Trash2 size={14} /> Delete {selected.size}
                  </button>
                </>
              )}
              <button onClick={() => isExpired ? toast.error('Renew subscription to create folders') : setCfOpen(true)} className="btn-secondary text-sm">
                <FolderPlus size={15} /> New folder
              </button>
            </div>
          </div>

          {isLoading ? <SkeletonList /> : (
            <>
              {subFolders.length === 0 && files.length === 0 ? (
                <EmptyState title="Empty folder" subtitle="Upload files or create sub-folders here" />
              ) : (
                <>
                  {subFolders.length > 0 && (
                    <section>
                      <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Folders</h2>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        <AnimatePresence>
                          {subFolders.map(f => (
                            <FolderCard key={f._id} folder={f}
                              onDelete={f => setToDelete({ ...f, type: 'folder' })}
                              onRename={f => setRenameF(f)}
                              onShare={f => isExpired ? toast.error('Renew subscription to share') : setShare({ ...f, type: 'folder' })}
                              onDownload={handleFolderDownload}
                              onFileDrop={handleMove}
                              onFolderDrop={handleFolderMove}
                              onToggleStar={handleToggleStar} />
                          ))}
                        </AnimatePresence>
                      </div>
                    </section>
                  )}
                  {files.length > 0 && (
                    <section>
                      <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 mt-8">Files</h2>
                      <RubberBandSelect>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                          <AnimatePresence>
                            {files.map(f => (
                              <FileCard key={f._id} file={f}
                                onPreview={f => isExpired ? toast.error('Renew subscription to preview files') : setPreview(f)}
                                onShare={f => isExpired ? toast.error('Renew subscription to share') : setShare(f)}
                                onDelete={f => setToDelete({ ...f, type: 'file' })}
                                onDragStateChange={setIsDraggingFile}
                                onToggleStar={handleToggleStar} />
                            ))}
                          </AnimatePresence>
                        </div>
                      </RubberBandSelect>
                    </section>
                  )}
                </>
              )}
            </>
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

      {/* ── Move to Root drop zone – shows while dragging a file card ── */}
      <AnimatePresence>
        {isDraggingFile && (
          <motion.div
            key="root-drop"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
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
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3
              px-6 py-3 rounded-2xl border-2 border-dashed cursor-default select-none
              transition-colors duration-150 shadow-xl
              ${
                rootDropOver
                  ? 'bg-emerald-500 border-emerald-300 shadow-emerald-400/40 scale-105'
                  : 'bg-white/90 dark:bg-gray-900/90 border-gray-300 dark:border-gray-600 backdrop-blur-md'
              }`}
          >
            <Home size={18} className={rootDropOver ? 'text-white' : 'text-gray-500 dark:text-gray-400'} />
            <span className={`text-sm font-semibold ${
              rootDropOver ? 'text-white' : 'text-gray-600 dark:text-gray-300'
            }`}>
              {rootDropOver ? 'Release to move to root' : 'Drop here → Move to Root'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <CreateFolderModal open={cfOpen} parentFolderId={id} onClose={() => setCfOpen(false)} />
      <CreateFolderModal open={!!renameF} existingFolder={renameF} onClose={() => setRenameF(null)} />
      <PreviewModal open={!!preview} file={preview} files={files} onClose={() => setPreview(null)} />
      <ShareModal open={!!shareFile} item={shareFile} isFolder={shareFile?.type === 'folder'} onClose={() => setShare(null)} />
      <DeleteConfirmModal
        open={!!toDelete} loading={delLoading}
        title={toDelete?.type === 'folder' ? 'Delete folder' : 'Delete file'}
        message={toDelete?.type === 'folder'
          ? `"${toDelete?.name}" and all its contents will be permanently deleted.`
          : `"${toDelete?.fileName}" will be permanently deleted.`}
        onConfirm={handleDelete} onClose={() => setToDelete(null)} />
    </>
  )
}
