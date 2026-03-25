// src/app/claims/page.tsx
'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { FileBarChart, Download, Loader2, Plus, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import { formatINR } from '@/lib/gst/engine'
import type { ITCClaim, GSTR3BData } from '@/types'

// Generate last 12 months for period selector
function getRecentPeriods(): { value: string; label: string }[] {
  const periods = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = d.toISOString().slice(0, 7)
    const label = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    periods.push({ value, label })
  }
  return periods
}

export default function ClaimsPage() {
  const [claims, setClaims] = useState<ITCClaim[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [exporting, setExporting] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState(() => new Date().toISOString().slice(0, 7))

  const periods = getRecentPeriods()

  useEffect(() => {
    fetchClaims()
  }, [])

  async function fetchClaims() {
    setLoading(true)
    try {
      const res = await fetch('/api/claims')
      const { data } = await res.json()
      setClaims(data?.claims || [])
    } catch {
      toast.error('Failed to load claims')
    } finally {
      setLoading(false)
    }
  }

  async function generateClaim() {
    setGenerating(true)
    try {
      const res = await fetch('/api/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period: selectedPeriod }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to generate claim')
      }

      toast.success('ITC claim generated successfully')
      await fetchClaims()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  async function exportClaim(claimId: string, format: 'excel' | 'json' | 'csv') {
    setExporting(`${claimId}-${format}`)
    try {
      const res = await fetch(`/api/export?claimId=${claimId}&format=${format}`)
      if (!res.ok) throw new Error('Export failed')

      const blob = await res.blob()
      const ext = format === 'excel' ? 'xlsx' : format
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ITC_Saathi_${format.toUpperCase()}.${ext}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success(`Exported as ${format.toUpperCase()}`)
    } catch {
      toast.error('Export failed')
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display font-bold text-2xl sm:text-3xl text-surface-900 dark:text-surface-50">
          ITC Claims
        </h1>
        <p className="text-surface-500 mt-1">
          Generate period-wise ITC claims and export GSTR-3B ready data
        </p>
      </div>

      {/* Generate claim */}
      <div className="card p-5">
        <h2 className="font-semibold text-surface-800 dark:text-surface-200 mb-4">
          Generate New Claim
        </h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="input-base flex-1"
          >
            {periods.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <button
            onClick={generateClaim}
            disabled={generating}
            className="btn-primary whitespace-nowrap"
          >
            {generating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            {generating ? 'Generating...' : 'Generate Claim'}
          </button>
        </div>
        <p className="text-xs text-surface-400 mt-2">
          Aggregates all verified invoices for the selected period
        </p>
      </div>

      {/* Claims list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-5 h-32 shimmer" />
          ))}
        </div>
      ) : claims.length === 0 ? (
        <div className="card p-12 text-center">
          <FileBarChart className="w-10 h-10 text-surface-300 dark:text-surface-600 mx-auto mb-3" />
          <p className="text-surface-500 font-medium">No claims yet</p>
          <p className="text-surface-400 text-sm mt-1">
            Process invoices then generate your first ITC claim above
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {claims.map((claim) => {
            const gstr3b = claim.gstr3bData as GSTR3BData
            return (
              <div key={claim.id} className="card p-5 animate-slide-up">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="font-display font-semibold text-lg text-surface-900 dark:text-surface-50">
                        {formatPeriod(claim.period)}
                      </h3>
                      <ClaimStatusBadge status={claim.status} />
                    </div>

                    {/* GSTR-3B Summary */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                      <MetricBox label="Net ITC" value={formatINR(Number(claim.netITC))} accent />
                      <MetricBox label="IGST" value={formatINR(Number(claim.totalIGST))} />
                      <MetricBox label="CGST" value={formatINR(Number(claim.totalCGST))} />
                      <MetricBox label="SGST" value={formatINR(Number(claim.totalSGST))} />
                    </div>

                    {/* GSTR-3B Table preview */}
                    {gstr3b && (
                      <div className="rounded-lg bg-surface-50 dark:bg-surface-800/50 p-3 text-xs">
                        <div className="font-medium text-surface-600 dark:text-surface-400 mb-2">
                          GSTR-3B Table 4A (Eligible ITC)
                        </div>
                        <div className="grid grid-cols-3 gap-2 font-mono text-surface-700 dark:text-surface-300">
                          <span>IGST: {formatINR(gstr3b.table4A?.integrated || 0)}</span>
                          <span>CGST: {formatINR(gstr3b.table4A?.central || 0)}</span>
                          <span>SGST: {formatINR(gstr3b.table4A?.state || 0)}</span>
                        </div>
                        {(gstr3b.table4D?.section17_5 || 0) > 0 && (
                          <div className="mt-2 text-rose-600 dark:text-rose-400">
                            Table 4D (Blocked): {formatINR(gstr3b.table4D.section17_5)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Export buttons */}
                  <div className="flex sm:flex-col gap-2 flex-shrink-0">
                    {(['excel', 'json', 'csv'] as const).map((fmt) => (
                      <button
                        key={fmt}
                        onClick={() => exportClaim(claim.id, fmt)}
                        disabled={exporting === `${claim.id}-${fmt}`}
                        className="btn-secondary text-xs py-1.5 px-3"
                        title={`Export as ${fmt.toUpperCase()}`}
                      >
                        {exporting === `${claim.id}-${fmt}` ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Download className="w-3 h-3" />
                        )}
                        {fmt.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Explainer */}
      <div className="card p-4 bg-amber-50/50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800">
        <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-2">
          How to use this for GSTR-3B
        </h3>
        <ol className="text-xs text-amber-700 dark:text-amber-400 space-y-1 list-decimal list-inside">
          <li>Generate claim for the relevant return period</li>
          <li>Copy Table 4A values (IGST, CGST, SGST) into your GSTR-3B Table 4A</li>
          <li>Enter any blocked ITC in Table 4D if applicable</li>
          <li>Export Excel/JSON for your Chartered Accountant's records</li>
          <li>Always verify totals match your GSTR-2B before filing</li>
        </ol>
      </div>
    </div>
  )
}

function formatPeriod(period: string): string {
  const [year, month] = period.split('-')
  return new Date(parseInt(year), parseInt(month) - 1, 1)
    .toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

function ClaimStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    draft: { label: 'Draft', className: 'badge-neutral', icon: <Clock className="w-3 h-3" /> },
    ready: { label: 'Ready', className: 'badge-success', icon: <CheckCircle2 className="w-3 h-3" /> },
    filed: { label: 'Filed', className: 'badge-info', icon: <CheckCircle2 className="w-3 h-3" /> },
    adjusted: { label: 'Adjusted', className: 'badge-warning', icon: <AlertCircle className="w-3 h-3" /> },
  }
  const s = map[status] || map.draft
  return (
    <span className={s.className}>
      {s.icon}
      {s.label}
    </span>
  )
}

function MetricBox({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div className="text-xs text-surface-500 mb-0.5">{label}</div>
      <div className={`num font-bold text-sm ${accent ? 'text-saffron-600 dark:text-saffron-400' : 'text-surface-800 dark:text-surface-200'}`}>
        {value}
      </div>
    </div>
  )
}
