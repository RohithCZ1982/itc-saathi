// src/components/invoice/InvoiceResultCard.tsx
import { CheckCircle2, AlertTriangle, Info, TrendingDown } from 'lucide-react'
import { formatINR } from '@/lib/gst/engine'
import type { ExtractedInvoiceData, LineItem } from '@/types'

interface Props {
  data: ExtractedInvoiceData
}

export function InvoiceResultCard({ data }: Props) {
  const hasRateCut = data.lineItems.some((i) => i.rateCutApplied)
  const blockedItems = data.lineItems.filter((i) => !i.itcEligible)
  const eligibleItems = data.lineItems.filter((i) => i.itcEligible)

  return (
    <div className="card overflow-hidden animate-slide-up">
      {/* Header */}
      <div className="px-5 py-4 border-b border-surface-200 dark:border-surface-800 flex items-start justify-between gap-4">
        <div>
          <div className="font-semibold text-surface-900 dark:text-surface-50">
            {data.invoiceNumber}
          </div>
          <div className="text-sm text-surface-500 mt-0.5 space-x-3">
            <span>{data.invoiceDate ? new Date(data.invoiceDate).toLocaleDateString('en-IN') : 'N/A'}</span>
            <span>·</span>
            <span className="truncate">{data.supplierName}</span>
          </div>
          {data.supplierGSTIN && (
            <div className="font-mono text-xs text-surface-400 mt-0.5">{data.supplierGSTIN}</div>
          )}
        </div>

        {/* Confidence badge */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <ConfidenceBadge confidence={data.extractionConfidence} />
          {data.ocrUsed && (
            <span className="badge badge-info text-[10px]">OCR</span>
          )}
        </div>
      </div>

      {/* Rate cut alert */}
      {hasRateCut && (
        <div className="mx-5 mt-4 flex items-start gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
          <TrendingDown className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <span className="font-semibold text-emerald-700 dark:text-emerald-300">
              Cement rate cut applied!
            </span>{' '}
            <span className="text-emerald-600 dark:text-emerald-400">
              GST recalculated at 18% (was 28%) for cement items on this invoice.
            </span>
          </div>
        </div>
      )}

      {/* ITC Summary */}
      <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <SummaryBox
          label="Taxable Value"
          value={formatINR(data.subtotal)}
        />
        <SummaryBox
          label="Total GST"
          value={formatINR(data.totalGST)}
        />
        <SummaryBox
          label="ITC Eligible"
          value={formatINR(data.totalITCEligible)}
          accent="green"
        />
        {blockedItems.length > 0 && (
          <SummaryBox
            label="Blocked ITC"
            value={formatINR(blockedItems.reduce((s, i) => s + i.cgst + i.sgst + i.igst, 0))}
            accent="red"
          />
        )}
      </div>

      {/* GST breakdown */}
      {(data.totalCGST > 0 || data.totalSGST > 0 || data.totalIGST > 0) && (
        <div className="px-5 pb-3 flex gap-4 text-xs font-mono text-surface-500">
          {data.totalCGST > 0 && <span>CGST: {formatINR(data.totalCGST)}</span>}
          {data.totalSGST > 0 && <span>SGST: {formatINR(data.totalSGST)}</span>}
          {data.totalIGST > 0 && <span>IGST: {formatINR(data.totalIGST)}</span>}
        </div>
      )}

      {/* Line items table */}
      <div className="border-t border-surface-200 dark:border-surface-800 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-surface-50 dark:bg-surface-800/50">
              <th className="text-left px-4 py-2.5 font-medium text-surface-500">Description</th>
              <th className="text-left px-3 py-2.5 font-medium text-surface-500">HSN</th>
              <th className="text-right px-3 py-2.5 font-medium text-surface-500">Taxable ₹</th>
              <th className="text-right px-3 py-2.5 font-medium text-surface-500">GST %</th>
              <th className="text-right px-3 py-2.5 font-medium text-surface-500">ITC ₹</th>
              <th className="text-center px-3 py-2.5 font-medium text-surface-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
            {data.lineItems.map((item) => (
              <tr
                key={item.id}
                className={`${!item.itcEligible ? 'opacity-60' : ''}`}
              >
                <td className="px-4 py-2.5">
                  <div className="font-medium text-surface-800 dark:text-surface-200 leading-tight max-w-[200px]">
                    {item.description || '—'}
                  </div>
                  {item.rateCutApplied && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                      <TrendingDown className="w-2.5 h-2.5" />
                      Rate cut 28%→18%
                    </span>
                  )}
                  {item.blockingReason && (
                    <div className="text-[10px] text-rose-500 mt-0.5">{item.blockingReason}</div>
                  )}
                </td>
                <td className="px-3 py-2.5 font-mono text-surface-600 dark:text-surface-400">
                  <div className="flex items-center gap-1">
                    {item.hsn}
                    {item.hsnValidated ? (
                      <span title="HSN validated">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      </span>
                    ) : (
                      <span title="HSN not in database">
                        <AlertTriangle className="w-3 h-3 text-amber-500" />
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-right num text-surface-700 dark:text-surface-300">
                  {formatINR(item.taxableValue)}
                </td>
                <td className="px-3 py-2.5 text-right num text-surface-600 dark:text-surface-400">
                  {item.gstRate}%
                </td>
                <td className={`px-3 py-2.5 text-right num font-medium ${item.itcEligible ? 'text-emerald-600 dark:text-emerald-400' : 'text-surface-400'}`}>
                  {item.itcEligible ? formatINR(item.itcAmount) : '—'}
                </td>
                <td className="px-3 py-2.5 text-center">
                  {item.itcEligible ? (
                    <span className="badge-success">Eligible</span>
                  ) : (
                    <span className="badge-error">Blocked</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals row */}
      <div className="px-5 py-3 border-t border-surface-200 dark:border-surface-800 flex justify-between items-center bg-surface-50 dark:bg-surface-800/30">
        <span className="text-sm font-semibold text-surface-700 dark:text-surface-300">
          Total ITC Claimable
        </span>
        <span className="num font-bold text-lg text-emerald-600 dark:text-emerald-400">
          {formatINR(data.totalITCEligible)}
        </span>
      </div>
    </div>
  )
}

function SummaryBox({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: 'green' | 'red' | 'orange'
}) {
  const valueColor =
    accent === 'green'
      ? 'text-emerald-600 dark:text-emerald-400'
      : accent === 'red'
      ? 'text-rose-600 dark:text-rose-400'
      : accent === 'orange'
      ? 'text-saffron-600 dark:text-saffron-400'
      : 'text-surface-800 dark:text-surface-200'

  return (
    <div>
      <div className="text-xs text-surface-400 mb-0.5">{label}</div>
      <div className={`num font-bold text-base ${valueColor}`}>{value}</div>
    </div>
  )
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100)
  const cls =
    pct >= 85 ? 'badge-success' : pct >= 65 ? 'badge-warning' : 'badge-error'
  const label = pct >= 85 ? 'High confidence' : pct >= 65 ? 'Medium confidence' : 'Low confidence'

  return (
    <span className={cls} title={label}>
      {pct}% confidence
    </span>
  )
}
