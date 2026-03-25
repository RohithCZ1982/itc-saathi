// src/lib/gst/engine.ts
// Core GST rate table and ITC calculation engine.
// Rate cut effective 22 September 2025 per GST Council 54th meeting.
// Cement: 28% → 18%, Steel: already 18%, Bricks/Tiles/Sand: 5%.

import type {
  HSNEntry,
  GSTRate,
  ITCRateInfo,
  LineItem,
  ExtractedInvoiceData,
  MaterialCategory,
  GSTR3BData,
} from '@/types'

// ─── Rate Cut Date ─────────────────────────────────────────────────────────
export const RATE_CUT_DATE = new Date('2025-09-22T00:00:00+05:30') // IST midnight

// ─── HSN Master Table ──────────────────────────────────────────────────────
// Source: GST rate schedule, CBIC notifications, 54th GST Council
// Covers all major construction materials used on Indian sites

export const HSN_TABLE: HSNEntry[] = [
  // ── CEMENT ───────────────────────────────────────────────────────────────
  {
    hsn: '2523',
    description: 'Portland cement, aluminous cement, slag cement, supersulphate cement',
    material: 'cement',
    rateBefore: 28,
    rateAfter: 18,
    itcEligible: true,
  },
  {
    hsn: '25231000',
    description: 'Cement clinkers',
    material: 'cement',
    rateBefore: 28,
    rateAfter: 18,
    itcEligible: true,
  },
  {
    hsn: '25232100',
    description: 'White Portland cement',
    material: 'cement',
    rateBefore: 28,
    rateAfter: 18,
    itcEligible: true,
  },
  {
    hsn: '25232900',
    description: 'Other Portland cement',
    material: 'cement',
    rateBefore: 28,
    rateAfter: 18,
    itcEligible: true,
  },
  {
    hsn: '25233000',
    description: 'Aluminous cement',
    material: 'cement',
    rateBefore: 28,
    rateAfter: 18,
    itcEligible: true,
  },
  {
    hsn: '25239000',
    description: 'Other hydraulic cements',
    material: 'cement',
    rateBefore: 28,
    rateAfter: 18,
    itcEligible: true,
  },

  // ── STEEL / TMT BARS ──────────────────────────────────────────────────────
  {
    hsn: '7213',
    description: 'Bars and rods, hot-rolled, in irregularly wound coils, of iron / non-alloy steel',
    material: 'steel',
    rateBefore: 18,
    rateAfter: 18,
    itcEligible: true,
  },
  {
    hsn: '7214',
    description: 'Other bars and rods of iron / non-alloy steel (TMT bars)',
    material: 'steel',
    rateBefore: 18,
    rateAfter: 18,
    itcEligible: true,
  },
  {
    hsn: '72141000',
    description: 'Forged bars / rods of iron / non-alloy steel',
    material: 'steel',
    rateBefore: 18,
    rateAfter: 18,
    itcEligible: true,
  },
  {
    hsn: '72142000',
    description: 'TMT bars of iron / non-alloy steel',
    material: 'steel',
    rateBefore: 18,
    rateAfter: 18,
    itcEligible: true,
  },
  {
    hsn: '72149100',
    description: 'Concrete reinforcing bar (rebar)',
    material: 'steel',
    rateBefore: 18,
    rateAfter: 18,
    itcEligible: true,
  },
  {
    hsn: '7215',
    description: 'Other bars and rods of iron / non-alloy steel',
    material: 'steel',
    rateBefore: 18,
    rateAfter: 18,
    itcEligible: true,
  },
  {
    hsn: '7216',
    description: 'Angles, shapes and sections of iron / non-alloy steel',
    material: 'steel',
    rateBefore: 18,
    rateAfter: 18,
    itcEligible: true,
  },
  {
    hsn: '7217',
    description: 'Wire of iron / non-alloy steel (binding wire)',
    material: 'steel',
    rateBefore: 18,
    rateAfter: 18,
    itcEligible: true,
  },
  {
    hsn: '7308',
    description: 'Structures and parts of iron / steel (formwork, shuttering)',
    material: 'steel',
    rateBefore: 18,
    rateAfter: 18,
    itcEligible: true,
  },

  // ── BRICKS ───────────────────────────────────────────────────────────────
  {
    hsn: '6901',
    description: 'Bricks, blocks, tiles of siliceous fossil meals / earth',
    material: 'bricks',
    rateBefore: 5,
    rateAfter: 5,
    itcEligible: true,
  },
  {
    hsn: '6902',
    description: 'Refractory bricks, blocks, tiles (construction grade)',
    material: 'bricks',
    rateBefore: 5,
    rateAfter: 5,
    itcEligible: true,
  },
  {
    hsn: '69010000',
    description: 'Fly ash bricks / building blocks',
    material: 'bricks',
    rateBefore: 5,
    rateAfter: 5,
    itcEligible: true,
  },
  {
    hsn: '6904',
    description: 'Ceramic building bricks, flooring blocks, support tiles',
    material: 'bricks',
    rateBefore: 5,
    rateAfter: 5,
    itcEligible: true,
  },
  {
    hsn: '69041000',
    description: 'Building bricks (red clay bricks)',
    material: 'bricks',
    rateBefore: 5,
    rateAfter: 5,
    itcEligible: true,
  },

  // ── TILES ─────────────────────────────────────────────────────────────────
  {
    hsn: '6905',
    description: 'Roofing tiles, chimney-pots, cowls, chimney liners (ceramic)',
    material: 'tiles',
    rateBefore: 5,
    rateAfter: 5,
    itcEligible: true,
  },
  {
    hsn: '6907',
    description: 'Ceramic flags and paving, hearth / wall tiles',
    material: 'tiles',
    rateBefore: 5,
    rateAfter: 5,
    itcEligible: true,
  },
  {
    hsn: '69072100',
    description: 'Glazed ceramic flags and paving tiles (vitrified)',
    material: 'tiles',
    rateBefore: 12,
    rateAfter: 12,
    itcEligible: true,
  },
  {
    hsn: '69072200',
    description: 'Glazed ceramic tiles (mosaic, granite effect)',
    material: 'tiles',
    rateBefore: 12,
    rateAfter: 12,
    itcEligible: true,
  },

  // ── SAND / AGGREGATES ─────────────────────────────────────────────────────
  {
    hsn: '2505',
    description: 'Natural sands of all kinds',
    material: 'sand',
    rateBefore: 5,
    rateAfter: 5,
    itcEligible: true,
  },
  {
    hsn: '25051000',
    description: 'Silica sands and quartz sands',
    material: 'sand',
    rateBefore: 5,
    rateAfter: 5,
    itcEligible: true,
  },
  {
    hsn: '2516',
    description: 'Granite, porphyry, basalt, sandstone (crushed stone / aggregate)',
    material: 'aggregates',
    rateBefore: 5,
    rateAfter: 5,
    itcEligible: true,
  },
  {
    hsn: '2517',
    description: 'Pebbles, gravel, broken stone for concrete / road building (aggregate)',
    material: 'aggregates',
    rateBefore: 5,
    rateAfter: 5,
    itcEligible: true,
  },
  {
    hsn: '25171010',
    description: 'Ordinary gravel and crushed stone',
    material: 'aggregates',
    rateBefore: 5,
    rateAfter: 5,
    itcEligible: true,
  },

  // ── CONSTRUCTION CHEMICALS ─────────────────────────────────────────────────
  {
    hsn: '3824',
    description: 'Prepared binders for foundry moulds; construction chemicals (admixtures)',
    material: 'chemicals',
    rateBefore: 18,
    rateAfter: 18,
    itcEligible: true,
  },
  {
    hsn: '38244090',
    description: 'Concrete admixtures / water-proofing compounds',
    material: 'chemicals',
    rateBefore: 18,
    rateAfter: 18,
    itcEligible: true,
  },
  {
    hsn: '3214',
    description: 'Glaziers putty, grafting putty, resin cements, caulking compounds',
    material: 'chemicals',
    rateBefore: 18,
    rateAfter: 18,
    itcEligible: true,
  },
  {
    hsn: '2521',
    description: 'Limestone flux; limestone for industrial use (including in cement)',
    material: 'other_construction',
    rateBefore: 5,
    rateAfter: 5,
    itcEligible: true,
  },
  {
    hsn: '2522',
    description: 'Quicklime, slaked lime and hydraulic lime',
    material: 'other_construction',
    rateBefore: 5,
    rateAfter: 5,
    itcEligible: true,
  },
]

