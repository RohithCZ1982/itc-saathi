export const dynamic = 'force-dynamic'

// src/app/dashboard/page.tsx
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { DashboardStats } from '@/components/invoice/DashboardStats'
import { RateCutBanner } from '@/components/gst/RateCutBanner'
import { RecentInvoices } from '@/components/invoice/RecentInvoices'
import { QuickUpload } from '@/components/invoice/QuickUpload'
import Link from 'next/link'
import { Upload, FileBarChart } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // Fetch stats
  const [invoicesRes, claimsRes] = await Promise.all([
    (supabase.from('invoices') as any)
      .select('id, file_name, status, extracted_data, uploaded_at')
      .eq('user_id', user.id)
      .order('uploaded_at', { ascending: false })
      .limit(10),
    (supabase.from('itc_claims') as any)
      .select('id, period, net_itc, total_itc, status')
      .eq('user_id', user.id)
      .order('period', { ascending: false })
      .limit(3),
  ])

  const invoices = (invoicesRes.data || []) as Array<{ id: string; status: string; extracted_data: unknown; uploaded_at: string }>
  const claims = (claimsRes.data || []) as Array<{ id: string; period: string; net_itc: number; total_itc: number; status: string }>

  // Aggregate stats
  const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
  const pendingCount = invoices.filter((i) => ['pending', 'processing'].includes(i.status)).length
  const currentClaim = claims.find((c) => c.period === currentMonth)
  const totalEligibleAllTime = claims.reduce((sum, c) => sum + (Number(c.net_itc) || 0), 0)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Rate cut banner */}
      <RateCutBanner />

      {/* Stats grid */}
      <DashboardStats
        totalITC={totalEligibleAllTime}
        pendingCount={pendingCount}
        currentMonthITC={currentClaim?.net_itc ? Number(currentClaim.net_itc) : 0}
      />

      {/* Action buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/upload"
          className="card p-5 flex items-center gap-4 hover:border-saffron-400 dark:hover:border-saffron-600 transition-colors group"
        >
          <div className="w-12 h-12 rounded-xl bg-saffron-100 dark:bg-saffron-900/30 flex items-center justify-center group-hover:bg-saffron-200 dark:group-hover:bg-saffron-900/50 transition-colors">
            <Upload className="w-6 h-6 text-saffron-600 dark:text-saffron-400" />
          </div>
          <div>
            <div className="font-semibold text-surface-900 dark:text-surface-50">Upload Invoice</div>
            <div className="text-sm text-surface-500">PDF or image, digital or scanned</div>
          </div>
        </Link>

        <Link
          href="/claims"
          className="card p-5 flex items-center gap-4 hover:border-emerald-400 dark:hover:border-emerald-600 transition-colors group"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center group-hover:bg-emerald-200 dark:group-hover:bg-emerald-900/50 transition-colors">
            <FileBarChart className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <div className="font-semibold text-surface-900 dark:text-surface-50">Generate GSTR-3B Report</div>
            <div className="text-sm text-surface-500">Export Table 4A data for filing</div>
          </div>
        </Link>
      </div>

      {/* Recent invoices */}
      <RecentInvoices invoices={invoices as Parameters<typeof RecentInvoices>[0]['invoices']} />
    </div>
  )
}
