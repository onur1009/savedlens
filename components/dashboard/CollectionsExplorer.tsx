'use client'

import { useState, useRef, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Home,
  FolderOpen,
  Plus,
  Layers,
  Sparkles,
  BookOpen,
  X,
  Check,
  RotateCw,
  Loader2,
  CheckCircle2,
} from 'lucide-react'
import type { Collection, Bookmark } from '@/lib/mock-data'
import ItemCard from './ItemCard'

interface CollectionsExplorerProps {
  initialCollections: Collection[]
  initialBookmarks: Bookmark[]
}

const PRESET_COLORS = [
  '#6366f1', // Indigo
  '#ec4899', // Pink
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#ef4444', // Red
  '#14b8a6', // Teal
]

const BATCH_SIZE = 24

export default function CollectionsExplorer({
  initialCollections,
  initialBookmarks,
}: CollectionsExplorerProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlCollection = searchParams.get('collection')

  const [collections, setCollections] = useState<Collection[]>(initialCollections)
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(initialBookmarks)
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(urlCollection)
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newColName, setNewColName] = useState('')
  const [newColColor, setNewColColor] = useState(PRESET_COLORS[0])
  const [autoScan, setAutoScan] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [scanningColId, setScanningColId] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  function showToast(msg: string) {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 4500)
  }

  async function handleCreateCollection(e: React.FormEvent) {
    e.preventDefault()
    if (!newColName.trim()) return

    setIsCreating(true)
    try {
      const res = await fetch('/api/v1/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newColName.trim(),
          color: newColColor,
          icon: 'folder',
          scanLibrary: autoScan,
        }),
      })
      const data = await res.json()
      if (res.ok && data.collection) {
        const matchedIds = new Set<string>(data.matchedBookmarkIds || [])
        const newCol: Collection = {
          id: data.collection.id,
          name: data.collection.name,
          color: data.collection.color || newColColor,
          icon: data.collection.icon || 'folder',
          count: data.matchedCount || 0,
          created_at: data.collection.created_at || new Date().toISOString(),
        }
        setCollections((prev) => [newCol, ...prev])
        
        if (matchedIds.size > 0) {
          setBookmarks((prev) =>
            prev.map((b) =>
              matchedIds.has(b.id)
                ? { ...b, collections: [...(b.collections || []), data.collection.id] }
                : b
            )
          )
        }

        setSelectedCollectionId(data.collection.id)
        setNewColName('')
        setIsModalOpen(false)
        window.dispatchEvent(new CustomEvent('collections-updated'))
        showToast(data.message || `"${newCol.name}" koleksiyonu oluşturuldu!`)
      } else {
        showToast(data.error || 'Koleksiyon oluşturulamadı')
      }
    } catch (err) {
      console.error('Failed to create collection:', err)
      showToast('Koleksiyon oluşturulurken bir hata meydana geldi')
    } finally {
      setIsCreating(false)
    }
  }

  async function handleRescanCollection(e: React.MouseEvent, colId: string, colName: string) {
    e.stopPropagation()
    setScanningColId(colId)
    showToast(`"${colName}" için tüm kütüphane taranıyor...`)

    try {
      const res = await fetch(`/api/v1/collections/${colId}/scan`, {
        method: 'POST',
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setCollections((prev) =>
          prev.map((c) => (c.id === colId ? { ...c, count: data.matchedCount } : c))
        )
        router.refresh()
        window.dispatchEvent(new CustomEvent('collections-updated'))
        showToast(data.message || `"${colName}" yeniden tarandı ve güncellendi!`)
      } else {
        showToast(data.error || 'Tarama başarısız oldu')
      }
    } catch {
      showToast('Tarama sırasında bağlantı hatası oluştu')
    } finally {
      setScanningColId(null)
    }
  }

  // Sync URL search params
  useEffect(() => {
    if (urlCollection) {
      setSelectedCollectionId(urlCollection)
    }
  }, [urlCollection])

  // Reset pagination when selected collection changes
  useEffect(() => {
    setVisibleCount(BATCH_SIZE)
  }, [selectedCollectionId])

  // Filter bookmarks by selected collection
  const displayedBookmarks = useMemo(() => {
    if (!selectedCollectionId) return []
    return bookmarks.filter((b) => b.collections?.includes(selectedCollectionId))
  }, [bookmarks, selectedCollectionId])

  // Infinite Scroll Sentinel Observer
  useEffect(() => {
    if (!sentinelRef.current) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + BATCH_SIZE, displayedBookmarks.length))
        }
      },
      { rootMargin: '400px' }
    )

    const el = sentinelRef.current
    observer.observe(el)
    return () => observer.unobserve(el)
  }, [displayedBookmarks.length])

  const visibleBookmarks = useMemo(() => {
    return displayedBookmarks.slice(0, visibleCount)
  }, [displayedBookmarks, visibleCount])

  const activeCollection = collections.find((c) => c.id === selectedCollectionId)

  return (
    <div className="flex flex-col gap-6 animate-fade-up">
      {/* Toast Banner */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-[#161726]/95 backdrop-blur-xl border border-purple-500/50 text-white text-xs sm:text-sm font-semibold py-3 px-4 rounded-2xl shadow-[0_10px_35px_rgba(168,85,247,0.3)] flex items-center gap-2.5 animate-fade-in ring-1 ring-white/10 max-w-md">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="leading-snug">{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors ml-auto shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FolderOpen className="w-6 h-6 text-[var(--accent-light)]" />
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              Koleksiyonlar & Panolar
            </h1>
          </div>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Sosyal medya kayıtlarınızı akıllı kategoriler ve tematik panolar halinde düzenleyin.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 hover:border-purple-500/40 text-sm font-semibold transition-all shadow-sm group cursor-pointer"
            title="Ana Sayfaya Git"
          >
            <Home className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
            <span>Ana Sayfa</span>
          </Link>

          <button
            id="btn-new-collection"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--accent)] text-white text-sm font-semibold hover:bg-[var(--accent-light)] transition-all shadow-[0_0_16px_var(--accent-glow)] shrink-0 active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Yeni Kategori / Koleksiyon
          </button>
        </div>
      </div>

      {/* Collections Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {collections.map((col) => {
          const isSelected = selectedCollectionId === col.id
          const isScanningThis = scanningColId === col.id

          return (
            <div
              key={col.id}
              onClick={() => setSelectedCollectionId(isSelected ? null : col.id)}
              className={`glass card-lift rounded-2xl p-5 flex flex-col justify-between group cursor-pointer transition-all border ${
                isSelected
                  ? 'border-[var(--accent)] ring-1 ring-[var(--accent)] shadow-[0_0_20px_var(--accent-glow)]'
                  : 'glow-border'
              }`}
            >
              <div className="flex items-start justify-between">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-base shadow-sm"
                  style={{ backgroundColor: col.color }}
                >
                  <Layers className="w-5 h-5" />
                </div>
                <div className="flex items-center gap-1.5">
                  {/* Re-scan Library Button */}
                  <button
                    type="button"
                    onClick={(e) => handleRescanCollection(e, col.id, col.name)}
                    disabled={isScanningThis}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-zinc-300 hover:text-white transition-all text-[11px] font-semibold flex items-center gap-1 opacity-80 group-hover:opacity-100"
                    title="Bu kategori için kütüphaneyi baştan tara ve eşleşenleri ekle"
                  >
                    {isScanningThis ? (
                      <Loader2 className="w-3 h-3 animate-spin text-purple-400" />
                    ) : (
                      <RotateCw className="w-3 h-3 text-purple-400" />
                    )}
                    <span className="hidden sm:inline">Yeniden Tara</span>
                  </button>

                  <span className="text-xs px-2.5 py-1 rounded-full bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-muted)] font-medium">
                    {col.count} içerik
                  </span>
                </div>
              </div>

              <div className="mt-4">
                <h3 className="text-base font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-light)] transition-colors flex items-center justify-between">
                  <span>{col.name}</span>
                  {isSelected && <Check className="w-4 h-4 text-[var(--accent-light)]" />}
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-1 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[var(--accent-light)]" />
                  {isSelected ? 'Filtre aktif (kaldırmak için tıkla)' : 'İçerikleri görmek için tıkla'}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Filtered items section */}
      <div className="mt-2">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[var(--accent-light)]" />
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              {activeCollection ? `"${activeCollection.name}" İçerikleri` : 'Tüm Koleksiyon İçerikleri'}
            </h2>
            <span className="text-xs text-[var(--text-muted)]">
              ({displayedBookmarks.length} gönderi)
            </span>
          </div>

          {selectedCollectionId && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => activeCollection && handleRescanCollection(e, activeCollection.id, activeCollection.name)}
                disabled={Boolean(scanningColId)}
                className="px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                {scanningColId ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RotateCw className="w-3.5 h-3.5" />
                )}
                <span>Kütüphaneyi Bu Kategori İçin Tara</span>
              </button>

              <button
                onClick={() => setSelectedCollectionId(null)}
                className="text-xs text-[var(--accent-light)] hover:underline font-medium"
              >
                Filtreyi Temizle
              </button>
            </div>
          )}
        </div>

        {!selectedCollectionId ? (
          <div className="glass rounded-2xl p-8 sm:p-12 text-center flex flex-col items-center justify-center gap-3.5 border border-white/10 shadow-lg animate-fade-in">
            <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.15)]">
              <Layers className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">İçerikleri Görmek İçin Bir Kategori / Koleksiyon Seçin</h3>
              <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
                Yukarıdaki panolardan dilediğinize tıklayarak o kategoriye ait içerikleri anında hızlıca listeleyebilirsiniz.
              </p>
            </div>
            {collections.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap justify-center pt-2">
                {collections.slice(0, 8).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCollectionId(c.id)}
                    className="px-3 py-1.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700/80 border border-white/10 text-xs font-semibold text-zinc-300 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                    <span>{c.name}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-zinc-900 text-zinc-400 font-bold">{c.count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : displayedBookmarks.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-3 animate-fade-in">
            <div className="w-12 h-12 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)]">
              <Layers className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Bu koleksiyonda henüz içerik bulunmuyor
            </p>
            <p className="text-xs text-[var(--text-muted)] max-w-sm">
              &quot;Kütüphaneyi Bu Kategori İçin Tara&quot; butonuna basarak tüm kütüphanenizdeki uygun kayıtları otomatik olarak aktarabilirsiniz.
            </p>
            {activeCollection && (
              <button
                type="button"
                onClick={(e) => handleRescanCollection(e, activeCollection.id, activeCollection.name)}
                disabled={Boolean(scanningColId)}
                className="mt-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md cursor-pointer hover:scale-105"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Kütüphaneyi Tara ve İçerikleri Eşleştir</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-fade-in">
              {visibleBookmarks.map((b) => (
                <ItemCard
                  key={b.id}
                  item={{
                    id: b.id,
                    url: b.permalink,
                    title: b.author_name ? `${b.author_name} (@${b.author_username})` : b.caption.slice(0, 60),
                    description: b.caption,
                    thumbnail_url: b.stored_media_urls[0] || b.media_urls[0] || null,
                    platform: b.platform,
                    tags: b.ai_tags,
                    summary: b.ai_summary,
                    extractors: b.extractors ?? null,
                    created_at: b.created_at,
                    author_username: b.author_username,
                    author_avatar: b.author_avatar,
                    media_type: b.media_type,
                    stored_media_urls: b.stored_media_urls,
                  }}
                />
              ))}
            </div>

            {/* Infinite Scroll Sentinel / Load More */}
            {visibleCount < displayedBookmarks.length && (
              <div ref={sentinelRef} className="py-6 flex justify-center items-center">
                <button
                  type="button"
                  onClick={() => setVisibleCount((prev) => Math.min(prev + BATCH_SIZE, displayedBookmarks.length))}
                  className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-zinc-300 border border-white/10 flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                  <span>Daha Fazla Göster ({visibleCount} / {displayedBookmarks.length})</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* New Collection Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-up"
          role="dialog"
        >
          <div className="w-full max-w-md glass p-6 rounded-2xl glow-border border border-purple-500/30 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Yeni Kategori / Koleksiyon Oluştur
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCollection} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-medium">
                  Kategori / Koleksiyon Adı
                </label>
                <input
                  type="text"
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  placeholder="Örn: Arabalar, Kahve, Tasarım, Kripto, Psikoloji..."
                  required
                  autoFocus
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-medium">
                  Renk Seçin
                </label>
                <div className="flex items-center gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewColColor(c)}
                      className={`w-7 h-7 rounded-full transition-transform ${
                        newColColor === c ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-black' : 'hover:scale-110'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Automatic Scan & Categorization Checkbox */}
              <label className="flex items-start gap-2.5 cursor-pointer bg-purple-950/30 border border-purple-800/40 p-3 rounded-xl hover:bg-purple-950/40 transition-colors">
                <input
                  type="checkbox"
                  checked={autoScan}
                  onChange={(e) => setAutoScan(e.target.checked)}
                  className="mt-0.5 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                />
                <div className="space-y-0.5">
                  <span className="text-xs text-white font-semibold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Tüm kütüphaneyi tara ve eşleşen içerikleri otomatik ekle</span>
                  </span>
                  <p className="text-[11px] text-zinc-400 leading-tight">
                    Kategori oluşturulduğunda kütüphaneniz taranır; başlık, etiket ve açıklamalarda bu kategoriyle eşleşen tüm kayıtlar otomatik olarak içine aktarılır.
                  </p>
                </div>
              </label>

              <div className="flex items-center justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isCreating}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={!newColName.trim() || isCreating}
                  className="btn-primary px-5 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-lg shadow-purple-900/40"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Oluşturuluyor & Kütüphane Taranıyor...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>Kategori Oluştur ve Tara</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
