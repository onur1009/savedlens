'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FolderOpen, Plus, Sparkles, BookOpen, Layers, X, Check, ArrowRight } from 'lucide-react'
import type { Collection, Bookmark } from '@/lib/mock-data'
import ItemCard from './ItemCard'

const PRESET_COLORS = [
  '#6366f1', // Indigo
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#ec4899', // Pink
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#ef4444', // Red
]

interface CollectionsExplorerProps {
  initialCollections: Collection[]
  initialBookmarks: Bookmark[]
}

export default function CollectionsExplorer({
  initialCollections,
  initialBookmarks,
}: CollectionsExplorerProps) {
  const [collections, setCollections] = useState<Collection[]>(initialCollections)
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newColName, setNewColName] = useState('')
  const [newColColor, setNewColColor] = useState(PRESET_COLORS[0])
  const [isCreating, setIsCreating] = useState(false)

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
        }),
      })
      const data = await res.json()
      if (res.ok && data.collection) {
        const newCol: Collection = {
          id: data.collection.id,
          name: data.collection.name,
          color: data.collection.color || newColColor,
          icon: data.collection.icon || 'folder',
          count: 0,
          created_at: data.collection.created_at || new Date().toISOString(),
        }
        setCollections((prev) => [newCol, ...prev])
        setNewColName('')
        setIsModalOpen(false)
      }
    } catch (err) {
      console.error('Failed to create collection:', err)
    } finally {
      setIsCreating(false)
    }
  }

  // Filter bookmarks by selected collection
  const displayedBookmarks = selectedCollectionId
    ? initialBookmarks.filter((b) => b.collections?.includes(selectedCollectionId))
    : initialBookmarks

  const activeCollection = collections.find((c) => c.id === selectedCollectionId)

  return (
    <div className="flex flex-col gap-8 animate-fade-up">
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
            Sosyal medya kayıtlarınızı tematik klasörlerde organize edin ve arşivleyin.
          </p>
        </div>

        <button
          id="btn-new-collection"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--accent)] text-white text-sm font-semibold hover:bg-[var(--accent-light)] transition-all shadow-[0_0_16px_var(--accent-glow)] shrink-0 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Yeni Koleksiyon
        </button>
      </div>

      {/* Collections Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {collections.map((col) => {
          const isSelected = selectedCollectionId === col.id
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
                <span className="text-xs px-2.5 py-1 rounded-full bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-muted)] font-medium">
                  {col.count} içerik
                </span>
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
                onClick={() => setSelectedCollectionId(null)}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--error)] flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                Filtreyi Kaldır
              </button>
              <Link
                href={`/dashboard?collection=${selectedCollectionId}`}
                className="text-xs text-[var(--accent-light)] hover:underline flex items-center gap-1"
              >
                Kütüphanede Aç <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          )}
        </div>

        {displayedBookmarks.length === 0 ? (
          <div className="p-12 text-center glass rounded-2xl">
            <p className="text-sm text-[var(--text-muted)]">
              Bu koleksiyonda henüz kayıtlı içerik bulunmuyor.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayedBookmarks.map((b) => (
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
        )}
      </div>

      {/* New Collection Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-up"
          role="dialog"
        >
          <div className="w-full max-w-sm glass p-6 rounded-2xl glow-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                Yeni Koleksiyon Oluştur
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCollection} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-medium">
                  Koleksiyon Adı
                </label>
                <input
                  type="text"
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  placeholder="Örn: Kitap Önerileri, Gezi..."
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

              <div className="flex items-center justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={!newColName.trim() || isCreating}
                  className="btn-primary px-4 py-2 text-xs font-semibold rounded-xl disabled:opacity-50"
                >
                  {isCreating ? 'Oluşturuluyor...' : 'Oluştur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
