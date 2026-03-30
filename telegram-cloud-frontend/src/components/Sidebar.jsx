import { memo, useCallback, useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import {
  LayoutDashboard,
  FolderOpen,
  Share2,
  Cloud,
  LogOut,
  X,
  HardDrive,
  Star,
  ImageIcon,
  Film,
  Crown,
  Zap,
  ArrowRight,
  Tag,
  Infinity,
  Music2,
  ListMusic,
  PanelLeftClose,
  PanelLeftOpen,
  BarChart3,
  Wallet,
  Banknote,
  Shield,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { formatBytes } from '../utils/helpers'
import AdSlot, { useAdGuard } from './AdBanner'
import UI_LAYERS from '../constants/uiLayers'

const linkGroups = [
  {
    label: 'Workspace',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/dashboard/analytics', icon: BarChart3, label: 'Analytics' },
      { to: '/files', icon: FolderOpen, label: 'My Files' },
      { to: '/shared', icon: Share2, label: 'Shared Links' },
      { to: '/wallet', icon: Wallet, label: 'Wallet' },
      { to: '/withdrawals', icon: Banknote, label: 'Withdrawals' },
    ],
  },
  {
    label: 'Library',
    items: [
      { to: '/starred', icon: Star, label: 'Starred' },
      { to: '/images', icon: ImageIcon, label: 'Images' },
      { to: '/videos', icon: Film, label: 'Videos' },
      { to: '/music', icon: Music2, label: 'Music' },
      { to: '/music/playlists', icon: ListMusic, label: 'Playlists' },
    ],
  },
  {
    label: 'Account',
    items: [
      { to: '/pricing', icon: Tag, label: 'Pricing' },
      { to: '/admin', icon: Shield, label: 'Admin Panel', adminOnly: true },
    ],
  },
]

const SidebarLink = memo(function SidebarLink({ to, icon: Icon, label, collapsed, onClose }) {
  return (
    <NavLink to={to} onClick={onClose} className="block">
      {({ isActive }) => (
        <div
          className={`relative flex items-center overflow-hidden rounded-[0.95rem] py-1.5 text-[12px] font-semibold transition-colors ${
            collapsed ? 'justify-center px-0' : 'gap-2 px-2.5'
          } ${isActive ? 'text-white' : 'text-zinc-800 dark:text-zinc-200 hover:text-zinc-950 dark:hover:text-white'}`}
        >
          {isActive ? (
            <span className="absolute inset-0 rounded-[0.95rem] bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-[0_14px_24px_-18px_rgba(79,70,229,0.72)]" />
          ) : null}
          <span
            className={`relative flex items-center justify-center rounded-[0.8rem] ${
              collapsed ? 'h-9 w-9' : 'h-8 w-8'
            } ${isActive ? 'bg-white/14' : 'bg-black/[0.045] dark:bg-white/[0.07]'}`}
          >
            <Icon size={15} strokeWidth={2.1} />
          </span>
          {!collapsed ? <span className="relative truncate">{label}</span> : null}
        </div>
      )}
    </NavLink>
  )
})

export default function Sidebar({ open, onClose, collapsed, onToggleCollapsed }) {
  const [isDesktop, setIsDesktop] = useState(() => (
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : false
  ))
  const { dark } = useTheme() // Get dark mode state from context
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const canShowAds = useAdGuard()
  const isSubscribed =
    user?.isSubscribed &&
    user?.subscriptionEnd &&
    new Date() < new Date(user.subscriptionEnd)
  const subscriptionEndLabel = user?.subscriptionEnd
    ? new Date(user.subscriptionEnd).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : ''
  const storageLimit = isSubscribed ? null : (user?.storageLimit || 10 * 1024 ** 3)
  const usedPct = storageLimit
    ? Math.min(((user?.storageUsed || 0) / storageLimit) * 100, 100)
    : 0
  const effectiveCollapsed = isDesktop && collapsed
  const [showSidebarAd, setShowSidebarAd] = useState(isDesktop)
  const visibleLinkGroups = linkGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (item.adminOnly && user?.role !== 'admin') return false
        if (user?.role === 'admin' && !user?.isTelegramConnected && !item.adminOnly && item.to !== '/pricing') {
          return false
        }
        return true
      }),
    }))
    .filter((group) => group.items.length > 0)

  useEffect(() => {
    const syncViewport = () => setIsDesktop(window.innerWidth >= 1024)
    syncViewport()
    window.addEventListener('resize', syncViewport)
    return () => window.removeEventListener('resize', syncViewport)
  }, [])

  useEffect(() => {
    if (!canShowAds) {
      setShowSidebarAd(false)
      return
    }

    if (isDesktop) {
      setShowSidebarAd(true)
      return
    }

    if (!open) {
      setShowSidebarAd(false)
      return
    }

    const timerId = window.setTimeout(() => setShowSidebarAd(true), 220)
    return () => window.clearTimeout(timerId)
  }, [canShowAds, isDesktop, open])

  const closeAndNavigate = useCallback((path) => {
    navigate(path)
    onClose?.()
  }, [navigate, onClose])

  return (
    <aside
      style={{ zIndex: isDesktop ? UI_LAYERS.sidebar : UI_LAYERS.modal - 8 }}
      data-dark={dark}
      className={[
        'fixed inset-y-0 left-0 flex h-full flex-col overflow-hidden border-r transition-[width,transform] duration-200 ease-out transform-gpu will-change-transform lg:static',
        dark ? 'dark' : '', // Explicitly add dark class when dark mode is active
        isDesktop
          ? 'backdrop-blur-xl border-black/5 bg-white/90 dark:border-white/8 dark:bg-[#0d1118]/95 shadow-[0_20px_44px_-36px_rgba(15,23,42,0.26)] dark:shadow-[0_22px_48px_-38px_rgba(0,0,0,0.48)]'
          : 'border-black/10 bg-white dark:border-white/10 dark:bg-[#0b1020] shadow-[0_18px_42px_-30px_rgba(15,23,42,0.32)] dark:shadow-[0_20px_48px_-30px_rgba(0,0,0,0.58)]',
        effectiveCollapsed ? 'w-[216px] lg:w-[68px]' : 'w-[216px]',
        open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
      ].join(' ')}
    >
      <div className={`pointer-events-none absolute inset-0 ${isDesktop ? 'bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.08),transparent_28%),radial-gradient(circle_at_bottom,rgba(16,185,129,0.04),transparent_24%)] dark:bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.09),transparent_28%),radial-gradient(circle_at_bottom,rgba(16,185,129,0.04),transparent_24%)]' : 'bg-transparent'}`} />

      <div className="relative flex h-full flex-col">
        <div className={`flex items-center border-b border-black/5 px-2 py-1.5 dark:border-white/5 ${effectiveCollapsed ? 'justify-center' : 'justify-between'}`}>
          <button
            type="button"
            onClick={() => closeAndNavigate('/dashboard')}
            className={`group flex items-center ${effectiveCollapsed ? 'justify-center' : 'gap-3'} min-w-0`}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-[0.85rem] bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-[0_14px_24px_-18px_rgba(79,70,229,0.65)] transition-transform group-hover:scale-[1.02]">
              <Cloud size={16} />
            </div>
            {!effectiveCollapsed ? (
              <div className="min-w-0 text-left">
                <p className="font-display text-[0.8rem] font-bold tracking-tight text-gray-900 dark:text-white">
                  Telecloud
                </p>
                <p className="text-[6.5px] font-bold uppercase tracking-[0.16em] text-zinc-600 dark:text-zinc-300">
                  Streaming Workspace
                </p>
              </div>
            ) : null}
          </button>

          {!effectiveCollapsed ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onToggleCollapsed}
                className="hidden lg:inline-flex app-icon-button"
                aria-label="Collapse sidebar"
              >
                <PanelLeftClose size={16} />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex app-icon-button lg:hidden"
                aria-label="Close sidebar"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="absolute right-2.5 top-2.5 hidden lg:block">
              <button
                type="button"
                onClick={onToggleCollapsed}
                className="app-icon-button"
                aria-label="Expand sidebar"
              >
                <PanelLeftOpen size={16} />
              </button>
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto overscroll-contain px-1.5 py-1.5">
          {visibleLinkGroups.map((group) => (
            <div key={group.label} className="space-y-0.5">
              {!effectiveCollapsed ? (
                <p className="px-2.5 pt-1 text-[7.5px] font-bold uppercase tracking-[0.15em] text-zinc-500 dark:text-zinc-300">
                  {group.label}
                </p>
              ) : null}
              {group.items.map((item) => (
                <SidebarLink
                  key={item.to}
                  {...item}
                  collapsed={effectiveCollapsed}
                  onClose={onClose}
                />
              ))}
            </div>
          ))}
        </nav>

        <div className="space-y-1.5 border-t border-black/5 px-1.5 pb-1.5 pt-1.5 dark:border-white/5">
          {effectiveCollapsed ? (
            <button
              type="button"
              onClick={() => closeAndNavigate('/pricing')}
              className="flex h-[44px] w-full items-center justify-center rounded-[0.9rem] border border-black/5 bg-white/65 text-zinc-600 shadow-sm transition hover:border-indigo-300 hover:text-indigo-600 dark:border-white/8 dark:bg-white/[0.04] dark:text-zinc-300 dark:hover:border-indigo-400/40 dark:hover:text-indigo-300"
            >
              {isSubscribed ? <Crown size={18} /> : <HardDrive size={18} />}
            </button>
          ) : (
            <div className="app-panel-muted border-black/8 bg-white/92 px-2 py-1.5 dark:border-white/10 dark:bg-white/[0.06]">
              {isSubscribed ? (
                <>
                  <div className="mb-1.5 flex flex-col gap-1.5">
                    <div className="flex items-start gap-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[0.75rem] bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-sm">
                        <Crown size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[8px] font-bold uppercase tracking-[0.13em] text-amber-600 dark:text-amber-400">
                          Pro Plan
                        </p>
                        <p className="mt-0.5 max-w-[7.5rem] text-[7.5px] font-semibold leading-3 text-zinc-600 dark:text-zinc-300">
                          Unlimited storage and ad-free music streaming
                        </p>
                      </div>
                    </div>
                    <div className="flex">
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[6.5px] font-bold uppercase tracking-[0.11em] text-amber-600 dark:text-amber-300">
                        <Infinity size={12} /> Unlimited
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-black/5 dark:bg-white/8">
                    <div
                      className="h-full w-full rounded-full bg-gradient-to-r from-amber-400 to-amber-600"
                    />
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center justify-between gap-1 text-[7.5px] font-semibold text-zinc-600 dark:text-zinc-300">
                    <span>{formatBytes(user?.storageUsed || 0)} used</span>
                    <span>Expires {subscriptionEndLabel}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-1.5 flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-[0.75rem] bg-indigo-500/10 text-indigo-500 dark:text-indigo-300">
                      <HardDrive size={16} />
                    </div>
                    <div>
                      <p className="text-[8px] font-bold uppercase tracking-[0.13em] text-zinc-700 dark:text-zinc-200">
                        Free Plan
                      </p>
                      <p className="text-[8.5px] font-medium text-zinc-600 dark:text-zinc-300">
                        {usedPct.toFixed(1)}% of 10 GB used
                      </p>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-black/5 dark:bg-white/8">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-[width] duration-700 ease-out"
                      style={{ width: `${usedPct}%` }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => closeAndNavigate('/pricing')}
                    className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-indigo-500 via-indigo-500 to-purple-500 px-2 py-1.5 text-[7px] font-bold uppercase tracking-[0.11em] text-white shadow-[0_18px_28px_-18px_rgba(99,102,241,0.58)] transition hover:-translate-y-0.5"
                  >
                    <Zap size={13} />
                    Upgrade to Pro
                    <ArrowRight size={13} />
                  </button>
                </>
              )}
            </div>
          )}

          {!effectiveCollapsed && canShowAds && showSidebarAd ? (
            <div className="overflow-hidden rounded-[0.9rem] border border-black/8 bg-white/88 px-1 py-1 dark:border-white/10 dark:bg-white/[0.06]">
              <p className="px-1 pb-1 text-[7px] font-bold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-300">
                Sponsored
              </p>
              <AdSlot formatId="2018497" style={{ width: '100%', minHeight: 32, height: 48 }} />
            </div>
          ) : null}

          <div className={`flex items-center ${effectiveCollapsed ? 'justify-center' : 'gap-2 rounded-[0.9rem] border border-black/8 bg-white/88 px-1 py-1 dark:border-white/10 dark:bg-white/[0.06]'}`}>
            <button
              type="button"
              onClick={() => closeAndNavigate('/profile')}
              className={`group flex items-center ${effectiveCollapsed ? 'justify-center' : 'gap-2.5'} min-w-0 flex-1`}
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[0.75rem] bg-gradient-to-br from-indigo-400 to-indigo-600 text-[11px] font-bold text-white shadow-[0_16px_24px_-18px_rgba(99,102,241,0.66)]">
                {user?.email?.[0]?.toUpperCase()}
              </div>
              {!effectiveCollapsed ? (
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate text-[9.5px] font-semibold text-gray-900 dark:text-white">
                    {user?.email}
                  </p>
                  <p className="text-[7.5px] font-medium text-zinc-600 dark:text-zinc-300">
                    {user?.isTelegramConnected ? 'Telegram connected' : 'Telegram not connected'}
                  </p>
                </div>
              ) : null}
            </button>

            {!effectiveCollapsed ? (
              <button
                type="button"
                onClick={logout}
                className="app-icon-button text-red-500 hover:text-red-500"
                aria-label="Logout"
              >
                <LogOut size={16} />
              </button>
            ) : null}
          </div>

          {effectiveCollapsed ? (
            <button
              type="button"
              onClick={logout}
              className="flex h-10 w-full items-center justify-center rounded-[1rem] border border-black/5 bg-white/65 text-red-500 transition hover:bg-red-50 dark:border-white/8 dark:bg-white/[0.04] dark:hover:bg-red-500/10"
              aria-label="Logout"
            >
              <LogOut size={16} />
            </button>
          ) : null}
        </div>
      </div>
    </aside>
  )
}
