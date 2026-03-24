import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, Phone, Hash, Lock, CheckCircle, ArrowRight, LogOut } from 'lucide-react'
import toast from 'react-hot-toast'
import { authAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'

const STEPS = [
  { n: 1, label: 'Phone number' },
  { n: 2, label: 'Verify OTP'   },
  { n: 3, label: 'Connected!'   },
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
      toast.success('OTP sent to your Telegram app!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send OTP')
    } finally { setLoading(false) }
  }

  const verifyOTP = async (e) => {
    e.preventDefault()
    if (!otp.trim()) return toast.error('Enter the OTP from Telegram')
    setLoading(true)
    try {
      await authAPI.verifyOTP({ phoneNumber: phone, phoneCode: otp, phoneCodeHash: codeHash, ...(twoFA ? { password: twoFA } : {}) })
      await refreshUser()
      setStep(3)
      toast.success('Telegram connected!')
      setTimeout(() => navigate('/dashboard'), 1500)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <MessageCircle size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Connect Telegram</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            Link your Telegram account to start storing files
          </p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map(({ n, label }) => (
            <div key={n} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all
                ${step > n ? 'bg-green-500 text-white' : step === n ? 'bg-brand-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-400'}`}>
                {step > n ? <CheckCircle size={14} /> : n}
              </div>
              <span className={`text-xs hidden sm:block ${step === n ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-400'}`}>
                {label}
              </span>
              {n < STEPS.length && <div className="w-8 h-px bg-gray-200 dark:bg-gray-700 mx-1" />}
            </div>
          ))}
        </div>

        <div className="card p-6">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.form key="step1"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                onSubmit={sendOTP} className="space-y-4"
              >
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 flex gap-3">
                  <Phone size={18} className="text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Enter your phone number in international format (e.g. +919876543210).
                    You will receive an OTP in your Telegram app.
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Phone number</label>
                  <div className="relative">
                    <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input type="tel" placeholder="+91 98765 43210"
                      value={phone} onChange={e => setPhone(e.target.value)}
                      className="input pl-9" autoComplete="tel" />
                  </div>
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
                  {loading
                    ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <><ArrowRight size={16} /> Send OTP</>}
                </button>
              </motion.form>
            )}

            {step === 2 && (
              <motion.form key="step2"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                onSubmit={verifyOTP} className="space-y-4"
              >
                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 flex gap-3">
                  <Hash size={18} className="text-green-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Open your Telegram app and copy the verification code.
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Telegram OTP code</label>
                  <div className="relative">
                    <Hash size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input type="text" placeholder="Enter 5-digit code"
                      value={otp} onChange={e => setOtp(e.target.value)}
                      className="input pl-9 text-center text-lg tracking-widest" maxLength={5} autoFocus />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                    2FA Password <span className="text-gray-400 font-normal">(if enabled)</span>
                  </label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input type="password" placeholder="Leave blank if not set"
                      value={twoFA} onChange={e => setTwoFA(e.target.value)}
                      className="input pl-9" />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setStep(1)} className="btn-secondary flex-1">Back</button>
                  <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
                    {loading
                      ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : 'Verify'}
                  </button>
                </div>
              </motion.form>
            )}

            {step === 3 && (
              <motion.div key="step3"
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className="text-center py-6"
              >
                <motion.div
                  initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', bounce: 0.5, delay: 0.1 }}
                  className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4"
                >
                  <CheckCircle size={32} className="text-green-500" />
                </motion.div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Telegram connected!</h3>
                <p className="text-sm text-gray-400">Redirecting to your dashboard...</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button onClick={logout}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 mx-auto mt-4">
          <LogOut size={14} /> Sign out
        </button>
      </div>
    </div>
  )
}
