'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  X,
  ExternalLink,
  Star,
  Tag,
  ChefHat,
  MapPin,
  Ticket,
  Code2,
  Mic2,
  Share2,
  Trash2,
  Check,
  Sparkles,
  Layers,
  Video,
  FileText,
  Calendar,
  ShieldCheck,
  Folder,
  Plus,
  Loader2,
} from 'lucide-react'
import type { SavedItem } from '@/lib/mock-data'

interface CollectionOption {
  id: string
  name: string
  color: string
}

interface ItemDetailModalProps {
  item: SavedItem | null
  onClose: () => void
  onItemUpdated?: (updatedItem: SavedItem) => void
  onItemDeleted?: (deletedId: string) => void
  userCollections?: CollectionOption[]
}

const PLATFORM_COLORS: Record<string, string> = {
  instagram: '#E1306C',
  tiktok: '#69C9D0',
  youtube: '#FF0000',
  twitter: '#1DA1F2',
  x: '#1DA1F2',
  linkedin: '#0A66C2',
  web: '#7c5cfc',
}

export default function ItemDetailModal(props: ItemDetailModalProps) {
  if (!props.item) return null
  return <ItemDetailModalContent {...props} item={props.item} />
}

function ItemDetailModalContent({
  item,
  onClose,
  onItemUpdated,
  onItemDeleted,
  userCollections = [],
}: {
  item: SavedItem
  onClose: () => void
  onItemUpdated?: (updatedItem: SavedItem) => void
  onItemDeleted?: (deletedId: string) => void
  userCollections?: CollectionOption[]
}) {
  const [copied, setCopied] = useState(false)
  const [discountCopied, setDiscountCopied] = useState(false)
  const [isFavorite, setIsFavorite] = useState(item.starred ?? false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [imageError, setImageError] = useState(false)

  // Categorization & Tags State
  const [collections, setCollections] = useState<CollectionOption[]>(userCollections)
  const [currentColId, setCurrentColId] = useState<string | null>(item.collection_id || null)
  const [isColDropdownOpen, setIsColDropdownOpen] = useState(false)
  const [newColName, setNewColName] = useState('')
  const [isCreatingCol, setIsCreatingCol] = useState(false)
  const [isSavingCol, setIsSavingCol] = useState(false)

  const [tags, setTags] = useState<string[]>(item.tags || [])
  const [newTagInput, setNewTagInput] = useState('')
  const [isSavingTags, setIsSavingTags] = useState(false)
  const [isAutoCategorizing, setIsAutoCategorizing] = useState(false)
  const [autoCatMessage, setAutoCatMessage] = useState<string | null>(null)

  useEffect(() => {
    setIsFavorite(item.starred ?? false)
    setImageError(false)
    setCurrentColId(item.collection_id || null)
    setTags(item.tags || [])
  }, [item])

  // Fetch collections if not provided
  useEffect(() => {
    if (collections.length === 0) {
      fetch('/api/v1/collections')
        .then((res) => res.json())
        .then((data) => {
          if (data.collections) {
            setCollections(data.collections)
          }
        })
        .catch(() => {})
    }
  }, [collections.length])

  // ESC key listener to close modal
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const platform = item.platform?.toLowerCase() ?? 'web'
  const platformColor = PLATFORM_COLORS[platform] ?? '#7c5cfc'
  const hasExtractors = item.extractors && Object.keys(item.extractors).length > 0
  const isBackedUp = Boolean(item.stored_media_urls && item.stored_media_urls.length > 0)
  const isInstagram = platform === 'instagram'
  const isReel =
    (item.url && (item.url.includes('/reel/') || item.url.includes('/reels/'))) ||
    (isInstagram && item.media_type === 'video') ||
    platform === 'tiktok'

  const formattedDate = new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(item.created_at))

  // Find active collection details
  const activeCollection = collections.find((c) => c.id === currentColId)

  // 1. Assign collection
  async function handleAssignCollection(collectionId: string | null) {
    setIsSavingCol(true)
    setIsColDropdownOpen(false)
    setCurrentColId(collectionId)

    const selectedCol = collections.find((c) => c.id === collectionId)
    const updated = {
      ...item,
      collection_id: collectionId,
      collection_name: selectedCol?.name || null,
      collection_color: selectedCol?.color || null,
    }

    if (onItemUpdated) {
      onItemUpdated(updated)
    }

    try {
      await fetch(`/api/v1/bookmarks/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collection_id: collectionId }),
      })
    } catch (err) {
      console.error('Failed to update collection:', err)
    } finally {
      setIsSavingCol(false)
    }
  }

  // 2. Create new collection and immediately assign
  async function handleCreateAndAssignCollection(e: React.FormEvent) {
    e.preventDefault()
    if (!newColName.trim()) return

    setIsCreatingCol(true)
    try {
      const res = await fetch('/api/v1/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newColName.trim(),
          color: '#6366f1',
        }),
      })
      const data = await res.json()

      if (res.ok && data.collection) {
        const created = {
          id: data.collection.id,
          name: data.collection.name,
          color: data.collection.color || '#6366f1',
        }
        setCollections((prev) => [created, ...prev])
        setNewColName('')
        await handleAssignCollection(created.id)
      }
    } catch (err) {
      console.error('Failed to create collection:', err)
    } finally {
      setIsCreatingCol(false)
    }
  }

  // 3. Add custom tag
  async function handleAddTag(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const cleanTag = newTagInput.trim().replace(/^#/, '').toLowerCase()
      if (!cleanTag || tags.includes(cleanTag)) {
        setNewTagInput('')
        return
      }

      const updatedTags = [...tags, cleanTag]
      setTags(updatedTags)
      setNewTagInput('')

      if (onItemUpdated) {
        onItemUpdated({ ...item, tags: updatedTags })
      }

      setIsSavingTags(true)
      try {
        await fetch(`/api/v1/bookmarks/${item.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tags: updatedTags }),
        })
      } catch (err) {
        console.error('Failed to save tags:', err)
      } finally {
        setIsSavingTags(false)
      }
    }
  }

  // 4. Remove tag
  async function handleRemoveTag(tagToRemove: string) {
    const updatedTags = tags.filter((t) => t !== tagToRemove)
    setTags(updatedTags)

    if (onItemUpdated) {
      onItemUpdated({ ...item, tags: updatedTags })
    }

    setIsSavingTags(true)
    try {
      await fetch(`/api/v1/bookmarks/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: updatedTags }),
      })
    } catch (err) {
      console.error('Failed to remove tag:', err)
    } finally {
      setIsSavingTags(false)
    }
  }

  // 5. 1-Click AI Auto-Categorize & Tagging
  async function handleAiAutoCategorize() {
    setIsAutoCategorizing(true)
    setAutoCatMessage(null)

    try {
      const res = await fetch('/api/v1/ai/autotag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookmark_id: item.id,
          caption: `${item.title || ''} ${item.description || ''}`,
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        const mergedTags = Array.from(new Set([...tags, ...(data.tags || [])]))
        setTags(mergedTags)

        const updatedItem = {
          ...item,
          summary: data.summary || item.summary,
          tags: mergedTags,
          extractors: data.extractors || item.extractors,
        }

        if (onItemUpdated) {
          onItemUpdated(updatedItem)
        }

        setAutoCatMessage('✨ Yapay zeka ile otomatik kategorize edildi ve yeni etiketler eklendi!')
        setTimeout(() => setAutoCatMessage(null), 5000)
      }
    } catch (err) {
      console.error('Auto categorize failed:', err)
    } finally {
      setIsAutoCategorizing(false)
    }
  }

  // Toggle favorite
  async function handleToggleFavorite() {
    const nextState = !isFavorite
    setIsFavorite(nextState)
    if (onItemUpdated) {
      onItemUpdated({ ...item, starred: nextState })
    }

    try {
      await fetch(`/api/v1/bookmarks/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_favorite: nextState }),
      })
    } catch (err) {
      console.error('Favorite update failed:', err)
    }
  }

  // Delete item
  async function handleDelete() {
    if (!confirm('Bu içeriği kütüphanenizden silmek istediğinize emin misiniz?')) {
      return
    }

    setIsDeleting(true)
    try {
      const res = await fetch(`/api/v1/bookmarks/${item.id}`, {
        method: 'DELETE',
      })
      if (res.ok && onItemDeleted) {
        onItemDeleted(item.id)
        onClose()
      }
    } catch (err) {
      console.error('Delete failed:', err)
    } finally {
      setIsDeleting(false)
    }
  }

  // Copy link
  function handleCopyLink() {
    navigator.clipboard.writeText(item.url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Copy discount coupon code
  function handleCopyDiscount(code: string) {
    navigator.clipboard.writeText(code)
    setDiscountCopied(true)
    setTimeout(() => setDiscountCopied(false), 2000)
  }

  const textContent = `${item.title || ''} ${item.description || ''}`
  const promoMatch =
    textContent.match(/kod[u]?\s*[:=\s]\s*([A-Z0-9_-]{4,15})/i) ||
    textContent.match(/(CLOUD\d{4}|INDIRIM\d{2}|YAZILIM\d{2})/i)
  const promoCode = promoMatch ? promoMatch[1] : 'SAVEDLENS2026'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[94vh] rounded-2xl md:rounded-3xl bg-[#121218] border border-white/10 shadow-[0_30px_100px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col md:flex-row animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Left Column: Media & Platform Showcase ─────────── */}
        <div className="w-full md:w-5/12 bg-[#0d0d12] flex flex-col justify-between border-b md:border-b-0 md:border-r border-white/10 relative overflow-hidden shrink-0">
          {item.thumbnail_url && !imageError ? (
            <div className="relative w-full aspect-[16/10] md:aspect-auto md:h-full min-h-[240px] md:min-h-[380px] bg-black/60 overflow-hidden">
              <Image
                src={item.thumbnail_url}
                alt={item.title ?? 'İçerik görseli'}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 40vw"
                onError={() => setImageError(true)}
              />

              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#121218] via-transparent to-black/30" />

              {/* Platform & Reel Badges */}
              <div className="absolute top-4 left-4 flex items-center gap-2 flex-wrap">
                <span
                  className="px-3 py-1 rounded-full text-white text-xs font-bold uppercase shadow-lg tracking-wider"
                  style={{ backgroundColor: platformColor }}
                >
                  {item.platform ?? 'Web'}
                </span>

                {isReel && (
                  <span className="px-3 py-1 rounded-full bg-gradient-to-r from-pink-600 to-rose-600 text-white text-xs font-bold shadow-lg flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5" />
                    <span>Reels & Video</span>
                  </span>
                )}
              </div>

              {/* Backup status pill */}
              {isBackedUp && (
                <div className="absolute bottom-4 left-4 px-3 py-1 rounded-lg bg-emerald-950/90 backdrop-blur-md border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 shadow-lg">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Kalıcı Arşivde Yedekli</span>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full h-full min-h-[240px] md:min-h-[380px] p-8 flex flex-col items-center justify-center text-center bg-gradient-to-br from-zinc-900 via-[#161622] to-black">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-xl mb-3"
                style={{ backgroundColor: platformColor }}
              >
                {platform.slice(0, 2).toUpperCase()}
              </div>
              <span className="text-sm font-bold uppercase tracking-wider text-zinc-200">
                {item.platform ?? 'Web'} İçeriği
              </span>
              <span className="text-xs text-zinc-400 mt-1 max-w-[220px] truncate font-mono">
                {item.url}
              </span>
            </div>
          )}
        </div>

        {/* ── Right Column: Categorization, AI & Content ───────── */}
        <div className="w-full md:w-7/12 flex flex-col justify-between max-h-[65vh] md:max-h-[92vh] overflow-y-auto p-4 sm:p-6 md:p-7 space-y-5 bg-[#121218]">
          <div className="space-y-4">
            {/* 1. Header: Author info on left, Star + Close on right */}
            <div className="flex items-center justify-between gap-4 pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5 min-w-0">
                {item.author_avatar ? (
                  <img
                    src={item.author_avatar}
                    alt={item.author_username || 'Yazar'}
                    className="w-8 h-8 rounded-full object-cover border border-white/10 shadow-sm shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[var(--accent-subtle)] text-xs flex items-center justify-center font-bold text-[var(--accent-light)] border border-[var(--accent)]/30 shrink-0">
                    @
                  </div>
                )}
                <div className="min-w-0">
                  <h4 className="text-xs sm:text-sm font-bold text-white leading-tight truncate">
                    {item.author_username ? `@${item.author_username}` : 'Bilinmeyen Yazar'}
                  </h4>
                  <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 mt-0.5">
                    <Calendar className="w-3 h-3" />
                    <span>{formattedDate}</span>
                  </div>
                </div>
              </div>

              {/* Action buttons: Star & Close button */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={handleToggleFavorite}
                  className="p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-amber-400 transition-colors border border-white/10"
                  title={isFavorite ? 'Favorilerden Çıkar' : 'Favorilere Ekle'}
                >
                  <Star
                    className={`w-4 h-4 ${
                      isFavorite ? 'fill-amber-400 text-amber-400' : ''
                    }`}
                  />
                </button>

                <button
                  onClick={onClose}
                  aria-label="Kapat"
                  className="p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors border border-white/10"
                  title="Kapat (ESC)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 2. Interactive Koleksiyon / Kategori Seçici Bar */}
            <div className="p-3 rounded-2xl bg-zinc-900/80 border border-white/10 flex flex-col gap-2 relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
                  <Folder className="w-4 h-4 text-amber-400" />
                  <span>Koleksiyon / Klasör:</span>
                </div>

                {/* Dropdown Toggle Button */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsColDropdownOpen((prev) => !prev)}
                    className="px-3 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border border-white/15"
                    style={{
                      backgroundColor: activeCollection ? `${activeCollection.color}25` : '#27272a',
                      color: activeCollection ? activeCollection.color : '#e4e4e7',
                    }}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: activeCollection?.color || '#71717a' }}
                    />
                    <span>{activeCollection ? activeCollection.name : '+ Koleksiyon Ata'}</span>
                    <span className="text-[10px] opacity-70">▼</span>
                  </button>

                  {/* Dropdown Menu */}
                  {isColDropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-[#181822] border border-white/15 shadow-2xl z-50 p-2 flex flex-col gap-1.5 animate-fade-in">
                      <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider px-2 py-1">
                        Koleksiyon Seç
                      </div>

                      {/* Remove from collection option */}
                      <button
                        type="button"
                        onClick={() => handleAssignCollection(null)}
                        className={`text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between hover:bg-zinc-800 transition-colors ${
                          !currentColId ? 'bg-zinc-800 text-white font-semibold' : 'text-zinc-400'
                        }`}
                      >
                        <span>📂 Klasörsüz (Koleksiyon Yok)</span>
                        {!currentColId && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                      </button>

                      {/* Collection items */}
                      <div className="max-h-40 overflow-y-auto flex flex-col gap-1 pr-1">
                        {collections.map((col) => {
                          const isCurrent = currentColId === col.id
                          return (
                            <button
                              key={col.id}
                              type="button"
                              onClick={() => handleAssignCollection(col.id)}
                              className={`text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between hover:bg-zinc-800 transition-colors ${
                                isCurrent ? 'bg-zinc-800 font-semibold' : 'text-zinc-300'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: col.color }}
                                />
                                <span className="truncate">{col.name}</span>
                              </div>
                              {isCurrent && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                            </button>
                          )
                        })}
                      </div>

                      {/* Inline New Collection Creator */}
                      <div className="pt-2 border-t border-white/10 mt-1">
                        <form onSubmit={handleCreateAndAssignCollection} className="flex gap-1.5">
                          <input
                            type="text"
                            value={newColName}
                            onChange={(e) => setNewColName(e.target.value)}
                            placeholder="Yeni klasör adı..."
                            className="flex-1 bg-black/50 px-2.5 py-1.5 rounded-lg text-xs text-white border border-white/10 outline-none focus:border-indigo-500"
                          />
                          <button
                            type="submit"
                            disabled={!newColName.trim() || isCreatingCol}
                            className="btn-primary px-2.5 py-1.5 rounded-lg text-xs font-semibold shrink-0 disabled:opacity-50"
                          >
                            {isCreatingCol ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                          </button>
                        </form>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {isSavingCol && (
                <span className="text-[10px] text-indigo-400">Koleksiyon kaydediliyor...</span>
              )}
            </div>

            {/* 3. Title */}
            <h2 className="text-base sm:text-lg md:text-xl font-bold text-white leading-snug">
              {item.title ?? item.url}
            </h2>

            {/* 4. AI Summary Card with 1-Click Auto-Categorize Action */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-[var(--accent-subtle)]/30 border border-[var(--accent)]/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-[var(--accent-light)]">
                  <Sparkles className="w-4 h-4" />
                  <span>Yapay Zeka Analizi & Özeti</span>
                </div>

                <button
                  type="button"
                  onClick={handleAiAutoCategorize}
                  disabled={isAutoCategorizing}
                  className="px-2.5 py-1 rounded-lg bg-indigo-600/80 hover:bg-indigo-600 text-white text-[11px] font-semibold flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
                  title="Yapay zeka ile gönderi metnini tara ve etiketle"
                >
                  {isAutoCategorizing ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Analiz Ediliyor...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3 text-amber-300" />
                      <span>AI ile Kategorize Et</span>
                    </>
                  )}
                </button>
              </div>

              {autoCatMessage && (
                <div className="text-xs text-emerald-300 bg-emerald-950/40 p-2 rounded-lg border border-emerald-800/40 animate-fade-in">
                  {autoCatMessage}
                </div>
              )}

              <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                {item.summary || 'Bu gönderi için otomatik özet oluşturulmamış. Yukarıdaki butona tıklayarak yapay zeka ile özetleyebilirsiniz.'}
              </p>
            </div>

            {/* 5. Interactive Tag Editor */}
            <div className="space-y-2 p-3 rounded-2xl bg-zinc-900/60 border border-white/10">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-[var(--accent-light)]" />
                  <span>Etiketler (Kategoriler)</span>
                </h4>
                {isSavingTags && (
                  <span className="text-[10px] text-zinc-400">Kaydediliyor...</span>
                )}
              </div>

              {/* Tag Chips */}
              <div className="flex flex-wrap gap-1.5 items-center">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-2.5 py-1 rounded-lg bg-zinc-800 border border-white/10 text-zinc-200 flex items-center gap-1.5 group"
                  >
                    <span>#{tag}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="text-zinc-500 hover:text-rose-400 transition-colors p-0.5"
                      title="Etiketi kaldır"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}

                {/* Inline New Tag Input */}
                <input
                  type="text"
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  placeholder="+ Etiket ekle (Enter)..."
                  className="bg-black/40 px-2.5 py-1 rounded-lg text-xs text-white border border-white/10 outline-none focus:border-indigo-500 placeholder:text-zinc-500 w-36"
                />
              </div>
            </div>

            {/* 6. Structured Extractors */}
            {hasExtractors && (
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Akıllı İçerik Çıkarımları
                </h4>

                {/* Recipe Extractor */}
                {item.extractors?.recipe && (
                  <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-800/40 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
                      <ChefHat className="w-4 h-4" />
                      <span>Tarif & Mutfak Kartı</span>
                    </div>
                    <p className="text-xs text-amber-200/80 leading-relaxed">
                      Yemek/tatlı tarifi tespit edildi. Malzemeler ve pişirme adımları kütüphanenize indekslendi.
                    </p>
                  </div>
                )}

                {/* Location Extractor */}
                {item.extractors?.location && (
                  <div className="p-3 rounded-xl bg-blue-950/20 border border-blue-800/40 flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 text-xs font-semibold text-blue-300">
                        <MapPin className="w-4 h-4" />
                        <span>Mekan / Gezi Önerisi</span>
                      </div>
                      <p className="text-xs text-blue-200/80">
                        Keşfedilen lokasyon harita listenize kaydedildi.
                      </p>
                    </div>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.title || 'Mekan')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 rounded-lg bg-blue-600/80 hover:bg-blue-600 text-white text-xs font-semibold flex items-center gap-1 shrink-0 transition-colors"
                    >
                      <span>Haritada Aç</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}

                {/* Discount Extractor */}
                {item.extractors?.discount && (
                  <div className="p-3 rounded-xl bg-green-950/20 border border-green-800/40 flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 text-xs font-semibold text-green-300">
                        <Ticket className="w-4 h-4" />
                        <span>İndirim & Fırsat Kodu</span>
                      </div>
                      <p className="text-xs text-green-200/80">
                        Kupon kodu: <code className="font-mono font-bold text-green-300 bg-green-900/50 px-1.5 py-0.5 rounded">{promoCode}</code>
                      </p>
                    </div>
                    <button
                      onClick={() => handleCopyDiscount(promoCode)}
                      className="px-3 py-1 rounded-lg bg-green-600/80 hover:bg-green-600 text-white text-xs font-semibold flex items-center gap-1 shrink-0 transition-colors"
                    >
                      {discountCopied ? <Check className="w-3.5 h-3.5" /> : <Ticket className="w-3.5 h-3.5" />}
                      <span>{discountCopied ? 'Kopyalandı!' : 'Kodu Al'}</span>
                    </button>
                  </div>
                )}

                {/* Code Extractor */}
                {item.extractors?.code && (
                  <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-800/40 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-cyan-300">
                      <Code2 className="w-4 h-4" />
                      <span>Kod Snippet</span>
                    </div>
                    <div className="bg-black/60 p-2.5 rounded-lg border border-cyan-800/30 text-[11px] font-mono text-cyan-200 overflow-x-auto">
                      <code>{item.description?.slice(0, 160) || '// Kod parçacığı'}</code>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 7. Original Caption */}
            {item.description && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Orijinal Açıklama
                </h4>
                <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/10 text-xs text-zinc-300 leading-relaxed max-h-36 overflow-y-auto whitespace-pre-wrap">
                  {item.description}
                </div>
              </div>
            )}
          </div>

          {/* ── Bottom Action Toolbar ───────────────────────── */}
          <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyLink}
                className="px-3 py-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 border border-white/10 text-xs font-medium text-zinc-300 hover:text-white flex items-center gap-1.5 transition-colors"
                title="Bağlantıyı Kopyala"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                <span>{copied ? 'Kopyalandı!' : 'Paylaş'}</span>
              </button>

              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-3 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-950/70 border border-rose-800/40 text-xs font-medium text-rose-300 hover:text-rose-200 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                title="İçeriği Sil"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Siliniyor...' : 'Sil'}</span>
              </button>
            </div>

            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary text-xs font-semibold py-2 px-4 rounded-xl flex items-center gap-1.5 shadow-lg hover:shadow-indigo-500/20"
            >
              <span>{isReel ? "Reels'i Aç" : 'Orijinal Gönderiye Git'}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
