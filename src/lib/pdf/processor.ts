// src/lib/pdf/processor.ts
// PDF text extraction with digital + OCR fallback.
// Strategy:
//   1. Try pdf-parse for digital PDFs (fast, accurate)
//   2. If text confidence < threshold, fall back to Tesseract.js OCR
//   3. Return normalized text for AI extraction

// NOTE: This module runs server-side only (listed in serverExternalPackages).

const MIN_TEXT_CONFIDENCE = 0.6  // Switch to OCR if fewer chars/page
const MIN_CHARS_PER_PAGE = 100   // Scanned PDF detection heuristic

export interface PDFExtractionResult {
  text: string
  pageCount: number
  ocrUsed: boolean
  confidence: number  // 0-1
  error?: string
}

/**
 * Extract text from a PDF buffer.
 * Tries native text extraction first; falls back to Tesseract OCR.
 */
export async function extractPDFText(
  buffer: Buffer,
  fileName: string
): Promise<PDFExtractionResult> {
  // First pass: native PDF text extraction
  try {
    const pdfParse = (await import('pdf-parse')).default
    const data = await pdfParse(buffer, {
      // Limit to 10 pages for performance (invoices are rarely longer)
      max: 10,
    })

    const avgCharsPerPage = data.numpages > 0
      ? data.text.length / data.numpages
      : 0

    // Sufficient text found — use native extraction
    if (avgCharsPerPage >= MIN_CHARS_PER_PAGE && data.text.trim().length > 50) {
      return {
        text: normalizeText(data.text),
        pageCount: data.numpages,
        ocrUsed: false,
        confidence: Math.min(1, avgCharsPerPage / 500),
      }
    }

    // Sparse text — likely a scanned PDF, fall through to OCR
    console.info(`[PDF] Sparse text (${avgCharsPerPage} chars/page) — using OCR for ${fileName}`)
  } catch (err) {
    console.warn('[PDF] pdf-parse failed, trying OCR:', err)
  }

  // Second pass: Tesseract OCR
  return extractWithOCR(buffer, fileName)
}

/**
 * OCR extraction using Tesseract.js.
 * Converts PDF pages to images then runs OCR.
 */
async function extractWithOCR(
  buffer: Buffer,
  fileName: string
): Promise<PDFExtractionResult> {
  try {
    // Dynamic import to keep server bundle lean
    const { createWorker } = await import('tesseract.js')

    // Configure worker for English + Hindi (Devanagari)
    const worker = await createWorker(['eng', 'hin'], 1, {
      logger: () => {}, // Suppress verbose logging
    })

    // For PDF OCR we need to render pages to images first.
    // We use Sharp to handle the image conversion if pages are extractable.
    // Fallback: treat the buffer as a single-page image if it's an image PDF.
    let ocrText = ''
    let confidence = 0

    try {
      // Attempt to render PDF pages via canvas (works in Node via pdfjs-dist)
      const pages = await renderPDFToImages(buffer)

      if (pages.length === 0) {
        throw new Error('No pages rendered')
      }

      const results = []
      for (const pageImage of pages.slice(0, 5)) { // Max 5 pages
        const { data } = await worker.recognize(pageImage)
        results.push(data.text)
        confidence += data.confidence / 100
      }

      ocrText = results.join('\n\n---PAGE BREAK---\n\n')
      confidence = confidence / pages.length

    } catch (renderErr) {
      // Last resort: try treating the buffer directly (works for image PDFs)
      console.warn('[PDF] Page render failed, trying direct buffer OCR:', renderErr)
      const { data } = await worker.recognize(buffer)
      ocrText = data.text
      confidence = data.confidence / 100
    }

    await worker.terminate()

    return {
      text: normalizeText(ocrText),
      pageCount: 1,
      ocrUsed: true,
      confidence,
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    console.error('[PDF] OCR failed:', errMsg)
    return {
      text: '',
      pageCount: 0,
      ocrUsed: true,
      confidence: 0,
      error: `OCR failed: ${errMsg}`,
    }
  }
}

/**
 * Render PDF pages to image buffers using pdfjs-dist (server-side canvas).
 * Returns array of PNG buffers, one per page.
 * Optional — requires pdfjs-dist and canvas packages installed separately.
 */
async function renderPDFToImages(buffer: Buffer): Promise<Buffer[]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pdfjsLib = await import(/* webpackIgnore: true */ 'pdfjs-dist/legacy/build/pdf.mjs' as string).catch(() => null)
    if (!pdfjsLib) return []

    const loadingTask = (pdfjsLib as any).getDocument({ data: new Uint8Array(buffer) })
    const pdf = await loadingTask.promise

    const images: Buffer[] = []
    const pageCount = Math.min((pdf as any).numPages, 5)

    for (let i = 1; i <= pageCount; i++) {
      try {
        const page = await (pdf as any).getPage(i)
        const viewport = page.getViewport({ scale: 2.0 })

        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const canvasMod = await import(/* webpackIgnore: true */ 'canvas' as string).catch(() => null)
        if (!canvasMod) break

        const canvas = (canvasMod as any).createCanvas(viewport.width, viewport.height)
        const ctx = canvas.getContext('2d')

        await page.render({
          canvasContext: ctx,
          viewport,
        }).promise

        images.push(canvas.toBuffer('image/png'))
      } catch {
        // Individual page failure — continue
      }
    }

    return images
  } catch {
    return []
  }
}

/**
 * Normalize extracted text:
 * - Collapse multiple whitespace/newlines
 * - Fix common OCR artifacts in Indian invoices
 * - Preserve table structure where possible
 */
export function normalizeText(raw: string): string {
  return raw
    // Fix common OCR misreads for Indian tax documents
    .replace(/\b0\b(?=\d{9}\b)/g, 'O') // Leading zero in GSTIN
    .replace(/\bl\b(?=[A-Z]{4}\d{4})/g, '1') // 'l' as '1' in PAN
    .replace(/₹/g, 'Rs ') // Normalize rupee symbol
    // Normalize whitespace
    .replace(/[ \t]+/g, ' ')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * Extract text from a URL (downloads and processes).
 * Used by API routes when file is already uploaded to Supabase Storage.
 */
export async function extractTextFromURL(
  url: string,
  fileName: string
): Promise<PDFExtractionResult> {
  const response = await fetch(url)
  if (!response.ok) {
    return {
      text: '',
      pageCount: 0,
      ocrUsed: false,
      confidence: 0,
      error: `Failed to fetch file: ${response.status} ${response.statusText}`,
    }
  }

  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  return extractPDFText(buffer, fileName)
}

/**
 * Validate uploaded file before processing.
 * Checks MIME type, size, and basic structure.
 */
export function validatePDFFile(file: {
  name: string
  size: number
  type: string
}): { valid: boolean; error?: string } {
  const MAX_SIZE = 10 * 1024 * 1024 // 10MB

  if (file.size > MAX_SIZE) {
    return { valid: false, error: 'File too large. Maximum size is 10MB.' }
  }

  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/tiff']
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Only PDF and image files (JPG, PNG, TIFF) are accepted.',
    }
  }

  // Sanitize filename
  const dangerousChars = /[<>:"/\\|?*\x00-\x1f]/
  if (dangerousChars.test(file.name)) {
    return { valid: false, error: 'Invalid file name.' }
  }

  return { valid: true }
}
