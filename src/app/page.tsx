// src/app/page.tsx
// Public landing page for ITC Saathi
// Converts visitors to sign-ups; showcases the rate cut and ITC benefit

import Link from 'next/link'
import { ArrowRight, FileText, Zap, Download, Shield, CheckCircle2, TrendingDown } from 'lucide-react'

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-surface-950 text-surface-50 overflow-hidden">
      {/* ── Nav ──────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 py-4 bg-surface-950/90 backdrop-blur border-b border-surface-800">
        <span className="font-display font-bold text-xl text-saffron-400">ITC Saathi</span>
        <div className="flex items-center gap-3">
          <Link href="/auth" className="btn-ghost text-surface-300 hover:text-white">
            Login
          </Link>
          <Link href="/auth?tab=signup" className="btn-primary">
            Get Started Free
          </Link>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-24 px-6 text-center">
        {/* Background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-saffron-600/15 rounded-full blur-[100px]" />
        </div>

        <div className="relative max-w-4xl mx-auto">
          {/* Rate cut announcement banner */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-saffron-500/10 border border-saffron-500/30 text-saffron-400 text-sm font-medium mb-8">
            <TrendingDown className="w-4 h-4" />
            Cement GST cut: 28% → 18% from 22 Sep 2025
          </div>

          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight mb-6">
            Claim every rupee
            <br />
            <span className="text-saffron-400">of ITC you deserve</span>
          </h1>

          <p className="text-xl text-surface-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            Upload construction material invoices. AI extracts GST data instantly.
            Get GSTR-3B-ready reports in one click. Built for Indian contractors.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth?tab=signup" className="btn-primary text-base px-6 py-3">
              Start Claiming Free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="#how-it-works" className="btn-secondary text-base px-6 py-3 !bg-transparent !border-surface-700 !text-surface-200 hover:!bg-surface-800">
              See How It Works
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats Banner ─────────────────────────────────────────────── */}
      <section className="border-y border-surface-800 bg-surface-900/50 py-12 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
          {[
            { value: '₹36 Lakh', label: 'Avg ITC saved per ₹1Cr cement purchase', sub: 'at 28% vs 18%' },
            { value: '< 2 min', label: 'Time to process an invoice', sub: 'PDF upload to ITC amount' },
            { value: '100%', label: 'Offline-first for site supervisors', sub: 'Syncs when online' },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="font-display font-bold text-4xl text-saffron-400 num">{stat.value}</div>
              <div className="text-surface-200 font-medium mt-1">{stat.label}</div>
              <div className="text-surface-500 text-sm mt-0.5">{stat.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-center mb-4">
            Three steps to reclaim your GST
          </h2>
          <p className="text-surface-400 text-center mb-16 max-w-xl mx-auto">
            No CA needed. No spreadsheets. No manual HSN lookups.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: FileText,
                step: '01',
                title: 'Upload PDF Invoice',
                desc: 'Drop any invoice — scanned or digital. We handle both with OCR fallback.',
                color: 'text-saffron-400',
              },
              {
                icon: Zap,
                step: '02',
                title: 'AI Extracts & Calculates',
                desc: 'HSN validation, GST rate check, rate-cut detection, ITC eligibility — all automatic.',
                color: 'text-emerald-400',
              },
              {
                icon: Download,
                step: '03',
                title: 'Export GSTR-3B Data',
                desc: 'Get Table 4A/4D ready data. Export to Excel or JSON for your CA or filing portal.',
                color: 'text-blue-400',
              },
            ].map((step) => (
              <div key={step.step} className="relative card p-6 bg-surface-900/50 border-surface-800">
                <div className={`font-display font-bold text-5xl ${step.color} opacity-20 absolute top-4 right-6`}>
                  {step.step}
                </div>
                <step.icon className={`w-7 h-7 ${step.color} mb-4`} />
                <h3 className="font-display font-semibold text-lg mb-2">{step.title}</h3>
                <p className="text-surface-400 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Materials Covered ─────────────────────────────────────────── */}
      <section className="py-16 px-6 bg-surface-900/30 border-y border-surface-800">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-2xl font-bold text-center mb-10">
            Materials covered with accurate GST rates
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { name: 'Cement', rate: '18%', prev: '28%', cut: true },
              { name: 'TMT Steel', rate: '18%', prev: '18%', cut: false },
              { name: 'Bricks', rate: '5%', prev: '5%', cut: false },
              { name: 'Sand / Aggregate', rate: '5%', prev: '5%', cut: false },
              { name: 'Tiles (Ceramic)', rate: '5%', prev: '5%', cut: false },
              { name: 'Tiles (Vitrified)', rate: '12%', prev: '12%', cut: false },
              { name: 'Construction Chemicals', rate: '18%', prev: '18%', cut: false },
              { name: 'Lime / Quicklime', rate: '5%', prev: '5%', cut: false },
            ].map((mat) => (
              <div key={mat.name} className="card p-4 bg-surface-900/50 border-surface-800">
                <div className="text-sm font-medium text-surface-200">{mat.name}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="num font-bold text-saffron-400">{mat.rate}</span>
                  {mat.cut && (
                    <span className="text-xs text-surface-500 line-through">{mat.prev}</span>
                  )}
                  {mat.cut && (
                    <span className="badge-success text-[10px]">CUT</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-3xl font-bold text-center mb-16">
            Everything a contractor needs
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              'Handles scanned and digital PDFs',
              'Auto-detects cement GST rate cut (22 Sep 2025)',
              'HSN validation for all construction materials',
              'CGST / SGST / IGST split calculated',
              'Section 17(5) blocking rules applied',
              'GSTR-2B reconciliation support',
              'Works offline — perfect for remote sites',
              'English + Hindi interface',
              'Export: Excel, JSON, CSV',
              'Secure — your data, your invoices only',
            ].map((f) => (
              <div key={f} className="flex items-start gap-3 py-3 border-b border-surface-800 last:border-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                <span className="text-surface-300 text-sm">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <Shield className="w-10 h-10 text-saffron-400 mx-auto mb-6" />
          <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4">
            Start reclaiming your ITC today
          </h2>
          <p className="text-surface-400 mb-8">
            Free to use. No credit card required. Built for India.
          </p>
          <Link href="/auth?tab=signup" className="btn-primary text-base px-8 py-3">
            Create Free Account
            <ArrowRight className="w-4 h-4" />
          </Link>
          <p className="text-surface-600 text-xs mt-6">
            ITC Saathi assists with calculations and exports. Verify with your CA before filing.
          </p>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="border-t border-surface-800 py-8 px-6 text-center text-surface-600 text-sm">
        <div className="font-display font-bold text-surface-400 mb-2">ITC Saathi</div>
        <p>Built for Indian contractors. GST rates per CBIC notification, effective 22 September 2025.</p>
        <p className="mt-1 text-surface-700">
          Demo: <span className="text-surface-500">https://itc-saathi.vercel.app</span>
        </p>
      </footer>
    </main>
  )
}
