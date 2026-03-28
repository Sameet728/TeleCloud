import { motion } from 'framer-motion'
import { Crown, Zap, AlertTriangle, ArrowRight, Infinity } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { formatBytes } from '../utils/helpers'

/**
 * SubscriptionBanner — shows current plan, storage and upgrade prompt.
 * Accepts subscription data from the parent (no API calls here).
 */
export default function SubscriptionBanner({ sub }) {
  const navigate = useNavigate()
  if (!sub) return null

  const {
    plan, isSubscribed, storageUsed, storageLimit,
    subscriptionEnd, isExpired, nearLimit,
  } = sub

  const isFreePlan = !isSubscribed || plan === 'free'
  const used       = storageUsed  || 0
  const limit      = storageLimit || 10 * 1024 * 1024 * 1024
  const pct        = Math.min(100, Math.round((used / limit) * 100))

  if (isExpired) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="bg-red-50/80 dark:bg-red-500/10 backdrop-blur-md border border-red-200/60 dark:border-red-500/20 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-500/20 flex items-center justify-center shrink-0 shadow-inner">
            <AlertTriangle size={20} className="text-red-500" />
          </div>
          <div>
            <p className="text-sm font-bold text-red-700 dark:text-red-300 tracking-tight">Subscription Expired</p>
            <p className="text-xs font-medium text-red-600/80 dark:text-red-400/80 mt-0.5">Renew to restore upload, download and preview access.</p>
          </div>
        </div>
        <button onClick={() => navigate('/pricing')} className="btn-primary text-sm shrink-0 shadow-md">
          Renew Now <ArrowRight size={14} />
        </button>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl border border-gray-200/60 dark:border-zinc-800/80 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 shadow-sm"
    >
      {/* Plan info */}
      <div className="flex items-center gap-4">
        {isFreePlan
          ? <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-zinc-800/50 flex items-center justify-center shadow-inner"><Zap size={20} className="text-zinc-500" /></div>
          : <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30"><Crown size={20} className="text-white" /></div>
        }
        <div>
          <p className="text-sm font-bold text-gray-900 dark:text-white tracking-tight">
            {isFreePlan ? 'Free Plan' : 'Pro Plan ✦'}
          </p>
          {!isFreePlan && subscriptionEnd && (
            <p className="text-xs font-medium text-zinc-500 mt-0.5">Renews {new Date(subscriptionEnd).toLocaleDateString()}</p>
          )}
        </div>
      </div>

      {/* Storage bar */}
      <div className="flex-1 max-w-sm w-full">
        <div className="flex justify-between text-xs font-medium text-zinc-500 mb-2">
          <span>{formatBytes(used)} used</span>
          {isFreePlan ? (
            <span>{formatBytes(limit)} total</span>
          ) : (
            <span className="flex items-center gap-1 font-bold text-amber-600 dark:text-amber-500"><Infinity size={14}/> Unlimited</span>
          )}
        </div>
        <div className="h-2.5 rounded-full bg-gray-200 dark:bg-zinc-700 overflow-hidden shadow-inner">
          <div
            className={`h-full rounded-full transition-all duration-500 ${!isFreePlan ? 'bg-gradient-to-r from-amber-400 to-orange-500' : pct >= 90 ? 'bg-red-500' : pct >= 75 ? 'bg-amber-500' : 'bg-indigo-500'}`}
            style={{ width: !isFreePlan ? '100%' : `${pct}%` }}
          />
        </div>
        {isFreePlan && nearLimit && (
          <p className="text-xs font-medium text-amber-600 dark:text-amber-500 mt-2 flex items-center gap-1">
            <AlertTriangle size={12} /> Storage almost full — upgrade to continue
          </p>
        )}
      </div>

      {isFreePlan && (
        <button onClick={() => navigate('/pricing')} className="btn-primary text-sm shrink-0 shadow-md">
          Upgrade <ArrowRight size={14} />
        </button>
      )}
    </motion.div>
  )
}
