import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Check, Zap, Crown, Sparkles, ArrowLeft, Shield, 
  Music, Speaker, ShieldCheck, Star, 
  MessageCircle, ChevronDown, Mail
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { paymentsAPI } from '../services/api'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import UI_LAYERS from '../constants/uiLayers'

// Premium background pattern
const CanvasBackground = () => (
  <div 
    className="fixed inset-0 z-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
    style={{
      backgroundImage: `radial-gradient(currentColor 1px, transparent 1px)`,
      backgroundSize: '32px 32px'
    }}
  />
)

const PLANS = [
  {
    id:       'free',
    name:     'Starter',
    price:    0,
    period:   'forever',
    storage:  '10 GB Quota',
    icon:     Shield,
    style:    { 
      bg: 'bg-zinc-100 dark:bg-zinc-800/50', 
      text: 'text-zinc-600 dark:text-zinc-400',
      border: 'border-zinc-200 dark:border-zinc-700/50'
    },
    badge:    null,
    features: [
      '10 GB Cloud Storage', 
      'Standard Link Sharing', 
      '2 hrs/mo Music Streaming', 
      'Ad-Supported Platform'
    ],
  },
  {
    id:       'monthly',
    name:     'Pro Monthly',
    price:    49,
    period:   'month',
    storage:  'Unlimited',
    icon:     Zap,
    style:    { 
      bg: 'bg-blue-50 dark:bg-blue-500/10', 
      text: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-100 dark:border-blue-500/20'
    },
    badge:    null,
    features: [
      'Unlimited Cloud Storage', 
      'Advanced Folder Controls', 
      'Unlimited Music Streaming', 
      'Zero Advertisements',
      'Fast Upload Speeds'
    ],
  },
  {
    id:       '6months',
    name:     'Pro 6-Months',
    price:    249,
    period:   '6 months',
    storage:  'Unlimited',
    icon:     Sparkles,
    style:    { 
      bg: 'bg-indigo-50 dark:bg-indigo-500/10', 
      text: 'text-indigo-600 dark:text-indigo-400',
      border: 'border-indigo-100 dark:border-indigo-500/20'
    },
    badge:    'Recommended',
    features: [
      'Unlimited Cloud Storage', 
      'Advanced Folder Controls', 
      'Unlimited Music Streaming', 
      'Zero Advertisements',
      'Save ₹45 vs Monthly'
    ],
  },
  {
    id:       'yearly',
    name:     'Pro Yearly',
    price:    499,
    period:   'year',
    storage:  'Unlimited',
    icon:     Crown,
    style:    { 
      bg: 'bg-amber-50 dark:bg-amber-500/10', 
      text: 'text-amber-600 dark:text-amber-400',
      border: 'border-amber-100 dark:border-amber-500/20'
    },
    badge:    'Best Value',
    features: [
      'Unlimited Cloud Storage', 
      'Advanced Folder Controls', 
      'Unlimited Music Streaming', 
      'Zero Advertisements',
      'Save ₹89 vs Monthly',
      'VIP Support'
    ],
  },
]

const TESTIMONIALS = [
  {
    name: "Rahul M.",
    role: "Content Creator",
    text: "Finally, a cloud drive where I don't have to worry about running out of space. I back up all my heavy video files here directly through Telegram."
  },
  {
    name: "Priya S.",
    role: "Student",
    text: "The unlimited music streaming feature is completely ad-free on the Pro plan. It's so much faster and cleaner than other apps I've tried."
  },
  {
    name: "Aditya V.",
    role: "Freelancer",
    text: "Sharing files with clients is super easy. The Free plan is very generous, but upgrading to Pro for unlimited storage at just ₹49 is a no-brainer."
  }
]

