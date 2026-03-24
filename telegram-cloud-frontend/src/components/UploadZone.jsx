import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, Cloud } from 'lucide-react'
import useUpload from '../hooks/useUpload'

export default function UploadZone({ folderId, children }) {
  const [dragging, setDragging] = useState(false)
  const inputRef   = useRef(null)
  const { upload } = useUpload(folderId)

  // Only treat as upload-drag if actual OS files are being dragged (not card moves)
  const isFileDrag = (e) => e.dataTransfer?.types?.includes('Files')

  const onDragOver = (e) => { e.preventDefault(); if (isFileDrag(e)) setDragging(true) }
  const onDragLeave = (e) => {
    // Only clear if leaving the whole zone
    if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false)
  }
  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    if (isFileDrag(e)) upload(e.dataTransfer.files)
  }

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className="relative"
    >
      {children}

      {/* Small corner upload hint – appears only when OS files are dragged */}
      <AnimatePresence>
        {dragging && (
          <motion.div
            key="upload-hint"
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ duration: 0.18 }}
            className="fixed bottom-20 left-6 z-40 flex items-center gap-2.5
                       bg-brand-600 text-white px-4 py-2.5 rounded-2xl shadow-xl
                       shadow-brand-500/40 pointer-events-none border border-brand-400/30"
          >
            <Cloud size={18} className="shrink-0" />
            <span className="text-sm font-semibold">Drop to upload</span>
          </motion.div>
        )}
      </AnimatePresence>

      <input ref={inputRef} type="file" multiple className="hidden"
        onChange={e => { upload(e.target.files); e.target.value = '' }} />

      {/* Floating upload button */}
      <motion.button
        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
        onClick={() => inputRef.current.click()}
        className="fixed bottom-6 right-6 z-30 flex items-center gap-2 btn-primary shadow-lg shadow-brand-500/25 px-5 py-3"
      >
        <Upload size={18} />
        <span>Upload</span>
      </motion.button>
    </div>
  )
}

