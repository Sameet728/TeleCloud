import { useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { filesAPI } from '../services/api'
import { generateUploadId } from '../utils/helpers'
import useStore from '../store/useStore'

export default function useUpload(folderId = null) {
  const qc = useQueryClient()
  const { addUpload, updateUpload, removeUpload } = useStore()

  const upload = useCallback(async (files) => {
    const fileArr = Array.from(files)
    if (!fileArr.length) return

    const token   = localStorage.getItem('token')
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

    const uploads = fileArr.map(file => ({
      file,
      uploadId: generateUploadId(),
    }))

    uploads.forEach(({ uploadId, file }) => {
      addUpload(uploadId, file.name)
    })

    const results = await Promise.allSettled(
      uploads.map(({ uploadId, file }) => new Promise((resolve, reject) => {
        const CHUNK_SIZE = 4 * 1024 * 1024; // 4MB

        ;(async () => {
          try {
            updateUpload(uploadId, 0, 'initializing', '')
            
            const { data: initRes } = await filesAPI.initUpload({
              fileName: file.name,
              fileSize: file.size,
              folderId,
              mimeType: file.type || 'application/octet-stream'
            })
            
            let lastTimestamp = Date.now()
            let lastSpeed = ''
            let uploadedBytes = 0
            let chunkIndex = 0;
            
            for (let start = 0; start < file.size; start += CHUNK_SIZE) {
              const chunk = file.slice(start, start + CHUNK_SIZE);
              
              const fd = new FormData();
              fd.append('uploadId', initRes.data.uploadId);
              fd.append('startByte', start);
              fd.append('chunkIndex', chunkIndex);
              fd.append('chunkSize', CHUNK_SIZE);
              fd.append('file', chunk);

              await filesAPI.uploadChunk(fd);
              
              uploadedBytes += chunk.size;
              chunkIndex++;

              const now = Date.now()
              const elapsedMs = now - lastTimestamp
              if (elapsedMs > 500) {
                 const bytesPerSec = chunk.size / (elapsedMs / 1000);
                 if (bytesPerSec >= 1024 * 1024) lastSpeed = `${(bytesPerSec / 1024 / 1024).toFixed(1)} MB/s`
                 else if (bytesPerSec >= 1024) lastSpeed = `${(bytesPerSec / 1024).toFixed(0)} KB/s`
                 else lastSpeed = `${(bytesPerSec).toFixed(0)} B/s`
                 
                 lastTimestamp = now;
              }
              
              const pct = Math.round((uploadedBytes / file.size) * 95); // reserve last 5% for finalizing
              updateUpload(uploadId, pct, 'uploading', lastSpeed)
            }

            updateUpload(uploadId, 99, 'saving', lastSpeed)
            await filesAPI.finalizeUpload({ uploadId: initRes.data.uploadId });

            updateUpload(uploadId, 100, 'complete', '')
            resolve()

          } catch (err) {
            updateUpload(uploadId, 0, 'error', '')
            reject(err)
          }
        })();
      }))
    )

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
        failed === 1 ? `1 file failed to upload` : `${failed} files failed to upload`
      )
    }

    setTimeout(() => {
      uploads.forEach(({ uploadId }) => removeUpload(uploadId))
    }, 3500)

  }, [folderId, addUpload, updateUpload, removeUpload, qc])

  return { upload }
}
