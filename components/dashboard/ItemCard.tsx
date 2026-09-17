'use client'

import Image from 'next/image'
import {
  ExternalLink,
  Star,
  Tag,
  ChefHat,
  MapPin,
  Ticket,
  Mic2,
  Code2,
  Layers,
  Video,
  FileText,
  Maximize2,
  Folder,
} from 'lucide-react'
import { useState } from 'react'

interface Extractors {
  recipe?: boolean
  location?: boolean
  discount?: boolean
  transcript?: boolean
  code?: boolean
  [key: string]: boolean | undefined
}

export interface ItemCardData {
  id: string
  url: string
  title: string | null
  description: string | null
  thumbnail_url: string | null
  platform: string | null
  tags: string[] | null
  summary: string | null
  extractors: Extractors | null
  created_at: string
  author_username?: string
  author_avatar?: string
  media_type?: string
  stored_media_urls?: string[]
  starred?: boolean
  collection_id?: string | null
  collection_name?: string | null
  collection_color?: string | null
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

export default function ItemCard({
  item,
  onClick,
}: {
  item: ItemCardData
  onClick?: () => void
}) {
  const [starred, setStarred] = useState(item.starred ?? false)
  const [imgError, setImgError] = useState(false)

  const platform = item.platform?.toLowerCase() ?? 'web'
  const platformColor = PLATFORM_COLORS[platform] ?? '#7c5cfc'
  const hasExtractors = item.extractors && Object.keys(item.extractors).length > 0
  const isBackedUp = Boolean(item.stored_media_urls && item.stored_media_urls.length > 0)
  const isReel =
    (item.url && (item.url.includes('/reel/') || item.url.includes('/reels/'))) ||
    (platform === 'instagram' && item.media_type === 'video') ||
    platform === 'tiktok'

  // Boilerplate fallback usernames that should not be shown
  const BOILERPLATE_USERNAMES = ['instagram_creator', 'instagram_user', 'user', 'kullanici']
  const displayAuthor = item.author_username && !BOILERPLATE_USERNAMES.includes(item.author_username.toLowerCase())
    ? item.author_username
    : null

  // Use portrait ratio for reels/tiktok vertical content, landscape for others
  const aspectClass = isReel ? 'aspect-[9/13]' : 'aspect-[16/10]'

  const formattedDate = new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(item.created_at))

