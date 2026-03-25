// src/app/upload/page.tsx
'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'
import { Upload, FileText, X, CheckCircle, AlertCircle, Loader2, WifiOff } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase/client'
import { useAppStore } from '@/store'
import { savePendingUpload } from '@/lib/offline/db'
import { InvoiceResultCard } from '@/components/invoice/InvoiceResultCard'
import type { ExtractedInvoiceData, UploadProgress } from '@/types'
import { v4 as uuidv4 } from 'uuid'

interface FileState {
  localId: string
  file: File
  progress: UploadProgress
  result?: ExtractedInvoiceData
}

const MAX_FILES = 10
const MAX_SIZE = 10 * 1024 * 1024 // 10MB
const ACCEPTED = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/tiff': ['.tiff', '.tif'],
}

export default function UploadPage() {
  const [files, setFiles] = useState<FileState[]>([])
  const { isOnline, addPendingUpload } = useAppStore()
  const supabase = getSupabaseClient()

  const processFile = useCallback(
    async (fileState: FileState) => {
      const { localId, file } = fileState

      const updateProgress = (updates: Partial<UploadProgress>) => {
        setFiles((prev) =>
          prev.map((f) =>
            f.localId === localId ? { ...f, progress: { ...f.progress, ...updates } } : f
          )
        )
      }

      try {
        // If offline, queue for later
        if (!isOnline) {
          await savePendingUpload({
            localId,
            file,
            fileName: file.name,
            fileSize: file.size,
            createdAt: new Date().toISOString(),
            retryCount: 0,
            status: 'pending',
          })
          addPendingUpload(localId)
          updateProgress({ stage: 'uploading', progress: 100 })
          toast('Saved offline. Will upload when connected.', { icon: '📶' })
          return
        }

        // ── Step 1: Upload to Supabase Storage ─────────────────────
        updateProgress({ stage: 'uploading', progress: 10 })

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')

        const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf'
        const storagePath = `${user.id}/${uuidv4()}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from('invoices')
          .upload(storagePath, file, {
            contentType: file.type,
            upsert: false,
          })

        if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`)
        updateProgress({ stage: 'uploading', progress: 40 })

        // Get the public URL path
        const { data: urlData } = supabase.storage.from('invoices').getPublicUrl(storagePath)

        // ── Step 2: Create invoice record ───────────────────────────
        const invoiceRes = await fetch('/api/invoices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileUrl: urlData.publicUrl,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
          }),
        })

        if (!invoiceRes.ok) {
          const err = await invoiceRes.json()
          throw new Error(err.error || 'Failed to create invoice record')
        }

        const { data: invoice } = await invoiceRes.json()
        updateProgress({ stage: 'extracting', progress: 50, invoiceId: invoice.id })

        // ── Step 3: Trigger AI extraction ──────────────────────────
        const extractRes = await fetch('/api/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ invoiceId: invoice.id }),
        })

        updateProgress({ stage: 'calculating', progress: 80 })

        if (!extractRes.ok) {
          const err = await extractRes.json()
          throw new Error(err.error || 'Extraction failed')
        }

        const { data: extractData } = await extractRes.json()
        updateProgress({ stage: 'done', progress: 100 })

        // Show result
        setFiles((prev) =>
          prev.map((f) =>
            f.localId === localId
              ? { ...f, result: extractData.extractedData, progress: { ...f.progress, stage: 'done', progress: 100 } }
              : f
          )
        )

        toast.success(`${file.name} processed successfully`)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Processing failed'
        updateProgress({ stage: 'error', progress: 0, error: msg })
        toast.error(`Failed: ${file.name}`)
      }
    },
    [isOnline, supabase, addPendingUpload]
  )

  const onDrop = useCallback(
    (accepted: File[]) => {
      const remaining = MAX_FILES - files.length
      const toProcess = accepted.slice(0, remaining)

      if (accepted.length > remaining) {
        toast.error(`Only ${remaining} more file(s) can be added`)
      }

      const newFiles: FileState[] = toProcess.map((file) => ({
        localId: uuidv4(),
        file,
        progress: {
          invoiceId: '',
          fileName: file.name,
          stage: 'uploading',
          progress: 0,
        },
      }))

      setFiles((prev) => [...prev, ...newFiles])

      // Process each file
      newFiles.forEach(processFile)
    },
    [files.length, processFile]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED,
    maxSize: MAX_SIZE,
    maxFiles: MAX_FILES,
    onDropRejected: (rejections) => {
      rejections.forEach((r) => {
        const reason = r.errors[0]?.code === 'file-too-large'
          ? 'File too large (max 10MB)'
          : r.errors[0]?.code === 'file-invalid-type'
          ? 'Invalid file type (PDF, JPG, PNG only)'
          : r.errors[0]?.message
        toast.error(`${r.file.name}: ${reason}`)
      })
    },
  })

  const removeFile = (localId: string) => {
    setFiles((prev) => prev.filter((f) => f.localId !== localId))
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display font-bold text-2xl sm:text-3xl text-surface-900 dark:text-surface-50">
          Upload Invoice
        </h1>
        <p className="text-surface-500 mt-1">
          PDF or image invoices for cement, steel, bricks and other construction materials
        </p>
      </div>

      {/* Offline warning */}
      {!isOnline && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300">
          <WifiOff className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm font-medium">
            You're offline. Invoices will be saved locally and uploaded when connected.
          </span>
        </div>
      )}

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-200
          ${isDragActive
            ? 'border-saffron-400 bg-saffron-50 dark:bg-saffron-900/10'
            : 'border-surface-300 dark:border-surface-700 hover:border-saffron-300 dark:hover:border-saffron-700 hover:bg-saffron-50/50 dark:hover:bg-saffron-900/5'
          }
        `}
      >
        <input {...getInputProps()} />
        <Upload className={`w-10 h-10 mx-auto mb-4 ${isDragActive ? 'text-saffron-500' : 'text-surface-400'}`} />
        <p className="font-semibold text-surface-700 dark:text-surface-200 mb-1">
          {isDragActive ? 'Drop files here' : 'Drop invoices here or click to browse'}
        </p>
        <p className="text-sm text-surface-400">
          PDF, JPG, PNG up to 10MB · Up to {MAX_FILES} files at once
        </p>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-4">
          {files.map((f) => (
            <div key={f.localId} className="animate-slide-up">
              {/* Progress card */}
              {f.progress.stage !== 'done' && (
                <div className="card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <FileText className="w-5 h-5 text-surface-400 flex-shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate text-surface-800 dark:text-surface-200">
                          {f.file.name}
                        </p>
                        <p className="text-xs text-surface-400 mt-0.5">
                          {(f.file.size / 1024).toFixed(0)} KB
                        </p>
                      </div>
                    </div>

                    {f.progress.stage === 'error' ? (
                      <button
                        onClick={() => removeFile(f.localId)}
                        className="text-surface-400 hover:text-surface-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    ) : (
                      <StageIndicator stage={f.progress.stage} />
                    )}
                  </div>

                  {f.progress.stage !== 'error' && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-surface-400 mb-1">
                        <span>{stageLabel(f.progress.stage)}</span>
                        <span>{f.progress.progress}%</span>
                      </div>
                      <div className="h-1.5 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-saffron-500 rounded-full transition-all duration-500"
                          style={{ width: `${f.progress.progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {f.progress.stage === 'error' && (
                    <p className="mt-2 text-xs text-rose-500">{f.progress.error}</p>
                  )}
                </div>
              )}

              {/* Result card */}
              {f.progress.stage === 'done' && f.result && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                      {f.file.name} — processed
                    </span>
                    <button
                      onClick={() => removeFile(f.localId)}
                      className="ml-auto text-surface-400 hover:text-surface-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <InvoiceResultCard data={f.result} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tips */}
      <div className="card p-4 bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800">
        <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2">
          For best results
        </h3>
        <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
          <li>• Digital PDFs process faster and more accurately than scanned images</li>
          <li>• Ensure HSN codes are visible — they determine GST rate and ITC eligibility</li>
          <li>• If OCR fails, try a higher-quality scan (300 DPI or above)</li>
          <li>• Cement invoices dated 22 Sep 2025+ should show 18% GST, not 28%</li>
        </ul>
      </div>
    </div>
  )
}

function StageIndicator({ stage }: { stage: UploadProgress['stage'] }) {
  if (stage === 'error') return <AlertCircle className="w-4 h-4 text-rose-500" />
  if (stage === 'done') return <CheckCircle className="w-4 h-4 text-emerald-500" />
  return <Loader2 className="w-4 h-4 text-saffron-500 animate-spin" />
}

function stageLabel(stage: UploadProgress['stage']): string {
  const labels: Record<UploadProgress['stage'], string> = {
    uploading: 'Uploading file...',
    extracting: 'AI extracting invoice data...',
    calculating: 'Calculating ITC...',
    done: 'Done',
    error: 'Failed',
  }
  return labels[stage]
}
