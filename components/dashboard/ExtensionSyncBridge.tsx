'use client'

import { useEffect } from 'react'

export default function ExtensionSyncBridge({ userId }: { userId: string }) {
  useEffect(() => {
    if (typeof window !== 'undefined' && userId) {
      try {
        localStorage.setItem('savedlens_sync_token', userId)
        window.dispatchEvent(new CustomEvent('savedlens-sync-token', { detail: { token: userId } }))
      } catch (err) {
        console.warn('[ExtensionSyncBridge] localStorage error:', err)
      }
    }
  }, [userId])

  return null
}
