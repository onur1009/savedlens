'use client'

import { BookmarkPlus, Sparkles } from 'lucide-react'
import type { SavedItem } from '@/lib/mock-data'
import ItemCard from './ItemCard'

interface LibraryGridProps {
  items: SavedItem[]
}

export default function LibraryGrid({ items }: LibraryGridProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center animate-fade-up">
        <div className="w-16 h-16 rounded-2xl bg-[var(--accent-subtle)] flex items-center justify-center">
          <BookmarkPlus className="w-8 h-8 text-[var(--accent-light)]" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Aramanızla eşleşen içerik bulunamadı
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1 max-w-xs">
            Farklı bir arama terimi deneyin veya filtreleri temizleyin.
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
          <Sparkles className="w-3 h-3 text-[var(--accent-light)]" />
          Instagram • TikTok • LinkedIn • YouTube • Twitter/X • Web
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
