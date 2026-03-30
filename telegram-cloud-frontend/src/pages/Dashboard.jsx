import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { 
  Files, HardDrive, Folder, ArrowRight, 
  ExternalLink, Zap, ShieldCheck, AlertCircle, Plus, BarChart3, Wallet
} from 'lucide-react'
import { dashboardAPI } from '../services/api'
import { formatBytes, formatCurrency, formatDate } from '../utils/helpers'
import FileIcon from '../utils/fileIcons'
import { SkeletonList } from '../components/SkeletonCard'
import { useSubscription } from '../store/useSubscription'
import SubscriptionBanner from '../components/SubscriptionBanner'
import AdBanner, { useAdGuard } from '../components/AdBanner'

// Tighter Animation Variants for zoomed-out feel
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.03 } }
}

const itemVariants = {
  hidden: { y: 10, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 400, damping: 30 } }
}

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <motion.div 
      variants={itemVariants}
      whileHover={{ y: -4 }}
      className="app-panel-muted group p-3.5 sm:p-4 transition-all duration-200"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className={`rounded-2xl p-3 ${color.bg} ${color.text} bg-opacity-10 shadow-inner`}>
          <Icon size={16} strokeWidth={2.5} />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-gray-400 dark:text-zinc-500">{label}</span>
      </div>
      <div>
        <h3 className="text-[1.5rem] font-bold tracking-tight text-gray-900 dark:text-white">{value}</h3>
        {sub && <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-gray-400">
          <Zap size={10} className="text-amber-500" /> {sub}
        </p>}
      </div>
      <div className={`absolute -right-4 -bottom-4 h-24 w-24 rounded-full blur-3xl opacity-0 transition-opacity group-hover:opacity-15 ${color.bg}`} />
    </motion.div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const sub = useSubscription()
  const canShowAds = useAdGuard()
  
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardAPI.get().then(r => r.data.data),
    staleTime: 60_000,
  })

  const stats = data?.stats
  // Ensure we safely handle undefined or null folder structures
  const folders = data?.folderStructure || []

  if (sub.isExpired) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full bg-white dark:bg-zinc-900 border border-red-100 dark:border-red-900/30 p-6 rounded-2xl text-center shadow-xl"
        >
          <div className="w-16 h-16 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} className="text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Access Locked</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed mb-6">
            Your premium plan has expired. Your vault is secure, but you need to renew to restore access.
          </p>
          <button 
            onClick={() => navigate('/pricing')} 
            className="w-full py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-all active:scale-95"
          >
            Renew Subscription <ArrowRight size={16} />
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="app-page pt-1"
    >
      <motion.section variants={itemVariants} className="app-hero">
        <div className="grid gap-4 lg:grid-cols-[1.2fr_auto] lg:items-end">
          <div>
            <p className="app-kicker">Command Center</p>
            <motion.h1 variants={itemVariants} className="mt-2 text-[2rem] font-display font-bold tracking-tight text-gray-900 dark:text-white sm:text-[2.3rem]">
            Overview
            </motion.h1>
            <motion.p variants={itemVariants} className="app-subtitle">
              Monitor your storage network, recent file activity, and the health of your Telegram-powered vault.
            </motion.p>
          </div>
          <motion.div variants={itemVariants} className="shrink-0">
            <SubscriptionBanner sub={sub} />
          </motion.div>
        </div>
      </motion.section>

      {/* Stats Grid - Denser layout */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-[2rem] bg-zinc-100/80 dark:bg-zinc-800/50 animate-pulse" />
          ))
        ) : (
          <>
            <StatCard 
              icon={Files} label="Assets" value={stats?.totalFiles || 0}
              color={{ bg: 'bg-blue-500', text: 'text-blue-500' }} 
            />
            <StatCard 
              icon={HardDrive} label="Volume" value={formatBytes(stats?.storageUsed || 0)}
              sub={sub.isFreePlan ? '10 GB Free Limit' : 'Unmetered'}
              color={{ bg: 'bg-indigo-500', text: 'text-indigo-500' }} 
            />
            <StatCard 
              icon={Folder} label="Directories" value={folders.length}
              color={{ bg: 'bg-emerald-500', text: 'text-emerald-500' }} 
            />
            <StatCard 
              icon={ShieldCheck} label="Telegram Node" 
              value={stats?.isTelegramConnected ? 'Active' : 'Offline'}
              color={stats?.isTelegramConnected 
                ? { bg: 'bg-cyan-500', text: 'text-cyan-500' } 
                : { bg: 'bg-rose-500', text: 'text-rose-500' }} 
            />
          </>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        
        <motion.div variants={itemVariants} className="lg:col-span-3">
          <div className="app-panel overflow-hidden">
            <div className="grid gap-4 px-5 py-5 lg:grid-cols-[1.25fr_0.85fr] lg:items-center">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-500">Creator Monetization</p>
                <h2 className="mt-2 text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                  Estimated earnings now live in your workspace
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                  Track impressions, estimated earnings, wallet balance, and pending withdrawals from the new creator analytics suite.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                <div className="rounded-[1.4rem] border border-indigo-100 bg-indigo-50/80 p-4 dark:border-indigo-500/20 dark:bg-indigo-500/10">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-white/80 p-2.5 text-indigo-600 shadow-sm dark:bg-white/10 dark:text-indigo-300">
                      <BarChart3 size={16} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">Total Earned</p>
                      <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(stats?.totalEarned)}</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-[1.4rem] border border-emerald-100 bg-emerald-50/80 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-white/80 p-2.5 text-emerald-600 shadow-sm dark:bg-white/10 dark:text-emerald-300">
                      <Wallet size={16} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">Wallet Balance</p>
                      <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(stats?.walletBalance)}</p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/dashboard/analytics')}
                  className="group flex items-center justify-between rounded-[1.4rem] border border-gray-200 bg-white p-4 text-left transition-all hover:border-indigo-300 hover:bg-indigo-50/60 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-indigo-500/40 dark:hover:bg-zinc-900"
                >
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">Open Analytics</p>
                    <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">See file-level performance</p>
                  </div>
                  <ArrowRight size={16} className="text-zinc-400 transition-transform group-hover:translate-x-1 group-hover:text-indigo-500" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
        
        {/* Recent Files Table - Spans 2 columns on large screens */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="app-section-title">Activity Log</h2>
            <button 
              onClick={() => navigate('/files')}
              className="group flex items-center gap-1 text-xs font-semibold text-zinc-500 transition-colors hover:text-indigo-500"
            >
              Open Explorer <ExternalLink size={12} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </button>
          </div>

          <motion.div variants={itemVariants} className="app-panel overflow-hidden">
            {isLoading ? <SkeletonList count={5} /> : (
              (!data?.recentFiles || data.recentFiles.length === 0) ? (
                <div className="py-12 text-center flex flex-col items-center">
                  <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-3">
                     <Files size={20} className="text-zinc-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-zinc-200">No recent activity</p>
                  <p className="text-xs text-zinc-500 mt-1">Upload files or media to see them here.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-zinc-800/50">
                  {data.recentFiles.map((file) => (
                    <div key={file._id} 
                      className="group flex items-center gap-3 px-5 py-3 hover:bg-indigo-50/60 dark:hover:bg-white/[0.03] transition-colors cursor-pointer"
                      onClick={() => navigate('/files')}
                    >
                      <div className="rounded-xl bg-gray-100 p-2 dark:bg-zinc-800 text-zinc-500">
                        <FileIcon mimeType={file.mimeType} size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-zinc-200 truncate">{file.fileName}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[9px] px-1 py-0.5 bg-gray-100 dark:bg-zinc-800 rounded text-zinc-500 font-bold uppercase tracking-tighter">
                            {file.mimeType.split('/')[1] || 'FILE'}
                          </span>
                          <span className="text-[11px] text-zinc-400 font-medium">{formatBytes(file.fileSize)}</span>
                        </div>
                      </div>
                      <p className="text-[11px] font-medium text-zinc-400 whitespace-nowrap hidden sm:block">
                        {formatDate(file.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              )
            )}
          </motion.div>
        </div>

        {/* Directory Structure (Quick Access) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="app-section-title">Quick Access</h2>
            <button 
              onClick={() => navigate('/files')}
              className="text-zinc-400 hover:text-indigo-500 transition-colors"
            >
              <Plus size={16} />
            </button>
          </div>

          <motion.div variants={itemVariants} className="grid grid-cols-1 gap-2">
            {isLoading ? (
               Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 rounded-[1.7rem] bg-zinc-100 dark:bg-zinc-800/50 animate-pulse" />
              ))
            ) : folders.length === 0 ? (
              // FIX: Empty state for folders so it doesn't look broken
              <div className="app-panel-muted border border-dashed border-gray-200/80 p-6 text-center flex flex-col items-center dark:border-zinc-800">
                <Folder size={20} className="text-zinc-400 mb-2" />
                <p className="text-sm font-medium text-gray-900 dark:text-zinc-300">Workspace Empty</p>
                <p className="text-xs text-zinc-500 mt-1">Create directories to organize your media.</p>
              </div>
            ) : (
              folders.map(folder => (
                <button 
                  key={folder._id}
                  onClick={() => navigate(`/folder/${folder._id}`)}
                  className="app-panel-muted flex items-center gap-3 p-3.5 text-left group hover:border-indigo-500/40"
                >
                  <div 
                    className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform"
                    style={{ background: `${folder.color || '#6366f1'}15` }}
                  >
                    <Folder size={16} style={{ color: folder.color || '#6366f1' }} fill={`${folder.color || '#6366f1'}40`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-zinc-200 truncate">{folder.name}</p>
                    <p className="text-[10px] text-zinc-500 font-medium">Directory</p>
                  </div>
                </button>
              ))
            )}
          </motion.div>
        </div>
      </div>

      {canShowAds && (
        <motion.div variants={itemVariants} className="pt-4">
          <div className="app-panel-muted p-3 flex justify-center overflow-hidden">
            <AdBanner formatId="2018497" />
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
