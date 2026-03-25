# ITC Saathi — Auto-claim GST Input Tax Credit

> Upload invoices → AI extracts data → Exact ITC calculation → One-click GSTR-3B export

Built for Indian contractors and builders to automatically claim every rupee of Input Tax Credit on construction materials — including the **cement GST rate cut from 28% to 18%** effective 22 September 2025.

---

## What It Does

**Laser-focused on one thing:** ITC auto-claim for construction materials.

1. **Upload** — PDF or scanned image invoices (cement, steel, bricks, tiles, sand)
2. **Extract** — AI (Claude) reads invoice data; OCR fallback for scanned PDFs
3. **Calculate** — GST engine validates HSN codes, applies rate-cut rules, computes eligible ITC
4. **Export** — GSTR-3B Table 4A/4D ready data in Excel, JSON, or CSV

**No attendance, no RERA, no payroll — just ITC.**

---

## GST Rules Baked In

| Material | HSN | Rate (pre 22-Sep-2025) | Rate (from 22-Sep-2025) |
|----------|-----|------------------------|--------------------------|
| Cement (all types) | 2523xx | 28% | **18%** ✂️ |
| TMT Steel / Rebar | 7213–7217 | 18% | 18% |
| Bricks (clay/fly ash) | 6904xx | 5% | 5% |
| Sand / Aggregates | 2505, 2517 | 5% | 5% |
| Ceramic Tiles | 6907 | 5% | 5% |
| Vitrified Tiles | 69072x | 12% | 12% |
| Construction Chemicals | 3824 | 18% | 18% |
| Lime / Quicklime | 2521–2522 | 5% | 5% |

- **Section 17(5) blocking** — blocked credits flagged automatically
- **IGST vs CGST/SGST** split determined from GSTIN state codes
- **GSTR-2B reconciliation** fields included

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router) + TypeScript |
| Styling | Tailwind CSS (dark mode, mobile-first) |
| Backend | Next.js API Routes (serverless) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Storage | Supabase Storage (private bucket) |
| AI Extraction | Anthropic Claude (claude-sonnet-4) |
| PDF Parsing | pdf-parse + Tesseract.js OCR |
| Export | xlsx (Excel), native JSON/CSV |
| Offline | IndexedDB (idb) + Zustand |
| i18n | English + Hindi |
| Deploy | Vercel |

---

## Project Structure

```
itc-saathi/
├── src/
│   ├── app/
│   │   ├── page.tsx                 # Landing page
│   │   ├── layout.tsx               # Root layout (fonts, theme, toasts)
│   │   ├── globals.css              # Tailwind + CSS variables
│   │   ├── auth/
│   │   │   ├── page.tsx             # Login / signup
│   │   │   └── callback/route.ts    # OAuth callback
│   │   ├── dashboard/
│   │   │   ├── layout.tsx           # Auth guard + sidebar + topbar
│   │   │   └── page.tsx             # Dashboard with stats
│   │   ├── upload/page.tsx          # Invoice upload with drag-drop
│   │   ├── claims/page.tsx          # ITC claims + GSTR-3B export
│   │   ├── settings/page.tsx        # Profile + preferences
│   │   └── api/
│   │       ├── extract/route.ts     # POST — PDF→text→AI→ITC
│   │       ├── invoices/route.ts    # GET/POST — invoice CRUD
│   │       ├── claims/route.ts      # GET/POST — ITC claim generation
│   │       └── export/route.ts      # GET — Excel/JSON/CSV export
│   ├── components/
│   │   ├── gst/RateCutBanner.tsx    # Cement rate cut notification
│   │   ├── invoice/
│   │   │   ├── InvoiceResultCard.tsx # Extracted invoice display
│   │   │   ├── DashboardStats.tsx   # Stats cards
│   │   │   └── RecentInvoices.tsx   # Invoice list
│   │   └── layout/
│   │       ├── SidebarNav.tsx       # Desktop sidebar
│   │       ├── TopBar.tsx           # Mobile nav + header
│   │       └── AppInitializer.tsx   # i18n + online listener
│   ├── lib/
│   │   ├── gst/engine.ts            # ⭐ GST rate table + ITC logic
│   │   ├── pdf/
│   │   │   ├── processor.ts         # PDF parse + OCR
│   │   │   └── extractor.ts         # AI extraction (Claude API)
│   │   ├── supabase/
│   │   │   ├── client.ts            # Browser Supabase client
│   │   │   └── server.ts            # Server Supabase client (SSR)
│   │   ├── i18n/index.ts            # Translation hook
│   │   └── offline/db.ts            # IndexedDB for offline uploads
│   ├── store/index.ts               # Zustand global state
│   ├── middleware.ts                # Auth session refresh
│   └── types/
│       ├── index.ts                 # All TypeScript types
│       └── supabase.ts              # Database types
├── supabase/
│   ├── config.toml                  # Supabase local config
│   └── migrations/
│       └── 001_initial_schema.sql   # Full schema + RLS + storage
├── public/
│   ├── manifest.json                # PWA manifest
│   └── locales/
│       ├── en/common.json           # English translations
│       └── hi/common.json           # Hindi translations
├── .env.example                     # Environment variables template
├── next.config.js
├── tailwind.config.ts
├── vercel.json
└── package.json
```

