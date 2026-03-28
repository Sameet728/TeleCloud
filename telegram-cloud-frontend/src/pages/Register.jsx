import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, Cloud, Eye, EyeOff, UserPlus, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'
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

export default function Register() {
  const { register } = useAuth()
  const navigate     = useNavigate()
  const [form, setForm]     = useState({ email: '', password: '', confirm: '' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  // Real-time password validation state
  const isLengthValid = form.password.length >= 8
  const isMatchValid = form.password === form.confirm && form.confirm.length > 0

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.email || !form.password) return toast.error('Please fill in all fields')
    if (!isLengthValid) return toast.error('Password must be at least 8 characters')
    if (!isMatchValid) return toast.error('Passwords do not match')
    
    setLoading(true)
    try {
      await register(form.email, form.password)
      toast.success('Workspace initialized. Connect your node next.')
      navigate('/connect-telegram')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Initialization failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="relative min-h-screen bg-gray-50 dark:bg-zinc-950 flex items-center justify-center p-4 text-zinc-900 dark:text-zinc-100 overflow-hidden">
      <CanvasBackground />
      
      {/* Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/20 blur-[120px] rounded-full pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="w-full max-w-sm relative z-10"
      >
        {/* Header Section */}
        <div className="text-center mb-8 flex flex-col items-center">
          <Link to="/" className="inline-flex items-center justify-center p-3 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-sm mb-6 group transition-all hover:border-indigo-500/50 hover:shadow-indigo-500/10">
            <Cloud size={28} className="text-indigo-600 dark:text-indigo-500 group-hover:scale-110 transition-transform" />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Initialize Workspace</h1>
          <p className="text-sm font-medium text-zinc-500 mt-1.5">Free forever. No credit card required.</p>
        </div>

        {/* Form Card */}
        <div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl border border-gray-200/50 dark:border-zinc-800/50 p-6 rounded-3xl shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Email Input */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-2 pl-1">
                Email Address
              </label>
              <div className="relative group">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                  type="email" 
                  placeholder="name@company.com"
                  value={form.email} 
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full bg-gray-50 dark:bg-zinc-950/50 border border-gray-200 dark:border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder:text-zinc-500" 
                  autoComplete="email" 
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <div className="flex items-center justify-between mb-2 pl-1 pr-1">
                <label className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">
                  Password
                </label>
                <AnimatePresence>
                  {form.password.length > 0 && (
                    <motion.span 
                      initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 5 }}
                      className={`text-[10px] font-bold ${isLengthValid ? 'text-emerald-500' : 'text-amber-500'}`}
                    >
                      {isLengthValid ? 'Valid Length' : 'Min 8 Chars'}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
              <div className="relative group">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                  type={showPw ? 'text' : 'password'} 
                  placeholder="••••••••"
                  value={form.password} 
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className={`w-full bg-gray-50 dark:bg-zinc-950/50 border rounded-xl py-3 pl-10 pr-12 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-zinc-500 tracking-wide
                    ${form.password.length > 0 && !isLengthValid ? 'border-amber-500/50 focus:border-amber-500' : 'border-gray-200 dark:border-zinc-800 focus:border-indigo-500'}
                  `} 
                  autoComplete="new-password" 
                />
                
                {/* Refined Show/Hide Toggle */}
                <button 
                  type="button" 
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-md transition-all focus:outline-none"
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm Password Input */}
            <div>
              <div className="flex items-center justify-between mb-2 pl-1 pr-1">
                <label className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">
                  Confirm Password
                </label>
                <AnimatePresence>
                  {form.confirm.length > 0 && (
                    <motion.span 
                      initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 5 }}
                      className={`text-[10px] font-bold flex items-center gap-1 ${isMatchValid ? 'text-emerald-500' : 'text-red-500'}`}
                    >
                      {isMatchValid ? <><ShieldCheck size={12} /> Matches</> : 'No Match'}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
              <div className="relative group">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                  type={showPw ? 'text' : 'password'} 
                  placeholder="••••••••"
                  value={form.confirm} 
                  onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                  className={`w-full bg-gray-50 dark:bg-zinc-950/50 border rounded-xl py-3 pl-10 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-zinc-500 tracking-wide
                    ${form.confirm.length > 0 && !isMatchValid ? 'border-red-500/50 focus:border-red-500' : 'border-gray-200 dark:border-zinc-800 focus:border-indigo-500'}
                  `} 
                  autoComplete="new-password" 
                />
              </div>
            </div>

            {/* Submit Button */}
            <motion.button
              type="submit" 
              disabled={loading || (form.password.length > 0 && !isLengthValid)}
              whileHover={{ scale: 1.01 }} 
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl transition-all shadow-[0_4px_14px_0_rgba(79,70,229,0.39)] disabled:opacity-50 disabled:cursor-not-allowed mt-4"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <><UserPlus size={16} /> Deploy Workspace</>
              )}
            </motion.button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs font-medium text-zinc-500 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-zinc-900 dark:text-white font-bold hover:text-indigo-500 transition-colors">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  )
}