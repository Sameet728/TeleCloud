import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, FolderOpen, Share2, Cloud,
  LogOut, X, HardDrive, Star, ImageIcon, Film,
  Crown, Zap, ArrowRight, Tag, Infinity
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { formatBytes } from '../utils/helpers'


const links = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/files',     icon: FolderOpen,      label: 'My Files'  },
  { to: '/shared',    icon: Share2,          label: 'Shared'    },
  { type: 'divider' },
  { to: '/starred',   icon: Star,            label: 'Starred'   },
  { to: '/images',    icon: ImageIcon,       label: 'Images'    },
  { to: '/videos',    icon: Film,            label: 'Videos'    },
  { to: '/pricing',   icon: Tag,             label: 'Pricing'   },
]

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const isSubscribed = user?.isSubscribed && user?.subscriptionEnd && new Date() < new Date(user.subscriptionEnd)
  const storageLimit = isSubscribed ? null : (user?.storageLimit || 10 * 1024 ** 3)
  const usedPct = storageLimit ? Math.min((user?.storageUsed || 0) / storageLimit * 100, 100) : 0

  return (
    <AnimatePresence>
      <aside
        className={[
          'fixed lg:static z-[60] flex flex-col w-64 h-full',
          'bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800',
          'transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        ].join(' ')}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-brand-600 rounded-xl flex items-center justify-center">
              <Cloud size={16} className="text-white" />
            </div>
            <span className="font-semibold text-gray-900 dark:text-white">TeleCloud</span>
          </div>
          <button onClick={onClose}
            className="lg:hidden p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {links.map((link, idx) => {
            if (link.type === 'divider') {
              return <div key={`div-${idx}`} className="h-px bg-gray-100 dark:bg-gray-800 my-4 mx-2" />
            }
            const { to, icon: Icon, label } = link
            return (
              <NavLink key={to} to={to} onClick={onClose}
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <Icon size={18} />
                <span>{label}</span>
              </NavLink>
            )
          })}
        </nav>

        {/* Storage / Plan indicator */}
        <div className="mx-3 mb-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl">
          {isSubscribed ? (
            <>
              <div className="flex items-center gap-2 mb-2">
                <Crown size={14} className="text-amber-500" />
                <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">Pro Plan ✦</span>
                <span className="ml-auto text-xs text-gray-400 font-medium flex items-center gap-1"><Infinity size={12}/> Unlimited</span>
              </div>
              <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full transition-all duration-1000" style={{ width: '100%' }} />
              </div>
              <div className="flex justify-between items-center mt-1.5">
                <p className="text-xs text-gray-500">
                  {formatBytes(user?.storageUsed || 0)} used
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-500 font-medium">
                  Expires {new Date(user.subscriptionEnd).toLocaleDateString()}
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-2">
                <HardDrive size={14} className="text-gray-400" />
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Free Plan</span>
                <span className="ml-auto text-xs text-gray-400">{formatBytes(user?.storageUsed || 0)}</span>
              </div>
              <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${usedPct}%` }} />
              </div>
              <p className="text-xs text-gray-400 mt-1.5">{usedPct.toFixed(1)}% of 10 GB used</p>
              <button onClick={() => { navigate('/pricing'); onClose(); }}
                className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:opacity-90">
                <Zap size={11} /> Upgrade <ArrowRight size={11} />
              </button>
            </>
          )}
        </div>

        {/* User */}
        <div className="px-3 pb-4 border-t border-gray-100 dark:border-gray-800 pt-3">
          <div 
            onClick={() => { navigate('/profile'); onClose(); }}
            className="flex items-center gap-3 px-2 mb-2 p-2 -mx-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
          >
            <div className="w-8 h-8 bg-brand-100 dark:bg-brand-900 rounded-full flex items-center justify-center shrink-0">
              <span className="text-xs font-semibold text-brand-700 dark:text-brand-300">
                {user?.email?.[0]?.toUpperCase()}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user?.email}</p>
              <p className="text-xs text-gray-400">{user?.isTelegramConnected ? '✓ Telegram' : 'No Telegram'}</p>
            </div>
          </div>
          <button onClick={logout}
            className="sidebar-link w-full text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600">
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </AnimatePresence>
  )
}
