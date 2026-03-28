import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, Phone, Lock, CheckCircle, ArrowRight, LogOut, ShieldCheck, Send } from 'lucide-react'
import toast from 'react-hot-toast'
import { authAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'

// Subtle background pattern to match the workspace
const CanvasBackground = () => (
  <div 
    className="absolute inset-0 z-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
    style={{
      backgroundImage: `radial-gradient(currentColor 1px, transparent 1px)`,
      backgroundSize: '24px 24px'
    }}
  />
)

const STEPS = [
  { n: 1, label: 'Phone Number' },
  { n: 2, label: 'Verify Code'  },
  { n: 3, label: 'Connected'    },
]

export default function ConnectTelegram() {
  const { refreshUser, logout } = useAuth()
  const navigate = useNavigate()
  const [step, setStep]         = useState(1)
  const [phone, setPhone]       = useState('')
  const [otp, setOtp]           = useState('')
  const [twoFA, setTwoFA]       = useState('')
  const [codeHash, setCodeHash] = useState('')
  const [loading, setLoading]   = useState(false)

  const sendOTP = async (e) => {
    e.preventDefault()
    if (!phone.trim()) return toast.error('Enter your phone number with country code')
    setLoading(true)
    try {
      const { data } = await authAPI.sendOTP({ phoneNumber: phone })
      setCodeHash(data.data.phoneCodeHash)
      setStep(2)
      toast.success('Verification code sent to Telegram!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send verification code')
    } finally { setLoading(false) }
  }

  const verifyOTP = async (e) => {
    e.preventDefault()
    if (!otp.trim()) return toast.error('Enter the verification code from Telegram')
    setLoading(true)
    try {
      await authAPI.verifyOTP({ phoneNumber: phone, phoneCode: otp, phoneCodeHash: codeHash, ...(twoFA ? { password: twoFA } : {}) })
      await refreshUser()
      setStep(3)
      toast.success('Account securely linked!')
      setTimeout(() => navigate('/dashboard'), 1500)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="relative min-h-screen bg-gray-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4 text-zinc-900 dark:text-zinc-100 overflow-hidden">
      <CanvasBackground />
      
      {/* Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Header Section */}
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-blue-500/30">
            <Send size={28} className="text-white ml-[-2px] mt-[2px]" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Connect Telegram</h1>
          <p className="text-sm font-medium text-zinc-500 mt-1.5 max-w-xs mx-auto">
            Link your account to securely store and stream unlimited files.
          </p>
        </div>

        {/* Dynamic Stepper */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map(({ n, label }) => {
            const isCompleted = step > n
            const isActive = step === n
            
            return (
              <div key={n} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 shadow-sm
                  ${isCompleted ? 'bg-emerald-500 text-white shadow-emerald-500/20' 
                    : isActive ? 'bg-indigo-600 text-white shadow-indigo-500/30' 
                    : 'bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-zinc-400'}`}
                >
                  {isCompleted ? <CheckCircle size={14} /> : n}
                </div>
                <span className={`text-[10px] uppercase tracking-widest hidden sm:block font-bold transition-colors
                  ${isActive ? 'text-gray-900 dark:text-zinc-100' 
                    : isCompleted ? 'text-emerald-600 dark:text-emerald-500' 
                    : 'text-zinc-400'}`}
                >
                  {label}
                </span>
                {n < STEPS.length && (
                  <div className={`w-8 h-[2px] rounded-full mx-1 transition-colors duration-300
                    ${isCompleted ? 'bg-emerald-500/50' : 'bg-gray-200 dark:bg-zinc-800'}`} 
                  />
                )}
              </div>
            )
          })}
        </div>

        {/* Interactive Form Card */}
        <div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl border border-gray-200/50 dark:border-zinc-800/50 p-6 sm:p-8 rounded-[2rem] shadow-xl">
          <AnimatePresence mode="wait">
            {/* STEP 1: Phone Number */}
            {step === 1 && (
              <motion.form 
                key="step1"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}
                onSubmit={sendOTP} className="space-y-5"
              >
                <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-2xl p-4 flex items-start gap-3">
                  <Phone size={18} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <p className="text-[13px] font-medium text-blue-800 dark:text-blue-300 leading-relaxed">
                    Enter your phone number with the country code (e.g. +91 9876543210). We'll send a code to your Telegram app.
                  </p>
                </div>
                
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-2 pl-1">
                    Phone Number
                  </label>
                  <div className="relative group">
                    <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input 
                      type="tel" 
                      placeholder="+91 98765 43210"
                      value={phone} 
                      onChange={e => setPhone(e.target.value)}
                      className="w-full bg-white dark:bg-zinc-950/50 border border-gray-200 dark:border-zinc-800 rounded-xl py-3.5 pl-10 pr-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder:text-zinc-400 placeholder:font-medium tracking-wide" 
                      autoComplete="tel" 
                      autoFocus
                    />
                  </div>
                </div>
                
                <button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl transition-all shadow-[0_4px_14px_0_rgba(79,70,229,0.39)] disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                >
                  {loading ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>Send Code <ArrowRight size={16} /></>
                  )}
                </button>
              </motion.form>
            )}

            {/* STEP 2: OTP Verification */}
            {step === 2 && (
              <motion.form 
                key="step2"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}
                onSubmit={verifyOTP} className="space-y-5"
              >
                <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-2xl p-4 flex items-start gap-3">
                  <MessageCircle size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-[13px] font-medium text-emerald-800 dark:text-emerald-300 leading-relaxed">
                    Open your Telegram app. You have received a message from Telegram with your login code.
                  </p>
                </div>
                
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-2 pl-1 text-center">
                    Verification Code
                  </label>
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="•••••"
                      value={otp} 
                      onChange={e => setOtp(e.target.value)}
                      className="w-full bg-white dark:bg-zinc-950/50 border border-gray-200 dark:border-zinc-800 rounded-xl py-4 text-center text-2xl font-mono tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder:text-zinc-300 dark:placeholder:text-zinc-700" 
                      maxLength={5} 
                      autoFocus 
                    />
                  </div>
                </div>
                
                <div>
                  <label className="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-2 px-1">
                    <span>2FA Password</span>
                    <span className="text-zinc-400 font-medium tracking-normal normal-case">If enabled</span>
                  </label>
                  <div className="relative group">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input 
                      type="password" 
                      placeholder="Leave blank if not set"
                      value={twoFA} 
                      onChange={e => setTwoFA(e.target.value)}
                      className="w-full bg-white dark:bg-zinc-950/50 border border-gray-200 dark:border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder:text-zinc-400 tracking-wide" 
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    type="button" 
                    onClick={() => setStep(1)} 
                    className="flex-1 py-3.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white text-sm font-bold rounded-xl transition-all shadow-sm active:scale-[0.98]"
                  >
                    Go Back
                  </button>
                  <button 
                    type="submit" 
                    disabled={loading} 
                    className="flex-[2] flex items-center justify-center gap-2 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl transition-all shadow-[0_4px_14px_0_rgba(79,70,229,0.39)] disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                  >
                    {loading ? (
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      'Verify & Connect'
                    )}
                  </button>
                </div>
              </motion.form>
            )}

            {/* STEP 3: Success State */}
            {step === 3 && (
              <motion.div 
                key="step3"
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className="text-center py-10"
              >
                <motion.div
                  initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', bounce: 0.5, delay: 0.1 }}
                  className="w-20 h-20 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-inner"
                >
                  <ShieldCheck size={40} className="text-emerald-500" />
                </motion.div>
                <h3 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-2">Securely Connected</h3>
                <p className="text-sm font-medium text-zinc-500">Your files will now be routed through your Telegram account. Taking you to the workspace...</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Global Action */}
        <div className="mt-8 text-center">
          <button 
            onClick={logout}
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-red-500 transition-colors group"
          >
            <LogOut size={14} className="group-hover:-translate-x-0.5 transition-transform" /> 
            Sign Out
          </button>
        </div>
      </motion.div>
    </div>
  )
}