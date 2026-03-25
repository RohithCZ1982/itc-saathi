// src/lib/pdf/extractor.ts
// AI-powered invoice data extraction using Claude.
// SERVER-SIDE ONLY — never import in client components.

import type { ExtractedInvoiceData, LineItem, GSTRate } from '@/types'
import { enrichLineItems } from '@/lib/gst/engine'
import { v4 as uuidv4 } from 'uuid'

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL = 'llama-3.3-70b-versatile'

export async function extractInvoiceData(
  rawText: string,
  ocrUsed: boolean,
  _invoiceId: string
): Promise<ExtractedInvoiceData> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('GROQ_API_KEY is not set')

  const truncated = rawText.length > 8000 ? rawText.slice(0, 8000) + '...[truncated]' : rawText

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4096,
      messages: [
        {
          role: 'system',
          content: 'You extract structured data from Indian GST invoices. Return ONLY valid JSON, no preamble.',
        },
        {
          role: 'user',
          content: `Extract invoice data from this text and return JSON with exactly these fields:
{"invoice_number":null,"invoice_date":"YYYY-MM-DD","supplier_gstin":null,"supplier_name":null,"supplier_address":null,"buyer_gstin":null,"buyer_name":null,"buyer_address":null,"place_of_supply":null,"reverse_charge":false,"line_items":[{"description":"","hsn":"","quantity":0,"unit":"NOS","unit_price":0,"taxable_value":0,"gst_rate":18,"cgst":0,"sgst":0,"igst":0,"total_amount":0}],"subtotal":0,"total_cgst":0,"total_sgst":0,"total_igst":0,"total_amount":0,"confidence":0.8}

HSN must be digits only. gst_rate must be 5, 12, 18, or 28.

INVOICE TEXT:
${truncated}`,
        },
      ],
    }),
  })

  if (!response.ok) {
    const err = await response.text().catch(() => '')
    throw new Error(`Groq API error ${response.status}: ${err.slice(0, 200)}`)
  }

  const data = await response.json()
  const rawJson = (data.choices?.[0]?.message?.content ?? '').replace(/```json\n?|\n?```/g, '').trim()

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(rawJson)
  } catch {
    throw new Error(`JSON parse failed. Raw response: ${rawJson.slice(0, 200)}`)
  }

  return normalizeExtractedData(parsed, ocrUsed, rawText)
}

function normalizeExtractedData(raw: Record<string, unknown>, ocrUsed: boolean, rawText: string): ExtractedInvoiceData {
  const invoiceDate = parseDate(raw.invoice_date as string | null)
  const supplierGSTIN = sanitizeGSTIN(raw.supplier_gstin as string | null)
  const buyerGSTIN = sanitizeGSTIN(raw.buyer_gstin as string | null)
  const isInterState = supplierGSTIN.length >= 2 && buyerGSTIN.length >= 2
    ? supplierGSTIN.slice(0, 2) !== buyerGSTIN.slice(0, 2)
    : false

  const rawItems = Array.isArray(raw.line_items) ? raw.line_items as Record<string, unknown>[] : []
  const baseItems = rawItems.map((item) => ({
    id: uuidv4(),
    description: String(item.description || ''),
    hsn: String(item.hsn || '').replace(/\D/g, ''),
    hsnValidated: false as const,
    quantity: toNum(item.quantity),
    unit: String(item.unit || 'NOS'),
    unitPrice: toNum(item.unit_price),
    taxableValue: toNum(item.taxable_value),
    gstRate: clampRate(toNum(item.gst_rate)),
    cgst: toNum(item.cgst),
    sgst: toNum(item.sgst),
    igst: toNum(item.igst),
    totalGST: toNum(item.cgst) + toNum(item.sgst) + toNum(item.igst),
    totalAmount: toNum(item.total_amount),
    itcEligible: false as const,
    itcAmount: 0,
    rateCutApplied: false as const,
  }))

  const enriched = enrichLineItems(baseItems, invoiceDate, isInterState)
  const totalCGST = r2(enriched.reduce((s, i) => s + i.cgst, 0))
  const totalSGST = r2(enriched.reduce((s, i) => s + i.sgst, 0))
  const totalIGST = r2(enriched.reduce((s, i) => s + i.igst, 0))
  const totalITCEligible = r2(enriched.reduce((s, i) => s + i.itcAmount, 0))
  const subtotal = r2(enriched.reduce((s, i) => s + i.taxableValue, 0))

  return {
    invoiceNumber: String(raw.invoice_number || `INV-${Date.now()}`),
    invoiceDate: invoiceDate.toISOString().split('T')[0],
    supplierGSTIN,
    supplierName: String(raw.supplier_name || ''),
    supplierAddress: raw.supplier_address ? String(raw.supplier_address) : undefined,
    buyerGSTIN,
    buyerName: String(raw.buyer_name || ''),
    buyerAddress: raw.buyer_address ? String(raw.buyer_address) : undefined,
    placeOfSupply: String(raw.place_of_supply || ''),
    reverseCharge: Boolean(raw.reverse_charge),
    lineItems: enriched,
    subtotal: toNum(raw.subtotal) || subtotal,
    totalCGST,
    totalSGST,
    totalIGST,
    totalGST: r2(totalCGST + totalSGST + totalIGST),
    totalAmount: toNum(raw.total_amount) || r2(subtotal + totalCGST + totalSGST + totalIGST),
    totalITCEligible,
    extractionConfidence: Math.min(1, Math.max(0, toNum(raw.confidence) || 0.7)),
    ocrUsed,
    rawText: rawText.slice(0, 2000),
  }
}

function parseDate(s: string | null): Date {
  if (!s) return new Date()
  let d = new Date(s)
  if (!isNaN(d.getTime())) return d
  const m = s.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/)
  if (m) {
    const yr = m[3].length === 2 ? `20${m[3]}` : m[3]
    d = new Date(`${yr}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`)
    if (!isNaN(d.getTime())) return d
  }
  return new Date()
}

function sanitizeGSTIN(v: string | null): string {
  return v ? v.replace(/\s/g, '').toUpperCase().slice(0, 15) : ''
}

function clampRate(n: number): GSTRate {
  const valid: GSTRate[] = [5, 12, 18, 28]
  return valid.reduce((a, b) => Math.abs(b - n) < Math.abs(a - n) ? b : a)
}

function toNum(v: unknown): number {
  if (typeof v === 'number') return r2(v)
  if (typeof v === 'string') return r2(parseFloat(v.replace(/[₹,\s]/g, '')) || 0)
  return 0
}

function r2(n: number): number {
  return Math.round(n * 100) / 100
}