  async function handleToggleStar(e: React.MouseEvent) {
    e.stopPropagation()
    const nextState = !starred
    setStarred(nextState)
    try {
      await fetch(`/api/v1/bookmarks/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_favorite: nextState }),
      })
    } catch {
      // ignore
    }
  }

  return (
    <article
      onClick={onClick}
      className="bg-[#15151e] border border-white/10 card-lift rounded-2xl overflow-hidden group flex flex-col justify-between cursor-pointer transition-all duration-300 hover:border-[var(--accent)]/50 hover:shadow-[0_12px_36px_rgba(0,0,0,0.45)]"
    >
      <div>
        {/* Media preview */}
        {item.thumbnail_url && !imgError ? (
          <div className={`relative w-full ${aspectClass} overflow-hidden bg-black/50`}>
            <Image
              src={item.thumbnail_url}
              alt={item.title ?? 'İçerik görseli'}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
              onError={() => setImgError(true)}
            />

            {/* Platform & Reel Badges */}
            <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap">
              <span
                className="px-2.5 py-0.5 rounded-full text-white text-[10px] font-bold tracking-wide shadow-md uppercase"
                style={{ backgroundColor: platformColor }}
              >
                {item.platform ?? 'Web'}
              </span>

              {isReel && (
                <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-pink-600 to-rose-600 text-white text-[10px] font-bold shadow-md flex items-center gap-1">
                  <Video className="w-3 h-3" />
                  <span>Reel</span>
                </span>
              )}
            </div>

            {/* Media type indicator */}
            {!isReel && item.media_type && (
              <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-zinc-200 text-[10px] font-medium flex items-center gap-1 border border-white/10">
                {item.media_type === 'carousel' && <Layers className="w-3 h-3 text-indigo-400" />}
                {item.media_type === 'video' && <Video className="w-3 h-3 text-rose-400" />}
                {item.media_type === 'article' && <FileText className="w-3 h-3 text-sky-400" />}
                <span>
                  {item.media_type === 'carousel'
                    ? 'Döngü'
                    : item.media_type === 'video'
                    ? 'Video'
                    : item.media_type === 'article'
                    ? 'Makale'
                    : 'Görsel'}
                </span>
              </div>
            )}

            {/* Hover Inspect Icon */}
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
              <span className="px-3 py-1.5 rounded-xl bg-black/85 backdrop-blur-md text-white text-xs font-semibold flex items-center gap-1.5 border border-white/10 shadow-lg">
                <Maximize2 className="w-3.5 h-3.5 text-[var(--accent-light)]" />
                <span>Kategorize Et & İncele</span>
              </span>
            </div>

            {/* Cloud Backup Pill */}
            {isBackedUp && (
              <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-emerald-950/80 backdrop-blur-md border border-emerald-500/30 text-emerald-300 text-[9px] font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Yedekli</span>
              </div>
            )}
          </div>
        ) : (
          <div className={`relative w-full ${aspectClass} overflow-hidden bg-gradient-to-br from-indigo-950/40 via-purple-950/20 to-black/60 p-4 flex flex-col justify-between`}>
            <div className="flex items-center justify-between">
              <span
                className="px-2.5 py-0.5 rounded-full text-white text-[10px] font-bold tracking-wide uppercase shadow-md"
                style={{ backgroundColor: platformColor }}
              >
                {item.platform ?? 'Web'}
              </span>
              {isReel && (
                <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold">
                  Reel
                </span>
              )}
            </div>
            <div className="text-center py-2">
              <span className="text-xs font-semibold text-zinc-300 group-hover:text-white transition-colors">
                Kategorize Et & İncele ↗
              </span>
            </div>
            <span className="text-[9px] text-zinc-500 truncate font-mono">
              {item.url}
            </span>
          </div>
        )}

        <div className="p-3.5 sm:p-4 flex flex-col gap-2.5">
          {/* Author info & Assigned Collection badge */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              {displayAuthor ? (
                <>
                  {item.author_avatar ? (
                    <img
                      src={item.author_avatar}
                      alt={displayAuthor}
                      className="w-4 h-4 rounded-full object-cover border border-white/10 shrink-0"
                    />
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-[var(--bg-elevated)] text-[9px] flex items-center justify-center font-bold text-[var(--accent-light)] shrink-0">
                      @
                    </div>
                  )}
                  <span className="text-[11px] font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors truncate">
                    @{displayAuthor}
                  </span>
                </>
              ) : (
                <span className="text-[11px] text-[var(--text-muted)] italic truncate">{platform}</span>
              )}
            </div>

            {/* Collection pill if categorized */}
            {item.collection_name ? (
              <span
                className="px-2 py-0.5 rounded-md text-[10px] font-semibold flex items-center gap-1 border border-white/10 shrink-0 truncate max-w-[130px]"
                style={{
                  backgroundColor: `${item.collection_color || '#6366f1'}25`,
                  color: item.collection_color || '#818cf8',
                }}
              >
                <Folder className="w-2.5 h-2.5 shrink-0" />
                <span className="truncate">{item.collection_name}</span>
              </span>
            ) : (
              <span className="text-[10px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors shrink-0">
                <Folder className="w-2.5 h-2.5" />
                <span>+ Klasör</span>
              </span>
            )}
          </div>

          {/* Title & star */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] leading-snug line-clamp-2 group-hover:text-[var(--accent-light)] transition-colors">
              {item.title ?? item.url}
            </h3>
            <button
              onClick={handleToggleStar}
              aria-label={starred ? 'Favorilerden çıkar' : 'Favorilere ekle'}
              className="shrink-0 text-[var(--text-muted)] hover:text-amber-400 transition-colors p-0.5"
            >
              <Star
                className={`w-3.5 h-3.5 ${
                  starred ? 'fill-amber-400 text-amber-400' : ''
                }`}
              />
            </button>
          </div>

          {/* AI Summary snippet */}
          {item.summary && (
            <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed line-clamp-2 bg-[var(--bg-surface)] p-2 rounded-xl border border-[var(--border)]">
              {item.summary}
            </p>
          )}

          {/* Extractor badges */}
          {hasExtractors && (
            <div className="flex flex-wrap gap-1">
              {item.extractors?.recipe === true && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-950/40 text-amber-300 border border-amber-800/40 text-[9px] font-medium">
                  <ChefHat className="w-2.5 h-2.5" />
                  Tarif
                </span>
              )}
              {item.extractors?.location === true && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-950/40 text-blue-300 border border-blue-800/40 text-[9px] font-medium">
                  <MapPin className="w-2.5 h-2.5" />
                  Mekan
                </span>
              )}
              {item.extractors?.discount === true && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-green-950/40 text-green-300 border border-green-800/40 text-[9px] font-medium">
                  <Ticket className="w-2.5 h-2.5" />
                  İndirim
                </span>
              )}
              {item.extractors?.code === true && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-cyan-950/40 text-cyan-300 border border-cyan-800/40 text-[9px] font-medium">
                  <Code2 className="w-2.5 h-2.5" />
                  Kod
                </span>
              )}
              {item.extractors?.transcript === true && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-purple-950/40 text-purple-300 border border-purple-800/40 text-[9px] font-medium">
                  <Mic2 className="w-2.5 h-2.5" />
                  Ses
                </span>
              )}
            </div>
          )}

          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 items-center">
              <Tag className="w-2.5 h-2.5 text-[var(--text-muted)] shrink-0" />
              {item.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-muted)]"
                >
                  #{tag}
                </span>
              ))}
              {item.tags.length > 3 && (
                <span className="text-[9px] text-zinc-500">+{item.tags.length - 3}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-3.5 py-2.5 flex items-center justify-between border-t border-[var(--border)] bg-black/10">
        <span className="text-[10px] text-[var(--text-muted)]">{formattedDate}</span>
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1 text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--accent-light)] transition-colors p-0.5"
        >
          <span>Orijinal</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </article>
  )
}
