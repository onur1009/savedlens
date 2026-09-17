'use client'

import { useState, useMemo, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import type { SavedItem } from '@/lib/mock-data'
import FilterBar from './FilterBar'
import LibraryGrid from './LibraryGrid'
import QuickSaveBar from './QuickSaveBar'
import ItemDetailModal from './ItemDetailModal'

interface CollectionOption {
  id: string
  name: string
  color: string
}

interface DashboardExplorerProps {
  initialItems: SavedItem[]
  userCollections?: CollectionOption[]
  offlineMode?: boolean
}

export default function DashboardExplorer({
  initialItems,
  userCollections = [],
  offlineMode = false,
}: DashboardExplorerProps) {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [items, setItems] = useState<SavedItem[]>(initialItems)
  const [selectedItem, setSelectedItem] = useState<SavedItem | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPlatform, setSelectedPlatform] = useState('Hepsi')
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [onlyStarred, setOnlyStarred] = useState(false)

  const urlPlatform = searchParams.get('platform')
  const urlFilter = searchParams.get('filter')
  const urlTag = searchParams.get('tag')
  const urlCollection = searchParams.get('collection')

  // Sync state with URL search params whenever they change
  useEffect(() => {
    if (urlPlatform) {
      if (urlPlatform.toLowerCase() === 'reels' || urlPlatform.toLowerCase() === 'reel') {
        setSelectedPlatform('reels')
      } else {
        const match = ['Instagram', 'TikTok', 'LinkedIn', 'YouTube', 'Twitter/X', 'Web'].find(
          (p) => p.toLowerCase().includes(urlPlatform.toLowerCase())
        )
        setSelectedPlatform(match || 'Hepsi')
      }
    } else {
      setSelectedPlatform('Hepsi')
    }

    if (urlFilter === 'starred') {
      setOnlyStarred(true)
    }

    if (urlCollection) {
      setSelectedCollectionId(urlCollection)
    }

    if (urlTag) {
      setSelectedTags([urlTag])
    }
  }, [urlPlatform, urlFilter, urlCollection, urlTag])

  // Real-time multi-dimensional filtering
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // 1. Reels Filter
      if (selectedPlatform === 'reels') {
        const isReel =
          (item.url && (item.url.includes('/reel/') || item.url.includes('/reels/'))) ||
          (item.platform === 'instagram' && item.media_type === 'video') ||
          item.platform === 'tiktok'
        if (!isReel) return false
      }
      // 2. Standard Platform Filter
      else if (selectedPlatform !== 'Hepsi') {
        const pName = selectedPlatform.toLowerCase()
        const itemPlatform = (item.platform || '').toLowerCase()
        if (pName.includes('twitter') || pName.includes('x')) {
          if (itemPlatform !== 'twitter' && itemPlatform !== 'x') return false
        } else if (!itemPlatform.includes(pName)) {
          return false
        }
      }

      // 3. Collection Filter
      if (selectedCollectionId) {
        if (item.collection_id !== selectedCollectionId) {
          return false
        }
      }

      // 4. Starred Filter
      if (onlyStarred && !item.starred) {
        return false
      }

      // 5. URL Filter parameter (recipe, location, discount, code)
      if (urlFilter) {
        if (urlFilter === 'recipe' && !item.extractors?.recipe) return false
        if (urlFilter === 'location' && !item.extractors?.location) return false
        if (urlFilter === 'discount' && !item.extractors?.discount) return false
        if (urlFilter === 'code' && !item.extractors?.code) return false
      }

      // 6. Tag Filter
      if (selectedTags.length > 0) {
        const itemTags = (item.tags || []).map((t) => t.toLowerCase())
        const hasAllTags = selectedTags.every((t) => itemTags.includes(t.toLowerCase()))
        if (!hasAllTags) return false
      }

      // 7. Full-text search (title, caption, author, summary, tags)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim()
        const matchTitle = (item.title || '').toLowerCase().includes(query)
        const matchDesc = (item.description || '').toLowerCase().includes(query)
        const matchAuthor = (item.author_username || '').toLowerCase().includes(query)
        const matchSummary = (item.summary || '').toLowerCase().includes(query)
        const matchTags = (item.tags || []).some((t) => t.toLowerCase().includes(query))

        if (!matchTitle && !matchDesc && !matchAuthor && !matchSummary && !matchTags) {
          return false
        }
      }

      return true
    })
  }, [items, selectedPlatform, selectedCollectionId, onlyStarred, selectedTags, searchQuery, urlFilter])

  function handleTagToggle(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  function handleClearFilters() {
    setSearchQuery('')
    setSelectedPlatform('Hepsi')
    setSelectedCollectionId(null)
    setSelectedTags([])
    setOnlyStarred(false)
    if (urlFilter || urlPlatform || urlTag || urlCollection) {
      router.push('/dashboard')
    }
  }

  function handleNewItem(newItem: SavedItem) {
    setItems((prev) => [newItem, ...prev])
  }

  function handleItemUpdated(updatedItem: SavedItem) {
    setItems((prev) => prev.map((it) => (it.id === updatedItem.id ? updatedItem : it)))
    setSelectedItem(updatedItem)
  }

  function handleItemDeleted(deletedId: string) {
    setItems((prev) => prev.filter((it) => it.id !== deletedId))
    setSelectedItem(null)
  }

  const hasActiveFilters = Boolean(
    searchQuery ||
    selectedPlatform !== 'Hepsi' ||
    selectedCollectionId !== null ||
    onlyStarred ||
    selectedTags.length > 0 ||
    urlFilter ||
    urlCollection ||
    urlTag
  )

  const activeCollectionName = userCollections.find((c) => c.id === selectedCollectionId)?.name

  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      {/* 1. Quick Save Bar (Compact & Low-profile) */}
      <QuickSaveBar offlineMode={offlineMode} onItemAdded={handleNewItem} />

      {/* 2. Interactive Filter & Search Bar */}
      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedPlatform={selectedPlatform}
        onPlatformChange={setSelectedPlatform}
        selectedCollectionId={selectedCollectionId}
        onCollectionChange={setSelectedCollectionId}
        collections={userCollections}
        selectedTags={selectedTags}
        onTagToggle={handleTagToggle}
        onClearFilters={handleClearFilters}
        onlyStarred={onlyStarred}
        onToggleStarred={() => setOnlyStarred((prev) => !prev)}
      />

      {/* 3. Active filter alert banner */}
      {hasActiveFilters && (
        <div className="flex items-center justify-between px-1 text-[11px] text-[var(--text-muted)] -mt-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span>
              <strong>{filteredItems.length}</strong> içerik listeleniyor (toplam {items.length})
            </span>
            {selectedPlatform === 'reels' && (
              <span className="px-1.5 py-0.2 rounded bg-rose-950/60 text-rose-300 border border-rose-800/50 font-semibold">
                🎬 Reels
              </span>
            )}
            {activeCollectionName && (
              <span className="px-1.5 py-0.2 rounded bg-amber-950/60 text-amber-300 border border-amber-800/50 font-semibold">
                📁 {activeCollectionName}
              </span>
            )}
            {onlyStarred && (
              <span className="px-1.5 py-0.2 rounded bg-amber-950/60 text-amber-300 border border-amber-800/50 font-semibold">
                ★ Favoriler
              </span>
            )}
          </div>

          <button
            onClick={handleClearFilters}
            className="text-[var(--accent-light)] hover:text-rose-400 hover:underline text-[11px] font-medium transition-colors ml-2 shrink-0"
          >
            Tümünü Göster
          </button>
        </div>
      )}

      {/* 4. Live Responsive Library Grid (Immediately visible above the fold!) */}
      <LibraryGrid
        items={filteredItems}
        onItemClick={(item) => setSelectedItem(item)}
      />

      {/* 5. Rich Detail & Interactive Categorizer Modal */}
      {selectedItem && (
        <ItemDetailModal
          item={selectedItem}
          userCollections={userCollections}
          onClose={() => setSelectedItem(null)}
          onItemUpdated={handleItemUpdated}
          onItemDeleted={handleItemDeleted}
        />
      )}
    </div>
  )
}
