'use client'

import { Search, X, Star, Sparkles } from 'lucide-react'

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
  selectedCategory?: string | null
  onCategoryChange?: (category: string | null) => void
  selectedCollectionId?: string | null
  onCollectionChange?: (colId: string | null) => void
  collections?: CollectionOption[]
  selectedTags?: string[]
  onClearFilters?: () => void
  onlyStarred?: boolean
  onToggleStarred?: () => void
  isSemanticSearch?: boolean
  onToggleSemanticSearch?: () => void
}

export default function FilterBar({
  searchQuery = '',
  onSearchChange,
  selectedPlatform = 'Hepsi',
  onPlatformChange,
  selectedCategory = null,
  onCategoryChange,
  selectedCollectionId = null,
  onCollectionChange,
  collections = [],
  selectedTags = [],
  onClearFilters,
  onlyStarred = false,
  onToggleStarred,
  isSemanticSearch = false,
  onToggleSemanticSearch,
}: FilterBarProps) {
  const hasFilters = Boolean(
    searchQuery.trim() ||
    (selectedPlatform && selectedPlatform !== 'Hepsi') ||
    selectedCategory !== null ||
    selectedCollectionId !== null ||
    selectedTags.length > 0 ||
    onlyStarred ||
    isSemanticSearch
  )

  return (
    <div className="flex flex-col gap-2">
      {/* ── Row 1: Search + Starred + Semantic Search Toggle + Clear ──── */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder={
              isSemanticSearch
                ? "🧠 İkinci Beyin Semantik Arama: örn. 'patates tarifi', 'tatlılar', 'sessiz kahveciler'..."
                : "Patates tarifi, yemek, reels, yazar (@kullanıcı) veya etiketlerde ara..."
            }
            className={`w-full pl-10 pr-9 py-2 rounded-xl bg-[var(--bg-surface)] border text-xs sm:text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none transition-all ${
              isSemanticSearch
                ? 'border-purple-500/60 focus:border-purple-400 focus:ring-1 focus:ring-purple-400/50 shadow-[0_0_15px_rgba(168,85,247,0.15)]'
                : 'border-[var(--border)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]'
            }`}
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

        {/* AI Semantic Search Mode Button */}
        {onToggleSemanticSearch && (
          <button
            type="button"
            onClick={onToggleSemanticSearch}
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border shrink-0 ${
              isSemanticSearch
                ? 'bg-purple-950/60 text-purple-300 border-purple-500/60 shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border)] hover:text-purple-300 hover:border-purple-500/30'
            }`}
            title="AI Semantik Arama: Anlam ve kavram benzerliğine göre arar"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isSemanticSearch ? 'text-purple-400 animate-pulse' : 'text-zinc-400'}`} />
            <span className="hidden sm:inline">AI Arama</span>
          </button>
        )}

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

      {/* ── Row 2: Category Selector + Platform Pills + Collection Filter Dropdown ── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {/* Category Dropdown Selector */}
        <div className="relative shrink-0">
          <select
            value={selectedCategory || ''}
            onChange={(e) => onCategoryChange?.(e.target.value || null)}
            aria-label="Kategori Filtresi"
            className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium cursor-pointer transition-all outline-none appearance-none pr-6 bg-[var(--bg-surface)] ${
              selectedCategory
                ? 'border-purple-500 text-purple-300 ring-1 ring-purple-400 font-bold bg-purple-950/30'
                : 'border-[var(--border)] text-[var(--text-secondary)] hover:text-white'
            }`}
          >
            <option value="">🏷️ Tüm Kategoriler</option>
            <option value="recipe">🍳 Yemek & Tarifler</option>
            <option value="health">🩺 Sağlık & Doktor</option>
            <option value="productivity">💻 Yazılım, Kod & AI</option>
            <option value="travel">📍 Gezi & Mekan</option>
            <option value="product">🛍️ Ürün & İndirim</option>
            <option value="book_movie">🎬 Kitap & Dizi</option>
            <option value="other">📌 Diğer</option>
          </select>
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-zinc-400 pointer-events-none">
            ▼
          </span>
        </div>

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
