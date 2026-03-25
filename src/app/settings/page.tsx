// src/app/settings/page.tsx
'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Save, Loader2, Moon, Sun, Globe } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { getSupabaseClient } from '@/lib/supabase/client'
import { useAppStore } from '@/store'
import { useTheme } from 'next-themes'

export default function SettingsPage() {
  const supabase = getSupabaseClient()
  const { language, setLanguage, darkMode, setDarkMode } = useAppStore()
  const { setTheme, resolvedTheme } = useTheme()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    fullName: '',
    businessName: '',
    gstin: '',
  })
  const [gstinError, setGstinError] = useState('')

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await (supabase.from('profiles') as any)
      .select('*')
      .eq('id', user.id)
      .single() as { data: { full_name: string | null; business_name: string | null; gstin: string | null } | null }

    if (profile) {
      setForm({
        fullName: profile.full_name || '',
        businessName: profile.business_name || '',
        gstin: profile.gstin || '',
      })
    }
  }

  function validateGSTIN(gstin: string): boolean {
    if (!gstin) return true // Optional
    return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gstin.toUpperCase())
  }

  async function handleSave() {
    if (form.gstin && !validateGSTIN(form.gstin)) {
      setGstinError('Invalid GSTIN format (e.g., 27AAPFU0939F1ZV)')
      return
    }
    setGstinError('')
    setSaving(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await (supabase.from('profiles') as any)
        .update({
          full_name: form.fullName.trim(),
          business_name: form.businessName.trim() || null,
          gstin: form.gstin.trim().toUpperCase() || null,
          language,
          dark_mode: darkMode,
        })
        .eq('id', user.id)

      if (error) throw error
      toast.success('Settings saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const toggleDark = () => {
    const next = resolvedTheme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    setDarkMode(next === 'dark')
  }

  return (
    <div className="max-w-xl mx-auto space-y-6 animate-fade-in">
      <div>
        <PageHeader />
        <h1 className="font-display font-bold text-2xl sm:text-3xl text-surface-900 dark:text-surface-50">
          Settings
        </h1>
        <p className="text-surface-500 mt-1">Manage your profile and preferences</p>
      </div>

      {/* Profile */}
      <div className="card p-5 space-y-4">
        <h2 className="font-semibold text-surface-800 dark:text-surface-200">Profile</h2>

        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
            Full Name
          </label>
          <input
            type="text"
            value={form.fullName}
            onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
            placeholder="Your full name"
            className="input-base"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
            Business Name
          </label>
          <input
            type="text"
            value={form.businessName}
            onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))}
            placeholder="Your company or firm name"
            className="input-base"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
            Your GSTIN
          </label>
          <input
            type="text"
            value={form.gstin}
            onChange={(e) => {
              setForm((f) => ({ ...f, gstin: e.target.value.toUpperCase() }))
              setGstinError('')
            }}
            placeholder="e.g., 27AAPFU0939F1ZV"
            maxLength={15}
            className={`input-base font-mono uppercase ${gstinError ? 'border-rose-400 focus:ring-rose-400' : ''}`}
          />
          {gstinError && <p className="text-xs text-rose-500 mt-1">{gstinError}</p>}
          <p className="text-xs text-surface-400 mt-1">
            Used to determine IGST vs CGST/SGST split on invoices
          </p>
        </div>
      </div>

      {/* Preferences */}
      <div className="card p-5 space-y-4">
        <h2 className="font-semibold text-surface-800 dark:text-surface-200">Preferences</h2>

        {/* Language */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Globe className="w-4 h-4 text-surface-500" />
            <div>
              <div className="text-sm font-medium text-surface-800 dark:text-surface-200">Language</div>
              <div className="text-xs text-surface-400">App interface language</div>
            </div>
          </div>
          <div className="flex gap-2">
            {(['en', 'hi'] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  language === lang
                    ? 'bg-saffron-500 text-white'
                    : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700'
                }`}
              >
                {lang === 'en' ? 'English' : 'हिन्दी'}
              </button>
            ))}
          </div>
        </div>

        {/* Dark mode */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {resolvedTheme === 'dark' ? (
              <Moon className="w-4 h-4 text-surface-500" />
            ) : (
              <Sun className="w-4 h-4 text-surface-500" />
            )}
            <div>
              <div className="text-sm font-medium text-surface-800 dark:text-surface-200">Dark Mode</div>
              <div className="text-xs text-surface-400">
                Currently: {resolvedTheme === 'dark' ? 'Dark' : 'Light'}
              </div>
            </div>
          </div>
          <button
            onClick={toggleDark}
            className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
              resolvedTheme === 'dark' ? 'bg-saffron-500' : 'bg-surface-300'
            }`}
            role="switch"
            aria-checked={resolvedTheme === 'dark'}
          >
            <span
              className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200 ${
                resolvedTheme === 'dark' ? 'left-7' : 'left-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Save */}
      <button onClick={handleSave} disabled={saving} className="btn-primary w-full py-3">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {saving ? 'Saving...' : 'Save Settings'}
      </button>

      {/* Disclaimer */}
      <p className="text-xs text-surface-400 text-center">
        ITC Saathi calculations are for reference only. Always verify with a Chartered Accountant
        before filing your GSTR-3B.
      </p>
    </div>
  )
}
