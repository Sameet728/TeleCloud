import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { FolderPlus, Trash2, Grid, List, Download, AlertTriangle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
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
import useStore from '../store/useStore'
import { useSubscription } from '../store/useSubscription'

export default function Files({ filter = null }) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { isExpired } = useSubscription()
  const { selected, clearSelected } = useStore()
  const [cfOpen, setCfOpen]     = useState(false)
  const [preview, setPreview]   = useState(null)
  const [shareFile, setShare]   = useState(null)
  const [toDelete, setToDelete] = useState(null)
  const [renameF, setRenameF]   = useState(null)
  const [delLoading, setDelLoading] = useState(false)

  const { data: foldersData, isLoading: fl } = useQuery({
    queryKey: ['folders', filter || 'root'],
    queryFn: () => foldersAPI.list({ 
      ...(filter === 'starred' ? { isStarred: 'true' } : { parentFolderId: null })
    }).then(r => r.data.data),
    // Hide folders entirely if we are specifically filtering for images or videos
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
      default: return 'My Files'
    }
  }

  const handleToggleStar = async (item, isFolder = false) => {
    const tid = toast.loading(item.isStarred ? 'Removing star...' : 'Starring...')
    try {
      if (isFolder) {
        await foldersAPI.update(item._id, { isStarred: !item.isStarred })
      } else {
        await filesAPI.update(item._id, { isStarred: !item.isStarred })
      }
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
        toast.success('Folder deleted')
        qc.invalidateQueries({ queryKey: ['folders'] })
      } else {
        await filesAPI.delete(toDelete._id)
        toast.success('File deleted')
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
    const tid = toast.loading(`Moving ${ids.length > 1 ? ids.length + ' files' : 'file'}...`)
    try {
      await filesAPI.move({ fileIds: ids, targetFolderId })
      toast.success(ids.length > 1 ? `${ids.length} files moved!` : 'File moved!', { id: tid })
      clearSelected()
      qc.invalidateQueries({ queryKey: ['files'] })
      qc.invalidateQueries({ queryKey: ['folders'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Move failed', { id: tid })
    }
  }

  const handleFolderMove = async (draggedFolderId, targetFolderId) => {
    if (isExpired) return toast.error('Renew subscription to manage files')
    if (draggedFolderId === targetFolderId) return
    const tid = toast.loading('Moving folder...')
    try {
      await foldersAPI.update(draggedFolderId, { parentFolderId: targetFolderId })
      toast.success('Folder moved', { id: tid })
      qc.invalidateQueries({ queryKey: ['folders'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to move folder', { id: tid })
    }
  }

  const handleBulkDelete = async () => {
    if (selected.size === 0) return
    try {
      await filesAPI.bulkDelete([...selected])
      toast.success(`${selected.size} files deleted`)
      clearSelected()
      qc.invalidateQueries({ queryKey: ['files'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Bulk delete failed')
    }
  }

  const handleBulkDownload = async () => {
    if (isExpired) return toast.error('Renew subscription to download files')
    if (selected.size === 0) return;
    const items = Array.from(selected);
    const fileIds = items.filter(id => files.some(f => f._id === id));
    const folderIds = items.filter(id => folders.some(f => f._id === id));
    
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

  const handleFolderDownload = async (folder) => {
    if (isExpired) return toast.error('Renew subscription to download files')
    const tid = toast.loading('Preparing archive...');
    try {
      const { data } = await filesAPI.getZipToken({ fileIds: [], folderIds: [folder._id] });
      const a = document.createElement('a');
      a.href = filesAPI.downloadZip(data.data.token);
      a.click();
      toast.success('Download started', { id: tid });
    } catch (err) {
      toast.error('Failed to prepare download', { id: tid });
    }
  };

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

          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{getPageTitle()}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {folders.length} folders · {files.length} files
              </p>
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

          {loading ? <SkeletonList /> : (
            <>
              {folders.length === 0 && files.length === 0 ? (
                <EmptyState
                  title="No files here"
                  subtitle="Drag and drop files here, or click the Upload button to get started"
                />
              ) : (
                <>
                  {folders.length > 0 && (
                    <section>
                      <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Folders</h2>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        <AnimatePresence>
                          {folders.map(f => (
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
                      <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Files</h2>
                      <RubberBandSelect>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                          <AnimatePresence>
                            {files.map(f => (
                              <FileCard key={f._id} file={f}
                                onPreview={f => isExpired ? toast.error('Renew subscription to preview files') : setPreview(f)}
                                onShare={f => isExpired ? toast.error('Renew subscription to share') : setShare(f)}
                                onDelete={f => setToDelete({ ...f, type: 'file' })}
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
        <UploadZone folderId={null}>
          {contentWrapper}
        </UploadZone>
      )}

      <CreateFolderModal open={cfOpen} parentFolderId={null} onClose={() => setCfOpen(false)} />
      <CreateFolderModal open={!!renameF} parentFolderId={null} existingFolder={renameF} onClose={() => setRenameF(null)} />
      <PreviewModal open={!!preview} file={preview} files={files} onClose={() => setPreview(null)} />
      <ShareModal open={!!shareFile} item={shareFile} isFolder={shareFile?.type === 'folder'} onClose={() => setShare(null)} />
      <DeleteConfirmModal
        open={!!toDelete} loading={delLoading}
        title={toDelete?.type === 'folder' ? 'Delete folder' : 'Delete file'}
        message={toDelete?.type === 'folder'
          ? `"${toDelete?.name}" and all its contents will be permanently deleted.`
          : `"${toDelete?.fileName}" will be permanently deleted from Telegram.`}
        onConfirm={handleDelete} onClose={() => setToDelete(null)} />
    </>
  )
}
