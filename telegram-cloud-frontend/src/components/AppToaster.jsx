import { motion } from 'framer-motion'
import { AlertCircle, CheckCircle2, Info, Loader2, X } from 'lucide-react'
import { Toaster, resolveValue, toast } from 'react-hot-toast'
import { useTheme } from '../context/ThemeContext'
import UI_LAYERS from '../constants/uiLayers'

function ToastIcon({ type }) {
  if (type === 'success') {
    return <CheckCircle2 size={18} className="text-emerald-500" />
  }
  if (type === 'error') {
    return <AlertCircle size={18} className="text-red-500" />
  }
  if (type === 'loading') {
    return <Loader2 size={18} className="animate-spin text-indigo-500" />
  }
  return <Info size={18} className="text-sky-500" />
}

function getTypeClasses(type, dark) {
  const base = dark
    ? 'border-white/10 bg-[#10131b]/88 text-white shadow-[0_24px_60px_-30px_rgba(0,0,0,0.7)]'
    : 'border-white/80 bg-white/88 text-gray-900 shadow-[0_24px_60px_-30px_rgba(15,23,42,0.28)]'

  if (type === 'success') {
    return `${base} ${dark ? 'ring-1 ring-emerald-500/20' : 'ring-1 ring-emerald-200/80'}`
  }
  if (type === 'error') {
    return `${base} ${dark ? 'ring-1 ring-red-500/20' : 'ring-1 ring-red-200/80'}`
  }
  if (type === 'loading') {
    return `${base} ${dark ? 'ring-1 ring-indigo-500/20' : 'ring-1 ring-indigo-200/80'}`
  }
  return `${base} ${dark ? 'ring-1 ring-sky-500/20' : 'ring-1 ring-sky-200/80'}`
}

export default function AppToaster() {
  const { dark } = useTheme()

  return (
    <Toaster
      position="bottom-right"
      gutter={12}
      containerStyle={{
        bottom: 18,
        right: 18,
        left: 18,
        zIndex: UI_LAYERS.toast,
      }}
      toastOptions={{
        duration: 4200,
        style: {
          background: 'transparent',
          boxShadow: 'none',
          padding: 0,
          margin: 0,
        },
      }}
    >
      {(t) => {
        const resolved = resolveValue(t.message, t)
        const type = t.type === 'blank' ? 'info' : t.type

        return (
          <motion.div
            initial={{ opacity: 0, x: 28, scale: 0.96 }}
            animate={{ opacity: t.visible ? 1 : 0, x: t.visible ? 0 : 18, scale: t.visible ? 1 : 0.96 }}
            exit={{ opacity: 0, x: 28, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className={`pointer-events-auto ml-auto w-full max-w-[21rem] rounded-[1.35rem] border px-3.5 py-2.5 backdrop-blur-2xl ${getTypeClasses(type, dark)}`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[1rem] bg-white/70 dark:bg-white/[0.05]">
                <ToastIcon type={type} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold leading-5">
                  {typeof resolved === 'string' ? resolved : resolved}
                </p>
                <div className={`mt-1.5 h-1.5 overflow-hidden rounded-full ${dark ? 'bg-white/10' : 'bg-gray-200/80'}`}>
                  <motion.div
                    initial={{ width: '100%' }}
                    animate={{ width: t.type === 'loading' ? '55%' : '0%' }}
                    transition={{
                      duration: t.type === 'loading' ? 1.1 : ((t.duration || 4200) / 1000),
                      repeat: t.type === 'loading' ? Infinity : 0,
                      repeatType: t.type === 'loading' ? 'reverse' : 'loop',
                      ease: 'linear',
                    }}
                    className={`h-full rounded-full ${
                      type === 'success'
                        ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                        : type === 'error'
                          ? 'bg-gradient-to-r from-red-400 to-red-500'
                          : 'bg-gradient-to-r from-indigo-400 to-sky-500'
                    }`}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => toast.dismiss(t.id)}
                className={`rounded-xl p-2 transition-colors ${dark ? 'text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-200' : 'text-zinc-400 hover:bg-gray-100 hover:text-zinc-700'}`}
                aria-label="Dismiss toast"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )
      }}
    </Toaster>
  )
}
