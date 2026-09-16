'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BookmarkPlus, Sparkles, Loader2, Database } from 'lucide-react'
import type { SavedItem } from '@/lib/mock-data'
import ItemCard from './ItemCard'

interface LibraryGridProps {
  items: SavedItem[]
}

export default function LibraryGrid({ items }: LibraryGridProps) {
  const router = useRouter()
  const [seeding, setSeeding] = useState(false)
  const [seedMessage, setSeedMessage] = useState<string | null>(null)

  async function handleSeedData() {
    setSeeding(true)
    setSeedMessage(null)
    try {
      const res = await fetch('/api/seed', { method: 'POST' })
      const data = await res.json()
      if (res.ok && data.success) {
        setSeedMessage('✓ Örnek veriler yüklendi! Sayfa yenileniyor...')
        setTimeout(() => {
          router.refresh()
          window.location.reload()
        }, 1200)
      } else {
        setSeedMessage(`✗ Hata: ${data.error || 'Yüklenemedi'}`)
        setSeeding(false)
      }
    } catch {
      setSeedMessage('✗ Bağlantı hatası oluştu.')
      setSeeding(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center animate-fade-up glass rounded-3xl p-8 max-w-lg mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-[var(--accent-subtle)] flex items-center justify-center shadow-[0_0_20px_var(--accent-glow)]">
          <BookmarkPlus className="w-8 h-8 text-[var(--accent-light)]" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Kütüphaneniz henüz boş
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1 max-w-xs mx-auto">
            Yukarıdaki alana bir link yapıştırın veya tek tıkla örnek Dewey içeriklerini veritabanınıza yükleyin.
          </p>
        </div>

        <button
          onClick={handleSeedData}
          disabled={seeding}
          className="btn-primary text-xs font-semibold py-2.5 px-5 rounded-xl flex items-center gap-2 mt-2 disabled:opacity-50"
        >
          {seeding ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Database className="w-4 h-4 text-amber-300" />
          )}
          <span>Örnek Dewey İçeriklerini Yükle</span>
        </button>

        {seedMessage && (
          <p className="text-xs text-[var(--accent-light)] font-mono animate-fade-up">
            {seedMessage}
          </p>
        )}

        <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mt-2">
          <Sparkles className="w-3.5 h-3.5 text-[var(--accent-light)]" />
          Instagram • TikTok • LinkedIn • YouTube • Twitter/X
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 stagger">
      {items.map((item) => (
        <ItemCard key={item.id} item={item} />
      ))}
    </div>
  )
}
