// src/app/api/invoices/[id]/route.ts
// PATCH /api/invoices/[id] — save manual overrides to extracted data

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import type { ApiResponse } from '@/types'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await getSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json<ApiResponse<never>>({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { extractedData } = body
    if (!extractedData) {
      return NextResponse.json<ApiResponse<never>>({ error: 'extractedData is required' }, { status: 400 })
    }

    // Verify invoice belongs to user
    const { data: existing } = await (supabase.from('invoices') as any)
      .select('id, user_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!existing) {
      return NextResponse.json<ApiResponse<never>>({ error: 'Invoice not found' }, { status: 404 })
    }

    const { data, error } = await (supabase.from('invoices') as any)
      .update({
        extracted_data: extractedData,
        manual_overrides: extractedData,
        status: 'verified',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json<ApiResponse<never>>({ error: 'Failed to save' }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch {
    return NextResponse.json<ApiResponse<never>>({ error: 'Internal error' }, { status: 500 })
  }
}
