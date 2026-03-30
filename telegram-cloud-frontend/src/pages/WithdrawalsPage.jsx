import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, Landmark, ShieldCheck, Wallet } from 'lucide-react'
import toast from 'react-hot-toast'
import { walletAPI, withdrawalAPI } from '../services/api'
import { formatCurrency, formatDate } from '../utils/helpers'

export default function WithdrawalsPage() {
  const qc = useQueryClient()
  const [form, setForm] = useState({ amount: '', upiId: '' })
  const { data } = useQuery({
    queryKey: ['wallet'],
    queryFn: () => walletAPI.get().then((res) => res.data.data),
  })

  useEffect(() => {
    if (data?.summary?.defaultUpiId) {
      setForm((prev) => ({ ...prev, upiId: prev.upiId || data.summary.defaultUpiId }))
    }
  }, [data])

  const mutation = useMutation({
    mutationFn: () => withdrawalAPI.create({
      amount: Number(form.amount),
      upiId: form.upiId.trim(),
    }),
    onSuccess: () => {
      toast.success('Withdrawal request created')
      setForm((prev) => ({ ...prev, amount: '' }))
      qc.invalidateQueries({ queryKey: ['wallet'] })
      qc.invalidateQueries({ queryKey: ['withdrawals'] })
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to create withdrawal request')
    },
  })

  const { data: withdrawalsData } = useQuery({
    queryKey: ['withdrawals'],
    queryFn: () => withdrawalAPI.list().then((res) => res.data.data),
  })

  const summary = data?.summary
  const withdrawals = withdrawalsData?.withdrawals || []

  return (
    <div className="app-page space-y-5 pt-1">
      <section className="app-hero">
        <p className="app-kicker">Payout Desk</p>
        <h1 className="mt-2 text-[2rem] font-display font-bold tracking-tight text-gray-900 dark:text-white sm:text-[2.35rem]">
          Withdrawals
        </h1>
        <p className="app-subtitle">
          Request creator payouts to your UPI ID and monitor approval, rejection, and completion states from one place.
        </p>
      </section>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="app-panel p-5">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="app-section-title">Create Withdrawal Request</h2>
              <p className="mt-1 text-xs text-zinc-500">Available balance: {formatCurrency(summary?.walletBalance)}</p>
            </div>
            <div className="rounded-2xl bg-indigo-500/10 p-3 text-indigo-600 dark:text-indigo-300">
              <Landmark size={18} />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">Amount</label>
              <div className="relative">
                <Wallet size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="number"
                  min="500"
                  value={form.amount}
                  onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                  className="app-input-surface h-11 pl-10"
                  placeholder="500"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">UPI ID</label>
              <input
                type="text"
                value={form.upiId}
                onChange={(e) => setForm((prev) => ({ ...prev, upiId: e.target.value }))}
                className="app-input-surface h-11"
                placeholder="creator@upi"
              />
            </div>

            <div className="rounded-[1.1rem] border border-emerald-200 bg-emerald-50/80 p-4 text-xs text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
              <p className="font-bold uppercase tracking-[0.16em]">Protection</p>
              <p className="mt-2 leading-relaxed">
                Withdrawal amounts are reserved immediately after request creation so the same earnings cannot be withdrawn twice.
              </p>
            </div>

            <button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || !form.amount || !form.upiId}
              className="app-button-primary w-full justify-center px-4 py-3 text-xs disabled:opacity-60"
            >
              {mutation.isPending ? 'Submitting...' : 'Submit Withdrawal'}
              <ArrowRight size={14} />
            </button>
          </div>
        </section>

        <section className="app-panel overflow-hidden">
          <div className="border-b border-gray-100 px-4 py-4 dark:border-zinc-800 sm:px-5">
            <h2 className="app-section-title">Request Timeline</h2>
            <p className="mt-1 text-xs text-zinc-500">Pending requests stay reserved until rejected or completed by admin.</p>
          </div>
          <div className="space-y-3 px-4 py-4 sm:px-5">
            {withdrawals.length === 0 ? (
              <div className="rounded-[1rem] border border-dashed border-gray-200 p-6 text-center text-sm text-zinc-500 dark:border-zinc-800">
                No payout requests yet.
              </div>
            ) : withdrawals.map((item) => (
              <div key={item._id} className="rounded-[1rem] border border-gray-100 bg-white/70 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(item.amount)}</p>
                    <p className="mt-1 text-xs text-zinc-500">{item.upiId}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${
                    item.status === 'completed'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
                      : item.status === 'rejected'
                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-300'
                        : item.status === 'approved'
                          ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-300'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-300'
                  }`}>
                    {item.status}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                  <span>{formatDate(item.createdAt)}</span>
                  {item.transactionId ? <span>UTR: {item.transactionId}</span> : null}
                  {item.status === 'completed' ? (
                    <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-300">
                      <ShieldCheck size={12} /> Paid
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
