// src/lib/i18n/index.ts
// Lightweight i18n without next-intl overhead.
// Loads JSON translation files, supports nested keys with dot notation.

import { useCallback } from 'react'
import { useAppStore } from '@/store'

type TranslationValue = string | Record<string, unknown>

/**
 * Deep get a value from nested object using dot notation.
 * e.g. get(obj, 'nav.dashboard') → 'Dashboard'
 */
function deepGet(obj: Record<string, unknown>, path: string): string | undefined {
  const keys = path.split('.')
  let current: unknown = obj

  for (const key of keys) {
    if (current === null || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[key]
  }

  return typeof current === 'string' ? current : undefined
}

// In-memory translation cache
const cache: Record<string, Record<string, unknown>> = {}

/**
 * Load translations for a locale. Fetches from public/locales/{locale}/common.json.
 * Caches in memory.
 */
export async function loadTranslations(locale: 'en' | 'hi'): Promise<Record<string, unknown>> {
  if (cache[locale]) return cache[locale]

  try {
    const response = await fetch(`/locales/${locale}/common.json`)
    const data = await response.json()
    cache[locale] = data
    return data
  } catch {
    console.warn(`Failed to load translations for ${locale}, falling back to en`)
    if (locale !== 'en') return loadTranslations('en')
    return {}
  }
}

/**
 * Synchronously get translations from cache.
 * Falls back to 'en' if locale not loaded yet.
 */
export function getTranslations(locale: 'en' | 'hi'): Record<string, unknown> {
  return cache[locale] || cache['en'] || {}
}

/**
 * Translation function type.
 */
export type TFunction = (key: string, params?: Record<string, string>) => string

/**
 * useT hook — returns a t() function for the current locale.
 */
export function useT(): TFunction {
  const language = useAppStore((s) => s.language)
  const translations = getTranslations(language)

  return useCallback(
    (key: string, params?: Record<string, string>): string => {
      const value = deepGet(translations, key)
      if (!value) {
        // Return last key segment as fallback
        const fallback = key.split('.').pop() || key
        return fallback
      }

      if (!params) return value

      // Simple interpolation: {{variable}} → value
      return Object.entries(params).reduce(
        (str, [k, v]) => str.replace(new RegExp(`{{${k}}}`, 'g'), v),
        value
      )
    },
    [translations]
  )
}
