import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'

const variantClasses = {
  primary:
    'bg-gradient-to-r from-indigo-500 via-indigo-500 to-emerald-500 text-white shadow-[0_24px_44px_-24px_rgba(79,70,229,0.8)]',
  secondary:
    'border border-gray-200/80 bg-white/80 text-zinc-700 shadow-sm dark:border-white/10 dark:bg-white/[0.05] dark:text-zinc-200',
  danger:
    'border border-red-200 bg-red-50 text-red-600 shadow-sm dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400',
  ghost:
    'border border-transparent bg-transparent text-zinc-600 dark:text-zinc-300',
  glass:
    'border border-white/30 bg-white/70 text-zinc-700 shadow-[0_16px_36px_-24px_rgba(15,23,42,0.3)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06] dark:text-zinc-100',
}

const sizeClasses = {
  sm: 'px-3.5 py-2 text-xs rounded-full',
  md: 'px-4 py-2.5 text-sm rounded-full',
  lg: 'px-5 py-3 text-sm rounded-[1.2rem]',
  icon: 'h-11 w-11 rounded-2xl',
}

export default function AppButton({
  children,
  icon: Icon,
  loading = false,
  variant = 'primary',
  size = 'md',
  className = '',
  fullWidth = false,
  disabled = false,
  iconClassName = '',
  ...props
}) {
  return (
    <motion.button
      type="button"
      whileHover={{ scale: disabled ? 1 : 1.03, y: disabled ? 0 : -1 }}
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200
        disabled:cursor-not-allowed disabled:opacity-60
        ${variantClasses[variant] || variantClasses.primary}
        ${sizeClasses[size] || sizeClasses.md}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <Loader2 size={16} className="animate-spin" />
      ) : Icon ? (
        <Icon size={16} className={iconClassName} />
      ) : null}
      {children}
    </motion.button>
  )
}
