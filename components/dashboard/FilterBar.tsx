'use client'

import { Search, X, Star, Sparkles, Mic2 } from 'lucide-react'

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

export type SortOption = 'newest' | 'oldest' | 'popular' | 'title_asc' | 'title_desc'

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
  onlyWithTranscript?: boolean
  onToggleWithTranscript?: () => void
  isSemanticSearch?: boolean
  onToggleSemanticSearch?: () => void
  sortBy?: SortOption
  onSortChange?: (sort: SortOption) => void
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
  onlyWithTranscript = false,
  onToggleWithTranscript,
  isSemanticSearch = false,
  onToggleSemanticSearch,
  sortBy = 'newest',
  onSortChange,
}: FilterBarProps) {
  const hasFilters = Boolean(
    searchQuery.trim() ||
    (selectedPlatform && selectedPlatform !== 'Hepsi') ||
    selectedCategory !== null ||
    selectedCollectionId !== null ||
    selectedTags.length > 0 ||
    onlyStarred ||
    onlyWithTranscript ||
    isSemanticSearch ||
    sortBy !== 'newest'
  )

  return (
    <div className="flex flex-col gap-2">
      {/* ── Row 1: Search + Starred + Scriptli + Semantic Search Toggle + Clear ──── */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 group/search">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within/search:text-indigo-400 transition-colors" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder={
              isSemanticSearch
                ? "🧠 İkinci Beyin Semantik Arama: örn. 'patates tarifi', 'tatlılar', 'sessiz kahveciler'..."
                : "Tarif, reels, video scripti, yazar (@kullanıcı) veya etiketlerde ara..."
            }
            className={`w-full pl-10 pr-16 py-2.5 rounded-xl bg-[#0d111c]/90 backdrop-blur-xl border text-xs sm:text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none transition-all ${
              isSemanticSearch
                ? 'border-purple-500/70 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/25 shadow-[0_0_20px_rgba(168,85,247,0.2)]'
                : 'border-white/[0.08] focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 hover:border-white/15'
            }`}
          />
          {searchQuery ? (
            <button
              onClick={() => onSearchChange?.('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-all"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-white/10 bg-white/5 text-[10px] font-mono text-zinc-400 pointer-events-none">
              <span>⌘</span><span>K</span>
            </div>
          )}
        </div>

        {/* AI Semantic Search Mode Button */}
        {onToggleSemanticSearch && (
          <button
            type="button"
            onClick={onToggleSemanticSearch}
            className={`px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border shrink-0 cursor-pointer ${
              isSemanticSearch
                ? 'bg-purple-950/70 text-purple-200 border-purple-500/60 shadow-[0_0_16px_rgba(168,85,247,0.35)] ring-1 ring-purple-400/50'
                : 'bg-[#0d111c]/90 text-zinc-400 border-white/[0.08] hover:text-purple-300 hover:border-purple-500/30'
            }`}
            title="AI Semantik Arama: Anlam ve kavram benzerliğine göre arar"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isSemanticSearch ? 'text-purple-300 animate-pulse' : 'text-zinc-400'}`} />
            <span className="hidden sm:inline">AI Arama</span>
          </button>
        )}

        {/* Favorite / Starred Quick Toggle */}
        <button
          type="button"
          onClick={onToggleStarred}
          className={`px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border shrink-0 cursor-pointer ${
            onlyStarred
              ? 'bg-amber-950/60 text-amber-200 border-amber-500/60 shadow-[0_0_14px_rgba(245,158,11,0.25)] ring-1 ring-amber-400/40'
              : 'bg-[#0d111c]/90 text-zinc-400 border-white/[0.08] hover:text-zinc-200 hover:border-white/15'
          }`}
          title="Yalnızca favorileri filtrele"
        >
          <Star className={`w-3.5 h-3.5 ${onlyStarred ? 'fill-amber-400 text-amber-400' : 'text-zinc-400'}`} />
          <span className="hidden sm:inline">Favoriler</span>
        </button>

        {/* With Transcript (Deşifre Hazır) Quick Toggle */}
        {onToggleWithTranscript && (
          <button
            type="button"
            onClick={onToggleWithTranscript}
            className={`px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border shrink-0 cursor-pointer ${
              onlyWithTranscript
                ? 'bg-gradient-to-r from-purple-950/80 to-indigo-950/80 text-purple-200 border-purple-500/60 shadow-[0_0_16px_rgba(168,85,247,0.35)] ring-1 ring-purple-400/50'
                : 'bg-[#0d111c]/90 text-zinc-400 border-white/[0.08] hover:text-purple-300 hover:border-purple-500/30'
            }`}
            title="Yalnızca ses deşifresi hazır olan videoları filtrele"
          >
            {onlyWithTranscript && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
            <Mic2 className={`w-3.5 h-3.5 ${onlyWithTranscript ? 'text-purple-300' : 'text-zinc-400'}`} />
            <span className="hidden sm:inline">Deşifreli</span>
          </button>
        )}

        {/* Reset / Clear button if any filter is active */}
        {hasFilters && (
          <button
            onClick={onClearFilters}
            className="px-2.5 py-2.5 rounded-xl text-xs text-zinc-400 hover:text-rose-400 bg-[#0d111c]/90 border border-white/[0.08] hover:border-rose-500/40 flex items-center gap-1 transition-all shrink-0 cursor-pointer"
            title="Tüm filtreleri sıfırla"
          >
            <X className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Temizle</span>
          </button>
        )}
      </div>

      {/* ── Row 2: Sort Selector + Category Selector + Platform Pills + Collection Filter Dropdown ── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide py-1">
        {/* Sort Selector */}
        <div className="relative shrink-0">
          <select
            value={sortBy}
            onChange={(e) => onSortChange?.(e.target.value as SortOption)}
            aria-label="Sıralama Ölçütü"
            className={`text-xs px-3 py-2 rounded-xl border font-medium cursor-pointer transition-all outline-none appearance-none pr-7 bg-[#0d111c]/90 backdrop-blur-xl ${
              sortBy !== 'newest'
                ? 'border-amber-500/80 text-amber-200 ring-1 ring-amber-400/40 font-bold bg-amber-950/40 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                : 'border-white/[0.08] text-zinc-300 hover:text-white hover:border-white/15'
            }`}
          >
            <option value="newest" className="bg-[#111827] text-white">🕒 Yeniden Eskiye</option>
            <option value="oldest" className="bg-[#111827] text-white">⏳ Eskiden Yeniye</option>
            <option value="popular" className="bg-[#111827] text-white">🔥 En Çok İzlenenler & Popüler</option>
            <option value="title_asc" className="bg-[#111827] text-white">🔤 A-Z (Başlığa Göre)</option>
            <option value="title_desc" className="bg-[#111827] text-white">🔤 Z-A (Başlığa Göre)</option>
          </select>
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-zinc-400 pointer-events-none">
            ▼
          </span>
        </div>

        {/* Category Dropdown Selector */}
        <div className="relative shrink-0">
          <select
            value={selectedCategory || ''}
            onChange={(e) => onCategoryChange?.(e.target.value || null)}
            aria-label="Kategori Filtresi"
            className={`text-xs px-3 py-2 rounded-xl border font-medium cursor-pointer transition-all outline-none appearance-none pr-7 bg-[#0d111c]/90 backdrop-blur-xl ${
              selectedCategory
                ? 'border-purple-500/80 text-purple-200 ring-1 ring-purple-400/40 font-bold bg-purple-950/40 shadow-[0_0_12px_rgba(168,85,247,0.2)]'
                : 'border-white/[0.08] text-zinc-300 hover:text-white hover:border-white/15'
            }`}
          >
            <option value="" className="bg-[#111827] text-white">🏷️ Tüm Kategoriler</option>
            <option value="recipe" className="bg-[#111827] text-white">🍳 Yemek & Tarifler</option>
            <option value="productivity" className="bg-[#111827] text-white">⚡ Yazılım, Kod & AI</option>
            <option value="finance" className="bg-[#111827] text-white">💰 Finans, Borsa & Girişim</option>
            <option value="motivation_mindset" className="bg-[#111827] text-white">💡 Kişisel Gelişim & Zihin</option>
            <option value="health" className="bg-[#111827] text-white">🩺 Sağlık & Fitness</option>
            <option value="travel" className="bg-[#111827] text-white">📍 Gezi & Mekanlar</option>
            <option value="product" className="bg-[#111827] text-white">🛍️ Ürün & Fırsatlar</option>
            <option value="book_movie" className="bg-[#111827] text-white">📚 Kitap & Sinema</option>
            <option value="other" className="bg-[#111827] text-white">📌 Diğer</option>
          </select>
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-zinc-400 pointer-events-none">
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
              className={`text-xs px-3 py-2 rounded-xl border font-medium cursor-pointer transition-all outline-none appearance-none pr-7 bg-[#0d111c]/90 backdrop-blur-xl ${
                selectedCollectionId
                  ? 'border-indigo-500/80 text-indigo-200 ring-1 ring-indigo-400/40 font-bold bg-indigo-950/40 shadow-[0_0_12px_rgba(99,102,241,0.2)]'
                  : 'border-white/[0.08] text-zinc-300 hover:text-white hover:border-white/15'
              }`}
            >
              <option value="" className="bg-[#111827] text-white">📁 Tüm Koleksiyonlar</option>
              {collections.map((col) => (
                <option key={col.id} value={col.id} className="bg-[#111827] text-white">
                  📁 {col.name}
                </option>
              ))}
            </select>
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-zinc-400 pointer-events-none">
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
              className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                isActive
                  ? p.isSpecial
                    ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white border-transparent shadow-[0_0_16px_rgba(244,63,94,0.45)] scale-[1.02]'
                    : 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white border-transparent shadow-[0_0_16px_rgba(99,102,241,0.45)] scale-[1.02]'
                  : 'bg-[#0d111c]/90 text-zinc-400 hover:text-zinc-100 border-white/[0.08] hover:border-white/20'
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
