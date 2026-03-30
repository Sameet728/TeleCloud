import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { BarChart3, Eye, Image, Layers3, Wallet, Clock3 } from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
  BarChart,
  Bar,
} from 'recharts'
import { analyticsAPI } from '../services/api'
import { formatCurrency, formatDateShort } from '../utils/helpers'

const RANGE_OPTIONS = [
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
]

function StatCard({ icon: Icon, label, value, tone = 'indigo' }) {
  const tones = {
    indigo: 'text-indigo-600 dark:text-indigo-300',
    emerald: 'text-emerald-600 dark:text-emerald-300',
    amber: 'text-amber-600 dark:text-amber-300',
    rose: 'text-rose-600 dark:text-rose-300',
    cyan: 'text-cyan-600 dark:text-cyan-300',
  }

  return (
    <div className="app-panel-muted p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{value}</p>
        </div>
        <div className={`rounded-2xl bg-white/70 p-3 shadow-sm dark:bg-white/10 ${tones[tone] || tones.indigo}`}>
          <Icon size={18} />
        </div>
      </div>
    </div>
  )
}

export default function AnalyticsDashboard() {
  const [range, setRange] = useState('30d')
  const { data, isLoading } = useQuery({
    queryKey: ['creator-analytics', range],
    queryFn: () => analyticsAPI.get({ range }).then((res) => res.data.data),
    staleTime: 60_000,
  })

  const overview = data?.overview
  const earningsSeries = data?.charts?.earnings || []
  const viewsSeries = data?.charts?.views || []
  const topFiles = data?.charts?.topFiles || []
  const files = data?.files || []

  return (
    <div className="app-page space-y-5 pt-1">
      <section className="app-hero flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="app-kicker">Creator Earnings</p>
          <h1 className="mt-2 text-[2rem] font-display font-bold tracking-tight text-gray-900 dark:text-white sm:text-[2.35rem]">
            Analytics
          </h1>
          <p className="app-subtitle">
            Track estimated earnings, view velocity, ad impressions, and the files driving your daily revenue share.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setRange(option.value)}
              className={`rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] transition-all ${
                range === option.value
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                  : 'border border-gray-200 bg-white text-zinc-600 hover:border-indigo-300 hover:text-indigo-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Estimated Earnings" value={isLoading ? '...' : formatCurrency(overview?.estimatedEarnings)} icon={BarChart3} />
        <StatCard label="Total Views" value={isLoading ? '...' : (overview?.totalViews || 0).toLocaleString('en-IN')} icon={Eye} tone="emerald" />
        <StatCard label="Impressions" value={isLoading ? '...' : (overview?.totalImpressions || 0).toLocaleString('en-IN')} icon={Image} tone="amber" />
        <StatCard label="Files Uploaded" value={isLoading ? '...' : (overview?.totalFilesUploaded || 0).toLocaleString('en-IN')} icon={Layers3} tone="cyan" />
        <StatCard label="Wallet Balance" value={isLoading ? '...' : formatCurrency(overview?.walletBalance)} icon={Wallet} tone="rose" />
        <StatCard
          label="Pending Withdrawals"
          value={isLoading ? '...' : `${formatCurrency(overview?.pendingWithdrawalsAmount)} | ${overview?.pendingWithdrawalsCount || 0}`}
          icon={Clock3}
          tone="indigo"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="app-panel p-4 sm:p-5">
          <div className="mb-4">
            <h2 className="app-section-title">Estimated Earnings Over Time</h2>
            <p className="mt-1 text-xs text-zinc-500">Creator share after the 70% payout split, based on tracked ad impressions.</p>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={earningsSeries}>
                <defs>
                  <linearGradient id="earningsFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={(value) => `Rs ${value}`} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip formatter={(value) => formatCurrency(value)} labelFormatter={(label) => formatDateShort(label)} />
                <Area type="monotone" dataKey="amount" stroke="#4f46e5" fill="url(#earningsFill)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="app-panel p-4 sm:p-5">
          <div className="mb-4">
            <h2 className="app-section-title">Views vs Impressions</h2>
            <p className="mt-1 text-xs text-zinc-500">Use impressions as the settlement driver and views as the audience health signal.</p>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={viewsSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip labelFormatter={(label) => formatDateShort(label)} />
                <Bar dataKey="count" name="Views" fill="#10b981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="impressions" name="Impressions" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.section>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_1.2fr]">
        <section className="app-panel p-4 sm:p-5">
          <div className="mb-4">
            <h2 className="app-section-title">Top Performing Files</h2>
            <p className="mt-1 text-xs text-zinc-500">Files ranked by creator earnings, then impressions.</p>
          </div>
          <div className="space-y-2">
            {topFiles.length === 0 ? (
              <div className="rounded-[1.3rem] border border-dashed border-gray-200 p-6 text-center text-sm text-zinc-500 dark:border-zinc-800">
                No monetized traffic yet.
              </div>
            ) : topFiles.map((file, index) => (
              <div key={file.fileId} className="flex items-center justify-between gap-3 rounded-[1rem] border border-gray-100 bg-white/70 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/60">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-400">#{index + 1}</p>
                  <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{file.fileName}</p>
                  <p className="mt-1 text-[11px] text-zinc-500">
                    {file.impressions.toLocaleString('en-IN')} impressions | {file.views.toLocaleString('en-IN')} views
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(file.userEarning)}</p>
                  <p className="text-[11px] text-zinc-500">Gross {formatCurrency(file.estimatedRevenue)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="app-panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-4 dark:border-zinc-800 sm:px-5">
            <div>
              <h2 className="app-section-title">Per File Analytics</h2>
              <p className="mt-1 text-xs text-zinc-500">Estimated values refresh after each admin revenue settlement update.</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="bg-gray-50/80 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500 dark:bg-zinc-900/70">
                <tr>
                  <th className="px-4 py-3 sm:px-5">File</th>
                  <th className="px-4 py-3">Views</th>
                  <th className="px-4 py-3">Impressions</th>
                  <th className="px-4 py-3">Revenue</th>
                  <th className="px-4 py-3">Your 70%</th>
                  <th className="px-4 py-3 sm:px-5">Uploaded</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                {files.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-zinc-500 sm:px-5">
                      No files have generated analytics yet.
                    </td>
                  </tr>
                ) : files.map((file) => (
                  <tr key={file.fileId} className="text-sm text-zinc-600 dark:text-zinc-300">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white sm:px-5">{file.fileName}</td>
                    <td className="px-4 py-3">{file.views.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3">{file.impressions.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3">{formatCurrency(file.estimatedRevenue)}</td>
                    <td className="px-4 py-3 font-semibold text-indigo-600 dark:text-indigo-300">{formatCurrency(file.userEarning)}</td>
                    <td className="px-4 py-3 sm:px-5">{formatDateShort(file.uploadDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}
