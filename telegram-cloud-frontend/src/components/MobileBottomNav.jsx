import { motion } from 'framer-motion'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  FolderOpen,
  Music2,
  Share2,
  UserRound,
} from 'lucide-react'
import UI_LAYERS from '../constants/uiLayers'

const items = [
  { to: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { to: '/files', label: 'Files', icon: FolderOpen },
  { to: '/music', label: 'Music', icon: Music2 },
  { to: '/shared', label: 'Shared', icon: Share2 },
  { to: '/profile', label: 'Profile', icon: UserRound },
]

function isActiveRoute(pathname, to) {
  if (to === '/dashboard') return pathname === '/dashboard'
  return pathname === to || pathname.startsWith(`${to}/`)
}

export default function MobileBottomNav() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-2.5 px-2 md:hidden" style={{ zIndex: UI_LAYERS.mobileNav }}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        className="pointer-events-auto mx-auto max-w-sm app-panel px-1 py-1"
      >
        <div className="grid grid-cols-5 gap-1">
          {items.map(({ to, label, icon: Icon }) => {
            const active = isActiveRoute(location.pathname, to)
            return (
              <button
                key={to}
                type="button"
                onClick={() => navigate(to)}
                className="relative flex min-h-[50px] flex-col items-center justify-center gap-0.5 overflow-hidden rounded-[1rem] px-1 py-1 text-[8px] font-bold uppercase tracking-[0.1em] text-zinc-500 transition-colors dark:text-zinc-400"
              >
                {active ? (
                  <motion.span
                    layoutId="mobile-nav-active"
                    className="absolute inset-0 rounded-[1rem] bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-[0_18px_30px_-18px_rgba(79,70,229,0.72)]"
                    transition={{ type: 'spring', stiffness: 360, damping: 30 }}
                  />
                ) : null}
                <span className={`relative ${active ? 'text-white' : ''}`}>
                  <Icon size={15} strokeWidth={2.1} />
                </span>
                <span className={`relative ${active ? 'text-white' : ''}`}>{label}</span>
              </button>
            )
          })}
        </div>
      </motion.div>
    </div>
  )
}
