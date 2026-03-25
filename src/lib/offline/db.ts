// src/lib/offline/db.ts
// IndexedDB storage for offline-pending invoice uploads.
// Uses 'idb' wrapper for clean async API.
// Files are stored here while offline; synced when connection restores.

import { openDB, type IDBPDatabase } from 'idb'
import type { PendingUpload } from '@/types'

const DB_NAME = 'itc-saathi-offline'
const DB_VERSION = 1
const STORE_NAME = 'pending_uploads'

let dbPromise: Promise<IDBPDatabase> | null = null

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'localId' })
          store.createIndex('status', 'status')
          store.createIndex('createdAt', 'createdAt')
        }
      },
    })
  }
  return dbPromise
}

/**
 * Save a pending upload to IndexedDB.
 * File objects are stored directly (IDB supports Blobs/Files).
 */
export async function savePendingUpload(upload: PendingUpload): Promise<void> {
  const db = await getDB()
  await db.put(STORE_NAME, upload)
}

/**
 * Get all pending uploads, ordered by creation time.
 */
export async function getPendingUploads(): Promise<PendingUpload[]> {
  const db = await getDB()
  const all = await db.getAll(STORE_NAME)
  return all.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
}

/**
 * Get a single pending upload by localId.
 */
export async function getPendingUpload(localId: string): Promise<PendingUpload | undefined> {
  const db = await getDB()
  return db.get(STORE_NAME, localId)
}

/**
 * Update the status of a pending upload.
 */
export async function updatePendingUploadStatus(
  localId: string,
  status: PendingUpload['status'],
  retryCount?: number
): Promise<void> {
  const db = await getDB()
  const existing = await db.get(STORE_NAME, localId)
  if (!existing) return

  await db.put(STORE_NAME, {
    ...existing,
    status,
    ...(retryCount !== undefined ? { retryCount } : {}),
  })
}

/**
 * Remove a pending upload (after successful sync).
 */
export async function removePendingUpload(localId: string): Promise<void> {
  const db = await getDB()
  await db.delete(STORE_NAME, localId)
}

/**
 * Get count of pending uploads.
 */
export async function getPendingCount(): Promise<number> {
  const db = await getDB()
  return db.count(STORE_NAME)
}
