'use client'

import { useState, useMemo, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import type { SavedItem } from '@/lib/mock-data'
import FilterBar, { type SortOption } from './FilterBar'
import LibraryGrid from './LibraryGrid'
import QuickSaveBar from './QuickSaveBar'
import ItemDetailModal from './ItemDetailModal'
import GlobalAIChatModal from './GlobalAIChatModal'
import {
  Loader2,
  Sparkles,
  CheckCircle2,
  ChefHat,
  Code2,
  HeartPulse,
  MapPin,
  ShoppingBag,
  BookOpen,
  AlertCircle,
  RotateCw,
  X,
  Trash2,
  TrendingUp,
  Lightbulb,
  CheckSquare,
} from 'lucide-react'

interface CollectionOption {
  id: string
  name: string
  color: string
}

function normalizeTurkishSearch(str: string | null | undefined): string {
  if (!str) return ''
  return str
    .toLocaleLowerCase('tr-TR')
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .trim()
}

function getStem(token: string): string {
  if (token.length < 4) return token
  return token.replace(/(li|lı|lu|lü|lerin|ların|ler|lar|den|dan|de|da|nin|nın|in|ın|i|ı|e|a)$/, '')
}

function safeEncodeURIComponent(str: string | null | undefined): string {
  if (!str) return ''
  try {
    const sanitized = str.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '')
    return encodeURIComponent(sanitized)
  } catch {
    return encodeURIComponent(str.replace(/[^\x00-\x7F]/g, ''))
  }
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
  const [collections, setCollections] = useState<CollectionOption[]>(userCollections)
  const [selectedItem, setSelectedItem] = useState<SavedItem | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSemanticSearch, setIsSemanticSearch] = useState(false)
  const [semanticResults, setSemanticResults] = useState<SavedItem[] | null>(null)
  const [isSearchingSemantic, setIsSearchingSemantic] = useState(false)
  const [isBatchCategorizing, setIsBatchCategorizing] = useState(false)
  const [batchError, setBatchError] = useState<string | null>(null)
  const [batchResult, setBatchResult] = useState<{
    count: number
    message: string
  } | null>(null)

  // Selection & Bulk Action state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [itemToDelete, setItemToDelete] = useState<SavedItem | null>(null)
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false)
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)
  const [actionToast, setActionToast] = useState<string | null>(null)

  function showToast(msg: string) {
    setActionToast(msg)
    setTimeout(() => setActionToast(null), 3500)
  }

  const urlPlatform = searchParams.get('platform')
  const urlFilter = searchParams.get('filter')
  const urlTag = searchParams.get('tag')
  const urlCollection = searchParams.get('collection')

  // User manual overrides for filters (null means follow URL searchParams)
  const [userPlatform, setUserPlatform] = useState<string | null>(null)
  const [userCategory, setUserCategory] = useState<string | null>(null)
  const [userStarred, setUserStarred] = useState<boolean | null>(null)
  const [userCollectionId, setUserCollectionId] = useState<string | null>(null)
  const [userTags, setUserTags] = useState<string[] | null>(null)
  const [sortBy, setSortBy] = useState<SortOption>('newest')

  const selectedPlatform = userPlatform ?? (
    urlPlatform
      ? (urlPlatform.toLowerCase() === 'reels' || urlPlatform.toLowerCase() === 'reel'
          ? 'reels'
          : ['Instagram', 'TikTok', 'LinkedIn', 'YouTube', 'Twitter/X', 'Web'].find((p) =>
              p.toLowerCase().includes(urlPlatform.toLowerCase())
            ) || 'Hepsi')
      : 'Hepsi'
  )

  const initialCategoryFromUrl = useMemo(() => {
    if (!urlFilter) return null
    if (urlFilter === 'recipe') return 'recipe'
    if (urlFilter === 'location') return 'travel'
    if (urlFilter === 'discount') return 'product'
    if (urlFilter === 'code') return 'productivity'
    if (urlFilter === 'health') return 'health'
    if (urlFilter === 'book_movie') return 'book_movie'
    return urlFilter
  }, [urlFilter])

  const selectedCategory = userCategory !== null ? userCategory : initialCategoryFromUrl
  const onlyStarred = userStarred !== null ? userStarred : (urlFilter === 'starred')
  const selectedCollectionId = userCollectionId !== null ? userCollectionId : urlCollection
  const selectedTags = useMemo(() => {
    return userTags !== null ? userTags : (urlTag ? [urlTag] : [])
  }, [userTags, urlTag])

  // ── Polling for Ingestion Jobs (status === 'processing') ────────
  useEffect(() => {
    const processingList = items.filter((it) => it.status === 'processing')
    if (processingList.length === 0) return

    const interval = setInterval(async () => {
      for (const procItem of processingList) {
        try {
          const res = await fetch(`/api/v1/bookmarks/${procItem.id}`)
          if (res.ok) {
            const data = await res.json()
            if (data.item && data.item.status !== 'processing') {
              setItems((prev) =>
                prev.map((it) =>
                  it.id === procItem.id
                    ? {
                        ...it,
                        ...data.item,
                        title: data.item.author_name || data.item.permalink,
                        description: data.item.caption,
                        summary: data.item.ai_summary,
                        tags: data.item.ai_tags,
                        thumbnail_url: data.item.media_urls?.[0] || null,
                      }
                    : it
                )
              )
            }
          }
        } catch {
          // ignore
        }
      }
    }, 3500)

    return () => clearInterval(interval)
  }, [items])

  // ── Semantic Search Debounce ───────────────────────────────────
  useEffect(() => {
    if (!isSemanticSearch || !searchQuery.trim()) {
      return
    }

    let isMounted = true
    const timer = setTimeout(async () => {
      setIsSearchingSemantic(true)
      try {
        const res = await fetch(`/api/v1/search/semantic?q=${safeEncodeURIComponent(searchQuery.trim())}`)
        if (res.ok) {
          const data = await res.json()
          if (isMounted && Array.isArray(data.items)) {
            setSemanticResults(data.items)
          }
        }
      } catch {
        // ignore
      } finally {
        if (isMounted) setIsSearchingSemantic(false)
      }
    }, 400)

    return () => {
      isMounted = false
      clearTimeout(timer)
    }
  }, [isSemanticSearch, searchQuery])

  // Multi-dimensional filtering logic
  const filteredItems = useMemo(() => {
    const baseList = isSemanticSearch && semanticResults !== null ? semanticResults : items

    const filtered = baseList.filter((item) => {
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

      // 5. Category Filter (supports selectedCategory & URL filters)
      if (selectedCategory) {
        if (selectedCategory === 'recipe' && item.category !== 'recipe' && !item.extractors?.recipe) return false
        if (selectedCategory === 'health' && item.category !== 'health' && !item.extractors?.health) return false
        if (selectedCategory === 'productivity' && item.category !== 'productivity' && !item.extractors?.code) return false
        if (selectedCategory === 'finance' && item.category !== 'finance') return false
        if (selectedCategory === 'motivation_mindset' && item.category !== 'motivation_mindset') return false
        if (selectedCategory === 'travel' && item.category !== 'travel' && !item.extractors?.location) return false
        if (selectedCategory === 'product' && item.category !== 'product' && !item.extractors?.discount) return false
        if (selectedCategory === 'book_movie' && item.category !== 'book_movie') return false
        if (selectedCategory === 'other' && item.category !== 'other') return false
      }

      // 6. Tag Filter
      if (selectedTags.length > 0) {
        const itemTags = (item.tags || []).map((t) => t.toLowerCase())
        const hasAllTags = selectedTags.every((t) => itemTags.includes(t.toLowerCase()))
        if (!hasAllTags) return false
      }

      // 7. Intelligent Multi-Token Search with Turkish Normalization & Stemming
      if (!isSemanticSearch && searchQuery.trim()) {
        const normQuery = normalizeTurkishSearch(searchQuery)
        const rawTokens = normQuery.split(/\s+/).filter(Boolean)
        const tokens = rawTokens.map((t) => ({
          raw: t,
          stem: getStem(t),
        }))

        // Searchable content from all dimensions of the bookmark
        const actionData = item.actionable_data as Record<string, unknown> | undefined
        const ingredientsText = Array.isArray(actionData?.ingredients) ? actionData.ingredients.join(' ') : ''
        const stepsText = Array.isArray(actionData?.steps) ? actionData.steps.join(' ') : ''

        const categoryKeywords =
          item.category === 'recipe'
            ? 'tarif yemek mutfak lezzet tatli pismis malzeme'
            : item.category === 'productivity'
            ? 'yazilim kod yapayzeka ai teknoloji developer prompt'
            : item.category === 'health'
            ? 'saglik doktor hekim klinik tedavi beslenme egzersiz'
            : item.category === 'travel'
            ? 'gezi seyahat mekan otel rota kafe tatil'
            : item.category === 'product'
            ? 'urun alisveris indirim kampanya fiyat link'
            : item.category === 'book_movie'
            ? 'kitap film dizi sinema oyun belgesel'
            : ''

        const rawCorpus = [
          item.title || '',
          item.description || '',
          item.summary || '',
          (item.tags || []).join(' '),
          item.author_username || '',
          item.author_name || '',
          item.transcript || '',
          ingredientsText,
          stepsText,
          categoryKeywords,
        ].join(' ')

        const normalizedCorpus = normalizeTurkishSearch(rawCorpus)

        // Every token (or its linguistic stem) must match somewhere in the corpus
        const allTokensMatch = tokens.every((t) => {
          if (normalizedCorpus.includes(t.raw)) return true
          if (t.stem.length >= 3 && normalizedCorpus.includes(t.stem)) return true
          return false
        })

        if (!allTokensMatch) {
          return false
        }
      }

      return true
    })

    // 8. Sorting System (newest, oldest, popular/views, title A-Z, title Z-A)
    const sorted = [...filtered]
    if (sortBy === 'oldest') {
      sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    } else if (sortBy === 'popular') {
      sorted.sort((a, b) => {
        const actA = (a.actionable_data || {}) as Record<string, unknown>
        const actB = (b.actionable_data || {}) as Record<string, unknown>
        const scoreA =
          (typeof actA.views === 'number' ? actA.views : 0) +
          (typeof actA.likes === 'number' ? actA.likes : 0) +
          (a.starred ? 100000 : 0) +
          (a.media_type === 'video' || a.url?.includes('/reel') ? 50000 : 0) +
          Object.keys(a.extractors || {}).length * 10000
        const scoreB =
          (typeof actB.views === 'number' ? actB.views : 0) +
          (typeof actB.likes === 'number' ? actB.likes : 0) +
          (b.starred ? 100000 : 0) +
          (b.media_type === 'video' || b.url?.includes('/reel') ? 50000 : 0) +
          Object.keys(b.extractors || {}).length * 10000
        return scoreB - scoreA
      })
    } else if (sortBy === 'title_asc') {
      sorted.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'tr'))
    } else if (sortBy === 'title_desc') {
      sorted.sort((a, b) => (b.title || '').localeCompare(a.title || '', 'tr'))
    } else {
      sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }

    return sorted
  }, [
    items,
    isSemanticSearch,
    semanticResults,
    selectedPlatform,
    selectedCategory,
    selectedCollectionId,
    onlyStarred,
    selectedTags,
    searchQuery,
    sortBy,
  ])

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      recipe: 0,
      health: 0,
      productivity: 0,
      finance: 0,
      motivation_mindset: 0,
      travel: 0,
      product: 0,
      book_movie: 0,
      other: 0,
    }
    for (const it of items) {
      const c = it.category || 'other'
      counts[c] = (counts[c] || 0) + 1
    }
    return counts
  }, [items])

  async function handleBatchCategorize() {
    setIsBatchCategorizing(true)
    setBatchResult(null)
    setBatchError(null)

    try {
      const res = await fetch('/api/v1/ai/batch-categorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceAll: true }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        // 1. High-speed Patch Map Application (updates cards in-place without redraw overhead)
        if (data.patchMap && typeof data.patchMap === 'object') {
          setItems((prev) =>
            prev.map((item) => {
              const patch = data.patchMap[item.id]
              if (!patch) return item
              return {
                ...item,
                category: patch.category || item.category,
                summary: patch.summary || item.summary,
                tags: patch.tags || item.tags,
                collection_id: patch.collection_id || item.collection_id,
                collection_name: patch.collection_name || item.collection_name,
                collection_color: patch.collection_color || item.collection_color,
                status: 'completed',
              }
            })
          )
        } else if (Array.isArray(data.updatedItems) && data.updatedItems.length > 0) {
          setItems(data.updatedItems)
        }

        // 2. Synchronize collections
        if (Array.isArray(data.collections) && data.collections.length > 0) {
          setCollections(data.collections)
        }

        // 3. Notify sidebar to instantly refresh collection badges
        window.dispatchEvent(new CustomEvent('collections-updated'))

        setBatchResult({
          count: data.processedCount || items.length,
          message: `${data.processedCount || items.length} içerik akıllı algoritmalarla analiz edildi ve uygun kategorilere/koleksiyonlara yerleştirildi!`,
        })
        setTimeout(() => setBatchResult(null), 9000)
      } else {
        setBatchError(data.error || 'Kategorizasyon tamamlanamadı. Lütfen tekrar deneyin.')
      }
    } catch (err) {
      console.error('Batch categorization failed:', err)
      setBatchError('Kategorizasyon sırasında sunucuyla bağlantı kurulamadı. Lütfen tekrar deneyin.')
    } finally {
      setIsBatchCategorizing(false)
    }
  }

  function handleClearFilters() {
    setSearchQuery('')
    setIsSemanticSearch(false)
    setSemanticResults(null)
    setUserPlatform('Hepsi')
    setUserCategory(null)
    setUserCollectionId(null)
    setUserTags([])
    setUserStarred(false)
    setSortBy('newest')
    if (urlFilter || searchParams.get('platform') || searchParams.get('tag') || searchParams.get('collection')) {
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
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.delete(deletedId)
      return next
    })
  }

  function handleToggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleToggleSelectAll() {
    if (selectedIds.size === filteredItems.length && filteredItems.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredItems.map((it) => it.id)))
    }
  }

  async function handleConfirmSingleDelete() {
    if (!itemToDelete) return
    const id = itemToDelete.id
    const prevItems = items

    setItems((prev) => prev.filter((it) => it.id !== id))
    setItemToDelete(null)
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    showToast('İçerik kütüphaneden silindi')

    try {
      const res = await fetch(`/api/v1/bookmarks/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        setItems(prevItems)
        showToast('Silme işlemi başarısız oldu')
      }
    } catch {
      setItems(prevItems)
      showToast('Sunucu hatası: İçerik silinemedi')
    }
  }

  async function handleConfirmBulkDelete() {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return

    setIsBulkDeleting(true)
    const prevItems = items

    setItems((prev) => prev.filter((it) => !selectedIds.has(it.id)))
    setSelectedIds(new Set())
    setShowBulkDeleteModal(false)
    showToast(`${ids.length} içerik temizlendi`)

    try {
      const res = await fetch('/api/v1/bookmarks/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', bookmarkIds: ids }),
      })

      if (!res.ok) {
        const data = await res.json()
        setItems(prevItems)
        showToast(data.error || 'Toplu silme başarısız oldu')
      }
    } catch {
      setItems(prevItems)
      showToast('Bağlantı hatası: İçerikler silinemedi')
    } finally {
      setIsBulkDeleting(false)
    }
  }

  async function handleBulkAddToCollection(colId: string) {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return

    const col = collections.find((c) => c.id === colId)
    showToast(`${ids.length} içerik "${col?.name || 'Koleksiyona'}" ekleniyor...`)

    try {
      const res = await fetch('/api/v1/bookmarks/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_to_collection', bookmarkIds: ids, collectionId: colId }),
      })

      if (res.ok) {
        setItems((prev) =>
          prev.map((it) =>
            selectedIds.has(it.id)
              ? {
                  ...it,
                  collection_id: colId,
                  collection_name: col?.name || null,
                  collection_color: col?.color || null,
                }
              : it
          )
        )
        setSelectedIds(new Set())
        showToast(`${ids.length} içerik başarıyla koleksiyona eklendi`)
      } else {
        showToast('Koleksiyona eklenemedi')
      }
    } catch {
      showToast('Koleksiyon bağlantı hatası')
    }
  }

  const hasActiveFilters = Boolean(
    searchQuery ||
    selectedPlatform !== 'Hepsi' ||
    selectedCategory !== null ||
    selectedCollectionId !== null ||
    onlyStarred ||
    selectedTags.length > 0 ||
    isSemanticSearch ||
    sortBy !== 'newest' ||
    urlFilter
  )

  const activeCollectionName = userCollections.find((c) => c.id === selectedCollectionId)?.name

  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      {/* 1. Quick Save Bar (Immediate 200 OK + Async Queue) */}
      <QuickSaveBar offlineMode={offlineMode} onItemAdded={handleNewItem} />

      {/* 2. Global AI Batch Categorization Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#171228] via-[#121324] to-[#1a1226] border border-purple-500/25 p-3.5 sm:p-4 shadow-[0_0_25px_rgba(168,85,247,0.12)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-purple-600/20 border border-purple-500/40 text-purple-300 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
              <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
            </div>
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  Tüm Kütüphaneyi AI ile Tanı & Kategorize Et
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-purple-950/80 border border-purple-500/40 text-purple-300 text-[10px] font-semibold">
                  {items.length} Gönderi
                </span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Açıklamalar ve <span className="text-purple-300 font-medium">#hashtag</span>&apos;ler analiz edilerek <span className="text-amber-300 font-medium">Yemek Tarifleri</span>, <span className="text-emerald-300 font-medium">Sağlık & Doktor</span>, <span className="text-indigo-300 font-medium">Yazılım & AI</span>, <span className="text-blue-300 font-medium">Gezi</span> ve <span className="text-pink-300 font-medium">Ürünler</span> otomatik ayrıştırılır.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleBatchCategorize}
              disabled={isBatchCategorizing}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs sm:text-sm font-bold shadow-[0_0_20px_rgba(168,85,247,0.4)] flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {isBatchCategorizing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>AI Ayrıştırıyor...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>AI ile Otomatik Tanı</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* In-Progress Loading State Banner */}
        {isBatchCategorizing && (
          <div className="mt-3 p-3 rounded-xl bg-purple-950/70 border border-purple-500/40 text-purple-200 text-xs flex items-center justify-between gap-3 animate-pulse shadow-lg">
            <div className="flex items-center gap-2.5">
              <Loader2 className="w-4 h-4 animate-spin text-purple-400 shrink-0" />
              <span>
                Yapay Zeka kütüphanenizdeki {items.length} içeriği tarıyor, metinleri analiz ediyor ve uygun kategorilere yerleştiriyor...
              </span>
            </div>
            <span className="text-[11px] font-mono text-purple-300 font-semibold shrink-0">Lütfen bekleyin</span>
          </div>
        )}

        {/* Error Feedback Banner with Retry Button */}
        {batchError && !isBatchCategorizing && (
          <div className="mt-3 p-3 rounded-xl bg-red-950/70 border border-red-500/50 text-red-200 text-xs flex items-center justify-between gap-3 animate-fade-in shadow-lg">
            <div className="flex items-center gap-2.5 min-w-0">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span className="truncate">{batchError}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleBatchCategorize}
                className="px-2.5 py-1 rounded-lg bg-red-800/80 hover:bg-red-700 text-white font-semibold text-[11px] flex items-center gap-1 transition-all"
              >
                <RotateCw className="w-3 h-3" />
                <span>Tekrar Dene</span>
              </button>
              <button
                type="button"
                onClick={() => setBatchError(null)}
                aria-label="Kapat"
                className="p-1 rounded-lg hover:bg-white/10 text-red-300 hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Success Celebration Feedback Banner */}
        {batchResult && !isBatchCategorizing && (
          <div className="mt-3 p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-200 text-xs flex items-center justify-between gap-3 animate-fade-in shadow-lg">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-semibold">{batchResult.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setBatchResult(null)}
              aria-label="Kapat"
              className="p-1 rounded-lg hover:bg-white/10 text-emerald-300 hover:text-white transition-colors shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Quick Filter Category Chips */}
        <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
          <span className="text-[10px] uppercase font-bold text-zinc-400 shrink-0 mr-1">Hızlı Filtrele:</span>

          <button
            type="button"
            onClick={() => setUserCategory(userCategory === 'recipe' ? null : 'recipe')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all border shrink-0 ${
              selectedCategory === 'recipe'
                ? 'bg-amber-500/30 text-amber-200 border-amber-500/60 ring-1 ring-amber-400'
                : 'bg-zinc-900/60 text-zinc-400 border-white/5 hover:text-amber-300 hover:border-amber-500/30'
            }`}
          >
            <ChefHat className="w-3.5 h-3.5 text-amber-400" />
            <span>Tarifler</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-950 text-amber-300 font-bold">{categoryCounts.recipe}</span>
          </button>

          <button
            type="button"
            onClick={() => setUserCategory(userCategory === 'health' ? null : 'health')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all border shrink-0 ${
              selectedCategory === 'health'
                ? 'bg-emerald-500/30 text-emerald-200 border-emerald-500/60 ring-1 ring-emerald-400'
                : 'bg-zinc-900/60 text-zinc-400 border-white/5 hover:text-emerald-300 hover:border-emerald-500/30'
            }`}
          >
            <HeartPulse className="w-3.5 h-3.5 text-emerald-400" />
            <span>Sağlık & Doktor</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-950 text-emerald-300 font-bold">{categoryCounts.health}</span>
          </button>

          <button
            type="button"
            onClick={() => setUserCategory(userCategory === 'productivity' ? null : 'productivity')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all border shrink-0 ${
              selectedCategory === 'productivity'
                ? 'bg-indigo-500/30 text-indigo-200 border-indigo-500/60 ring-1 ring-indigo-400'
                : 'bg-zinc-900/60 text-zinc-400 border-white/5 hover:text-indigo-300 hover:border-indigo-500/30'
            }`}
          >
            <Code2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>Yazılım & AI</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-950 text-indigo-300 font-bold">{categoryCounts.productivity}</span>
          </button>

          <button
            type="button"
            onClick={() => setUserCategory(userCategory === 'finance' ? null : 'finance')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all border shrink-0 ${
              selectedCategory === 'finance'
                ? 'bg-emerald-500/30 text-emerald-200 border-emerald-500/60 ring-1 ring-emerald-400'
                : 'bg-zinc-900/60 text-zinc-400 border-white/5 hover:text-emerald-300 hover:border-emerald-500/30'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span>Finans & Borsa</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-950 text-emerald-300 font-bold">{categoryCounts.finance}</span>
          </button>

          <button
            type="button"
            onClick={() => setUserCategory(userCategory === 'motivation_mindset' ? null : 'motivation_mindset')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all border shrink-0 ${
              selectedCategory === 'motivation_mindset'
                ? 'bg-orange-500/30 text-orange-200 border-orange-500/60 ring-1 ring-orange-400'
                : 'bg-zinc-900/60 text-zinc-400 border-white/5 hover:text-orange-300 hover:border-orange-500/30'
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5 text-orange-400" />
            <span>Kişisel Gelişim</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-orange-950 text-orange-300 font-bold">{categoryCounts.motivation_mindset}</span>
          </button>

          <button
            type="button"
            onClick={() => setUserCategory(userCategory === 'travel' ? null : 'travel')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all border shrink-0 ${
              selectedCategory === 'travel'
                ? 'bg-blue-500/30 text-blue-200 border-blue-500/60 ring-1 ring-blue-400'
                : 'bg-zinc-900/60 text-zinc-400 border-white/5 hover:text-blue-300 hover:border-blue-500/30'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 text-blue-400" />
            <span>Gezi & Mekan</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-950 text-blue-300 font-bold">{categoryCounts.travel}</span>
          </button>

          <button
            type="button"
            onClick={() => setUserCategory(userCategory === 'product' ? null : 'product')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all border shrink-0 ${
              selectedCategory === 'product'
                ? 'bg-pink-500/30 text-pink-200 border-pink-500/60 ring-1 ring-pink-400'
                : 'bg-zinc-900/60 text-zinc-400 border-white/5 hover:text-pink-300 hover:border-pink-500/30'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5 text-pink-400" />
            <span>Ürün & İndirim</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-pink-950 text-pink-300 font-bold">{categoryCounts.product}</span>
          </button>

          <button
            type="button"
            onClick={() => setUserCategory(userCategory === 'book_movie' ? null : 'book_movie')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all border shrink-0 ${
              selectedCategory === 'book_movie'
                ? 'bg-purple-500/30 text-purple-200 border-purple-500/60 ring-1 ring-purple-400'
                : 'bg-zinc-900/60 text-zinc-400 border-white/5 hover:text-purple-300 hover:border-purple-500/30'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-purple-400" />
            <span>Kitap & Dizi</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-950 text-purple-300 font-bold">{categoryCounts.book_movie}</span>
          </button>
        </div>
      </div>

      {/* 3. Interactive Filter & Search Bar with Semantic Mode */}
      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedPlatform={selectedPlatform}
        onPlatformChange={setUserPlatform}
        selectedCategory={selectedCategory}
        onCategoryChange={setUserCategory}
        selectedCollectionId={selectedCollectionId}
        onCollectionChange={setUserCollectionId}
        collections={collections}
        selectedTags={selectedTags}
        onClearFilters={handleClearFilters}
        onlyStarred={onlyStarred}
        onToggleStarred={() => setUserStarred((prev) => (prev !== null ? !prev : !onlyStarred))}
        isSemanticSearch={isSemanticSearch}
        onToggleSemanticSearch={() => setIsSemanticSearch((prev) => !prev)}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />

      {/* 3. Semantic Search Indicator or Active Filter Banner */}
      {isSearchingSemantic && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-950/40 border border-purple-800/40 text-xs text-purple-300">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
          <span>pgvector ile semantik anlamsal arama yapılıyor...</span>
        </div>
      )}

      {hasActiveFilters && (
        <div className="flex items-center justify-between px-1 text-[11px] text-[var(--text-muted)] -mt-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span>
              <strong>{filteredItems.length}</strong> içerik listeleniyor (toplam {items.length})
            </span>
            {searchQuery.trim() && (
              <span className="px-2 py-0.5 rounded-lg bg-purple-500/20 text-purple-200 border border-purple-500/40 font-semibold flex items-center gap-1.5">
                <span>🔍 &ldquo;{searchQuery}&rdquo;</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-900/80 text-purple-300 font-bold">
                  {filteredItems.length} sonuç
                </span>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="hover:text-white text-purple-400 p-0.5"
                  title="Aramayı temizle"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {isSemanticSearch && (
              <span className="px-2 py-0.2 rounded bg-purple-950/80 text-purple-300 border border-purple-700/50 font-semibold flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-purple-400" />
                Semantik AI Arama
              </span>
            )}
            {sortBy !== 'newest' && (
              <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-200 border border-amber-500/40 font-semibold flex items-center gap-1">
                <span>
                  {sortBy === 'oldest' && '⏳ Eskiden Yeniye'}
                  {sortBy === 'popular' && '🔥 En Çok İzlenenler'}
                  {sortBy === 'title_asc' && '🔤 A-Z'}
                  {sortBy === 'title_desc' && '🔤 Z-A'}
                </span>
                <button
                  type="button"
                  onClick={() => setSortBy('newest')}
                  className="hover:text-white text-amber-400 p-0.5"
                  title="Sıralamayı sıfırla"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
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

      {/* 4. Live Responsive Library Grid */}
      <LibraryGrid
        items={filteredItems}
        onItemClick={(item) => setSelectedItem(item)}
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
        onDeleteSingle={(item) => setItemToDelete(item)}
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

      {/* 6. Floating Bulk Action Bar (When 1+ items selected) */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-zinc-950/90 backdrop-blur-xl border border-white/20 shadow-[0_10px_40px_rgba(0,0,0,0.85)] rounded-2xl p-2.5 px-4 flex items-center gap-3 animate-fade-up max-w-[95vw] overflow-x-auto ring-1 ring-white/10">
          <div className="flex items-center gap-2 pr-3 border-r border-white/10 shrink-0">
            <div className="w-5 h-5 rounded-full bg-[var(--accent)] text-white text-[11px] font-bold flex items-center justify-center">
              {selectedIds.size}
            </div>
            <span className="text-xs font-semibold text-white whitespace-nowrap">
              içerik seçildi
            </span>
          </div>

          {/* Toggle Select All */}
          <button
            type="button"
            onClick={handleToggleSelectAll}
            className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-zinc-300 hover:text-white transition-all whitespace-nowrap cursor-pointer"
          >
            {selectedIds.size === filteredItems.length ? 'Seçimi Kaldır' : `Tümünü Seç (${filteredItems.length})`}
          </button>

          {/* Bulk Assign to Collection Dropdown */}
          {collections.length > 0 && (
            <div className="relative shrink-0">
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleBulkAddToCollection(e.target.value)
                    e.target.value = ''
                  }
                }}
                defaultValue=""
                className="text-xs px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 font-medium cursor-pointer outline-none transition-all"
              >
                <option value="" disabled>📁 Koleksiyona Ekle...</option>
                {collections.map((col) => (
                  <option key={col.id} value={col.id} className="bg-zinc-900 text-white">
                    {col.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Bulk Delete Button */}
          <button
            type="button"
            onClick={() => setShowBulkDeleteModal(true)}
            disabled={isBulkDeleting}
            className="px-3 py-1.5 rounded-xl bg-rose-600/90 hover:bg-rose-600 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shrink-0 cursor-pointer disabled:opacity-50"
          >
            {isBulkDeleting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
            <span>Seçilenleri Sil ({selectedIds.size})</span>
          </button>

          {/* Cancel Selection */}
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors ml-1 shrink-0"
            title="Seçimi İptal Et"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 7. Bulk Delete Confirmation Modal */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#15151e] border border-white/15 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1.5">
              <h3 className="text-lg font-bold text-white">
                {selectedIds.size} İçeriği Silmek İstiyor musunuz?
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Seçilen <strong className="text-white">{selectedIds.size}</strong> içerik kütüphanenizden ve bağlı koleksiyonlardan kalıcı olarak temizlenecektir. Bu işlem geri alınamaz.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowBulkDeleteModal(false)}
                disabled={isBulkDeleting}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-xs font-semibold text-zinc-300 hover:bg-white/5 transition-all"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkDelete}
                disabled={isBulkDeleting}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white flex items-center justify-center gap-2 transition-all shadow-lg shadow-rose-900/40"
              >
                {isBulkDeleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>Evet, Temizle</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Single Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#15151e] border border-white/15 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-white">
                İçeriği Kütüphaneden Sil
              </h3>
              <p className="text-xs text-zinc-400 line-clamp-2">
                &ldquo;{itemToDelete.title || itemToDelete.url}&rdquo; içeriği kütüphanenizden silinecektir.
              </p>
            </div>
            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="flex-1 py-2 rounded-xl border border-white/10 text-xs font-semibold text-zinc-300 hover:bg-white/5 transition-all"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleConfirmSingleDelete}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-all shadow-md shadow-rose-900/40"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Sil</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. Floating Toast Notification Banner */}
      {actionToast && (
        <div className="fixed top-6 right-6 z-50 bg-zinc-900/95 backdrop-blur-md border border-white/20 text-white text-xs font-medium px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2.5 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{actionToast}</span>
        </div>
      )}

      {/* 10. Floating Global AI Second Brain Chat (Recall Model RAG) */}
      <GlobalAIChatModal />
    </div>
  )
}
