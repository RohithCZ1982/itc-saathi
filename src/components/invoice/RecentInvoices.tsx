// src/components/invoice/RecentInvoices.tsx
import Link from 'next/link'
import { FileText, ExternalLink } from 'lucide-react'
import { formatINR } from '@/lib/gst/engine'
import type { ExtractedInvoiceData } from '@/types'

interface InvoiceRow {
  id: string
  file_name: string
  status: string
  extracted_data: unknown
  uploaded_at: string
}

const STATUS_BADGE: Record<string, string> = {
  pending: 'badge-neutral',
  processing: 'badge-warning',
  extracted: 'badge-success',
  verified: 'badge-success',
  claimed: 'badge-info',
  rejected: 'badge-error',
  reconciled: 'badge-info',
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  processing: 'Processing',
  extracted: 'Extracted',
  verified: 'Verified',
  claimed: 'Claimed',
  rejected: 'Rejected',
  reconciled: 'Reconciled',
}

export function RecentInvoices({ invoices }: { invoices: InvoiceRow[] }) {
  if (invoices.length === 0) {
    return (
      <div className="card p-10 text-center">
        <FileText className="w-10 h-10 text-surface-300 dark:text-surface-600 mx-auto mb-3" />
        <p className="text-surface-500 font-medium">No invoices yet</p>
        <p className="text-surface-400 text-sm mt-1">
          Upload your first invoice to start claiming ITC
        </p>
        <Link href="/upload" className="btn-primary mt-4 inline-flex">
          Upload Invoice
        </Link>
      </div>
    )
  }

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 border-b border-surface-200 dark:border-surface-800 flex items-center justify-between">
        <h2 className="font-semibold text-surface-800 dark:text-surface-200">Recent Invoices</h2>
        <Link href="/upload" className="text-sm text-saffron-600 dark:text-saffron-400 hover:underline">
          Upload more
        </Link>
      </div>

      <div className="divide-y divide-surface-100 dark:divide-surface-800">
        {invoices.map((inv) => {
          const data = inv.extracted_data as ExtractedInvoiceData | null

          return (
            <div key={inv.id} className="px-5 py-4 flex items-center gap-4 hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
              {/* Icon */}
              <div className="w-9 h-9 rounded-lg bg-surface-100 dark:bg-surface-800 flex items-center justify-center flex-shrink-0">
                <FileText className="w-4 h-4 text-surface-500" />
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-surface-800 dark:text-surface-200 truncate">
                    {data?.invoiceNumber || inv.file_name}
                  </span>
                  <span className={STATUS_BADGE[inv.status] || 'badge-neutral'}>
                    {STATUS_LABEL[inv.status] || inv.status}
                  </span>
                  {data?.ocrUsed && (
                    <span className="badge badge-info">OCR</span>
                  )}
                </div>

                <div className="flex items-center gap-3 mt-0.5">
                  {data?.supplierName && (
                    <span className="text-xs text-surface-400 truncate max-w-[150px]">
                      {data.supplierName}
                    </span>
                  )}
                  {data?.invoiceDate && (
                    <span className="text-xs text-surface-400">
                      {new Date(data.invoiceDate).toLocaleDateString('en-IN')}
                    </span>
                  )}
                </div>
              </div>

              {/* ITC amount */}
              {data?.totalITCEligible !== undefined && (
                <div className="text-right flex-shrink-0">
                  <div className="num text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    {formatINR(data.totalITCEligible)}
                  </div>
                  <div className="text-xs text-surface-400">ITC eligible</div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {invoices.length >= 10 && (
        <div className="px-5 py-3 border-t border-surface-200 dark:border-surface-800 text-center">
          <Link href="/claims" className="text-sm text-saffron-600 dark:text-saffron-400 hover:underline">
            View all invoices →
          </Link>
        </div>
      )}
    </div>
  )
}
