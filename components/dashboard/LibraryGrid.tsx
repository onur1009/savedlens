'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import { BookmarkPlus, Sparkles, DownloadCloud, Loader2, ChevronDown } from 'lucide-react'
import type { SavedItem } from '@/lib/mock-data'
import ItemCard from './ItemCard'

interface LibraryGridProps {
  items: SavedItem[]
  onItemClick?: (item: SavedItem) => void
}

const BATCH_SIZE = 32

export default function LibraryGrid({ items, onItemClick }: LibraryGridProps) {
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  // Reset pagination when items filter / search changes
  useEffect(() => {
    setVisibleCount(BATCH_SIZE)
  }, [items])

  // Infinite Scroll: automatically load next batch as sentinel approaches viewport
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + BATCH_SIZE, items.length))
        }
      },
      { rootMargin: '300px' }
    )

    const el = sentinelRef.current
    if (el) observer.observe(el)

    return () => {
      if (el) observer.unobserve(el)
    }
  }, [items.length])

  const visibleItems = useMemo(() => {
    return items.slice(0, visibleCount)
  }, [items, visibleCount])

  const hasMore = visibleCount < items.length

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center animate-fade-up glass rounded-3xl p-8 max-w-lg mx-auto glow-border">
        <div className="w-16 h-16 rounded-2xl bg-[var(--accent-subtle)] flex items-center justify-center shadow-[0_0_25px_var(--accent-glow)] border border-[var(--accent)]/30">
          <BookmarkPlus className="w-8 h-8 text-[var(--accent-light)]" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">
            Kütüphaneniz henüz boş
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] max-w-sm mx-auto leading-relaxed">
            Yukarıdaki kaydetme çubuğuna Instagram, TikTok, YouTube veya dilediğiniz bir web bağlantısını yapıştırarak ilk içeriğinizi yapay zeka ile arşivleyin.
          </p>
        </div>

        {/* Action suggestion to install or open Chrome extension */}
        <Link
          href="/dashboard/settings/sync"
          className="mt-2 px-4 py-2.5 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] border border-[var(--border)] text-xs font-semibold text-[var(--text-primary)] hover:text-[var(--accent-light)] flex items-center gap-2 transition-all shadow-sm group"
        >
          <DownloadCloud className="w-4 h-4 text-[var(--accent-light)] group-hover:scale-110 transition-transform" />
          <span>Chrome Eklentisini Aç & Eşitle</span>
        </Link>

        <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] mt-3">
          <Sparkles className="w-3.5 h-3.5 text-[var(--accent-light)]" />
          <span>Instagram • TikTok • LinkedIn • YouTube • Twitter/X • Web</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-5">
        {visibleItems.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            onClick={() => onItemClick?.(item)}
          />
        ))}
      </div>

      {/* Infinite Scroll Sentinel & Load More Trigger */}
      {hasMore && (
        <div ref={sentinelRef} className="flex flex-col items-center justify-center py-6 gap-2">
          <button
            type="button"
            onClick={() => setVisibleCount((prev) => Math.min(prev + BATCH_SIZE, items.length))}
            className="px-5 py-2.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-white/10 text-xs font-medium text-zinc-300 hover:text-white flex items-center gap-2 transition-all shadow-sm cursor-pointer"
          >
            <ChevronDown className="w-4 h-4 text-purple-400" />
            <span>Daha Fazla Göster ({visibleItems.length} / {items.length})</span>
          </button>
          <span className="text-[11px] text-zinc-500 font-mono">
            Aşağı kaydırdıkça otomatik yüklenir
          </span>
        </div>
      )}
    </div>
  )
}
