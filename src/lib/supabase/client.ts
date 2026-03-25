// src/lib/supabase/client.ts
// Browser-side Supabase client (singleton pattern)
// Lazy-initialized to avoid build-time failures when env vars aren't set

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/supabase'

let client: ReturnType<typeof createBrowserClient<Database>> | null = null

export function getSupabaseClient() {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!url || !key) {
      // Return a stub during build/SSR when env vars aren't present
      // This only happens at build time; at runtime the real values will be set
      if (typeof window === 'undefined') {
        // Server-side / build time — return minimal stub
        return {
          auth: {
            getUser: async () => ({ data: { user: null }, error: null }),
            signInWithPassword: async () => ({ error: new Error('Not configured') }),
            signUp: async () => ({ error: new Error('Not configured') }),
            signOut: async () => ({ error: null }),
            resetPasswordForEmail: async () => ({ error: null }),
          },
          from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }) }),
          storage: { from: () => ({ upload: async () => ({ error: null }), getPublicUrl: () => ({ data: { publicUrl: '' } }) }) },
        } as unknown as ReturnType<typeof createBrowserClient<Database>>
      }
      throw new Error(
        'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
        'Copy .env.example to .env.local and fill in your Supabase project credentials.'
      )
    }

    client = createBrowserClient<Database>(url, key)
  }
  return client
}
