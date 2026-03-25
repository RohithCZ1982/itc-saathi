// src/components/gst/RateCutBanner.tsx
'use client'

import { useState } from 'react'
import { TrendingDown, X, Info } from 'lucide-react'
import { RATE_CUT_DATE } from '@/lib/gst/engine'

export function RateCutBanner() {
  const [dismissed, setDismissed] = useState(false)
  const now = new Date()
  const isAfterCut = now >= RATE_CUT_DATE

  if (dismissed) return null

  return (
    <div className={`relative rounded-xl p-4 border flex items-start gap-3 ${
      isAfterCut
        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
        : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
    }`}>
      <TrendingDown className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
        isAfterCut ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
      }`} />
      <div className="flex-1 min-w-0">
        <p className={`font-semibold text-sm ${
          isAfterCut ? 'text-emerald-800 dark:text-emerald-300' : 'text-amber-800 dark:text-amber-300'
        }`}>
          {isAfterCut
            ? '🎉 Cement GST rate cut is active — claim your savings!'
            : '⏰ Upcoming: Cement GST rate cut on 22 September 2025'}
        </p>
        <p className={`text-xs mt-1 ${
          isAfterCut ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'
        }`}>
          {isAfterCut
            ? 'GST on cement reduced from 28% to 18% effective 22 Sep 2025 (GST Council 54th meeting). All cement invoices from that date onwards are auto-calculated at 18%.'
            : 'GST on cement will be reduced from 28% to 18% from 22 September 2025. Start uploading invoices now to be ready.'}
        </p>
        {isAfterCut && (
          <p className="text-xs mt-1 text-emerald-600 dark:text-emerald-500 font-medium">
            Saving: ₹10 per ₹100 taxable value on cement. On ₹1 crore cement, that's ₹10 lakh ITC extra.
          </p>
        )}
      </div>
      <button
        onClick={() => setDismissed(true)}
        className={`flex-shrink-0 p-1 rounded-md transition-colors ${
          isAfterCut
            ? 'text-emerald-500 hover:bg-emerald-100 dark:hover:bg-emerald-900/30'
            : 'text-amber-500 hover:bg-amber-100 dark:hover:bg-amber-900/30'
        }`}
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
