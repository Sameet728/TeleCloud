import { useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { filesAPI } from '../services/api'
import { generateUploadId } from '../utils/helpers'
import useStore from '../store/useStore'

export default function useUpload(folderId = null) {
  const qc = useQueryClient()
  const { addUpload, updateUpload, removeUpload } = useStore()
  const esRefs = useRef({})

  const upload = useCallback(async (files) => {
    const fileArr = Array.from(files)
    if (!fileArr.length) return

    const token   = localStorage.getItem('token')
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

    // ── Upload every file independently with its own progress entry ──
    const uploads = fileArr.map(file => ({
      file,
      uploadId: generateUploadId(),
    }))

    // Register all in the store immediately so the panel shows up
    uploads.forEach(({ uploadId, file }) => {
      addUpload(uploadId, file.name)
    })

    const results = await Promise.allSettled(
      uploads.map(({ uploadId, file }) => new Promise((resolve, reject) => {

        // Open SSE stream for THIS file's uploadId — this delivers real
        // Telegram upload progress (20%…92%…complete) from the backend
        const es = new EventSource(
          `${baseUrl}/api/progress/${uploadId}?token=${token}`
        )
        esRefs.current[uploadId] = es

        es.onmessage = (e) => {
          try {
            const { progress, status } = JSON.parse(e.data)
            updateUpload(uploadId, progress, status)
            if (status === 'complete') {
              es.close()
              delete esRefs.current[uploadId]
              resolve()
            } else if (status === 'error') {
              es.close()
              delete esRefs.current[uploadId]
              reject(new Error('Upload error reported by server'))
            }
          } catch {}
        }

        es.onerror = () => {
          // SSE can disconnect on complete — that's normal; fall through
        }

        // Fire the actual HTTP upload (no onProgress — SSE is the source
        // of truth for progress so we don't fight ourselves)
        const fd = new FormData()
        fd.append('file', file)
        if (folderId) fd.append('folderId', folderId)

        filesAPI.upload(fd, uploadId)
          .then(() => {
            // In case SSE already resolved, this is a no-op.
            // If SSE missed the complete event, resolve here.
            updateUpload(uploadId, 100, 'complete')
            es.close()
            delete esRefs.current[uploadId]
            resolve()
          })
          .catch((err) => {
            updateUpload(uploadId, 0, 'error')
            es.close()
            delete esRefs.current[uploadId]
            reject(err)
          })
      }))
    )

    // Summarise results
    const succeeded = results.filter(r => r.status === 'fulfilled').length
    const failed    = results.filter(r => r.status === 'rejected').length

    if (succeeded > 0) {
      toast.success(
        succeeded === 1
          ? `${fileArr.find((_, i) => results[i].status === 'fulfilled')?.name || 'File'} uploaded!`
          : `${succeeded} files uploaded successfully!`
      )
      qc.invalidateQueries({ queryKey: ['files'] })
      qc.invalidateQueries({ queryKey: ['folder'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    }

    if (failed > 0) {
      toast.error(
        failed === 1
          ? `1 file failed to upload`
          : `${failed} files failed to upload`
      )
    }

    // Remove completed entries from the panel after a short delay
    setTimeout(() => {
      uploads.forEach(({ uploadId }) => removeUpload(uploadId))
    }, 3500)

  }, [folderId, addUpload, updateUpload, removeUpload, qc])

  return { upload }
}