---

## Local Development Setup

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) account (free tier works)
- An [Anthropic API key](https://console.anthropic.com/)

### Step 1 — Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/itc-saathi.git
cd itc-saathi
npm install
```

### Step 2 — Create Supabase project

1. Go to [supabase.com](https://supabase.com) → New project
2. Note your **Project URL** and **anon key** from Settings → API
3. Note your **service_role key** (keep this secret)

### Step 3 — Run database migration

In the Supabase dashboard → SQL Editor, paste and run the contents of:
```
supabase/migrations/001_initial_schema.sql
```

This creates:
- `profiles` table with RLS
- `invoices` table with RLS + GIN index
- `itc_claims` table with RLS
- Storage bucket `invoices` (private)
- All Row Level Security policies
- Triggers for `updated_at` and auto-profile creation

### Step 4 — Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Step 5 — Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Production Deployment (Vercel + Supabase)

### Deploy to Vercel

1. Push to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import repo
3. Add environment variables (same as `.env.local`)
4. Deploy — Vercel auto-detects Next.js

The `vercel.json` already configures:
- Region: `bom1` (Mumbai — lowest latency for India)
- `/api/extract` timeout: 60s (for OCR processing)
- Security headers

### Supabase Auth Redirect URL

In Supabase Dashboard → Authentication → URL Configuration:
- **Site URL**: `https://your-app.vercel.app`
- **Redirect URLs**: `https://your-app.vercel.app/auth/callback`

---

## Security

- **RLS everywhere** — users can only access their own data
- **Private storage** — invoice files accessed via signed URLs only (5-min expiry)
- **File validation** — MIME type, size, filename sanitization before upload
- **IDOR prevention** — file URL verified to include user's ID before saving
- **No sensitive data in logs** — error handlers never log document content
- **Security headers** — X-Frame-Options, CSP, X-Content-Type-Options
- **Service role key** — server-only, never exposed to client

---

## GST Engine Details

The GST engine (`src/lib/gst/engine.ts`) contains:

- **HSN master table** — 30+ HSN codes covering all major construction materials
- **Rate cut logic** — `invoiceDate >= 2025-09-22` → use new rate for cement
- **Prefix fallback** — 8→6→4→2 digit HSN lookup (handles partial codes)
- **GSTIN validation** — regex per GSTN spec
- **ITC eligibility** — Section 17(5) blocking rules applied per item
- **IGST/CGST+SGST split** — determined from supplier vs buyer state codes
- **GSTR-3B builder** — produces Table 4A (eligible) and 4D (blocked) data

**Decision on Section 17(5):** All construction materials in our HSN table are eligible for ITC when used by a registered contractor making taxable supplies (works contract). The app assumes this is the user's situation. Users must confirm their own eligibility with a CA.

---

## Offline Support

- **Upload queue** — files saved to IndexedDB when offline
- **Auto-sync** — uploads automatically when connection restores
- **Offline indicator** — topbar shows pending count when offline
- **Zustand persistence** — language, dark mode, pending IDs in localStorage

---

## Adding Languages

1. Add a new locale file: `public/locales/[lang]/common.json`
2. Add the language option to `src/app/settings/page.tsx`
3. Update the `language` type in `src/types/index.ts` and `src/types/supabase.ts`

---

## Limitations & Disclaimer

- **ITC calculations are for reference only** — always verify with a Chartered Accountant before filing GSTR-3B
- **OCR accuracy** — scanned PDFs processed at 300 DPI+ give best results
- **HSN coverage** — covers common construction materials; uncommon HSNs show as "unvalidated"
- **Rate cut date** — hard-coded as 22 September 2025 per GST Council 54th meeting notification
- **GSTR-2B reconciliation** — matching field included in schema but auto-matching is a future feature

---

## License

MIT
