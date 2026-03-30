import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Landmark, Wallet, Clock3, TrendingUp } from 'lucide-react'
import { walletAPI } from '../services/api'
import { formatCurrency, formatDate } from '../utils/helpers'

function SummaryCard({ icon: Icon, label, value, tone = 'indigo' }) {
  const toneClasses = {
    indigo: 'text-indigo-600 dark:text-indigo-300',
    emerald: 'text-emerald-600 dark:text-emerald-300',
    amber: 'text-amber-600 dark:text-amber-300',
    cyan: 'text-cyan-600 dark:text-cyan-300',
  }

  return (
    <div className="app-panel-muted p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">{label}</p>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
        <div className={`rounded-2xl bg-white/70 p-3 shadow-sm dark:bg-white/10 ${toneClasses[tone] || toneClasses.indigo}`}>
          <Icon size={18} />
        </div>
      </div>
    </div>
  )
}

export default function WalletPage() {
  const navigate = useNavigate()
  const { data, isLoading } = useQuery({
    queryKey: ['wallet'],
    queryFn: () => walletAPI.get().then((res) => res.data.data),
    staleTime: 60_000,
  })

  const summary = data?.summary
  const ledger = data?.ledger || []
  const withdrawals = data?.withdrawals || []

  return (
    <div className="app-page space-y-5 pt-1">
      <section className="app-hero flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="app-kicker">Creator Wallet</p>
          <h1 className="mt-2 text-[2rem] font-display font-bold tracking-tight text-gray-900 dark:text-white sm:text-[2.35rem]">
            Wallet
          </h1>
          <p className="app-subtitle">
            Review live available balance, reserved payout requests, and the settlement credits flowing into your Telecloud creator wallet.
          </p>
        </div>
        <button onClick={() => navigate('/withdrawals')} className="app-button-primary px-4 py-2.5 text-xs">
          Request Withdrawal <ArrowRight size={14} />
        </button>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Available Balance" value={isLoading ? '...' : formatCurrency(summary?.walletBalance)} icon={Wallet} />
        <SummaryCard label="Pending Reserved" value={isLoading ? '...' : formatCurrency(summary?.pendingWithdrawalBalance)} icon={Clock3} tone="amber" />
        <SummaryCard label="Total Earned" value={isLoading ? '...' : formatCurrency(summary?.totalEarned)} icon={TrendingUp} tone="emerald" />
        <SummaryCard label="Total Withdrawn" value={isLoading ? '...' : formatCurrency(summary?.totalWithdrawn)} icon={Landmark} tone="cyan" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.9fr]">
        <section className="app-panel overflow-hidden">
          <div className="border-b border-gray-100 px-4 py-4 dark:border-zinc-800 sm:px-5">
            <h2 className="app-section-title">Ledger History</h2>
            <p className="mt-1 text-xs text-zinc-500">Settlement credits and payout-related wallet movements.</p>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-zinc-800">
            {ledger.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-zinc-500 sm:px-5">No wallet activity yet.</div>
            ) : ledger.map((entry) => (
              <div key={entry._id} className="flex items-center justify-between gap-3 px-4 py-4 sm:px-5">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{entry.notes || entry.entryType.replaceAll('_', ' ')}</p>
                  <p className="mt-1 text-xs text-zinc-500">{formatDate(entry.createdAt)}</p>
                </div>
                <div className={`text-sm font-bold ${
                  entry.entryType === 'settlement_credit' || entry.entryType === 'withdrawal_release'
                    ? 'text-emerald-600 dark:text-emerald-300'
                    : 'text-amber-600 dark:text-amber-300'
                }`}>
                  {entry.entryType === 'settlement_credit' || entry.entryType === 'withdrawal_release' ? '+' : '-'}
                  {formatCurrency(entry.amount)}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="app-panel overflow-hidden">
          <div className="border-b border-gray-100 px-4 py-4 dark:border-zinc-800 sm:px-5">
            <h2 className="app-section-title">Recent Withdrawal Requests</h2>
            <p className="mt-1 text-xs text-zinc-500">Track request state changes and payout references.</p>
          </div>
          <div className="space-y-3 px-4 py-4 sm:px-5">
            {withdrawals.length === 0 ? (
              <div className="rounded-[1rem] border border-dashed border-gray-200 p-6 text-center text-sm text-zinc-500 dark:border-zinc-800">
                No withdrawals requested yet.
              </div>
            ) : withdrawals.map((item) => (
              <div key={item._id} className="rounded-[1rem] border border-gray-100 bg-white/70 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(item.amount)}</p>
                    <p className="mt-1 text-xs text-zinc-500">{item.upiId}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${
                    item.status === 'completed'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
                      : item.status === 'rejected'
                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-300'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-300'
                  }`}>
                    {item.status}
                  </span>
                </div>
                <p className="mt-3 text-xs text-zinc-500">{formatDate(item.createdAt)}</p>
                {item.transactionId ? (
                  <p className="mt-2 text-xs font-medium text-zinc-600 dark:text-zinc-300">UTR / Txn: {item.transactionId}</p>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
