'use client'

import { Search, X, Folder, Video, Star } from 'lucide-react'

const PLATFORMS = [
  { id: 'Hepsi', label: 'Hepsi' },
  { id: 'reels', label: '🎬 Reels', isSpecial: true },
  { id: 'Instagram', label: '📸 Instagram' },
  { id: 'TikTok', label: '🎵 TikTok' },
  { id: 'Twitter/X', label: '🐦 Twitter/X' },
  { id: 'YouTube', label: '▶ YouTube' },
  { id: 'Web', label: '🌐 Web' },
]

interface CollectionOption {
  id: string
  name: string
  color: string
}

interface FilterBarProps {
  searchQuery?: string
  onSearchChange?: (query: string) => void
  selectedPlatform?: string
  onPlatformChange?: (platform: string) => void
  selectedCollectionId?: string | null
  onCollectionChange?: (colId: string | null) => void
  collections?: CollectionOption[]
  selectedTags?: string[]
  onTagToggle?: (tag: string) => void
  onClearFilters?: () => void
  onlyStarred?: boolean
  onToggleStarred?: () => void
}

export default function FilterBar({
  searchQuery = '',
  onSearchChange,
  selectedPlatform = 'Hepsi',
  onPlatformChange,
  selectedCollectionId = null,
  onCollectionChange,
  collections = [],
  selectedTags = [],
  onTagToggle,
  onClearFilters,
  onlyStarred = false,
  onToggleStarred,
}: FilterBarProps) {
  const hasFilters = Boolean(
    searchQuery.trim() ||
    (selectedPlatform && selectedPlatform !== 'Hepsi') ||
    selectedCollectionId !== null ||
    selectedTags.length > 0 ||
    onlyStarred
  )

  const activeCollection = collections.find((c) => c.id === selectedCollectionId)

  return (
    <div className="flex flex-col gap-2">
      {/* ── Row 1: Search + Starred + Active Filter Status ──── */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder="Reels, içerik, yazar (@kullanıcı) veya etiketlerde ara..."
            className="w-full pl-10 pr-9 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] text-xs sm:text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange?.('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Favorite / Starred Quick Toggle */}
        <button
          type="button"
          onClick={onToggleStarred}
          className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border shrink-0 ${
            onlyStarred
              ? 'bg-amber-950/50 text-amber-300 border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
              : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border)] hover:text-white'
          }`}
          title="Yalnızca favorileri filtrele"
        >
          <Star className={`w-3.5 h-3.5 ${onlyStarred ? 'fill-amber-400 text-amber-400' : ''}`} />
          <span className="hidden sm:inline">Favoriler</span>
        </button>

        {/* Reset / Clear button if any filter is active */}
        {hasFilters && (
          <button
            onClick={onClearFilters}
            className="px-2.5 py-2 rounded-xl text-xs text-[var(--text-muted)] hover:text-rose-400 bg-[var(--bg-surface)] border border-[var(--border)] flex items-center gap-1 transition-colors shrink-0"
            title="Tüm filtreleri sıfırla"
          >
            <X className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Temizle</span>
          </button>
        )}
      </div>

      {/* ── Row 2: Platform Pills + Collection Filter Dropdown ── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {/* Collection Dropdown Selector */}
        {collections.length > 0 && (
          <div className="relative shrink-0">
            <select
              value={selectedCollectionId || ''}
              onChange={(e) => onCollectionChange?.(e.target.value || null)}
              aria-label="Koleksiyon Filtresi"
              className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium cursor-pointer transition-all outline-none appearance-none pr-6 bg-[var(--bg-surface)] ${
                selectedCollectionId
                  ? 'border-[var(--accent)] text-[var(--accent-light)] ring-1 ring-[var(--accent)]'
                  : 'border-[var(--border)] text-[var(--text-secondary)] hover:text-white'
              }`}
            >
              <option value="">📁 Tüm Koleksiyonlar</option>
              {collections.map((col) => (
                <option key={col.id} value={col.id}>
                  📁 {col.name}
                </option>
              ))}
            </select>
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-zinc-400 pointer-events-none">
              ▼
            </span>
          </div>
        )}

        {/* Platform & Reel filter buttons */}
        {PLATFORMS.map((p) => {
          const isActive = selectedPlatform === p.id
          return (
            <button
              key={p.id}
              onClick={() => onPlatformChange?.(p.id)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                isActive
                  ? p.isSpecial
                    ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white border-transparent shadow-[0_0_12px_rgba(244,63,94,0.4)]'
                    : 'bg-[var(--accent)] text-white border-transparent shadow-[0_0_12px_var(--accent-glow)]'
                  : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-white border-[var(--border)]'
              }`}
            >
              {p.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
