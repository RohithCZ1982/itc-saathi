// src/store/index.ts
// Global Zustand store for app-wide state.
// Keeps UI state, language, offline queue, and upload progress.

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { UserProfile, PendingUpload, UploadProgress } from '@/types'

interface AppState {
  // ── User ──────────────────────────────────────────────────────────────
  user: UserProfile | null
  setUser: (user: UserProfile | null) => void

  // ── Preferences ────────────────────────────────────────────────────────
  language: 'en' | 'hi'
  setLanguage: (lang: 'en' | 'hi') => void
  darkMode: boolean
  setDarkMode: (dark: boolean) => void

  // ── Online Status ──────────────────────────────────────────────────────
  isOnline: boolean
  setIsOnline: (online: boolean) => void

  // ── Offline Upload Queue ────────────────────────────────────────────────
  // Note: File objects aren't serializable → stored in IndexedDB separately.
  // This store tracks metadata only.
  pendingUploadIds: string[]
  addPendingUpload: (localId: string) => void
  removePendingUpload: (localId: string) => void

  // ── Active Upload Progress ─────────────────────────────────────────────
  uploadProgressMap: Record<string, UploadProgress>
  setUploadProgress: (invoiceId: string, progress: UploadProgress) => void
  clearUploadProgress: (invoiceId: string) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // ── User ────────────────────────────────────────────────────────────
      user: null,
      setUser: (user) => set({ user }),

      // ── Preferences ──────────────────────────────────────────────────────
      language: 'en',
      setLanguage: (language) => set({ language }),
      darkMode: false,
      setDarkMode: (darkMode) => set({ darkMode }),

      // ── Online Status ────────────────────────────────────────────────────
      isOnline: true,
      setIsOnline: (isOnline) => set({ isOnline }),

      // ── Offline Queue ────────────────────────────────────────────────────
      pendingUploadIds: [],
      addPendingUpload: (localId) =>
        set((s) => ({
          pendingUploadIds: s.pendingUploadIds.includes(localId)
            ? s.pendingUploadIds
            : [...s.pendingUploadIds, localId],
        })),
      removePendingUpload: (localId) =>
        set((s) => ({
          pendingUploadIds: s.pendingUploadIds.filter((id) => id !== localId),
        })),

      // ── Upload Progress ────────────────────────────────────────────────
      uploadProgressMap: {},
      setUploadProgress: (invoiceId, progress) =>
        set((s) => ({
          uploadProgressMap: { ...s.uploadProgressMap, [invoiceId]: progress },
        })),
      clearUploadProgress: (invoiceId) =>
        set((s) => {
          const map = { ...s.uploadProgressMap }
          delete map[invoiceId]
          return { uploadProgressMap: map }
        }),
    }),
    {
      name: 'itc-saathi-app',
      storage: createJSONStorage(() => localStorage),
      // Only persist preferences and offline queue metadata, not upload progress
      partialize: (state) => ({
        language: state.language,
        darkMode: state.darkMode,
        pendingUploadIds: state.pendingUploadIds,
      }),
    }
  )
)
