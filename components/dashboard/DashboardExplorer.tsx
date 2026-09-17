'use client'

import { useState, useMemo, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import type { SavedItem } from '@/lib/mock-data'
import FilterBar from './FilterBar'
import LibraryGrid from './LibraryGrid'
import QuickSaveBar from './QuickSaveBar'
import ItemDetailModal from './ItemDetailModal'

interface DashboardExplorerProps {
  initialItems: SavedItem[]
  offlineMode?: boolean
}

export default function DashboardExplorer({
  initialItems,
  offlineMode = false,
}: DashboardExplorerProps) {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [items, setItems] = useState<SavedItem[]>(initialItems)
  const [selectedItem, setSelectedItem] = useState<SavedItem | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPlatform, setSelectedPlatform] = useState('Hepsi')
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  const urlPlatform = searchParams.get('platform')
  const urlFilter = searchParams.get('filter')
  const urlTag = searchParams.get('tag')
  const urlCollection = searchParams.get('collection')

  // Sync state with URL search params whenever they change
  useEffect(() => {
    if (urlPlatform) {
      const match = ['Instagram', 'TikTok', 'LinkedIn', 'YouTube', 'Twitter/X', 'Web'].find(
        (p) => p.toLowerCase().includes(urlPlatform.toLowerCase())
      )
      setSelectedPlatform(match || 'Hepsi')
    } else {
      setSelectedPlatform('Hepsi')
    }

    if (urlTag) {
      setSelectedTags([urlTag])
    }
  }, [urlPlatform, urlTag])

  // Filter items in real time
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // 1. Platform Filter
      if (selectedPlatform !== 'Hepsi') {
        const pName = selectedPlatform.toLowerCase()
        const itemPlatform = (item.platform || '').toLowerCase()
        if (pName.includes('twitter') || pName.includes('x')) {
          if (itemPlatform !== 'twitter' && itemPlatform !== 'x') return false
        } else if (!itemPlatform.includes(pName)) {
          return false
        }
      }

      // 2. URL Filter parameter (recipe, location, discount, code, starred)
      if (urlFilter) {
        if (urlFilter === 'starred' && !item.starred) return false
        if (urlFilter === 'recipe' && !item.extractors?.recipe) return false
        if (urlFilter === 'location' && !item.extractors?.location) return false
        if (urlFilter === 'discount' && !item.extractors?.discount) return false
        if (urlFilter === 'code' && !item.extractors?.code) return false
      }

      // 3. Collection filter (if item has collection tag or matches)
      if (urlCollection) {
        // match tags or extractors or platform for collections
        if (urlCollection === 'c1' && !item.tags?.includes('tasarım') && !item.tags?.includes('ui')) return false
        if (urlCollection === 'c2' && !item.extractors?.recipe && !item.tags?.includes('tarif')) return false
        if (urlCollection === 'c3' && !item.tags?.includes('yapayZeka') && !item.tags?.includes('aiAgents')) return false
        if (urlCollection === 'c4' && !item.extractors?.location && !item.tags?.includes('istanbul')) return false
        if (urlCollection === 'c5' && !item.extractors?.code && !item.tags?.includes('nextjs')) return false
      }

      // 4. Tag Filter
      if (selectedTags.length > 0) {
        const itemTags = (item.tags || []).map((t) => t.toLowerCase())
        const hasAllTags = selectedTags.every((t) => itemTags.includes(t.toLowerCase()))
        if (!hasAllTags) return false
      }

      // 5. Full-text search (caption, title, author, summary, tags)
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
  }, [items, selectedPlatform, selectedTags, searchQuery, urlFilter, urlCollection])

  function handleTagToggle(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  function handleClearFilters() {
    setSearchQuery('')
    setSelectedPlatform('Hepsi')
    setSelectedTags([])
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
    selectedTags.length > 0 ||
    urlFilter ||
    urlCollection ||
    urlTag
  )

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Quick Save Bar (Prepends to live list on save) */}
      <QuickSaveBar offlineMode={offlineMode} onItemAdded={handleNewItem} />

      {/* 2. Interactive Filter Bar */}
      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedPlatform={selectedPlatform}
        onPlatformChange={setSelectedPlatform}
        selectedTags={selectedTags}
        onTagToggle={handleTagToggle}
        onClearFilters={handleClearFilters}
      />

      {/* Active filter alert / counter */}
      {hasActiveFilters && (
        <div className="flex items-center justify-between px-1 text-xs text-[var(--text-muted)] -mt-2">
          <span>
            <strong>{filteredItems.length}</strong> içerik listeleniyor (toplam {items.length} içerik)
            {urlFilter && <span className="ml-1 text-[var(--accent-light)] font-medium">[{urlFilter}]</span>}
            {urlCollection && <span className="ml-1 text-amber-400 font-medium">[Koleksiyon]</span>}
            {urlTag && <span className="ml-1 text-emerald-400 font-medium">[#{urlTag}]</span>}
          </span>
          <button
            onClick={handleClearFilters}
            className="text-[var(--text-secondary)] hover:text-[var(--error)] underline text-xs"
          >
            Tümünü Göster
          </button>
        </div>
      )}

      {/* 3. Live Library Grid */}
      <LibraryGrid
        items={filteredItems}
        onItemClick={(item) => setSelectedItem(item)}
      />

      {/* 4. Rich Reader & AI Insights Modal */}
      {selectedItem && (
        <ItemDetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onItemUpdated={handleItemUpdated}
          onItemDeleted={handleItemDeleted}
        />
      )}
    </div>
  )
}
