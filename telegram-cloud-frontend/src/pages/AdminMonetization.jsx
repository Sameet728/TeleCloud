import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, BarChart3, CheckCircle2, Users, Wallet } from 'lucide-react'
import toast from 'react-hot-toast'
import { adminMonetizationAPI } from '../services/api'
import { formatCurrency, formatDate } from '../utils/helpers'

const TABS = [
  { id: 'revenue', label: 'Revenue Control', icon: BarChart3 },
  { id: 'withdrawals', label: 'Withdrawals', icon: Wallet },
  { id: 'users', label: 'Top Earners', icon: Users },
]

const getSettlementDateKey = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())

export default function AdminMonetization() {
  const qc = useQueryClient()
  const [tab, setTab] = useState('revenue')
  const [revenueForm, setRevenueForm] = useState({
    dateKey: getSettlementDateKey(),
    grossRevenue: '',
    reportedImpressions: '',
    notes: '',
  })

  const settlementsQuery = useQuery({
    queryKey: ['admin-settlements'],
    queryFn: () => adminMonetizationAPI.settlements().then((res) => res.data.data),
    staleTime: 60_000,
  })

  const withdrawalsQuery = useQuery({
    queryKey: ['admin-withdrawals'],
    queryFn: () => adminMonetizationAPI.withdrawals({}).then((res) => res.data.data),
    staleTime: 30_000,
  })

  const usersQuery = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => adminMonetizationAPI.users({ page: 1, limit: 25 }).then((res) => res.data.data),
    staleTime: 30_000,
  })

  const revenueMutation = useMutation({
    mutationFn: () => adminMonetizationAPI.updateRevenue({
      dateKey: revenueForm.dateKey,
      grossRevenue: Number(revenueForm.grossRevenue || 0),
      reportedImpressions: revenueForm.reportedImpressions ? Number(revenueForm.reportedImpressions) : undefined,
      notes: revenueForm.notes || undefined,
    }),
    onSuccess: () => {
      toast.success('Daily settlement recalculated')
      qc.invalidateQueries({ queryKey: ['admin-settlements'] })
      qc.invalidateQueries({ queryKey: ['admin-users'] })
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to recalculate settlement')
    },
  })

  const withdrawalMutation = useMutation({
    mutationFn: ({ id, action, payload }) => adminMonetizationAPI.updateWithdrawal(id, { action, ...payload }),
    onSuccess: () => {
      toast.success('Withdrawal updated')
      qc.invalidateQueries({ queryKey: ['admin-withdrawals'] })
      qc.invalidateQueries({ queryKey: ['admin-users'] })
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update withdrawal')
    },
  })

  const pendingCount = useMemo(
    () => (withdrawalsQuery.data?.withdrawals || []).filter((item) => item.status === 'pending').length,
    [withdrawalsQuery.data]
  )

  return (
    <div className="app-page space-y-5 pt-1">
      <section className="app-hero">
        <p className="app-kicker">Admin Console</p>
        <h1 className="mt-2 text-[2rem] font-display font-bold tracking-tight text-gray-900 dark:text-white sm:text-[2.35rem]">
          Monetization
        </h1>
        <p className="app-subtitle">
          Operate daily revenue settlements, inspect top earners, and approve or complete creator payout requests.
        </p>
      </section>

      <div className="app-panel-muted flex flex-wrap gap-2 p-2">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] transition-all ${
              tab === id
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                : 'text-zinc-500 hover:bg-white/70 hover:text-zinc-900 dark:hover:bg-zinc-800/70 dark:hover:text-white'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'revenue' ? (
        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="app-panel p-5">
            <h2 className="app-section-title">Revenue Control</h2>
            <p className="mt-1 text-xs text-zinc-500">Use Telecloud tracked impressions as the divisor and optionally keep ad-network impressions for audit.</p>
            <div className="mt-5 space-y-4">
              <input
                type="date"
                value={revenueForm.dateKey}
                onChange={(e) => setRevenueForm((prev) => ({ ...prev, dateKey: e.target.value }))}
                className="app-input-surface h-11"
              />
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Gross revenue (INR)"
                value={revenueForm.grossRevenue}
                onChange={(e) => setRevenueForm((prev) => ({ ...prev, grossRevenue: e.target.value }))}
                className="app-input-surface h-11"
              />
              <input
                type="number"
                min="0"
                placeholder="Reported impressions (optional)"
                value={revenueForm.reportedImpressions}
                onChange={(e) => setRevenueForm((prev) => ({ ...prev, reportedImpressions: e.target.value }))}
                className="app-input-surface h-11"
              />
              <textarea
                rows={4}
                value={revenueForm.notes}
                onChange={(e) => setRevenueForm((prev) => ({ ...prev, notes: e.target.value }))}
                className="app-input-surface min-h-[120px] resize-none py-3"
                placeholder="Settlement notes or reconciliation comments"
              />
              <button
                onClick={() => revenueMutation.mutate()}
                disabled={revenueMutation.isPending || !revenueForm.dateKey || !revenueForm.grossRevenue}
                className="app-button-primary w-full justify-center px-4 py-3 text-xs disabled:opacity-60"
              >
                {revenueMutation.isPending ? 'Recalculating...' : 'Recalculate Daily Settlement'}
              </button>
            </div>
          </section>

          <section className="app-panel overflow-hidden">
            <div className="border-b border-gray-100 px-4 py-4 dark:border-zinc-800 sm:px-5">
              <h2 className="app-section-title">Settlement History</h2>
              <p className="mt-1 text-xs text-zinc-500">Recent day-level revenue inputs and creator payout totals.</p>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-zinc-800">
              {(settlementsQuery.data?.settlements || []).length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-zinc-500 sm:px-5">No settlements yet.</div>
              ) : settlementsQuery.data.settlements.map((item) => (
                <div key={item._id} className="flex items-start justify-between gap-4 px-4 py-4 sm:px-5">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.dateKey}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {item.trackedImpressions?.toLocaleString('en-IN')} tracked impressions
                      {item.reportedImpressions ? ` · ${item.reportedImpressions.toLocaleString('en-IN')} reported` : ''}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">{formatDate(item.updatedAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(item.grossRevenue)}</p>
                    <p className="mt-1 text-xs text-indigo-600 dark:text-indigo-300">Creator payout {formatCurrency(item.totalCreatorPayout)}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {tab === 'withdrawals' ? (
        <section className="app-panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-4 dark:border-zinc-800 sm:px-5">
            <div>
              <h2 className="app-section-title">Withdrawal Queue</h2>
              <p className="mt-1 text-xs text-zinc-500">{pendingCount} pending requests need review.</p>
            </div>
            <div className="rounded-full bg-amber-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-600 dark:text-amber-300">
              Live Queue
            </div>
          </div>
          <div className="space-y-3 px-4 py-4 sm:px-5">
            {(withdrawalsQuery.data?.withdrawals || []).length === 0 ? (
              <div className="rounded-[1rem] border border-dashed border-gray-200 p-6 text-center text-sm text-zinc-500 dark:border-zinc-800">No withdrawal requests found.</div>
            ) : withdrawalsQuery.data.withdrawals.map((item) => (
              <div key={item._id} className="rounded-[1rem] border border-gray-100 bg-white/70 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.userId?.email}</p>
                    <p className="mt-1 text-xs text-zinc-500">{formatCurrency(item.amount)} · {item.upiId} · {formatDate(item.createdAt)}</p>
                    {item.transactionId ? <p className="mt-1 text-xs text-zinc-500">UTR: {item.transactionId}</p> : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {item.status === 'pending' ? (
                      <>
                        <button
                          onClick={() => withdrawalMutation.mutate({ id: item._id, action: 'approve', payload: {} })}
                          className="rounded-full bg-cyan-500/10 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-600 dark:text-cyan-300"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => withdrawalMutation.mutate({ id: item._id, action: 'reject', payload: {} })}
                          className="rounded-full bg-rose-500/10 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-rose-600 dark:text-rose-300"
                        >
                          Reject
                        </button>
                      </>
                    ) : null}
                    {item.status === 'approved' ? (
                      <button
                        onClick={() => {
                          const transactionId = window.prompt('Enter UTR / transaction ID')
                          if (!transactionId) return
                          withdrawalMutation.mutate({
                            id: item._id,
                            action: 'complete',
                            payload: { transactionId },
                          })
                        }}
                        className="rounded-full bg-emerald-500/10 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-300"
                      >
                        Mark Completed
                      </button>
                    ) : null}
                    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] ${
                      item.status === 'completed'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
                        : item.status === 'rejected'
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-300'
                          : item.status === 'approved'
                            ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-300'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-300'
                    }`}>
                      {item.status === 'completed' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                      {item.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {tab === 'users' ? (
        <section className="app-panel overflow-hidden">
          <div className="border-b border-gray-100 px-4 py-4 dark:border-zinc-800 sm:px-5">
            <h2 className="app-section-title">Top Earners and Uploaders</h2>
            <p className="mt-1 text-xs text-zinc-500">Creators ranked by total earned, with quick visibility into their best files.</p>
          </div>
          <div className="space-y-3 px-4 py-4 sm:px-5">
            {(usersQuery.data?.users || []).map((user) => (
              <div key={user._id} className="rounded-[1rem] border border-gray-100 bg-white/70 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{user.email}</p>
                    <p className="mt-1 text-xs text-zinc-500">{user.uploadCount} uploads · wallet {formatCurrency(user.walletBalance)} · withdrawn {formatCurrency(user.totalWithdrawn)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-indigo-600 dark:text-indigo-300">{formatCurrency(user.totalEarned)}</p>
                    <p className="mt-1 text-xs text-zinc-500">Pending {formatCurrency(user.pendingWithdrawalBalance)}</p>
                  </div>
                </div>
                {(user.topFiles || []).length > 0 ? (
                  <div className="mt-4 grid gap-2 md:grid-cols-3">
                    {user.topFiles.map((file) => (
                      <div key={file._id} className="rounded-[0.95rem] border border-gray-100 bg-gray-50/80 p-3 text-xs dark:border-zinc-800 dark:bg-zinc-950/60">
                        <p className="truncate font-semibold text-gray-900 dark:text-white">{file.fileName}</p>
                        <p className="mt-1 text-zinc-500">{file.impressions.toLocaleString('en-IN')} impressions</p>
                        <p className="mt-2 font-bold text-indigo-600 dark:text-indigo-300">{formatCurrency(file.userEarning)}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
