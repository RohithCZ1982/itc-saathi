// src/app/api/extract/route.ts
// POST /api/extract — extracts invoice data via PDF parse + AI

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient, getSupabaseAdminClient } from '@/lib/supabase/server'
import { extractTextFromURL } from '@/lib/pdf/processor'
import { extractInvoiceData } from '@/lib/pdf/extractor'
import type { ApiResponse, ExtractedInvoiceData } from '@/types'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json<ApiResponse<never>>({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { invoiceId } = body
    if (!invoiceId || typeof invoiceId !== 'string') {
      return NextResponse.json<ApiResponse<never>>({ error: 'invoiceId required' }, { status: 400 })
    }

    // Fetch invoice — use `as any` at Supabase boundary; RLS enforces ownership
    const { data: invoice, error: fetchError } = await (supabase
      .from('invoices') as any)
      .select('*')
      .eq('id', invoiceId)
      .eq('user_id', user.id)
      .single() as { data: { id: string; status: string; file_url: string; file_name: string } | null; error: unknown }

    if (fetchError || !invoice) {
      return NextResponse.json<ApiResponse<never>>({ error: 'Invoice not found' }, { status: 404 })
    }

    if (invoice.status === 'processing') {
      return NextResponse.json<ApiResponse<never>>({ error: 'Already processing' }, { status: 409 })
    }

    await (supabase.from('invoices') as any).update({ status: 'processing' }).eq('id', invoiceId)

    // Get signed URL via admin client
    const adminClient = getSupabaseAdminClient()
    const storagePath = invoice.file_url.replace(/^https?:\/\/[^/]+\/storage\/v1\/object\/public\/invoices\//, '')
    const { data: signedData, error: signedError } = await adminClient.storage
      .from('invoices')
      .createSignedUrl(storagePath, 300)

    if (signedError || !signedData?.signedUrl) {
      await (supabase.from('invoices') as any).update({ status: 'rejected' }).eq('id', invoiceId)
      return NextResponse.json<ApiResponse<never>>({ error: 'Could not access file' }, { status: 500 })
    }

    const startTime = Date.now()
    const extraction = await extractTextFromURL(signedData.signedUrl, invoice.file_name)

    if (extraction.error || !extraction.text) {
      await (supabase.from('invoices') as any).update({ status: 'rejected' }).eq('id', invoiceId)
      return NextResponse.json<ApiResponse<never>>(
        { error: extraction.error || 'Failed to extract text' }, { status: 422 }
      )
    }

    const extractedData = await extractInvoiceData(extraction.text, extraction.ocrUsed, invoiceId)
    const processingTimeMs = Date.now() - startTime

    await (supabase.from('invoices') as any)
      .update({
        status: 'extracted',
        extracted_data: extractedData as unknown as Record<string, unknown>,
        processed_at: new Date().toISOString(),
      })
      .eq('id', invoiceId)

    return NextResponse.json<ApiResponse<{ extractedData: ExtractedInvoiceData; processingTimeMs: number }>>({
      data: { extractedData, processingTimeMs },
    })
  } catch (err) {
    console.error('[extract]', err instanceof Error ? err.message : err)
    return NextResponse.json<ApiResponse<never>>({ error: 'Processing failed' }, { status: 500 })
  }
}
