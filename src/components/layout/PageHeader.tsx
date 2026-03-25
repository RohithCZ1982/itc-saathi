'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, LogOut } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase/client'
import { BottomNav } from './BottomNav'
import toast from 'react-hot-toast'

export function PageHeader() {
  const router = useRouter()
  const supabase = getSupabaseClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    toast.success('Logged out')
    router.push('/auth')
    router.refresh()
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-surface-500 hover:text-surface-800 dark:hover:text-surface-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-1.5 text-sm text-surface-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
      <BottomNav />
    </>
  )
}
