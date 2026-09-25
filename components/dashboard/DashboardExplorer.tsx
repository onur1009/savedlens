'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
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
  Star,
  Plus,
  FolderPlus,
  Mic2,
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

  // Manual Category / Collection Creation & Auto-Scan state
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryColor, setNewCategoryColor] = useState('#6366f1')
  const [autoScanNewCategory, setAutoScanNewCategory] = useState(true)
  const [isCreatingCategory, setIsCreatingCategory] = useState(false)
  const [isRescanningCollection, setIsRescanningCollection] = useState(false)

  function showToast(msg: string) {
    setActionToast(msg)
    setTimeout(() => setActionToast(null), 3500)
  }

  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault()
    if (!newCategoryName.trim() || isCreatingCategory) return

    setIsCreatingCategory(true)
    try {
      const res = await fetch('/api/v1/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCategoryName.trim(),
          color: newCategoryColor,
          icon: 'folder',
          scanLibrary: autoScanNewCategory,
        }),
      })
      const data = await res.json()
      if (res.ok && data.collection) {
        const createdCol: CollectionOption = {
          id: data.collection.id,
          name: data.collection.name,
          color: data.collection.color || newCategoryColor,
        }
        setCollections((prev) => [...prev, createdCol])

        const matchedIds = new Set<string>(data.matchedBookmarkIds || [])
        if (matchedIds.size > 0) {
          setItems((prev) =>
            prev.map((it) =>
              matchedIds.has(it.id)
                ? {
                    ...it,
                    collection_id: createdCol.id,
                    collection_name: createdCol.name,
                    collection_color: createdCol.color,
                  }
                : it
            )
          )
        }

        setUserCategory(null)
        setUserCollectionId(createdCol.id)
        setShowAddCategoryModal(false)
        setNewCategoryName('')
        window.dispatchEvent(new CustomEvent('collections-updated'))

        showToast(
          data.message ||
            `✨ "${createdCol.name}" kategorisi oluşturuldu ve ${data.matchedCount || 0} içerik bağlandı!`
        )
      } else {
        showToast(data.error || 'Kategori oluşturulamadı')
      }
    } catch (err) {
      console.error('Kategori oluşturma hatası:', err)
      showToast('Kategori oluşturulurken bir hata oluştu')
    } finally {
      setIsCreatingCategory(false)
    }
  }

  async function handleRescanActiveCollection() {
    if (!selectedCollectionId || isRescanningCollection) return
    setIsRescanningCollection(true)
    showToast(`"${activeCollectionName}" için tüm kütüphane taranıyor...`)

    try {
      const res = await fetch(`/api/v1/collections/${selectedCollectionId}/scan`, {
        method: 'POST',
      })
      const data = await res.json()
      if (res.ok && data.success) {
        const matchedIds = new Set<string>(data.matchedBookmarkIds || [])
        setItems((prev) =>
          prev.map((it) => {
            if (matchedIds.has(it.id)) {
              const prevColIds = it.collection_ids || (it.collection_id ? [it.collection_id] : [])
              const updatedColIds = prevColIds.includes(selectedCollectionId)
                ? prevColIds
                : [...prevColIds, selectedCollectionId]
              return {
                ...it,
                collection_id: selectedCollectionId,
                collection_name: activeCollectionName || it.collection_name,
                collection_ids: updatedColIds,
              }
            }
            return it
          })
        )
        window.dispatchEvent(new CustomEvent('collections-updated'))
        showToast(data.message || `✨ "${activeCollectionName}" yeniden tarandı ve güncellendi!`)
      } else {
        showToast(data.error || 'Tarama başarısız oldu')
      }
    } catch {
      showToast('Tarama sırasında bağlantı hatası oluştu')
    } finally {
      setIsRescanningCollection(false)
    }
  }

  const urlPlatform = searchParams.get('platform')
  const urlFilter = searchParams.get('filter')
  const urlTag = searchParams.get('tag')
  const urlCollection = searchParams.get('collection')

  // User manual overrides for filters (null means follow URL searchParams)
  const [userPlatform, setUserPlatform] = useState<string | null>(null)
  const [userCategory, setUserCategory] = useState<string | null>(null)
  const [userStarred, setUserStarred] = useState<boolean | null>(null)
  const [userWithTranscript, setUserWithTranscript] = useState<boolean>(false)
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
  const onlyWithTranscript = userWithTranscript || (urlFilter === 'transcript')
  const selectedCollectionId = userCollectionId !== null ? userCollectionId : urlCollection
  const selectedTags = useMemo(() => {
    return userTags !== null ? userTags : (urlTag ? [urlTag] : [])
  }, [userTags, urlTag])

  // Sync when URL query params change (e.g. from Sidebar navigation)
  useEffect(() => {
    if (urlFilter) {
      if (urlFilter === 'transcript') {
        setUserWithTranscript(true)
        setUserCategory(null)
      } else if (urlFilter === 'starred') {
        setUserStarred(true)
        setUserCategory(null)
      } else {
        const mapped =
          urlFilter === 'code'
            ? 'productivity'
            : urlFilter === 'location'
            ? 'travel'
            : urlFilter === 'discount'
            ? 'product'
            : urlFilter
        setUserCategory(mapped)
      }
      setUserCollectionId(null)
    }
  }, [urlFilter])

  useEffect(() => {
    if (urlCollection) {
      setUserCollectionId(urlCollection)
      setUserCategory(null)
    }
  }, [urlCollection])

  // Instant zero-latency filter synchronization from Sidebar
  useEffect(() => {
    const handleFilterChanged = (e: Event) => {
      try {
        const custom = e as CustomEvent<string>
        const targetUrl = new URL(custom.detail, window.location.origin)
        const filter = targetUrl.searchParams.get('filter')
        const col = targetUrl.searchParams.get('collection')
        const platform = targetUrl.searchParams.get('platform')

        if (filter) {
          const mapped =
            filter === 'code'
              ? 'productivity'
              : filter === 'location'
              ? 'travel'
              : filter === 'discount'
              ? 'product'
              : filter
          if (filter === 'starred') {
            setUserStarred(true)
            setUserCategory(null)
          } else {
            setUserStarred(null)
            setUserCategory(mapped)
          }
          setUserCollectionId(null)
          setUserPlatform('Hepsi')
        } else if (col) {
          setUserCollectionId(col)
          setUserCategory(null)
          setUserStarred(null)
          setUserPlatform('Hepsi')
        } else if (platform) {
          setUserPlatform(platform)
          setUserCategory(null)
          setUserCollectionId(null)
          setUserStarred(null)
        } else {
          // Reset all filters when clicking /dashboard
          setUserCategory(null)
          setUserCollectionId(null)
          setUserPlatform('Hepsi')
          setUserStarred(null)
        }
      } catch (err) {
        console.warn('Filter sync error:', err)
      }
    }

    window.addEventListener('dashboard-filter-changed', handleFilterChanged)
    return () => window.removeEventListener('dashboard-filter-changed', handleFilterChanged)
  }, [])

  function handleSelectCategory(cat: string) {
    setUserCollectionId(null)
    setUserCategory(selectedCategory === cat ? null : cat)
  }

  function handleSelectCollection(colId: string) {
    setUserCategory(null)
    setUserCollectionId(selectedCollectionId === colId ? null : colId)
  }

  // ── Polling for Ingestion Jobs (status === 'processing') ────────
  // Use a ref to avoid recreating the interval on every state change
  const processingIdsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const newProcessing = new Set(items.filter((it) => it.status === 'processing').map((it) => it.id))
    processingIdsRef.current = newProcessing
  }, [items])

  useEffect(() => {
    // Check once if there are processing items
    const initialProcessing = items.filter((it) => it.status === 'processing')
    if (initialProcessing.length === 0) return

    const interval = setInterval(async () => {
      const currentIds = Array.from(processingIdsRef.current)
      if (currentIds.length === 0) {
        clearInterval(interval)
        return
      }

      for (const procId of currentIds) {
        try {
          const res = await fetch(`/api/v1/bookmarks/${procId}`)
          if (res.ok) {
            const data = await res.json()
            if (data.item && data.item.status !== 'processing') {
              processingIdsRef.current.delete(procId)
              setItems((prev) =>
                prev.map((it) =>
                  it.id === procId
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
    }, 4000)

    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
        const matchDirect = item.collection_id === selectedCollectionId
        const matchMulti = item.collection_ids?.includes(selectedCollectionId)
        if (!matchDirect && !matchMulti) {
          return false
        }
      }

      // 4. Starred Filter
      if (onlyStarred && !item.starred) {
        return false
      }

      // 4.5. Script / Transcript Filter
      if (onlyWithTranscript && !item.transcript && !item.extractors?.transcript) {
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

    // 8. High-Speed Sorting System (avoids creating thousands of Date objects per sort)
    const sorted = [...filtered]
    if (sortBy === 'oldest') {
      sorted.sort((a, b) => a.created_at.localeCompare(b.created_at))
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
      sorted.sort((a, b) => b.created_at.localeCompare(a.created_at))
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

  // Precalculate category counts and O(1) collection counts in a single fast pass
  const { categoryCounts, collectionCountsMap } = useMemo(() => {
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
    const colMap: Record<string, number> = {}

    for (const it of items) {
      if (it.category === 'recipe' || it.extractors?.recipe) counts.recipe++
      else if (it.category === 'health' || it.extractors?.health) counts.health++
      else if (it.category === 'productivity' || it.extractors?.code) counts.productivity++
      else if (it.category === 'finance') counts.finance++
      else if (it.category === 'motivation_mindset') counts.motivation_mindset++
      else if (it.category === 'travel' || it.extractors?.location) counts.travel++
      else if (it.category === 'product' || it.extractors?.discount) counts.product++
      else if (it.category === 'book_movie') counts.book_movie++
      else counts.other++

      if (it.collection_id) {
        colMap[it.collection_id] = (colMap[it.collection_id] || 0) + 1
      }
    }
    return { categoryCounts: counts, collectionCountsMap: colMap }
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
    setUserWithTranscript(false)
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
    showToast('İçerik siliniyor...')

    try {
      const res = await fetch(`/api/v1/bookmarks/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (res.ok && data.success) {
        showToast('İçerik başarıyla silindi ✓')
      } else {
        setItems(prevItems)
        showToast(data.error || 'Silme işlemi başarısız oldu')
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
    const isWipingAll = (selectedIds.size >= items.length && !hasActiveFilters) || (selectedIds.size === filteredItems.length && !hasActiveFilters)

    // Optimistic removal
    setItems((prev) => (isWipingAll ? [] : prev.filter((it) => !selectedIds.has(it.id))))
    setSelectedIds(new Set())
    setShowBulkDeleteModal(false)
    showToast(isWipingAll ? 'Tüm kütüphane temizleniyor...' : `${ids.length} içerik kütüphaneden siliniyor...`)

    try {
      const res = await fetch('/api/v1/bookmarks/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: isWipingAll ? 'delete_all' : 'delete',
          bookmarkIds: ids,
          all: isWipingAll,
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        showToast(isWipingAll ? 'Tüm kütüphane başarıyla temizlendi ✓' : `${data.count || ids.length} içerik başarıyla silindi ✓`)
      } else {
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

  const [isBulkCategorizing, setIsBulkCategorizing] = useState(false)

  const areAllSelectedStarred = useMemo(() => {
    if (selectedIds.size === 0) return false
    return Array.from(selectedIds).every((id) => items.find((it) => it.id === id)?.starred)
  }, [selectedIds, items])

  async function handleBulkToggleFavorite(targetState?: boolean) {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return

    const shouldFav = targetState !== undefined
      ? targetState
      : !areAllSelectedStarred

    setItems((prev) =>
      prev.map((it) => (selectedIds.has(it.id) ? { ...it, starred: shouldFav } : it))
    )
    showToast(`${ids.length} içerik ${shouldFav ? 'favorilere eklendi ★' : 'favorilerden çıkarıldı'}`)

    try {
      await fetch('/api/v1/bookmarks/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'favorite', bookmarkIds: ids, isFavorite: shouldFav }),
      })
    } catch {
      showToast('Favori güncellenemedi')
    }
  }

  async function handleBulkReCategorize() {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return

    setIsBulkCategorizing(true)
    showToast(`${ids.length} içerik AI ile analiz ediliyor...`)

    try {
      const res = await fetch('/api/v1/bookmarks/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'categorize', bookmarkIds: ids }),
      })

      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data.updatedResults)) {
          interface UpdatedAIResult {
            id: string
            category: string
            collectionName: string
          }
          const resultMap = new Map<string, UpdatedAIResult>(
            data.updatedResults.map((r: UpdatedAIResult) => [r.id, r])
          )
          setItems((prev) =>
            prev.map((it) => {
              const updated = resultMap.get(it.id)
              if (updated) {
                return {
                  ...it,
                  category: updated.category,
                  collection_name: updated.collectionName,
                }
              }
              return it
            })
          )
        }
        showToast(`${ids.length} içerik AI ile yeniden sınıflandırıldı! ✨`)
        setSelectedIds(new Set())
      } else {
        showToast('Yapay zeka kategorizasyonunda hata oluştu')
      }
    } catch {
      showToast('Bağlantı hatası: AI kategorizasyonu tamamlanamadı')
    } finally {
      setIsBulkCategorizing(false)
    }
  }

  const hasActiveFilters = Boolean(
    searchQuery ||
    selectedPlatform !== 'Hepsi' ||
    selectedCategory !== null ||
    selectedCollectionId !== null ||
    onlyStarred ||
    onlyWithTranscript ||
    selectedTags.length > 0 ||
    isSemanticSearch ||
    sortBy !== 'newest' ||
    urlFilter
  )

  const activeCollectionName = collections.find((c) => c.id === selectedCollectionId)?.name

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
            onClick={() => setUserWithTranscript((prev) => !prev)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all border shrink-0 cursor-pointer ${
              onlyWithTranscript
                ? 'bg-purple-600/30 text-purple-200 border-purple-500/60 ring-1 ring-purple-400 font-bold shadow-[0_0_12px_rgba(168,85,247,0.3)]'
                : 'bg-zinc-900/60 text-zinc-400 border-white/5 hover:text-purple-300 hover:border-purple-500/30'
            }`}
          >
            <Mic2 className="w-3.5 h-3.5 text-purple-400" />
            <span>Scriptli Videolar</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-950 text-purple-300 font-bold">
              {items.filter((i) => Boolean(i.transcript) || i.extractors?.transcript).length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectCategory('recipe')}
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
            onClick={() => handleSelectCategory('health')}
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
            onClick={() => handleSelectCategory('productivity')}
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
            onClick={() => handleSelectCategory('finance')}
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
            onClick={() => handleSelectCategory('motivation_mindset')}
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
            onClick={() => handleSelectCategory('travel')}
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
            onClick={() => handleSelectCategory('product')}
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
            onClick={() => handleSelectCategory('book_movie')}
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

          {/* User Custom Collections / Categories */}
          {collections.map((col) => {
            const isSelected = selectedCollectionId === col.id
            const count = collectionCountsMap[col.id] || 0
            return (
              <button
                key={col.id}
                type="button"
                onClick={() => handleSelectCollection(col.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all border shrink-0 ${
                  isSelected
                    ? 'bg-indigo-500/30 text-indigo-200 border-indigo-500/60 ring-1 ring-indigo-400'
                    : 'bg-zinc-900/60 text-zinc-400 border-white/5 hover:text-white hover:border-zinc-700'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: col.color || '#6366f1' }}
                />
                <span>{col.name}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-zinc-800 text-zinc-300 font-bold">
                  {count}
                </span>
              </button>
            )
          })}

          {/* Quick Add Custom Category Button */}
          <button
            type="button"
            onClick={() => setShowAddCategoryModal(true)}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border shrink-0 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 hover:from-purple-500/30 hover:to-indigo-500/30 text-purple-300 hover:text-white border-purple-500/30 hover:border-purple-500/60 shadow-[0_0_12px_rgba(168,85,247,0.15)] cursor-pointer"
            title="Manuel kategori ekle ve tüm kütüphaneyi tara"
          >
            <Plus className="w-3.5 h-3.5 text-purple-400" />
            <span>+ Kategori Ekle</span>
            <Sparkles className="w-3 h-3 text-amber-400 animate-pulse" />
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
        onlyWithTranscript={onlyWithTranscript}
        onToggleWithTranscript={() => setUserWithTranscript((prev) => !prev)}
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
              <span className="px-2 py-0.5 rounded-lg bg-indigo-950/60 text-indigo-300 border border-indigo-800/50 font-semibold flex items-center gap-1.5">
                <span>📁 {activeCollectionName}</span>
                <button
                  type="button"
                  onClick={handleRescanActiveCollection}
                  disabled={isRescanningCollection}
                  className="ml-1 text-[10px] px-2 py-0.5 rounded bg-indigo-500/30 hover:bg-indigo-500/50 text-indigo-200 border border-indigo-400/40 flex items-center gap-1 cursor-pointer transition-all disabled:opacity-50"
                  title="Tüm kütüphaneyi bu kategori için yeniden tara"
                >
                  <Sparkles className={`w-3 h-3 ${isRescanningCollection ? 'animate-spin' : ''}`} />
                  <span>{isRescanningCollection ? 'Taranıyor...' : 'Yeniden Tara'}</span>
                </button>
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

      {/* 4. Top Action Toolbar (when items selected) OR Top Selection Trigger */}
      {selectedIds.size > 0 ? (
        <div className="sticky top-2 z-30 p-3 sm:p-3.5 rounded-2xl bg-[#141522]/95 backdrop-blur-xl border border-indigo-500/40 shadow-[0_8px_32px_rgba(99,102,241,0.25)] flex flex-wrap items-center justify-between gap-2.5 animate-fade-in ring-1 ring-white/10">
          {/* Left: Counter & Hepsini Seç */}
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-xs font-bold shadow-sm">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
              <span>{selectedIds.size} içerik seçildi</span>
            </span>

            {/* Hepsini Seç Butonu */}
            <button
              type="button"
              onClick={handleToggleSelectAll}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white flex items-center gap-1.5 transition-all border border-white/10 cursor-pointer"
            >
              <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
              <span>{selectedIds.size === filteredItems.length ? 'Seçimi Kaldır' : `Hepsini Seç (${filteredItems.length})`}</span>
            </button>
          </div>

          {/* Right: Eylem Butonları */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* ⭐ Favoriye Ekle / Çıkar */}
            <button
              type="button"
              onClick={() => handleBulkToggleFavorite()}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                areAllSelectedStarred
                  ? 'bg-amber-500/25 border-amber-500/60 text-amber-200 hover:bg-amber-500/35'
                  : 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25'
              }`}
              title={areAllSelectedStarred ? 'Seçilenleri favorilerden çıkar' : 'Seçilenleri favorilere ekle'}
            >
              <Star className={`w-3.5 h-3.5 text-amber-400 ${areAllSelectedStarred ? 'fill-amber-400' : 'fill-amber-400/30'}`} />
              <span>{areAllSelectedStarred ? 'Favorilerden Çıkar' : 'Favoriye Ekle'}</span>
            </button>

            {/* ✨ AI ile Yeniden Kategorize Et */}
            <button
              type="button"
              onClick={handleBulkReCategorize}
              disabled={isBulkCategorizing}
              className="px-3 py-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/50 text-purple-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm disabled:opacity-50"
              title="Seçilen içerikleri yapay zeka ile baştan analiz et ve kategorilere ayır"
            >
              {isBulkCategorizing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-300" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-purple-300" />
              )}
              <span>{isBulkCategorizing ? 'AI Ayrıştırıyor...' : selectedIds.size === 1 ? 'AI ile Yeniden Kategorize Et' : `AI ile Yeniden Kategorize Et (${selectedIds.size})`}</span>
            </button>

            {/* 📁 Koleksiyona Ekle */}
            {collections.length > 0 && (
              <div className="relative">
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleBulkAddToCollection(e.target.value)
                      e.target.value = ''
                    }
                  }}
                  defaultValue=""
                  className="text-xs px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-zinc-200 font-semibold cursor-pointer outline-none transition-all"
                >
                  <option value="" disabled className="bg-zinc-900 text-zinc-400">📁 Koleksiyona Ekle...</option>
                  {collections.map((col) => (
                    <option key={col.id} value={col.id} className="bg-zinc-900 text-white">
                      {col.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 🗑️ Sil */}
            <button
              type="button"
              onClick={() => setShowBulkDeleteModal(true)}
              disabled={isBulkDeleting}
              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
              title="Seçilenleri kütüphaneden sil"
            >
              {isBulkDeleting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
              <span>{selectedIds.size === 1 ? 'Sil' : `Sil (${selectedIds.size})`}</span>
            </button>

            {/* ✕ İptal */}
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors ml-0.5"
              title="Seçimi Temizle"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between px-1 text-xs text-[var(--text-muted)] -mb-1">
          <span>{filteredItems.length} içerik listeleniyor</span>
          {filteredItems.length > 0 && (
            <button
              type="button"
              onClick={handleToggleSelectAll}
              className="text-xs font-semibold text-[var(--accent-light)] hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer py-1 px-2.5 rounded-xl hover:bg-white/5 border border-white/5 hover:border-white/15"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Hepsini Seç ({filteredItems.length})</span>
            </button>
          )}
        </div>
      )}

      {/* 5. Live Responsive Library Grid */}
      <LibraryGrid
        items={filteredItems}
        onItemClick={(item) => setSelectedItem(item)}
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
        onDeleteSingle={(item) => setItemToDelete(item)}
      />

      {/* 6. Rich Detail & Interactive Categorizer Modal */}
      {selectedItem && (
        <ItemDetailModal
          item={selectedItem}
          userCollections={userCollections}
          onClose={() => setSelectedItem(null)}
          onItemUpdated={handleItemUpdated}
          onItemDeleted={handleItemDeleted}
        />
      )}

      {/* 7. Floating Bulk Action Bar (Bottom Bar - With All Actions) */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-zinc-950/95 backdrop-blur-xl border border-white/20 shadow-[0_12px_45px_rgba(0,0,0,0.9)] rounded-2xl p-2.5 px-4 flex items-center gap-2.5 animate-fade-up max-w-[95vw] overflow-x-auto ring-1 ring-white/10">
          <div className="flex items-center gap-2 pr-2.5 border-r border-white/10 shrink-0">
            <div className="w-5 h-5 rounded-full bg-[var(--accent)] text-white text-[11px] font-bold flex items-center justify-center">
              {selectedIds.size}
            </div>
            <span className="text-xs font-semibold text-white whitespace-nowrap">
              seçildi
            </span>
          </div>

          {/* Toggle Select All */}
          <button
            type="button"
            onClick={handleToggleSelectAll}
            className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-all whitespace-nowrap cursor-pointer shrink-0"
          >
            {selectedIds.size === filteredItems.length ? 'Seçimi Kaldır' : `Hepsini Seç (${filteredItems.length})`}
          </button>

          {/* ⭐ Favoriye Ekle / Çıkar */}
          <button
            type="button"
            onClick={() => handleBulkToggleFavorite()}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer shrink-0 ${
              areAllSelectedStarred
                ? 'bg-amber-500/30 text-amber-200 hover:bg-amber-500/40'
                : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
            }`}
            title={areAllSelectedStarred ? 'Favorilerden Çıkar' : 'Favoriye Ekle'}
          >
            <Star className={`w-3.5 h-3.5 text-amber-400 ${areAllSelectedStarred ? 'fill-amber-400' : 'fill-amber-400/30'}`} />
            <span>{areAllSelectedStarred ? 'Favoriden Çıkar' : 'Favori'}</span>
          </button>

          {/* ✨ AI ile Yeniden Kategorize Et */}
          <button
            type="button"
            onClick={handleBulkReCategorize}
            disabled={isBulkCategorizing}
            className="px-2.5 py-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer shrink-0 disabled:opacity-50"
            title="Seçilenleri AI ile yeniden analiz edip kategorize et"
          >
            {isBulkCategorizing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-purple-300" />
            )}
            <span>{isBulkCategorizing ? 'AI Analiz...' : 'AI Kategorize'}</span>
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
                className="text-xs px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-zinc-300 font-medium cursor-pointer outline-none transition-all"
              >
                <option value="" disabled>📁 Koleksiyon...</option>
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
            className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shrink-0 cursor-pointer disabled:opacity-50"
          >
            {isBulkDeleting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
            <span>{selectedIds.size === 1 ? 'Sil' : `Sil (${selectedIds.size})`}</span>
          </button>

          {/* Cancel Selection */}
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors ml-0.5 shrink-0"
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
                {selectedIds.size >= items.length && !hasActiveFilters
                  ? `Tüm Kütüphaneyi (${selectedIds.size} İçerik) Silmek İstiyor musunuz?`
                  : `${selectedIds.size} İçeriği Silmek İstiyor musunuz?`}
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {selectedIds.size >= items.length && !hasActiveFilters
                  ? `Kütüphanenizdeki kayıtlı tüm `
                  : `Seçilen `}
                <strong className="text-white">{selectedIds.size}</strong> içerik kütüphanenizden ve bağlı koleksiyonlardan kalıcı olarak temizlenecektir. Bu işlem geri alınamaz.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowBulkDeleteModal(false)}
                disabled={isBulkDeleting}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-xs font-semibold text-zinc-300 hover:bg-white/5 transition-all cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkDelete}
                disabled={isBulkDeleting}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white flex items-center justify-center gap-2 transition-all shadow-lg shadow-rose-900/40 cursor-pointer"
              >
                {isBulkDeleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>
                  {selectedIds.size >= items.length && !hasActiveFilters
                    ? 'Evet, Tümünü Temizle'
                    : `Evet, ${selectedIds.size} İçeriği Sil`}
                </span>
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

      {/* 10. Manual Category Creation & Auto-Scan Modal */}
      {showAddCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white">Yeni Kategori Ekle</h3>
                  <p className="text-xs text-zinc-400">Tüm kütüphanenizi otomatik tarayıp eşleştirin</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddCategoryModal(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Kategori / Koleksiyon Adı
                </label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="örn: Arabalar, Kahve & Mekanlar, Borsa, Fitness..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-800/80 border border-white/10 text-white placeholder:text-zinc-500 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Renk Seçin
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {[
                    { color: '#6366f1', label: 'Indigo' },
                    { color: '#ec4899', label: 'Pembe' },
                    { color: '#10b981', label: 'Yeşil' },
                    { color: '#f59e0b', label: 'Amber' },
                    { color: '#3b82f6', label: 'Mavi' },
                    { color: '#8b5cf6', label: 'Mor' },
                    { color: '#f43f5e', label: 'Gül' },
                    { color: '#06b6d4', label: 'Turkuaz' },
                  ].map((c) => (
                    <button
                      key={c.color}
                      type="button"
                      onClick={() => setNewCategoryColor(c.color)}
                      className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer ${
                        newCategoryColor === c.color ? 'scale-110 border-white ring-2 ring-purple-400' : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: c.color }}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/20 space-y-1.5">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoScanNewCategory}
                    onChange={(e) => setAutoScanNewCategory(e.target.checked)}
                    className="mt-0.5 rounded border-purple-400 text-purple-600 focus:ring-purple-500 w-4 h-4 bg-zinc-800 cursor-pointer"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-purple-200">
                      ✨ Tüm kütüphaneyi tara ve eşleşenleri bu kategoriye topla
                    </span>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Kütüphanenizdeki {items.length} içerik akıllı Türkçe anlamsal &amp; anahtar kelime eşleştirme motoruyla taranır ve uygun olanlar otomatik eklenir.
                    </p>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCategoryModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={!newCategoryName.trim() || isCreatingCategory}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 transition-all shadow-lg shadow-purple-500/25 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isCreatingCategory ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Kütüphane Taranıyor...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Kategori Oluştur ve Tara</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 11. Floating Global AI Second Brain Chat (Recall Model RAG) */}
      <GlobalAIChatModal />
    </div>
  )
}
