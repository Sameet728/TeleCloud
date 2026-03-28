import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import UI_LAYERS from '../../constants/uiLayers'

export default function ModalShell({
  open,
  onClose,
  icon: Icon,
  iconClassName = '',
  title,
  subtitle,
  maxWidth = 'max-w-lg',
  children,
  footer,
  contentClassName = '',
  bodyClassName = '',
  zIndexClassName = '',
  zIndex = UI_LAYERS.modal,
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`fixed inset-0 flex items-center justify-center bg-black/60 p-3 backdrop-blur-md ${zIndexClassName}`}
          style={{ zIndex }}
          onClick={(event) => event.target === event.currentTarget && onClose?.()}
        >
          <motion.div
            initial={{ scale: 0.94, opacity: 0, y: 24 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 18 }}
            transition={{ type: 'spring', stiffness: 360, damping: 30 }}
            className={`app-panel relative w-full ${maxWidth} overflow-hidden px-4 py-4 sm:px-6 sm:py-6 ${contentClassName}`}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.08),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.08),transparent_24%)] dark:bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.08),transparent_26%)]" />

            <div className="relative">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  {Icon ? (
                    <div className={`flex h-11 w-11 items-center justify-center rounded-[1.2rem] border border-white/40 bg-white/70 shadow-inner dark:border-white/10 dark:bg-white/[0.05] ${iconClassName}`}>
                      <Icon size={20} />
                    </div>
                  ) : null}
                  <div>
                    <h2 className="font-display text-lg font-bold tracking-tight text-gray-900 dark:text-white">
                      {title}
                    </h2>
                    {subtitle ? (
                      <p className="mt-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        {subtitle}
                      </p>
                    ) : null}
                  </div>
                </div>

                <motion.button
                  type="button"
                  whileHover={{ scale: 1.08, rotate: 90 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={onClose}
                  className="app-icon-button"
                >
                  <X size={16} />
                </motion.button>
              </div>

              <div className={bodyClassName}>{children}</div>

              {footer ? (
                <div className="mt-4 flex flex-wrap items-center gap-2.5">
                  {footer}
                </div>
              ) : null}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