// ─── HSN Lookup Map ────────────────────────────────────────────────────────
// Build prefix → entry map for fast lookups (8→6→4→2 digit fallback)
const hsnMap = new Map<string, HSNEntry>()
for (const entry of HSN_TABLE) {
  hsnMap.set(entry.hsn.replace(/\s/g, ''), entry)
}

/**
 * Look up HSN entry with prefix fallback.
 * Tries exact match, then 6-digit, 4-digit, 2-digit prefix.
 */
export function lookupHSN(rawHsn: string): HSNEntry | null {
  const clean = rawHsn.replace(/[.\s-]/g, '').trim()
  if (!clean) return null

  // Try exact match, then progressively shorter prefixes
  for (const len of [clean.length, 8, 6, 4, 2]) {
    const prefix = clean.slice(0, len)
    if (hsnMap.has(prefix)) return hsnMap.get(prefix)!
  }
  return null
}

/**
 * Validate GSTIN format.
 * Format: 2-digit state code + 10-char PAN + 1 entity number + 1 Z + 1 check digit
 */
export function validateGSTIN(gstin: string): boolean {
  if (!gstin) return false
  const cleaned = gstin.toUpperCase().trim()
  // Standard GSTIN regex per GSTN spec
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(cleaned)
}

/**
 * Determine the applicable GST rate for an item given the invoice date.
 * For cement: 28% before 22-Sep-2025, 18% from that date onward.
 */
