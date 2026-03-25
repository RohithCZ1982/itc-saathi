// src/components/layout/AppInitializer.tsx
'use client'

import { useEffect } from 'react'
import { loadTranslations } from '@/lib/i18n'
import { useAppStore } from '@/store'
import { useTheme } from 'next-themes'

/**
 * Client component that runs once on mount to:
 * 1. Load translations for the current language
 * 2. Set up online/offline event listeners
 * 3. Sync theme preference from store
 */
export function AppInitializer() {
  const { language, darkMode, setIsOnline } = useAppStore()
  const { setTheme } = useTheme()

  useEffect(() => {
    // Load translations
    loadTranslations(language)
    loadTranslations('en') // Always load English as fallback

    // Sync dark mode
    setTheme(darkMode ? 'dark' : 'light')
  }, [language, darkMode, setTheme])

  useEffect(() => {
    // Online/offline detection
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    setIsOnline(navigator.onLine)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [setIsOnline])

  return null
}