const FAQS = [
  {
    q: "How does unlimited storage work?",
    a: "We safely connect your Telecloud account to Telegram. Since Telegram offers unlimited storage, we use it as your personal hard drive to store all your files securely."
  },
  {
    q: "What happens if my Pro plan expires?",
    a: "You will automatically be downgraded to the Free plan. Don't worry, your files are completely safe and will never be deleted. You just won't be able to upload new files if you are over the 10 GB limit."
  },
  {
    q: "Is my data safe and private?",
    a: "Absolutely. We only act as a bridge. Your files are sent securely and stored directly in your personal Telegram account. We cannot read your personal files."
  },
  {
    q: "Can I cancel my subscription anytime?",
    a: "Yes. You can easily change or stop your plan at any time from your Account Settings page with a single click."
  }
]

// Expandable FAQ Item Component
const FAQItem = ({ faq, isOpen, onClick }) => (
  <div className="bg-white/60 dark:bg-zinc-900/40 backdrop-blur-md border border-gray-200/50 dark:border-zinc-800/80 rounded-2xl overflow-hidden transition-all">
    <button 
      onClick={onClick}
      className="w-full flex items-center justify-between p-5 text-left focus:outline-none"
    >
      <span className="text-sm font-bold text-gray-900 dark:text-zinc-100">{faq.q}</span>
      <ChevronDown size={18} className={`text-zinc-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-indigo-500' : ''}`} />
    </button>
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden"
        >
          <p className="px-5 pb-5 text-sm font-medium text-zinc-500 dark:text-zinc-400 leading-relaxed">
            {faq.a}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
)

