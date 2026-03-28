import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { 
  User, Mail, ShieldCheck, CreditCard, 
  Zap, Crown, ArrowLeft,
  LogOut, AlertCircle, Send
} from 'lucide-react'
import { authAPI, paymentsAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useSubscription } from '../store/useSubscription'
import toast from 'react-hot-toast'
import { formatDate } from '../utils/helpers'

// Softer, more elegant background pattern
const CanvasBackground = () => (
  <div 
    className="fixed inset-0 z-0 opacity-[0.02] dark:opacity-[0.03] pointer-events-none"
    style={{
      backgroundImage: `radial-gradient(currentColor 1px, transparent 1px)`,
      backgroundSize: '32px 32px'
    }}
  />
)

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
}

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 30 } }
}

export default function Profile() {
  const { user, setUser, logout } = useAuth()
  const sub = useSubscription()
  const navigate = useNavigate()
  
  const [history, setHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(true)

  useEffect(() => {
    paymentsAPI.getHistory()
      .then(res => {
        setHistory(res.data.data || [])
        setLoadingHistory(false)
      })
      .catch(() => setLoadingHistory(false))
  }, [])

  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect Telegram? You won\'t be able to access your files until you reconnect.')) return
    try {
      await authAPI.disconnectTelegram()
      setUser({ ...user, isTelegramConnected: false })
      toast.success('Telegram disconnected')
    } catch {
      toast.error('Failed to disconnect Telegram')
    }
  }

  const { plan, subscriptionEnd } = sub

  const planLabels = {
    free: 'Free Plan',
    monthly: 'Pro Monthly',
    '6months': 'Pro 6-Months',
    yearly: 'Pro Yearly'
  }

  return (
    <div className="min-h-screen relative bg-gray-50/50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 pb-24 overflow-x-hidden">
      <CanvasBackground />
      
      {/* Ambient background glows for a modern feel */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none -translate-y-1/2" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-500/5 dark:bg-purple-500/10 rounded-full blur-[120px] pointer-events-none translate-y-1/3" />

      {/* Clean, standalone header */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-xl border-b border-gray-200/50 dark:border-zinc-800/50">
        <button 
          onClick={() => navigate('/files')}
          className="flex items-center gap-2 text-sm font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors group"
        >
          <div className="p-1.5 rounded-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-sm group-hover:scale-105 transition-transform">
            <ArrowLeft size={16} />
          </div>
          Back to Files
        </button>
        <button 
          onClick={() => logout()}
          className="flex items-center gap-2 text-sm font-bold text-zinc-500 hover:text-red-500 transition-colors bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 px-4 py-2 rounded-full shadow-sm"
        >
          Sign Out <LogOut size={14} />
        </button>
      </header>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 max-w-4xl mx-auto pt-10 px-4 space-y-8"
      >
        <motion.div variants={itemVariants} className="text-center sm:text-left mb-4">
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">Account & Settings</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 font-medium">Manage your Telegram connection, storage plan, and billing.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Account Card */}
          <motion.div variants={itemVariants} className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-xl border border-gray-200/60 dark:border-white/5 rounded-[2rem] p-8 shadow-xl shadow-gray-200/20 dark:shadow-none">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-500/10 rounded-2xl flex items-center justify-center border border-blue-100 dark:border-blue-500/20 text-blue-500 shrink-0">
                <User size={24} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Profile</h2>
                <p className="text-xs font-medium text-zinc-500">Your login details</p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-2 pl-1">Email Address</label>
                <div className="flex items-center gap-3 px-4 py-3 bg-gray-50/50 dark:bg-zinc-950/50 rounded-2xl border border-gray-200/50 dark:border-zinc-800/80">
                  <Mail size={18} className="text-zinc-400" />
                  <span className="text-sm font-semibold text-gray-900 dark:text-zinc-200 truncate">{user?.email}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-2 pl-1">Telegram Connection</label>
                {user?.isTelegramConnected ? (
                  <div className="p-4 bg-emerald-50/50 dark:bg-emerald-500/5 border border-emerald-200/50 dark:border-emerald-500/10 rounded-2xl flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 rounded-full">
                        <ShieldCheck size={18} className="text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Telegram is Connected</span>
                    </div>
                    <button onClick={handleDisconnect} className="text-xs font-bold text-red-500 hover:text-red-600 transition-colors self-start px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10">
                      Disconnect Account
                    </button>
                  </div>
                ) : (
                  <div className="p-4 bg-amber-50/50 dark:bg-amber-500/5 border border-amber-200/50 dark:border-amber-500/10 rounded-2xl flex flex-col gap-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle size={20} className="text-amber-500 shrink-0 mt-0.5" />
                      <span className="text-sm font-medium text-amber-700 dark:text-amber-400 leading-relaxed">
                        Telegram is disconnected. You need to connect it to upload or download files.
                      </span>
                    </div>
                    <button onClick={() => navigate('/connect-telegram')} className="flex items-center justify-center gap-2 w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl transition-colors shadow-sm">
                      <Send size={16} /> Connect Telegram Now
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Subscription Card */}
          <motion.div variants={itemVariants} className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-xl border border-gray-200/60 dark:border-white/5 rounded-[2rem] p-8 shadow-xl shadow-gray-200/20 dark:shadow-none flex flex-col relative overflow-hidden">
            {/* Subtle gradient behind the crown icon for Pro users */}
            {plan !== 'free' && (
              <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/10 rounded-full blur-[50px] pointer-events-none" />
            )}

            <div className="flex items-center gap-4 mb-8 relative z-10">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shrink-0 ${plan === 'free' ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-500' : 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-100 dark:border-indigo-500/20 text-indigo-500'}`}>
                {plan === 'free' ? <Zap size={24} /> : <Crown size={24} />}
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Storage Plan</h2>
                <p className="text-xs font-medium text-zinc-500">Current limits and billing</p>
              </div>
            </div>

            <div className="space-y-6 flex-1 flex flex-col relative z-10">
              <div className="flex flex-col gap-1">
                <p className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                  {planLabels[plan || 'free']}
                </p>
                <p className="text-sm font-semibold text-zinc-500">
                  {plan === 'free' ? '10 GB of total storage' : 'Unlimited storage space'}
                </p>
              </div>

              {plan !== 'free' && subscriptionEnd && (
                <div className="px-4 py-3 bg-gray-50/50 dark:bg-zinc-950/50 rounded-2xl border border-gray-200/50 dark:border-zinc-800/80 flex justify-between items-center">
                  <span className="text-xs font-semibold text-zinc-500">Next billing date</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">{formatDate(subscriptionEnd)}</span>
                </div>
              )}

              <div className="mt-auto pt-4">
                <button 
                  onClick={() => navigate('/pricing')} 
                  className={`w-full py-3.5 text-sm font-bold rounded-xl transition-all shadow-sm active:scale-[0.98] ${
                    plan === 'free' 
                      ? 'bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-zinc-900' 
                      : 'bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-zinc-900 dark:text-white hover:bg-gray-50 dark:hover:bg-zinc-700'
                  }`}
                >
                  {plan === 'free' ? 'Upgrade to Pro' : 'Change Plan'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Payment History */}
        <motion.div variants={itemVariants} className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-xl border border-gray-200/60 dark:border-white/5 rounded-[2rem] p-8 shadow-xl shadow-gray-200/20 dark:shadow-none">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-purple-50 dark:bg-purple-500/10 rounded-2xl flex items-center justify-center border border-purple-100 dark:border-purple-500/20 text-purple-500 shrink-0">
              <CreditCard size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Payment History</h2>
              <p className="text-xs font-medium text-zinc-500">Past invoices and charges</p>
            </div>
          </div>

          {loadingHistory ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-12 bg-gray-100 dark:bg-zinc-800/50 rounded-2xl" />
              <div className="h-12 bg-gray-100 dark:bg-zinc-800/50 rounded-2xl" />
            </div>
          ) : history.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-gray-200 dark:border-zinc-800/80 rounded-3xl bg-gray-50/50 dark:bg-zinc-950/30">
              <p className="text-sm font-semibold text-zinc-500">You haven't made any payments yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-8 px-8 sm:mx-0 sm:px-0">
              <table className="w-full text-left whitespace-nowrap">
                <thead>
                  <tr className="text-xs font-semibold text-zinc-400 border-b border-gray-100 dark:border-zinc-800">
                    <th className="pb-4 pl-2 font-medium">Date</th>
                    <th className="pb-4 font-medium">Plan</th>
                    <th className="pb-4 font-medium">Amount</th>
                    <th className="pb-4 font-medium">Order ID</th>
                    <th className="pb-4 pr-2 font-medium text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-zinc-800/50">
                  {history.map(item => (
                    <tr key={item._id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                      <td className="py-4 pl-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">{formatDate(item.createdAt)}</td>
                      <td className="py-4 text-sm font-bold text-gray-900 dark:text-zinc-100">{planLabels[item.plan]}</td>
                      <td className="py-4 text-sm font-medium text-zinc-600 dark:text-zinc-400">₹{(item.amount / 100).toFixed(2)}</td>
                      <td className="py-4 text-xs font-mono text-zinc-400">{item.orderId}</td>
                      <td className="py-4 pr-2 text-right">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                          item.status === 'paid' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20' :
                          item.status === 'failed' ? 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 border border-red-100 dark:border-red-500/20' :
                          'bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400 border border-gray-200 dark:border-zinc-700'
                        }`}>
                          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  )
}