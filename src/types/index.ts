// src/types/index.ts
// Central type definitions for ITC Saathi

// ─── GST / Tax Types ───────────────────────────────────────────────────────

export type GSTRate = 5 | 12 | 18 | 28

export interface HSNEntry {
  hsn: string
  description: string
  material: MaterialCategory
  rateBefore: GSTRate   // rate before 22-Sep-2025
  rateAfter: GSTRate    // rate from 22-Sep-2025 onwards
  itcEligible: boolean  // false for items u/s 17(5) blocked credits
  blockingReason?: string
}

export type MaterialCategory =
  | 'cement'
  | 'steel'
  | 'bricks'
  | 'tiles'
  | 'sand'
  | 'aggregates'
  | 'chemicals'
  | 'other_construction'

export interface ITCRateInfo {
  hsn: string
  description: string
  material: MaterialCategory
  applicableRate: GSTRate
  isPostRateCut: boolean
  rateCutDate: string // ISO date string
  previousRate: GSTRate
  saving: number // rate diff as decimal
  itcEligible: boolean
  blockingReason?: string
}

// ─── Invoice Types ─────────────────────────────────────────────────────────

export type InvoiceStatus =
  | 'pending'
  | 'processing'
  | 'extracted'
  | 'verified'
  | 'claimed'
  | 'rejected'
  | 'reconciled'

export interface LineItem {
  id: string
  description: string
  hsn: string
  hsnValidated: boolean
  quantity: number
  unit: string
  unitPrice: number
  taxableValue: number
  gstRate: GSTRate
  cgst: number
  sgst: number
  igst: number
  totalGST: number
  totalAmount: number
  itcEligible: boolean
  itcAmount: number
  blockingReason?: string
  material?: MaterialCategory
  rateCutApplied: boolean
}

export interface ExtractedInvoiceData {
  invoiceNumber: string
  invoiceDate: string         // ISO date string
  supplierGSTIN: string
  supplierName: string
  supplierAddress?: string
  buyerGSTIN: string
  buyerName: string
  buyerAddress?: string
  placeOfSupply: string
  reverseCharge: boolean
  lineItems: LineItem[]
  subtotal: number
  totalCGST: number
  totalSGST: number
  totalIGST: number
  totalGST: number
  totalAmount: number
  totalITCEligible: number
  extractionConfidence: number  // 0-1
  ocrUsed: boolean
  rawText?: string
}

export interface Invoice {
  id: string
  userId: string
  fileUrl: string
  fileName: string
  fileSize: number
  mimeType: string
  status: InvoiceStatus
  extractedData: ExtractedInvoiceData | null
  manualOverrides?: Partial<ExtractedInvoiceData>
  gstr2bMatched: boolean
  gstr2bMatchDate?: string
  claimId?: string
  uploadedAt: string
  processedAt?: string
  createdAt: string
  updatedAt: string
  // Offline-only fields (pending sync)
  isOfflinePending?: boolean
  localId?: string
}

// ─── ITC Claim Types ───────────────────────────────────────────────────────

export type ClaimPeriod = string // 'YYYY-MM' format e.g. '2025-10'

export type ClaimStatus = 'draft' | 'ready' | 'filed' | 'adjusted'

export interface ITCClaim {
  id: string
  userId: string
  period: ClaimPeriod          // YYYY-MM
  status: ClaimStatus
  invoiceIds: string[]
  totalCGST: number
  totalSGST: number
  totalIGST: number
  totalITC: number
  blockedITC: number
  netITC: number
  gstr3bData: GSTR3BData
  createdAt: string
  updatedAt: string
  filedAt?: string
}

export interface GSTR3BData {
  period: string               // MMYYYY format for GSTR-3B
  table4A: {                   // Eligible ITC
    integrated: number
    central: number
    state: number
    cess: number
  }
  table4B: {                   // Ineligible / Reversed ITC (Section 17(5))
    rule42And43: number
    others: number
  }
  table4D: {                   // Ineligible ITC under section 17(5)
    section17_5: number
    others: number
  }
}

// ─── User / Auth Types ─────────────────────────────────────────────────────

export type UserRole = 'contractor' | 'accountant' | 'admin'

export interface UserProfile {
  id: string
  email: string
  fullName: string
  businessName?: string
  gstin?: string
  role: UserRole
  language: 'en' | 'hi'
  darkMode: boolean
  createdAt: string
}

// ─── API Types ─────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data?: T
  error?: string
  details?: string
}

export interface ExtractionRequest {
  invoiceId: string
  fileUrl: string
  forceOCR?: boolean
}

export interface ExtractionResult {
  invoiceId: string
  extractedData: ExtractedInvoiceData
  processingTimeMs: number
}

// ─── Export Types ──────────────────────────────────────────────────────────

export type ExportFormat = 'excel' | 'json' | 'csv'

export interface ExportRequest {
  claimId?: string
  period?: ClaimPeriod
  invoiceIds?: string[]
  format: ExportFormat
}

// ─── Offline / IndexedDB Types ─────────────────────────────────────────────

export interface PendingUpload {
  localId: string
  file: File
  fileName: string
  fileSize: number
  createdAt: string
  retryCount: number
  status: 'pending' | 'uploading' | 'failed'
}

export interface OfflineState {
  pendingUploads: PendingUpload[]
  lastSyncAt?: string
  isOnline: boolean
}

// ─── UI State Types ────────────────────────────────────────────────────────

export interface ToastMessage {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  title: string
  message?: string
}

export interface UploadProgress {
  invoiceId: string
  fileName: string
  stage: 'uploading' | 'extracting' | 'calculating' | 'done' | 'error'
  progress: number  // 0-100
  error?: string
}