export default function Pricing() {
  const navigate  = useNavigate()
  const { user }  = useAuth()
  const [loading, setLoading] = useState(null)
  const [paymentState, setPaymentState] = useState(null)
  const [openFaq, setOpenFaq] = useState(0)

  const pollStatus = async (orderId) => {
    setPaymentState('processing')
    const MAX_ATTEMPTS = 15
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      await new Promise(r => setTimeout(r, 2000))
      try {
        const { data } = await paymentsAPI.getStatus(orderId)
        const status = data?.data?.status
        if (status === 'paid') {
          setPaymentState('success')
          toast.success('Plan upgraded successfully!', { icon: '🚀' })
          setTimeout(() => navigate('/dashboard'), 1500)
          return
        }
        if (status === 'failed') {
          setPaymentState('failed')
          toast.error('Payment was declined.')
          return
        }
      } catch { /* ignore poll errors */ }
    }
    setPaymentState('success')
    toast.success('Payment received! Upgrading your account...', { icon: '☁️' })
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
        name:        'Telecloud',
        description: planLabel,
        order_id:    orderId,
        handler: async (response) => {
          try {
            await paymentsAPI.verify({
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
            })
          } catch { /* webhook fallback */ }
          pollStatus(response.razorpay_order_id)
        },
        prefill: { email: user?.email || '' },
        theme:   { color: '#6366f1' },
        modal: { ondismiss: () => setLoading(null) },
      }

      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', (resp) => {
        toast.error(resp?.error?.description || 'Payment failed. Please try again.')
        setLoading(null)
      })
      rzp.open()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to start payment')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen relative bg-gray-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-x-hidden">
      <CanvasBackground />
      
      {/* Ambient Glows */}
      <div className="pointer-events-none absolute left-1/2 top-0 h-[320px] w-[680px] -translate-x-1/2 rounded-[100%] bg-indigo-500/10 blur-[90px]" />

      {/* Header Navigation */}
      <header className="absolute inset-x-0 top-0 z-50 flex items-center px-4 py-4">
        <button 
          onClick={() => navigate(user ? '/dashboard' : '/')}
          className="group flex items-center gap-2 text-[11px] font-bold text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-white"
        >
          <div className="p-1.5 rounded-md bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-sm group-hover:scale-105 transition-transform">
            <ArrowLeft size={14} />
          </div>
          {user ? 'Return to Files' : 'Back to Home'}
        </button>
      </header>

      {/* Processing Overlay */}
      <AnimatePresence>
        {paymentState === 'processing' && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-xl dark:bg-zinc-950/80"
            style={{ zIndex: UI_LAYERS.interstitial }}
          >
            <div className="mb-5 h-10 w-10 animate-spin rounded-full border-[3px] border-zinc-200 border-t-indigo-500 dark:border-zinc-800" />
            <h2 className="mb-2 text-lg font-bold tracking-tight text-gray-900 dark:text-white">Securing Payment</h2>
            <p className="max-w-sm text-center text-[13px] font-medium text-zinc-500">
              Please wait while we confirm your payment. Do not close this window.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 mx-auto max-w-[82rem] px-4 pb-16 pt-16">
        
        {/* Hero Section */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mx-auto mb-10 max-w-[40rem] text-center">
          <span className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-0.75 text-[9px] font-bold uppercase tracking-widest text-indigo-600 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400">
            <ShieldCheck size={12} /> Simple & Transparent
          </span>
          <h1 className="mb-4 text-[2.45rem] font-extrabold leading-tight tracking-tight text-gray-900 dark:text-white md:text-[3rem]">
            Store unlimited files.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500">
              Never worry about space again.
            </span>
          </h1>
          <p className="mx-auto max-w-2xl text-[12px] font-medium leading-relaxed text-zinc-500 dark:text-zinc-400 md:text-[13px]">
            We use Telegram to safely store your files forever. Enjoy unlimited storage, ad-free music streaming, and fast uploads for one low price.
          </p>
        </motion.div>

        {/* Pricing Grid */}
        <div className="mb-16 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan, i) => {
            const Icon = plan.icon
            const isCurrent = user?.plan === plan.id
            const isBest = plan.badge === 'Recommended'

            return (
              <motion.div
                key={plan.id}
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: i * 0.1, type: "spring", stiffness: 300, damping: 30 }}
                className={`relative flex flex-col rounded-[1.25rem] bg-white/60 p-4 backdrop-blur-xl transition-all duration-300 dark:bg-zinc-900/40
                  ${isBest 
                    ? 'border-2 border-indigo-500 shadow-2xl shadow-indigo-500/10 lg:-translate-y-4' 
                    : 'border border-gray-200 dark:border-zinc-800/80 hover:border-indigo-500/50 hover:shadow-xl'
                  }
                `}
              >
                {/* Badge */}
                {plan.badge && (
                  <div className="absolute -top-3.5 left-0 right-0 flex justify-center">
                    <span className="rounded-full bg-indigo-500 px-2.5 py-0.75 text-[9px] font-bold uppercase tracking-widest text-white shadow-md">
                      {plan.badge}
                    </span>
                  </div>
                )}

                {/* Header */}
                <div className="mb-6">
                  <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-[1rem] border ${plan.style.bg} ${plan.style.border} ${plan.style.text}`}>
                    <Icon size={20} />
                  </div>
                  <h3 className="mb-2 text-[11px] font-bold uppercase tracking-widest text-zinc-500">{plan.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-[2.15rem] font-extrabold tracking-tight text-gray-900 dark:text-white">
                      {plan.price === 0 ? 'Free' : `₹${plan.price}`}
                    </span>
                    {plan.price > 0 && <span className="text-[11px] font-semibold text-zinc-500">/{plan.period}</span>}
                  </div>
                </div>

                {/* Features List */}
                <div className="flex-1">
                  <div className="mb-5 h-px w-full bg-gray-100 dark:bg-zinc-800" />
                  <ul className="mb-7 space-y-3">
                    {plan.features.map((feature, idx) => {
                      const isMusic = feature.toLowerCase().includes('music')
                      const isAds = feature.toLowerCase().includes('ad-supported') || feature.toLowerCase().includes('zero advert')
                      
                      return (
                        <li key={idx} className="flex items-start gap-2.5 text-[13px] font-medium text-gray-700 dark:text-zinc-300">
                          {isMusic ? (
                            <Music size={16} className="text-indigo-500 shrink-0 mt-0.5" />
                          ) : isAds ? (
                            <Speaker size={16} className={plan.id === 'free' ? "text-zinc-400 shrink-0 mt-0.5" : "text-emerald-500 shrink-0 mt-0.5"} />
                          ) : (
                            <Check size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                          )}
                          <span className="leading-tight">{feature}</span>
                        </li>
                      )
                    })}
                  </ul>
                </div>

                {/* CTA Button */}
                <button
                  onClick={() => handleUpgrade(plan)}
                  disabled={loading === plan.id || isCurrent}
                  className={`w-full rounded-xl py-3 text-[11px] font-bold uppercase tracking-wider transition-all
                    ${isCurrent
                      ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed border border-transparent'
                      : isBest
                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 active:scale-[0.98]'
                        : 'bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 text-zinc-900 dark:text-white hover:bg-gray-50 dark:hover:bg-zinc-800 active:scale-[0.98]'
                    }
                  `}
                >
                  {loading === plan.id ? (
                    <div className="flex justify-center">
                      <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : isCurrent ? (
                    'Current Plan'
                  ) : plan.id === 'free' ? (
                    'Start for Free'
                  ) : (
                    'Upgrade Now'
                  )}
                </button>
              </motion.div>
            )
          })}
        </div>

        {/* --- NEW SECTION: Testimonials --- */}
        <div className="mb-16">
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Loved by thousands</h2>
            <p className="text-sm font-medium text-zinc-500 mt-2">See what our users are saying about Telecloud.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {TESTIMONIALS.map((t, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="flex flex-col rounded-[1.5rem] border border-gray-200/50 bg-white/60 p-5 shadow-sm backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-900/40"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => <Star key={i} size={14} className="text-amber-500 fill-amber-500" />)}
                </div>
                <p className="text-sm font-medium text-gray-700 dark:text-zinc-300 leading-relaxed flex-1 mb-6">"{t.text}"</p>
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{t.name}</p>
                  <p className="text-[9px] uppercase tracking-widest text-zinc-500">{t.role}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* --- NEW SECTION: FAQ & Contact --- */}
        <div className="mb-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-12 lg:gap-5">
          
          {/* FAQ Accordion */}
          <div className="lg:col-span-7">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-[0.9rem] border border-indigo-100 bg-indigo-50 text-indigo-500 dark:border-indigo-500/20 dark:bg-indigo-500/10">
                <MessageCircle size={20} />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Common Questions</h2>
            </div>
            <div className="space-y-3">
              {FAQS.map((faq, idx) => (
                <FAQItem 
                  key={idx} 
                  faq={faq} 
                  isOpen={openFaq === idx} 
                  onClick={() => setOpenFaq(openFaq === idx ? -1 : idx)} 
                />
              ))}
            </div>
          </div>

          {/* Contact Me CTA */}
          <div className="lg:col-span-5 relative">
            <div className="pointer-events-none absolute inset-0 rounded-[1.5rem] bg-gradient-to-br from-indigo-500/10 to-purple-500/10 blur-xl" />
            <div className="relative rounded-[1.5rem] border border-gray-200/50 bg-white/60 p-6 text-center shadow-xl backdrop-blur-xl dark:border-zinc-800/80 dark:bg-zinc-900/60">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-[1.1rem] bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/30">
                <Mail size={24} />
              </div>
              <h3 className="mb-2 text-lg font-bold text-gray-900 dark:text-white">Still need help?</h3>
              <p className="mb-6 text-[13px] font-medium leading-relaxed text-zinc-500 dark:text-zinc-400">
                If you have any questions about plans, features, or how Telecloud connects to Telegram, I'm here to help.
              </p>
              <a 
                href="mailto:sameetpisal@gmail.com"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 py-3 text-[11px] font-bold uppercase tracking-wider text-white shadow-md transition-all active:scale-[0.98] hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-gray-100"
              >
                sameetpisal@gmail.com
              </a>
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
