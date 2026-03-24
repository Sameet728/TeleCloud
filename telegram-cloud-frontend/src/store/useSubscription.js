import { useEffect } from 'react'
import { paymentsAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'

/**
 * useSubscription — polls subscription status once on mount and
 * exposes helpers to check feature access.
 */
export function useSubscription() {
  const { user, setUser } = useAuth()

  useEffect(() => {
    const fetchSubscription = async () => {
      if (!user) return
      try {
        const { data } = await paymentsAPI.getSubscription()
        const sub = data.data
        const updatedUser = { ...user, ...sub }
        setUser(updatedUser)
        localStorage.setItem('user', JSON.stringify(updatedUser))
      } catch (_) {}
    }
    fetchSubscription()
  }, []) // run once on mount

  const isExpired =
    user?.plan !== 'free' &&
    user?.subscriptionEnd &&
    new Date() > new Date(user.subscriptionEnd)

  const isFreePlan   = !user?.isSubscribed || user?.plan === 'free'
  const storageUsed  = user?.storageUsed  || 0
  const storageLimit = user?.storageLimit || 10 * 1024 * 1024 * 1024
  const storagePercent = Math.min(100, Math.round((storageUsed / storageLimit) * 100))
  const nearLimit    = isFreePlan && storagePercent >= 80

  return { 
    isExpired, isFreePlan, storageUsed, storageLimit, 
    storagePercent, nearLimit,
    plan: user?.plan,
    isSubscribed: user?.isSubscribed,
    subscriptionEnd: user?.subscriptionEnd
  }
}
