'use client'

// src/components/invoice/EditableInvoiceCard.tsx
// Wraps InvoiceResultCard with an edit mode for manual data correction

import { useState } from 'react'
import { Pencil, X, Save, Loader2, CheckCircle2, AlertTriangle, TrendingDown } from 'lucide-react'
import { formatINR } from '@/lib/gst/engine'
import toast from 'react-hot-toast'
import type { ExtractedInvoiceData, LineItem, GSTRate } from '@/types'

interface Props {
  invoiceId: string
  data: ExtractedInvoiceData
  onSaved?: (updated: ExtractedInvoiceData) => void
}

export function EditableInvoiceCard({ invoiceId, data: initialData, onSaved }: Props) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState<ExtractedInvoiceData>(initialData)
  const [draft, setDraft] = useState<ExtractedInvoiceData>(initialData)

  const startEdit = () => {
    setDraft(data)
    setEditing(true)
  }

  const cancelEdit = () => {
    setDraft(data)
    setEditing(false)
  }

  const updateDraftHeader = (field: keyof ExtractedInvoiceData, value: string) => {
    setDraft((d) => ({ ...d, [field]: value }))
  }

  const updateDraftLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    setDraft((d) => {
      const items = [...d.lineItems]
      items[index] = { ...items[index], [field]: value }
      // Recalculate GST for the item when rate changes
      if (field === 'gstRate' || field === 'taxableValue') {
        const rate = field === 'gstRate' ? Number(value) as GSTRate : items[index].gstRate
        const taxable = field === 'taxableValue' ? Number(value) : items[index].taxableValue
        const totalGST = (taxable * rate) / 100
        // Assume intra-state (CGST+SGST) if no IGST was present
        const wasIGST = items[index].igst > 0
        items[index] = {
          ...items[index],
          taxableValue: taxable,
          gstRate: rate,
          cgst: wasIGST ? 0 : totalGST / 2,
          sgst: wasIGST ? 0 : totalGST / 2,
          igst: wasIGST ? totalGST : 0,
          totalGST,
          itcAmount: items[index].itcEligible ? totalGST : 0,
        }
      }
      return { ...d, lineItems: items }
    })
  }

  const save = async () => {
    setSaving(true)
    try {
      // Recalculate totals from line items
      const totals = draft.lineItems.reduce(
        (acc, item) => ({
          subtotal: acc.subtotal + item.taxableValue,
          totalCGST: acc.totalCGST + item.cgst,
          totalSGST: acc.totalSGST + item.sgst,
          totalIGST: acc.totalIGST + item.igst,
          totalGST: acc.totalGST + item.totalGST,
          totalAmount: acc.totalAmount + item.taxableValue + item.totalGST,
          totalITCEligible: acc.totalITCEligible + (item.itcEligible ? item.itcAmount : 0),
        }),
        { subtotal: 0, totalCGST: 0, totalSGST: 0, totalIGST: 0, totalGST: 0, totalAmount: 0, totalITCEligible: 0 }
      )

      const updated: ExtractedInvoiceData = { ...draft, ...totals }

      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extractedData: updated }),
      })

      if (!res.ok) throw new Error('Failed to save')

      setData(updated)
      setEditing(false)
      toast.success('Invoice data saved')
      onSaved?.(updated)
    } catch {
      toast.error('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  const current = editing ? draft : data
  const blockedItems = current.lineItems.filter((i) => !i.itcEligible)
  const hasRateCut = current.lineItems.some((i) => i.rateCutApplied)

  return (
    <div className="card overflow-hidden animate-slide-up">
      {/* Header */}
      <div className="px-5 py-4 border-b border-surface-200 dark:border-surface-800 flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="space-y-2">
              <input
                className="input-base text-sm font-semibold"
                value={draft.invoiceNumber}
                onChange={(e) => updateDraftHeader('invoiceNumber', e.target.value)}
                placeholder="Invoice Number"
              />
              <div className="flex gap-2">
                <input
                  type="date"
                  className="input-base text-sm flex-1"
                  value={draft.invoiceDate?.slice(0, 10) ?? ''}
                  onChange={(e) => updateDraftHeader('invoiceDate', e.target.value)}
                />
                <input
                  className="input-base text-sm flex-1 font-mono"
                  value={draft.supplierGSTIN}
                  onChange={(e) => updateDraftHeader('supplierGSTIN', e.target.value.toUpperCase())}
                  placeholder="Supplier GSTIN"
                  maxLength={15}
                />
              </div>
              <input
                className="input-base text-sm"
                value={draft.supplierName}
                onChange={(e) => updateDraftHeader('supplierName', e.target.value)}
                placeholder="Supplier Name"
              />
            </div>
          ) : (
            <>
              <div className="font-semibold text-surface-900 dark:text-surface-50">
                {current.invoiceNumber}
              </div>
              <div className="text-sm text-surface-500 mt-0.5 space-x-3">
                <span>{current.invoiceDate ? new Date(current.invoiceDate).toLocaleDateString('en-IN') : 'N/A'}</span>
                <span>·</span>
                <span>{current.supplierName}</span>
              </div>
              {current.supplierGSTIN && (
                <div className="font-mono text-xs text-surface-400 mt-0.5">{current.supplierGSTIN}</div>
              )}
            </>
          )}
        </div>

        {/* Edit / Save / Cancel buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {!editing ? (
            <button
              onClick={startEdit}
              className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </button>
          ) : (
            <>
              <button
                onClick={cancelEdit}
                className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-surface-200 dark:border-surface-700 text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-saffron-500 hover:bg-saffron-600 text-white font-medium transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save
              </button>
            </>
          )}
        </div>
      </div>

      {/* Rate cut alert */}
      {hasRateCut && (
        <div className="mx-5 mt-4 flex items-start gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
          <TrendingDown className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-emerald-600 dark:text-emerald-400">
            <span className="font-semibold text-emerald-700 dark:text-emerald-300">Cement rate cut applied!</span>{' '}
            GST recalculated at 18% (was 28%) for cement items on this invoice.
          </p>
        </div>
      )}

      {/* ITC Summary */}
      <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <SummaryBox label="Taxable Value" value={formatINR(current.subtotal)} />
        <SummaryBox label="Total GST" value={formatINR(current.totalGST)} />
        <SummaryBox label="ITC Eligible" value={formatINR(current.totalITCEligible)} accent="green" />
        {blockedItems.length > 0 && (
          <SummaryBox
            label="Blocked ITC"
            value={formatINR(blockedItems.reduce((s, i) => s + i.cgst + i.sgst + i.igst, 0))}
            accent="red"
          />
        )}
      </div>

      {/* GST breakdown */}
      {(current.totalCGST > 0 || current.totalSGST > 0 || current.totalIGST > 0) && (
        <div className="px-5 pb-3 flex gap-4 text-xs font-mono text-surface-500">
          {current.totalCGST > 0 && <span>CGST: {formatINR(current.totalCGST)}</span>}
          {current.totalSGST > 0 && <span>SGST: {formatINR(current.totalSGST)}</span>}
          {current.totalIGST > 0 && <span>IGST: {formatINR(current.totalIGST)}</span>}
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
            {current.lineItems.map((item, idx) => (
              <tr key={item.id} className={!item.itcEligible ? 'opacity-60' : ''}>
                <td className="px-4 py-2.5 max-w-[180px]">
                  {editing ? (
                    <input
                      className="input-base text-xs py-1"
                      value={draft.lineItems[idx]?.description ?? ''}
                      onChange={(e) => updateDraftLineItem(idx, 'description', e.target.value)}
                    />
                  ) : (
                    <div className="font-medium text-surface-800 dark:text-surface-200 leading-tight">
                      {item.description || '—'}
                    </div>
                  )}
                  {item.blockingReason && (
                    <div className="text-[10px] text-rose-500 mt-0.5">{item.blockingReason}</div>
                  )}
                </td>
                <td className="px-3 py-2.5 font-mono text-surface-600 dark:text-surface-400">
                  {editing ? (
                    <input
                      className="input-base text-xs py-1 w-20 font-mono"
                      value={draft.lineItems[idx]?.hsn ?? ''}
                      onChange={(e) => updateDraftLineItem(idx, 'hsn', e.target.value)}
                      maxLength={8}
                    />
                  ) : (
                    <div className="flex items-center gap-1">
                      {item.hsn}
                      {item.hsnValidated
                        ? <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        : <AlertTriangle className="w-3 h-3 text-amber-500" />
                      }
                    </div>
                  )}
                </td>
                <td className="px-3 py-2.5 text-right">
                  {editing ? (
                    <input
                      type="number"
                      className="input-base text-xs py-1 w-24 text-right"
                      value={draft.lineItems[idx]?.taxableValue ?? 0}
                      onChange={(e) => updateDraftLineItem(idx, 'taxableValue', e.target.value)}
                    />
                  ) : (
                    <span className="num text-surface-700 dark:text-surface-300">{formatINR(item.taxableValue)}</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-right">
                  {editing ? (
                    <select
                      className="input-base text-xs py-1 w-16"
                      value={draft.lineItems[idx]?.gstRate ?? 18}
                      onChange={(e) => updateDraftLineItem(idx, 'gstRate', Number(e.target.value))}
                    >
                      {[5, 12, 18, 28].map((r) => (
                        <option key={r} value={r}>{r}%</option>
                      ))}
                    </select>
                  ) : (
                    <span className="num text-surface-600 dark:text-surface-400">{item.gstRate}%</span>
                  )}
                </td>
                <td className={`px-3 py-2.5 text-right num font-medium ${item.itcEligible ? 'text-emerald-600 dark:text-emerald-400' : 'text-surface-400'}`}>
                  {item.itcEligible ? formatINR(item.itcAmount) : '—'}
                </td>
                <td className="px-3 py-2.5 text-center">
                  {item.itcEligible
                    ? <span className="badge-success">Eligible</span>
                    : <span className="badge-error">Blocked</span>
                  }
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
          {formatINR(current.totalITCEligible)}
        </span>
      </div>
    </div>
  )
}

function SummaryBox({ label, value, accent }: { label: string; value: string; accent?: 'green' | 'red' }) {
  const valueColor = accent === 'green'
    ? 'text-emerald-600 dark:text-emerald-400'
    : accent === 'red'
    ? 'text-rose-600 dark:text-rose-400'
    : 'text-surface-800 dark:text-surface-200'
  return (
    <div>
      <div className="text-xs text-surface-400 mb-0.5">{label}</div>
      <div className={`num font-bold text-base ${valueColor}`}>{value}</div>
    </div>
  )
}
