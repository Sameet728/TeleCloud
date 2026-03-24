import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { 
  User, Mail, Cloud, Shield, CreditCard, 
  Clock, Zap, Crown, ArrowRight, ExternalLink 
} from 'lucide-react'
import { authAPI, paymentsAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useSubscription } from '../store/useSubscription'
import toast from 'react-hot-toast'
import { formatDate } from '../utils/helpers'

export default function Profile() {
  const { user, setUser } = useAuth()
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
    if (!window.confirm('Are you sure you want to disconnect Telegram? You will not be able to access your files until you reconnect.')) return
    try {
      await authAPI.disconnectTelegram()
      setUser({ ...user, isTelegramConnected: false })
      toast.success('Telegram disconnected')
    } catch {
      toast.error('Failed to disconnect Telegram')
    }
  }

  const { plan, isSubscribed, subscriptionEnd } = sub

  const planLabels = {
    free: 'Free Plan',
    monthly: 'Monthly Pro',
    '6months': '6-Month Pro',
    yearly: 'Yearly Pro'
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Account & Profile</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage your details, connections, and active plans.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Account Details */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-brand-100 dark:bg-brand-900/30 rounded-xl flex items-center justify-center">
              <User size={20} className="text-brand-600 dark:text-brand-400" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">Profile Details</h2>
              <p className="text-xs text-gray-500">Your account identity</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-500 uppercase font-semibold">Email Address</label>
              <div className="flex items-center gap-2 mt-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                <Mail size={16} className="text-gray-400" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">{user?.email}</span>
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 uppercase font-semibold">Telegram Connection</label>
              
              {user?.isTelegramConnected ? (
                <div className="mt-1 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <Shield size={16} className="text-green-600 dark:text-green-500" />
                    <span className="text-sm font-medium text-green-700 dark:text-green-400">Connected & Active</span>
                  </div>
                  <button onClick={handleDisconnect} className="text-xs font-semibold text-red-600 hover:text-red-700 self-start">
                    Disconnect Telegram
                  </button>
                </div>
              ) : (
                <div className="mt-1 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex flex-col gap-3">
                  <div className="flex items-start gap-2">
                    <Clock size={16} className="text-red-600 dark:text-red-500 mt-0.5 shrink-0" />
                    <span className="text-sm font-medium text-red-700 dark:text-red-400">
                      Disconnected or session revoked. Reconnect to access files.
                    </span>
                  </div>
                  <button onClick={() => navigate('/connect-telegram')} className="btn-primary text-sm self-start py-1.5 px-4">
                    Reconnect Telegram <ArrowRight size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Plan Details */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
              <Crown size={20} className="text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">Subscription Plan</h2>
              <p className="text-xs text-gray-500">Manage your storage limits</p>
            </div>
          </div>

          <div className="space-y-5">
            <div className="flex items-end gap-3">
              <div className={`p-3 rounded-xl border ${plan === 'free' ? 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700 text-gray-600 dark:text-gray-300' : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-transparent'}`}>
                {plan === 'free' ? <Zap size={24} /> : <Crown size={24} />}
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{planLabels[plan || 'free']}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {plan === 'free' ? '10 GB limit' : 'Unlimited Storage'}
                </p>
              </div>
            </div>

            {plan !== 'free' && subscriptionEnd && (
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm border border-gray-100 dark:border-gray-700">
                <span className="text-gray-500">Plan expires on: </span>
                <span className="font-semibold text-gray-900 dark:text-white">{formatDate(subscriptionEnd)}</span>
              </div>
            )}

            <button onClick={() => navigate('/pricing')} className="btn-primary w-full justify-center">
              {plan === 'free' ? 'Upgrade Plan' : 'View Pricing Plans'}
            </button>
          </div>
        </motion.div>
      </div>

      {/* Transaction History */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
            <CreditCard size={20} className="text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">Transaction History</h2>
            <p className="text-xs text-gray-500">Your past payments and invoices</p>
          </div>
        </div>

        {loadingHistory ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-10 bg-gray-100 dark:bg-gray-800 rounded mb-2" />
            <div className="h-10 bg-gray-100 dark:bg-gray-800 rounded mb-2" />
          </div>
        ) : history.length === 0 ? (
          <div className="text-center p-6 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700/50">
            <p className="text-sm text-gray-500">No payment history found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th className="px-4 py-3 font-semibold rounded-l-lg">Date</th>
                  <th className="px-4 py-3 font-semibold">Plan</th>
                  <th className="px-4 py-3 font-semibold">Amount</th>
                  <th className="px-4 py-3 font-semibold">Order ID</th>
                  <th className="px-4 py-3 font-semibold rounded-r-lg text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map(item => (
                  <tr key={item._id} className="border-b border-gray-50 dark:border-gray-800/50 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{formatDate(item.createdAt)}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{planLabels[item.plan]}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">₹{(item.amount / 100).toFixed(2)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{item.orderId}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${
                        item.status === 'paid' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        item.status === 'failed' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                        'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                      }`}>
                        {item.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  )
}
