// src/app/api/invoices/route.ts
// GET  /api/invoices  — list user's invoices
// POST /api/invoices  — create invoice record after client-side upload

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { validatePDFFile } from '@/lib/pdf/processor'
import type { ApiResponse } from '@/types'
import { z } from 'zod'

const CreateInvoiceSchema = z.object({
  fileUrl: z.string().url(),
  fileName: z.string().min(1).max(255),
  fileSize: z.number().min(1).max(10 * 1024 * 1024),
  mimeType: z.enum(['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/tiff']),
})

export async function GET(req: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json<ApiResponse<never>>({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)
    const offset = parseInt(searchParams.get('offset') || '0')

    // Use `any` at Supabase query boundary — types verified at DB level via RLS
    let query = (supabase.from('invoices') as any)
      .select('*')
      .eq('user_id', user.id)
      .order('uploaded_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) query = query.eq('status', status)

    const { data, error } = await query
    if (error) {
      return NextResponse.json<ApiResponse<never>>({ error: 'Failed to fetch invoices' }, { status: 500 })
    }

    return NextResponse.json({ data: { invoices: data || [] } })
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
    const parsed = CreateInvoiceSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json<ApiResponse<never>>(
        { error: 'Invalid request', details: parsed.error.message }, { status: 400 }
      )
    }

    const { fileUrl, fileName, fileSize, mimeType } = parsed.data
    const validation = validatePDFFile({ name: fileName, size: fileSize, type: mimeType })
    if (!validation.valid) {
      return NextResponse.json<ApiResponse<never>>({ error: validation.error }, { status: 400 })
    }

    // Security: ensure file is in this user's storage path
    if (!fileUrl.includes(`/${user.id}/`)) {
      return NextResponse.json<ApiResponse<never>>({ error: 'Invalid file URL' }, { status: 403 })
    }

    const { data: invoice, error: insertError } = await (supabase.from('invoices') as any)
      .insert({
        user_id: user.id,
        file_url: fileUrl,
        file_name: fileName,
        file_size: fileSize,
        mime_type: mimeType,
        status: 'pending',
        uploaded_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json<ApiResponse<never>>({ error: 'Failed to create record' }, { status: 500 })
    }

    return NextResponse.json({ data: invoice }, { status: 201 })
  } catch {
    return NextResponse.json<ApiResponse<never>>({ error: 'Internal error' }, { status: 500 })
  }
}
