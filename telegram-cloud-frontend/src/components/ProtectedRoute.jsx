import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({
  children,
  requireTelegram = true,
  requireAdmin = false,
  ignoreTelegram = false,
}) {
  const { user, loading } = useAuth()

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!user) return <Navigate to="/login" replace />

  if (requireAdmin && user.role !== 'admin') {
    return <Navigate to={user.isTelegramConnected ? '/dashboard' : '/connect-telegram'} replace />
  }

  if (!ignoreTelegram && requireTelegram && !user.isTelegramConnected)
    return <Navigate to="/connect-telegram" replace />

  if (!ignoreTelegram && !requireTelegram && user.isTelegramConnected)
    return <Navigate to="/dashboard" replace />

  return children
}
