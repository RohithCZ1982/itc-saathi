// src/components/layout/SidebarNav.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Upload, FileBarChart, Settings, LogOut } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import type { Database } from '@/types/supabase'

type Profile = Database['public']['Tables']['profiles']['Row'] | null

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/upload', label: 'Upload Invoice', icon: Upload },
  { href: '/claims', label: 'ITC Claims', icon: FileBarChart },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function SidebarNav({ profile }: { profile: Profile }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = getSupabaseClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    toast.success('Logged out')
    router.push('/')
    router.refresh()
  }

  return (
    <aside className="hidden md:flex flex-col w-60 border-r border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 flex-shrink-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-surface-200 dark:border-surface-800">
        <span className="font-display font-bold text-xl text-saffron-500">ITC Saathi</span>
      </div>

      {/* User info */}
      {profile && (
        <div className="px-4 py-3 border-b border-surface-200 dark:border-surface-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-saffron-100 dark:bg-saffron-900/30 flex items-center justify-center flex-shrink-0">
              <span className="text-saffron-600 dark:text-saffron-400 font-bold text-sm">
                {(profile.full_name || profile.email || '?')[0].toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium truncate text-surface-800 dark:text-surface-200">
                {profile.full_name || 'User'}
              </div>
              <div className="text-xs truncate text-surface-400">{profile.email}</div>
            </div>
          </div>
          {profile.gstin && (
            <div className="mt-2 font-mono text-xs text-surface-500 truncate" title={profile.gstin}>
              GSTIN: {profile.gstin}
            </div>
          )}
        </div>
      )}

      {/* Nav links */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
                ${active
                  ? 'bg-saffron-50 dark:bg-saffron-900/20 text-saffron-700 dark:text-saffron-400'
                  : 'text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-800 hover:text-surface-900 dark:hover:text-surface-100'
                }
              `}
            >
              <item.icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-saffron-500' : ''}`} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-surface-200 dark:border-surface-800">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-surface-500 hover:bg-surface-50 dark:hover:bg-surface-800 hover:text-rose-600 dark:hover:text-rose-400 w-full transition-all duration-150"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </aside>
  )
}
