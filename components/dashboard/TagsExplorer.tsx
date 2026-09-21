'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Tag as TagIcon, Hash, Search, X, Check, ArrowRight } from 'lucide-react'
import type { Tag, Bookmark } from '@/lib/mock-data'
import ItemCard from './ItemCard'

interface TagsExplorerProps {
  initialTags: Tag[]
  initialBookmarks: Bookmark[]
}

export default function TagsExplorer({ initialTags, initialBookmarks }: TagsExplorerProps) {
  const tags = initialTags
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)

  const filteredTags = useMemo(() => {
    if (!searchQuery.trim()) return tags
    const q = searchQuery.toLowerCase()
    return tags.filter((t) => t.name.toLowerCase().includes(q))
  }, [tags, searchQuery])

  const displayedBookmarks = useMemo(() => {
    if (!selectedTag) return initialBookmarks
    return initialBookmarks.filter((b) =>
      b.ai_tags?.some((t) => t.toLowerCase() === selectedTag.toLowerCase())
    )
  }, [initialBookmarks, selectedTag])

  return (
    <div className="flex flex-col gap-8 animate-fade-up">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <TagIcon className="w-6 h-6 text-[var(--accent-light)]" />
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            Etiketler & Konu Haritası
          </h1>
        </div>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Yapay zeka modelleri tarafından gönderi açıklamalarından çıkarılan ve otomatik atanan etiketler.
        </p>
      </div>

      {/* Tags Cloud / Card */}
      <div className="glass rounded-2xl p-6 glow-border flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wider">
            Etiket Bulutu ({filteredTags.length})
          </h2>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Etiket ara..."
              className="w-full pl-8 pr-8 py-1.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {filteredTags.map((tag) => {
            const isSelected = selectedTag?.toLowerCase() === tag.name.toLowerCase()
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => setSelectedTag(isSelected ? null : tag.name)}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                  isSelected
                    ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-[0_0_12px_var(--accent-glow)]'
                    : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] border-[var(--border)]'
                }`}
              >
                <Hash className="w-3.5 h-3.5 opacity-70" />
                <span>{tag.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'
                  }`}
                >
                  {tag.count}
                </span>
                {isSelected && <Check className="w-3 h-3 text-white" />}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tagged Bookmarks Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              {selectedTag ? `#${selectedTag} Etiketli İçerikler` : 'Tüm Etiketli İçerikler'}
            </h2>
            <span className="text-xs text-[var(--text-muted)]">
              ({displayedBookmarks.length} gönderi)
            </span>
          </div>

          {selectedTag && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedTag(null)}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--error)] flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                Seçimi Kaldır
              </button>
              <Link
                href={`/dashboard?tag=${encodeURIComponent(selectedTag)}`}
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
              Bu etiketle eşleşen içerik bulunamadı.
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
    </div>
  )
}
