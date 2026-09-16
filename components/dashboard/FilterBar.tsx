'use client'

import { Search, X } from 'lucide-react'

const PLATFORMS = ['Hepsi', 'Instagram', 'TikTok', 'LinkedIn', 'Twitter/X', 'YouTube', 'Web']
const POPULAR_TAGS = ['tasarım', 'yapayZeka', 'tarif', 'nextjs', 'istanbul', 'verimlilik', 'indirim']

interface FilterBarProps {
  searchQuery?: string
  onSearchChange?: (query: string) => void
  selectedPlatform?: string
  onPlatformChange?: (platform: string) => void
  selectedTags?: string[]
  onTagToggle?: (tag: string) => void
  onClearFilters?: () => void
}

export default function FilterBar({
  searchQuery = '',
  onSearchChange,
  selectedPlatform = 'Hepsi',
  onPlatformChange,
  selectedTags = [],
  onTagToggle,
  onClearFilters,
}: FilterBarProps) {
  const hasFilters = Boolean(
    searchQuery.trim() ||
    (selectedPlatform && selectedPlatform !== 'Hepsi') ||
    selectedTags.length > 0
  )

  return (
    <div className="flex flex-col gap-3">
      {/* Full-text search bar */}
      <div className="relative w-full">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange?.(e.target.value)}
          placeholder="İçerik, yazar (@kullanıcı), özet veya etiketlerde ara..."
          className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange?.('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Platform pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {PLATFORMS.map((platform) => {
          const isActive = selectedPlatform === platform
          return (
            <button
              key={platform}
              onClick={() => onPlatformChange?.(platform)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                isActive
                  ? 'bg-[var(--accent)] text-white shadow-[0_0_12px_var(--accent-glow)]'
                  : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)]'
              }`}
            >
              {platform}
            </button>
          )
        })}
      </div>

      {/* Tag pills */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {POPULAR_TAGS.map((tag) => {
          const isSelected = selectedTags.includes(tag)
          return (
            <button
              key={tag}
              onClick={() => onTagToggle?.(tag)}
              className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                isSelected
                  ? 'bg-[var(--accent-subtle)] text-[var(--accent-light)] border-[var(--border-accent)] font-medium'
                  : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--border)] hover:text-[var(--text-secondary)]'
              }`}
            >
              #{tag}
            </button>
          )
        })}

        {hasFilters && (
          <button
            onClick={onClearFilters}
            className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--error)] transition-colors ml-1"
          >
            <X className="w-3 h-3" />
            Temizle
          </button>
        )}
      </div>
    </div>
  )
}