export function getApplicableRate(
  entry: HSNEntry,
  invoiceDate: Date
): ITCRateInfo {
  const isPostRateCut = invoiceDate >= RATE_CUT_DATE
  const applicableRate = isPostRateCut ? entry.rateAfter : entry.rateBefore

  return {
    hsn: entry.hsn,
    description: entry.description,
    material: entry.material,
    applicableRate,
    isPostRateCut,
    rateCutDate: '2025-09-22',
    previousRate: entry.rateBefore,
    saving: isPostRateCut
      ? (entry.rateBefore - entry.rateAfter) / 100
      : 0,
    itcEligible: entry.itcEligible,
    blockingReason: entry.blockingReason,
  }
}

/**
 * Check ITC blocking conditions under Section 17(5) of CGST Act.
 * Construction materials used for "immovable property on own account"
 * are blocked per Section 17(5)(c)/(d) UNLESS used for further supply
 * (i.e., the contractor/builder is selling the constructed unit).
 *
 * Decision: We assume buyer is a registered contractor/builder
 * making taxable supplies of construction services (works contract),
 * hence ITC is available. This is the common legitimate use case.
 * Users must confirm their business purpose in the profile.
 */
export function checkITCBlocking(
  hsn: string,
  userRole: string
): { eligible: boolean; reason?: string } {
  const entry = lookupHSN(hsn)
  if (!entry) {
    return { eligible: false, reason: 'HSN not in construction materials database' }
  }
  if (!entry.itcEligible) {
    return { eligible: false, reason: entry.blockingReason || 'Blocked under Section 17(5)' }
  }
  return { eligible: true }
}

// ─── ITC Calculator ────────────────────────────────────────────────────────

/**
 * Calculate GST amounts for a single line item given taxable value and rate.
 * For intra-state supply: CGST + SGST = rate/2 each
 * For inter-state supply: IGST = full rate
 */
export function calculateGST(
  taxableValue: number,
  rate: GSTRate,
  isInterState: boolean
): { cgst: number; sgst: number; igst: number; total: number } {
  const halfRate = rate / 2 / 100
  const fullRate = rate / 100

  if (isInterState) {
    const igst = round2(taxableValue * fullRate)
    return { cgst: 0, sgst: 0, igst, total: igst }
  } else {
    const cgst = round2(taxableValue * halfRate)
    const sgst = round2(taxableValue * halfRate)
    return { cgst, sgst, igst: 0, total: cgst + sgst }
  }
}

/**
 * Enrich extracted line items with ITC calculation.
 * Applies HSN lookup, rate validation, eligibility check.
 */
export function enrichLineItems(
  items: Omit<LineItem, 'itcEligible' | 'itcAmount' | 'rateCutApplied' | 'material' | 'hsnValidated'>[],
  invoiceDate: Date,
  isInterState: boolean
): LineItem[] {
  return items.map((item) => {
    const entry = lookupHSN(item.hsn)
    const hsnValidated = entry !== null

    if (!entry) {
      return {
        ...item,
        hsnValidated: false,
        material: undefined,
        itcEligible: false,
        itcAmount: 0,
        rateCutApplied: false,
        blockingReason: 'HSN code not found in construction materials list',
      }
    }

    const rateInfo = getApplicableRate(entry, invoiceDate)
    const gst = calculateGST(item.taxableValue, rateInfo.applicableRate, isInterState)

    // Recalculate if extracted rate differs from expected (flag discrepancy)
    const rateMismatch = item.gstRate !== rateInfo.applicableRate

    return {
      ...item,
      hsn: item.hsn,
      hsnValidated,
      material: entry.material,
      gstRate: rateInfo.applicableRate,
      cgst: gst.cgst,
      sgst: gst.sgst,
      igst: gst.igst,
      totalGST: gst.total,
      totalAmount: round2(item.taxableValue + gst.total),
      itcEligible: rateInfo.itcEligible,
      itcAmount: rateInfo.itcEligible ? gst.total : 0,
      rateCutApplied: rateInfo.isPostRateCut && entry.rateBefore !== entry.rateAfter,
      blockingReason: !rateInfo.itcEligible ? rateInfo.blockingReason : undefined,
      ...(rateMismatch
        ? { rateDiscrepancy: `Invoice shows ${item.gstRate}%, expected ${rateInfo.applicableRate}%` }
        : {}),
    } as LineItem
  })
}

