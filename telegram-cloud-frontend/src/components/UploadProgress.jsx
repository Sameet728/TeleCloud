import { motion } from 'framer-motion'
import { CheckCircle, AlertCircle, Upload } from 'lucide-react'
import useStore from '../store/useStore'
import { truncate } from '../utils/helpers'

export default function UploadProgress() {
  const uploads = useStore(s => s.uploads)

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 40, scale: 0.95 }}
      className="fixed bottom-5 right-5 w-72 card shadow-xl overflow-hidden z-50"
    >
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <Upload size={14} className="text-brand-500 animate-pulse" />
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Uploading</span>
        <span className="ml-auto text-xs text-gray-400">{Object.keys(uploads).length} file(s)</span>
      </div>
      <div className="divide-y divide-gray-50 dark:divide-gray-800">
        {Object.entries(uploads).map(([id, u]) => (
          <div key={id} className="px-4 py-3">
            <div className="flex items-center gap-2 mb-1.5">
              {u.status === 'complete'
                ? <CheckCircle size={14} className="text-green-500 shrink-0" />
                : u.status === 'error'
                ? <AlertCircle size={14} className="text-red-500 shrink-0" />
                : <div className="w-3.5 h-3.5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin shrink-0" />
              }
              <span className="text-xs text-gray-600 dark:text-gray-300 truncate">{truncate(u.name, 28)}</span>
              <span className="ml-auto text-xs font-medium text-gray-500">{u.progress}%</span>
            </div>
            <div className="h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${u.status === 'error' ? 'bg-red-400' : u.status === 'complete' ? 'bg-green-400' : 'progress-bar'}`}
                animate={{ width: `${u.progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
