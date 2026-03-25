// src/app/api/export/route.ts
// GET /api/export?claimId=xxx&format=excel|json|csv

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import type { ExtractedInvoiceData, GSTR3BData } from '@/types'
import { formatINR } from '@/lib/gst/engine'

export async function GET(req: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const claimId = searchParams.get('claimId')
    const format = searchParams.get('format') || 'excel'

    if (!claimId) return NextResponse.json({ error: 'claimId required' }, { status: 400 })
    if (!['excel', 'json', 'csv'].includes(format)) {
      return NextResponse.json({ error: 'format must be excel, json, or csv' }, { status: 400 })
    }

    const { data: claim, error: claimError } = await (supabase.from('itc_claims') as any)
      .select('*')
      .eq('id', claimId)
      .eq('user_id', user.id)
      .single() as { data: Record<string, unknown> | null; error: unknown }

    if (claimError || !claim) {
      return NextResponse.json({ error: 'Claim not found' }, { status: 404 })
    }

    const { data: invoices } = await (supabase.from('invoices') as any)
      .select('id, file_name, extracted_data, uploaded_at')
      .in('id', (claim.invoice_ids as string[]) || [])
      .eq('user_id', user.id) as {
        data: Array<{ id: string; file_name: string; extracted_data: unknown; uploaded_at: string }> | null
      }

    const gstr3b = claim.gstr3b_data as unknown as GSTR3BData
    const invList = invoices || []

    if (format === 'json') return generateJSON(claim, invList, gstr3b)
    if (format === 'csv') return generateCSV(claim, invList, gstr3b)
    return generateExcel(claim, invList, gstr3b)
  } catch (err) {
    console.error('[export]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}

type InvRow = { id: string; file_name: string; extracted_data: unknown; uploaded_at: string }

function generateJSON(claim: Record<string, unknown>, invoices: InvRow[], gstr3b: GSTR3BData): NextResponse {
  const out = {
    metadata: { exportedAt: new Date().toISOString(), app: 'ITC Saathi', purpose: 'GSTR-3B Input Tax Credit' },
    claim: {
      period: claim.period, status: claim.status,
      totals: { cgst: claim.total_cgst, sgst: claim.total_sgst, igst: claim.total_igst, netITC: claim.net_itc, blockedITC: claim.blocked_itc },
    },
    gstr3b: { period: gstr3b?.period, table4A: gstr3b?.table4A, table4D: gstr3b?.table4D },
    invoices: invoices.map((inv) => {
      const d = inv.extracted_data as ExtractedInvoiceData
      return {
        invoiceNumber: d?.invoiceNumber, invoiceDate: d?.invoiceDate,
        supplierGSTIN: d?.supplierGSTIN, supplierName: d?.supplierName,
        totalAmount: d?.totalAmount, eligibleITC: d?.totalITCEligible,
        lineItems: d?.lineItems?.map((i) => ({
          description: i.description, hsn: i.hsn, taxableValue: i.taxableValue,
          gstRate: i.gstRate, cgst: i.cgst, sgst: i.sgst, igst: i.igst,
          itcEligible: i.itcEligible, itcAmount: i.itcAmount, rateCutApplied: i.rateCutApplied,
        })),
      }
    }),
  }
  const period = String(claim.period).replace('-', '')
  return new NextResponse(JSON.stringify(out, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="ITC_Saathi_${period}.json"`,
    },
  })
}

function generateCSV(claim: Record<string, unknown>, invoices: InvRow[], gstr3b: GSTR3BData): NextResponse {
  const rows: string[] = [
    'ITC Saathi GSTR-3B Export', `Period,${claim.period}`, `Generated,${new Date().toLocaleDateString('en-IN')}`, '',
    'TABLE 4A - ELIGIBLE ITC', 'IGST,CGST,SGST',
    `${gstr3b?.table4A?.integrated || 0},${gstr3b?.table4A?.central || 0},${gstr3b?.table4A?.state || 0}`,
    '', 'INVOICE LINE ITEMS',
    'Invoice No,Date,Supplier,GSTIN,HSN,Description,Taxable Value,GST%,CGST,SGST,IGST,ITC Eligible,ITC Amount,Rate Cut',
  ]
  for (const inv of invoices) {
    const d = inv.extracted_data as ExtractedInvoiceData
    if (!d?.lineItems) continue
    for (const item of d.lineItems) {
      const esc = (s: string) => `"${(s || '').replace(/"/g, '""')}"`
      rows.push([
        d.invoiceNumber, d.invoiceDate, esc(d.supplierName), d.supplierGSTIN,
        item.hsn, esc(item.description), item.taxableValue, `${item.gstRate}%`,
        item.cgst, item.sgst, item.igst,
        item.itcEligible ? 'Yes' : 'No', item.itcAmount,
        item.rateCutApplied ? 'Yes (28%→18%)' : 'No',
      ].join(','))
    }
  }
  const period = String(claim.period).replace('-', '')
  return new NextResponse(rows.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="ITC_Saathi_${period}.csv"`,
    },
  })
}

async function generateExcel(claim: Record<string, unknown>, invoices: InvRow[], gstr3b: GSTR3BData): Promise<NextResponse> {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()

  // Sheet 1: Summary
  const summary = [
    ['ITC Saathi — GSTR-3B Ready Report'], [`Period:`, claim.period], [`Generated:`, new Date().toLocaleDateString('en-IN')], [],
    ['TABLE 4A: ELIGIBLE ITC'], ['', 'IGST (₹)', 'CGST (₹)', 'SGST/UTGST (₹)'],
    ['Eligible ITC', gstr3b?.table4A?.integrated || 0, gstr3b?.table4A?.central || 0, gstr3b?.table4A?.state || 0], [],
    ['TABLE 4D: INELIGIBLE ITC (Sec 17(5))'], ['Blocked ITC (₹)', gstr3b?.table4D?.section17_5 || 0], [],
    ['Net ITC (₹)', claim.net_itc],
  ]
  const ws1 = XLSX.utils.aoa_to_sheet(summary)
  ws1['!cols'] = [{ wch: 35 }, { wch: 18 }, { wch: 18 }, { wch: 18 }]
  XLSX.utils.book_append_sheet(wb, ws1, 'GSTR-3B Summary')

  // Sheet 2: Line items
  const rows: unknown[][] = [[
    'Invoice No', 'Date', 'Supplier', 'GSTIN', 'HSN', 'Description',
    'Qty', 'Unit', 'Taxable Val (₹)', 'GST%', 'CGST (₹)', 'SGST (₹)', 'IGST (₹)',
    'ITC Eligible', 'ITC Amount (₹)', 'Rate Cut Applied',
  ]]
  for (const inv of invoices) {
    const d = inv.extracted_data as ExtractedInvoiceData
    if (!d?.lineItems) continue
    for (const i of d.lineItems) {
      rows.push([d.invoiceNumber, d.invoiceDate, d.supplierName, d.supplierGSTIN,
        i.hsn, i.description, i.quantity, i.unit, i.taxableValue, i.gstRate,
        i.cgst, i.sgst, i.igst, i.itcEligible ? 'YES' : 'NO', i.itcAmount,
        i.rateCutApplied ? 'YES (28%→18%)' : 'No'])
    }
  }
  const ws2 = XLSX.utils.aoa_to_sheet(rows)
  ws2['!cols'] = Array(16).fill({ wch: 16 })
  ws2['!cols'][5] = { wch: 35 }
  XLSX.utils.book_append_sheet(wb, ws2, 'Invoice Details')

  const period = String(claim.period).replace('-', '')
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="ITC_Saathi_${period}.xlsx"`,
    },
  })
}