/**
 * Aggregate ITC totals from enriched invoice data.
 */
export function calculateInvoiceITC(
  lineItems: LineItem[]
): {
  totalCGST: number
  totalSGST: number
  totalIGST: number
  totalGST: number
  eligibleITC: number
  blockedITC: number
  netITC: number
} {
  let totalCGST = 0, totalSGST = 0, totalIGST = 0
  let eligibleITC = 0, blockedITC = 0

  for (const item of lineItems) {
    totalCGST += item.cgst
    totalSGST += item.sgst
    totalIGST += item.igst

    if (item.itcEligible) {
      eligibleITC += item.itcAmount
    } else {
      blockedITC += item.cgst + item.sgst + item.igst
    }
  }

  return {
    totalCGST: round2(totalCGST),
    totalSGST: round2(totalSGST),
    totalIGST: round2(totalIGST),
    totalGST: round2(totalCGST + totalSGST + totalIGST),
    eligibleITC: round2(eligibleITC),
    blockedITC: round2(blockedITC),
    netITC: round2(eligibleITC),
  }
}

/**
 * Build GSTR-3B Table 4 data from a set of invoices for a given period.
 * Table 4A: Eligible ITC (IGST, CGST, SGST/UTGST)
 * Table 4B: ITC Reversed (Rule 42/43)
 * Table 4D: Ineligible ITC under Sec 17(5)
 */
export function buildGSTR3BTable(
  invoices: Array<{ lineItems: LineItem[] }>,
  period: string
): GSTR3BData {
  let igst = 0, cgst = 0, sgst = 0
  let blocked = 0

  for (const inv of invoices) {
    for (const item of inv.lineItems) {
      if (item.itcEligible) {
        igst += item.igst
        cgst += item.cgst
        sgst += item.sgst
      } else {
        blocked += item.cgst + item.sgst + item.igst
      }
    }
  }

  // Convert period 'YYYY-MM' → 'MMYYYY' for GSTR-3B
  const [year, month] = period.split('-')
  const gstrPeriod = `${month}${year}`

  return {
    period: gstrPeriod,
    table4A: {
      integrated: round2(igst),
      central: round2(cgst),
      state: round2(sgst),
      cess: 0,
    },
    table4B: {
      rule42And43: 0,
      others: 0,
    },
    table4D: {
      section17_5: round2(blocked),
      others: 0,
    },
  }
}

/**
 * Validate that the rate on an invoice matches the expected rate
 * for that HSN and invoice date. Returns discrepancies to flag for review.
 */
export function validateInvoiceRates(
  data: ExtractedInvoiceData
): Array<{ lineItemId: string; expected: GSTRate; actual: GSTRate; discrepancy: string }> {
  const issues: Array<{
    lineItemId: string
    expected: GSTRate
    actual: GSTRate
    discrepancy: string
  }> = []

  const invoiceDate = new Date(data.invoiceDate)

  for (const item of data.lineItems) {
    const entry = lookupHSN(item.hsn)
    if (!entry) continue

    const rateInfo = getApplicableRate(entry, invoiceDate)

    if (item.gstRate !== rateInfo.applicableRate) {
      issues.push({
        lineItemId: item.id,
        expected: rateInfo.applicableRate,
        actual: item.gstRate,
        discrepancy:
          rateInfo.isPostRateCut && entry.material === 'cement'
            ? `Cement rate cut applied from ${entry.rateBefore}% to ${entry.rateAfter}% effective 22-Sep-2025`
            : `Rate mismatch: invoice shows ${item.gstRate}%, expected ${rateInfo.applicableRate}%`,
      })
    }
  }

  return issues
}

// ─── Utility ───────────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * Get all HSN codes for a material category.
 */
export function getHSNsByMaterial(material: MaterialCategory): string[] {
  return HSN_TABLE.filter((e) => e.material === material).map((e) => e.hsn)
}

/**
 * Format Indian rupee amount.
 */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount)
}

/**
 * Parse Indian number format (e.g., "1,23,456.78" → 123456.78).
 */
export function parseIndianNumber(str: string): number {
  if (!str) return 0
  const cleaned = str.replace(/[₹,\s]/g, '').trim()
  return parseFloat(cleaned) || 0
}
