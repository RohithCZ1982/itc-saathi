// src/components/invoice/DashboardStats.tsx
import { formatINR } from '@/lib/gst/engine'
import { TrendingUp, Clock, CheckCircle, IndianRupee } from 'lucide-react'

interface Props {
  totalITC: number
  pendingCount: number
  currentMonthITC: number
}

export function DashboardStats({ totalITC, pendingCount, currentMonthITC }: Props) {
  const stats = [
    {
      label: 'Total ITC Eligible',
      value: formatINR(totalITC),
      icon: IndianRupee,
      color: 'text-saffron-600 dark:text-saffron-400',
      bg: 'bg-saffron-50 dark:bg-saffron-900/20',
      description: 'All-time eligible input tax credit',
    },
    {
      label: 'This Month',
      value: formatINR(currentMonthITC),
      icon: TrendingUp,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      description: 'Current return period ITC',
    },
    {
      label: 'Pending Processing',
      value: String(pendingCount),
      icon: Clock,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      description: 'Invoices awaiting extraction',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {stats.map((stat) => (
        <div key={stat.label} className="card p-5">
          <div className="flex items-start justify-between mb-3">
            <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
          </div>
          <div className={`num font-bold text-2xl ${stat.color} mb-0.5`}>
            {stat.value}
          </div>
          <div className="text-sm font-medium text-surface-700 dark:text-surface-300">
            {stat.label}
          </div>
          <div className="text-xs text-surface-400 mt-0.5">{stat.description}</div>
        </div>
      ))}
    </div>
  )
}
