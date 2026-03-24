import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Zap, Crown, Sparkles, ArrowRight, Shield } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { paymentsAPI } from '../services/api'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'

const PLANS = [
  {
    id:       'free',
    name:     'Free',
    price:    0,
    period:   'forever',
    storage:  '10 GB',
    icon:     Shield,
    color:    'from-gray-500 to-gray-600',
    badge:    null,
    features: ['10 GB storage', 'File upload & sharing', 'Folder management', 'Secure JWT auth'],
  },
  {
    id:       'monthly',
    name:     'Monthly',
    price:    49,
    period:   'month',
    storage:  'Unlimited',
    icon:     Zap,
    color:    'from-blue-500 to-indigo-600',
    badge:    null,
    features: ['Unlimited storage', 'All features', 'File & folder sharing', 'Priority support'],
  },
  {
    id:       '6months',
    name:     '6 Months',
    price:    249,
    period:   '6 months',
    storage:  'Unlimited',
    icon:     Sparkles,
    color:    'from-violet-500 to-purple-600',
    badge:    'Best Value',
    features: ['Unlimited storage', 'All features', 'Save ₹45 vs monthly', 'Priority support'],
  },
  {
    id:       'yearly',
    name:     'Yearly',
    price:    499,
    period:   'year',
    storage:  'Unlimited',
    icon:     Crown,
    color:    'from-amber-500 to-orange-600',
    badge:    null,
    features: ['Unlimited storage', 'All features', 'Save ₹89 vs monthly', 'VIP support'],
  },
]

export default function Pricing() {
  const navigate  = useNavigate()
  const { user, setUser }  = useAuth()
  const [loading, setLoading] = useState(null)
  // null | 'processing' | 'success' | 'failed'
  const [paymentState, setPaymentState] = useState(null)

  // Poll /api/payments/status/:orderId until 'paid' or 'failed' or timeout
  const pollStatus = async (orderId) => {
    setPaymentState('processing')
    const MAX_ATTEMPTS = 15   // 15 × 2s = 30s
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      await new Promise(r => setTimeout(r, 2000))
      try {
        const { data } = await paymentsAPI.getStatus(orderId)
        const status = data?.data?.status
        if (status === 'paid') {
          setPaymentState('success')
          toast.success('🎉 Subscription activated! Enjoy unlimited storage.')
          // Refresh subscription from backend
          setTimeout(() => navigate('/dashboard'), 1500)
          return
        }
        if (status === 'failed') {
          setPaymentState('failed')
          toast.error('Payment was declined. Please try again.')
          return
        }
      } catch { /* ignore poll errors */ }
    }
    // Timeout — webhook may be delayed server-side
    setPaymentState('success')
    toast.success('Payment received! Your subscription will activate shortly.')
    setTimeout(() => navigate('/dashboard'), 2000)
  }

  const handleUpgrade = async (plan) => {
    if (plan.id === 'free') return navigate('/files')
    if (!user) return navigate('/login')

    setLoading(plan.id)
    try {
      const { data } = await paymentsAPI.createOrder(plan.id)
      const { orderId, amount, keyId, planLabel } = data.data

      const options = {
        key:         keyId,
        amount,
        currency:    'INR',
        name:        'TeleCloud',
        description: planLabel,
        order_id:    orderId,
        handler: async (response) => {
          try {
            // Step 1: Client-side HMAC verify (still validates the signature)
            await paymentsAPI.verify({
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
            })
          } catch { /* webhook will handle activation even if this fails */ }
          // Step 2: Poll backend for webhook-confirmed status
          pollStatus(response.razorpay_order_id)
        },
        prefill: { email: user?.email || '' },
        theme:   { color: '#6366f1' },
        modal: {
          ondismiss: () => setLoading(null),
        },
      }

      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', (resp) => {
        toast.error(resp?.error?.description || 'Payment failed. Please try again.')
        setLoading(null)
      })
      rzp.open()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to create order')
    } finally {
      setLoading(null)
    }
  }

  // ── Processing overlay
  if (paymentState === 'processing') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-gray-50 dark:bg-gray-950">
        <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">Confirming your payment…</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm">We're waiting for Razorpay to confirm your payment. This usually takes a few seconds.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      {/* Hero */}
      <div className="relative overflow-hidden pt-16 pb-12 px-4 text-center">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-pink-500/5" />
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <span className="inline-block bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-4">
            Simple Pricing
          </span>
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white mb-4">
            Store unlimited files<br />
            <span className="bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">for just ₹49/month</span>
          </h1>
          <p className="text-lg text-gray-500 dark:text-gray-400 max-w-lg mx-auto">
            Your files live on Telegram's infrastructure — ultra-reliable and unlimited. Pay only for the service layer.
          </p>
        </motion.div>
      </div>

      {/* Plan cards */}
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {PLANS.map((plan, i) => {
            const Icon = plan.icon
            const isCurrent = user?.plan === plan.id
            const isBest = plan.badge === 'Best Value'

            return (
              <motion.div
                key={plan.id}
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: i * 0.08 }}
                className={`relative card p-6 flex flex-col gap-5 transition-all duration-200
                  ${isBest ? 'ring-2 ring-indigo-500 shadow-xl shadow-indigo-500/20 scale-[1.02]' : 'hover:shadow-lg hover:-translate-y-0.5'}`}
              >
                {plan.badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
                    {plan.badge}
                  </span>
                )}

                {/* Icon */}
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${plan.color} flex items-center justify-center shadow-lg`}>
                  <Icon size={22} className="text-white" />
                </div>

                {/* Plan name & price */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">{plan.name}</h3>
                  <div className="flex items-end gap-1 mt-1">
                    <span className="text-3xl font-black text-gray-900 dark:text-white">
                      {plan.price === 0 ? 'Free' : `₹${plan.price}`}
                    </span>
                    {plan.price > 0 && (
                      <span className="text-sm text-gray-400 mb-1">/{plan.period}</span>
                    )}
                  </div>
                  <p className="text-sm text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5">
                    {plan.storage} storage
                  </p>
                </div>

                {/* Features */}
                <ul className="space-y-2 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <Check size={14} className="text-emerald-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <button
                  onClick={() => handleUpgrade(plan)}
                  disabled={loading === plan.id || isCurrent}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all
                    ${isCurrent
                      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 cursor-default'
                      : isBest
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:opacity-90 shadow-md'
                        : 'btn-primary'
                    }`}
                >
                  {loading === plan.id
                    ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : isCurrent
                      ? '✓ Current Plan'
                      : plan.id === 'free'
                        ? 'Get Started'
                        : <>Upgrade <ArrowRight size={14} /></>
                  }
                </button>
              </motion.div>
            )
          })}
        </div>

        {/* FAQ note */}
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          className="text-center text-sm text-gray-400 dark:text-gray-500 mt-10">
          Payments secured by Razorpay. Subscriptions auto-downgrade to Free at expiry — your files are never deleted.
        </motion.p>
      </div>
    </div>
  )
}
