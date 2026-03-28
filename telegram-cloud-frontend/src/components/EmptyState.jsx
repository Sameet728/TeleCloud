import { motion } from 'framer-motion'
import { Cloud } from 'lucide-react'

export default function EmptyState({ title = 'No files yet', subtitle = 'Upload files or create folders to get started', icon: Icon = Cloud }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="app-panel-muted flex flex-col items-center justify-center px-6 py-20 text-center"
    >
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-[2rem] border border-indigo-100 bg-gradient-to-br from-indigo-50 to-purple-50 shadow-inner dark:border-indigo-500/20 dark:from-indigo-500/10 dark:to-purple-500/10">
        <Icon size={32} className="text-indigo-500 dark:text-indigo-400" />
      </div>
      <h3 className="text-lg font-bold text-gray-900 dark:text-zinc-100 mb-2 tracking-tight">{title}</h3>
      <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 max-w-sm leading-relaxed">{subtitle}</p>
    </motion.div>
  )
}
