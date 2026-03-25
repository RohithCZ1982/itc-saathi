// src/app/api/claims/route.ts
// GET  /api/claims  — list user's ITC claims
// POST /api/claims  — generate/refresh claim for a period

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { buildGSTR3BTable, calculateInvoiceITC } from '@/lib/gst/engine'
import type { ApiResponse, ExtractedInvoiceData, LineItem } from '@/types'
import { z } from 'zod'

const CreateClaimSchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/, 'Period must be YYYY-MM'),
})

export async function GET(_req: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json<ApiResponse<never>>({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await (supabase.from('itc_claims') as any)
      .select('*')
      .eq('user_id', user.id)
      .order('period', { ascending: false })

    if (error) {
      return NextResponse.json<ApiResponse<never>>({ error: 'Failed to fetch claims' }, { status: 500 })
    }

    return NextResponse.json({ data: { claims: data || [] } })
  } catch {
    return NextResponse.json<ApiResponse<never>>({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json<ApiResponse<never>>({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = CreateClaimSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json<ApiResponse<never>>({ error: parsed.error.message }, { status: 400 })
    }

    const { period } = parsed.data
    const [year, month] = period.split('-')
    const startDate = `${year}-${month.padStart(2, '0')}-01`
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate()
    const endDate = `${year}-${month.padStart(2, '0')}-${lastDay}`

    // Fetch verified invoices for this period
    const { data: invoices, error: invError } = await (supabase.from('invoices') as any)
      .select('id, extracted_data')
      .eq('user_id', user.id)
      .in('status', ['extracted', 'verified', 'reconciled'])
      .gte('extracted_data->>invoiceDate', startDate)
      .lte('extracted_data->>invoiceDate', endDate) as {
        data: Array<{ id: string; extracted_data: unknown }> | null
        error: unknown
      }

    if (invError || !invoices || invoices.length === 0) {
      return NextResponse.json<ApiResponse<never>>(
        { error: `No processed invoices found for ${period}` }, { status: 404 }
      )
    }

    let totalCGST = 0, totalSGST = 0, totalIGST = 0, totalITC = 0, blockedITC = 0
    const invoicesForGSTR: Array<{ lineItems: LineItem[] }> = []

    for (const inv of invoices) {
      if (!inv.extracted_data) continue
      const d = inv.extracted_data as ExtractedInvoiceData
      const totals = calculateInvoiceITC(d.lineItems || [])
      totalCGST += totals.totalCGST
      totalSGST += totals.totalSGST
      totalIGST += totals.totalIGST
      totalITC += totals.eligibleITC
      blockedITC += totals.blockedITC
      invoicesForGSTR.push({ lineItems: d.lineItems || [] })
    }

    const r2 = (n: number) => Math.round(n * 100) / 100
    const gstr3bData = buildGSTR3BTable(invoicesForGSTR, period)

    const { data: claim, error: upsertError } = await (supabase.from('itc_claims') as any)
      .upsert({
        user_id: user.id,
        period,
        status: 'ready',
        invoice_ids: invoices.map((i) => i.id),
        total_cgst: r2(totalCGST),
        total_sgst: r2(totalSGST),
        total_igst: r2(totalIGST),
        total_itc: r2(totalITC),
        blocked_itc: r2(blockedITC),
        net_itc: r2(totalITC),
        gstr3b_data: gstr3bData as unknown as Record<string, unknown>,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,period' })
      .select()
      .single() as { data: { id: string } | null; error: unknown }

    if (upsertError || !claim) {
      return NextResponse.json<ApiResponse<never>>({ error: 'Failed to save claim' }, { status: 500 })
    }

    // Link invoices to this claim
    await (supabase.from('invoices') as any)
      .update({ claim_id: claim.id })
      .in('id', invoices.map((i) => i.id))

    return NextResponse.json({ data: claim }, { status: 201 })
  } catch (err) {
    console.error('[claims POST]', err instanceof Error ? err.message : err)
    return NextResponse.json<ApiResponse<never>>({ error: 'Internal error' }, { status: 500 })
  }
}
