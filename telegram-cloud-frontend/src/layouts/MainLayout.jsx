import { Outlet, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'
import UploadProgress from '../components/UploadProgress'
import MusicPlayerBar from '../components/MusicPlayerBar'
import MobileBottomNav from '../components/MobileBottomNav'
import useStore from '../store/useStore'
import UI_LAYERS from '../constants/uiLayers'

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem('telecloud-sidebar-collapsed') === 'true'
  })
  const location = useLocation()
  const uploads = useStore(s => s.uploads)
  const hasUploads = Object.keys(uploads).length > 0

  // Hide navbar on Profile and Pricing pages
  const hideNavbar = ['/profile', '/pricing'].includes(location.pathname)
  const hideMobileNav =
    hideNavbar ||
    location.pathname.startsWith('/view/') ||
    location.pathname.startsWith('/admin')

  useEffect(() => {
    window.localStorage.setItem('telecloud-sidebar-collapsed', String(sidebarCollapsed))
  }, [sidebarCollapsed])

  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  return (
    <div className="app-shell-bg relative flex h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.12),transparent_30%),radial-gradient(circle_at_80%_18%,rgba(16,185,129,0.08),transparent_18%)] dark:bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.15),transparent_30%),radial-gradient(circle_at_80%_18%,rgba(16,185,129,0.07),transparent_18%)]" />

      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 lg:hidden"
            style={{ zIndex: UI_LAYERS.modal - 12 }}
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((value) => !value)}
      />

      {/* Main */}
      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        {!hideNavbar && <Navbar onMenuClick={() => setSidebarOpen(true)} />}
        <main className={`relative flex-1 overflow-y-auto px-1.5 pb-18 pt-1.5 sm:px-2 lg:px-3 lg:pb-5 ${hideNavbar ? 'lg:pt-3' : ''}`}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 18, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
            className="min-h-full"
          >
            <Outlet />
          </motion.div>
        </main>
        {!hideMobileNav ? <MobileBottomNav /> : null}
        <MusicPlayerBar />
      </div>

      {/* Upload Progress Overlay */}
      <AnimatePresence>
        {hasUploads && <UploadProgress />}
      </AnimatePresence>
    </div>
  )
}
