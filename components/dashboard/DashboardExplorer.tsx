'use client'

import { useState, useMemo, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import type { SavedItem } from '@/lib/mock-data'
import FilterBar from './FilterBar'
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
        const res = await fetch(`/api/v1/search/semantic?q=${encodeURIComponent(searchQuery.trim())}`)
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

    return baseList.filter((item) => {
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
        if (selectedCategory === 'travel' && item.category !== 'travel' && !item.extractors?.location) return false
        if (selectedCategory === 'product' && item.category !== 'product' && !item.extractors?.discount) return false
        if (selectedCategory === 'productivity' && item.category !== 'productivity' && !item.extractors?.code) return false
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
  ])

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      recipe: 0,
      health: 0,
      productivity: 0,
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
  }

  const hasActiveFilters = Boolean(
    searchQuery ||
    selectedPlatform !== 'Hepsi' ||
    selectedCategory !== null ||
    selectedCollectionId !== null ||
    onlyStarred ||
    selectedTags.length > 0 ||
    isSemanticSearch ||
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

      {/* 6. Floating Global AI Second Brain Chat (Recall Model RAG) */}
      <GlobalAIChatModal />
    </div>
  )
}
