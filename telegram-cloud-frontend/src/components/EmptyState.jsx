import { motion } from 'framer-motion'
import { Cloud } from 'lucide-react'

export default function EmptyState({ title = 'No files yet', subtitle = 'Upload files or create folders to get started', icon: Icon = Cloud }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <div className="w-16 h-16 bg-brand-50 dark:bg-brand-900/20 rounded-2xl flex items-center justify-center mb-4">
        <Icon size={28} className="text-brand-400" />
      </div>
      <h3 className="font-semibold text-gray-700 dark:text-gray-200 mb-1">{title}</h3>
      <p className="text-sm text-gray-400 max-w-sm">{subtitle}</p>
    </motion.div>
  )
}
