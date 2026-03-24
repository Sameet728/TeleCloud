import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Files, HardDrive, Folder, Clock, ArrowRight } from 'lucide-react'
import { dashboardAPI } from '../services/api'
import { formatBytes, formatDate } from '../utils/helpers'
import FileIcon from '../utils/fileIcons'
import { SkeletonList } from '../components/SkeletonCard'
import { useSubscription } from '../store/useSubscription'
import SubscriptionBanner from '../components/SubscriptionBanner'

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <motion.div whileHover={{ y: -2 }} className="card p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</span>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={18} />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </motion.div>
  )
}

export default function Dashboard() {
  const navigate  = useNavigate()
  const sub       = useSubscription()
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardAPI.get().then(r => r.data.data),
    staleTime: 60_000,
  })

  const stats = data?.stats

  // Hard expiry block for paid-plan users
  if (sub.isExpired) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="card max-w-md w-full p-10">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-5">
            <Clock size={28} className="text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Subscription expired</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Your subscription has expired. Renew to continue accessing your files.
            Your files are safe — they won't be deleted.
          </p>
          <button onClick={() => navigate('/pricing')} className="btn-primary w-full justify-center">
            Renew plan <ArrowRight size={14} />
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20">
      <SubscriptionBanner sub={sub} />
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Welcome back! Here's your storage overview.</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded mb-3 w-3/4" />
              <div className="h-8 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Files}    label="Total files"    value={stats?.totalFiles || 0}
            color="bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400" />
          <StatCard icon={HardDrive} label="Storage used"  
            value={formatBytes(stats?.storageUsed || 0)}
            sub={sub.isFreePlan ? 'of 10 GB limit' : 'Unlimited storage'}
            color="bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400" />
          <StatCard icon={Folder}   label="Folders"        value={data?.folderStructure?.length || 0}
            color="bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" />
          <StatCard icon={Clock}    label="Telegram"
            value={stats?.isTelegramConnected ? 'Connected' : 'Disconnected'}
            color={stats?.isTelegramConnected
              ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400'
              : 'bg-red-50 dark:bg-red-900/30 text-red-500'} />
        </div>
      )}

      {/* Recent files */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 dark:text-white">Recent files</h2>
          <button onClick={() => navigate('/files')}
            className="text-sm text-brand-600 dark:text-brand-400 hover:underline">View all</button>
        </div>
        {isLoading ? <SkeletonList count={6} /> : (
          data?.recentFiles?.length === 0 ? (
            <div className="card p-10 text-center text-gray-400 text-sm">No files yet. Upload something!</div>
          ) : (
            <div className="card overflow-hidden">
              <div className="divide-y divide-gray-50 dark:divide-gray-800">
                {data?.recentFiles?.map(file => (
                  <div key={file._id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                    onClick={() => navigate('/files')}
                  >
                    <FileIcon mimeType={file.mimeType} size={16} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{file.fileName}</p>
                      <p className="text-xs text-gray-400">{formatBytes(file.fileSize)}</p>
                    </div>
                    <p className="text-xs text-gray-400 hidden sm:block shrink-0">{formatDate(file.createdAt)}</p>
                  </div>
                ))}
              </div>
            </div>
          )
        )}
      </div>

      {/* Folder overview */}
      {data?.folderStructure?.length > 0 && (
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Top-level folders</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {data.folderStructure.map(folder => (
              <motion.button key={folder._id} whileHover={{ y: -2 }}
                onClick={() => navigate(`/folder/${folder._id}`)}
                className="card p-3 flex items-center gap-3 hover:shadow-md transition-shadow text-left"
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                     style={{ background: (folder.color || '#6366f1') + '22' }}>
                  <Folder size={16} style={{ color: folder.color || '#6366f1' }} />
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{folder.name}</span>
              </motion.button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
