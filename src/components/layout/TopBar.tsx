// src/components/layout/TopBar.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, LayoutDashboard, Upload, FileBarChart, Settings, LogOut, Wifi, WifiOff } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store'
import toast from 'react-hot-toast'
import type { Database } from '@/types/supabase'

type Profile = Database['public']['Tables']['profiles']['Row'] | null

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/upload', label: 'Upload Invoice', icon: Upload },
  { href: '/claims', label: 'ITC Claims', icon: FileBarChart },
  { href: '/settings', label: 'Settings', icon: Settings },
]

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/upload': 'Upload Invoice',
  '/claims': 'ITC Claims',
  '/settings': 'Settings',
}

export function TopBar({ profile }: { profile: Profile }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { isOnline, pendingUploadIds } = useAppStore()
  const supabase = getSupabaseClient()

  const title = PAGE_TITLES[pathname] || 'ITC Saathi'

  const handleLogout = async () => {
    await supabase.auth.signOut()
    toast.success('Logged out')
    router.push('/')
    router.refresh()
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-surface-200 dark:border-surface-800 bg-white/90 dark:bg-surface-900/90 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Mobile: hamburger + title */}
          <div className="flex items-center gap-3 md:hidden">
            <button
              onClick={() => setMobileOpen(true)}
              className="p-2 -ml-1 rounded-lg text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800"
              aria-label="Open navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="font-display font-semibold text-surface-800 dark:text-surface-100">
              {title}
            </span>
          </div>

          {/* Desktop: breadcrumb title */}
          <h1 className="hidden md:block font-display font-semibold text-lg text-surface-800 dark:text-surface-100">
            {title}
          </h1>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Offline indicator */}
            {!isOnline && (
              <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-800">
                <WifiOff className="w-3 h-3" />
                Offline
                {pendingUploadIds.length > 0 && (
                  <span className="font-medium">({pendingUploadIds.length} pending)</span>
                )}
              </div>
            )}

            {/* Upload shortcut */}
            <Link href="/upload" className="btn-primary py-1.5 px-3 text-xs hidden sm:flex">
              <Upload className="w-3 h-3" />
              Upload
            </Link>
          </div>
        </div>
      </header>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 inset-y-0 w-72 bg-white dark:bg-surface-900 shadow-2xl flex flex-col animate-slide-up">
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-200 dark:border-surface-800">
              <span className="font-display font-bold text-xl text-saffron-500">ITC Saathi</span>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1.5 rounded-lg text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {profile && (
              <div className="px-4 py-3 border-b border-surface-200 dark:border-surface-800">
                <div className="font-medium text-sm text-surface-800 dark:text-surface-200">
                  {profile.full_name || 'User'}
                </div>
                <div className="text-xs text-surface-400 truncate">{profile.email}</div>
              </div>
            )}

            <nav className="flex-1 py-4 px-3 space-y-1">
              {NAV_ITEMS.map((item) => {
                const active = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`
                      flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium
                      ${active
                        ? 'bg-saffron-50 dark:bg-saffron-900/20 text-saffron-700 dark:text-saffron-400'
                        : 'text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-800'
                      }
                    `}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                )
              })}
            </nav>

            <div className="p-3 border-t border-surface-200 dark:border-surface-800">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm text-surface-500 hover:text-rose-600 hover:bg-surface-50 dark:hover:bg-surface-800 w-full"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  )
}
