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
        className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
      >
        <div className="flex items-center gap-3">
          <AlertTriangle size={20} className="text-red-500 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">Subscription expired</p>
            <p className="text-xs text-red-500 dark:text-red-400">Renew to continue uploading, downloading and previewing files.</p>
          </div>
        </div>
        <button onClick={() => navigate('/pricing')} className="btn-primary text-sm shrink-0">
          Renew now <ArrowRight size={14} />
        </button>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
      className="card p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
    >
      {/* Plan info */}
      <div className="flex items-center gap-3">
        {isFreePlan
          ? <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center"><Zap size={16} className="text-gray-500" /></div>
          : <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow"><Crown size={16} className="text-white" /></div>
        }
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            {isFreePlan ? 'Free Plan' : 'Pro Plan ✦'}
          </p>
          {!isFreePlan && subscriptionEnd && (
            <p className="text-xs text-gray-400">Renews {new Date(subscriptionEnd).toLocaleDateString()}</p>
          )}
        </div>
      </div>

      {/* Storage bar */}
      <div className="flex-1 max-w-xs w-full">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>{formatBytes(used)} used</span>
          {isFreePlan ? (
            <span>{formatBytes(limit)} total</span>
          ) : (
            <span className="flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-500"><Infinity size={14}/> Unlimited</span>
          )}
        </div>
        <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${!isFreePlan ? 'bg-gradient-to-r from-amber-400 to-orange-500' : pct >= 90 ? 'bg-red-500' : pct >= 75 ? 'bg-amber-500' : 'bg-indigo-500'}`}
            style={{ width: !isFreePlan ? '100%' : `${pct}%` }}
          />
        </div>
        {isFreePlan && nearLimit && (
          <p className="text-xs text-amber-500 mt-1">⚠ Storage almost full — upgrade to continue uploading</p>
        )}
      </div>

      {isFreePlan && (
        <button onClick={() => navigate('/pricing')} className="btn-primary text-sm shrink-0">
          Upgrade <ArrowRight size={14} />
        </button>
      )}
    </motion.div>
  )
}
