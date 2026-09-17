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
      className="glass card-lift glow-border rounded-2xl overflow-hidden group flex flex-col justify-between cursor-pointer transition-all duration-300 hover:border-[var(--accent)]/50 hover:shadow-[0_8px_30px_rgba(124,92,252,0.12)]"
    >
      <div>
        {/* Media preview */}
        {item.thumbnail_url && !imgError ? (
          <div className="relative w-full aspect-[16/10] overflow-hidden bg-black/40">
            <Image
              src={item.thumbnail_url}
              alt={item.title ?? 'İçerik görseli'}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              onError={() => setImgError(true)}
            />

            {/* Platform badge */}
            <div
              className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full text-white text-[10px] font-semibold tracking-wide shadow-md uppercase"
              style={{ backgroundColor: platformColor }}
            >
              {item.platform ?? 'Web'}
            </div>

            {/* Media type indicator */}
            {item.media_type && (
              <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-zinc-200 text-[10px] font-medium flex items-center gap-1">
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
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="px-3 py-1.5 rounded-xl bg-black/80 backdrop-blur-md text-white text-xs font-medium flex items-center gap-1.5 border border-white/10 shadow-lg">
                <Maximize2 className="w-3.5 h-3.5 text-[var(--accent-light)]" />
                <span>İncele & AI Analizi</span>
              </span>
            </div>

            {/* Cloud Backup Pill */}
            {isBackedUp && (
              <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-emerald-950/80 backdrop-blur-md border border-emerald-500/30 text-emerald-300 text-[9px] font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Kalıcı Arşiv</span>
              </div>
            )}
          </div>
        ) : (
          <div className="relative w-full aspect-[16/10] overflow-hidden bg-gradient-to-br from-indigo-950/40 via-purple-950/20 to-black/60 p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span
                className="px-2.5 py-0.5 rounded-full text-white text-[10px] font-semibold tracking-wide uppercase shadow-md"
                style={{ backgroundColor: platformColor }}
              >
                {item.platform ?? 'Web'}
              </span>
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-mono">
                {item.media_type ?? 'link'}
              </span>
            </div>
            <div className="text-center py-2">
              <span className="text-xs font-semibold text-zinc-300 group-hover:text-white transition-colors">
                Detayları Görüntüle ↗
              </span>
            </div>
            <span className="text-[9px] text-zinc-500 truncate font-mono">
              {item.url}
            </span>
          </div>
        )}

        <div className="p-4 flex flex-col gap-3">
          {/* Author info */}
          {item.author_username && (
            <div className="flex items-center gap-2">
              {item.author_avatar ? (
                <img
                  src={item.author_avatar}
                  alt={item.author_username}
                  className="w-5 h-5 rounded-full object-cover border border-[var(--border)]"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-[var(--bg-elevated)] text-[10px] flex items-center justify-center font-bold text-[var(--accent-light)]">
                  @
                </div>
              )}
              <span className="text-xs font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                @{item.author_username}
              </span>
            </div>
          )}

          {/* Title & star */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] leading-snug line-clamp-2 group-hover:text-[var(--accent-light)] transition-colors">
              {item.title ?? item.url}
            </h3>
            <button
              onClick={handleToggleStar}
              aria-label={starred ? 'Favorilerden çıkar' : 'Favorilere ekle'}
              className="shrink-0 text-[var(--text-muted)] hover:text-amber-400 transition-colors p-1"
            >
              <Star
                className={`w-4 h-4 ${
                  starred ? 'fill-amber-400 text-amber-400' : ''
                }`}
              />
            </button>
          </div>

          {/* AI Summary */}
          {item.summary && (
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-3 bg-[var(--bg-surface)] p-2.5 rounded-xl border border-[var(--border)]">
              {item.summary}
            </p>
          )}

          {/* Extractor badges */}
          {hasExtractors && (
            <div className="flex flex-wrap gap-1.5">
              {item.extractors?.recipe === true && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-950/40 text-amber-300 border border-amber-800/40 text-[10px] font-medium">
                  <ChefHat className="w-2.5 h-2.5" />
                  Tarif
                </span>
              )}
              {item.extractors?.location === true && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-950/40 text-blue-300 border border-blue-800/40 text-[10px] font-medium">
                  <MapPin className="w-2.5 h-2.5" />
                  Konum
                </span>
              )}
              {item.extractors?.discount === true && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-950/40 text-green-300 border border-green-800/40 text-[10px] font-medium">
                  <Ticket className="w-2.5 h-2.5" />
                  İndirim
                </span>
              )}
              {item.extractors?.code === true && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-950/40 text-cyan-300 border border-cyan-800/40 text-[10px] font-medium">
                  <Code2 className="w-2.5 h-2.5" />
                  Kod
                </span>
              )}
              {item.extractors?.transcript === true && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-950/40 text-purple-300 border border-purple-800/40 text-[10px] font-medium">
                  <Mic2 className="w-2.5 h-2.5" />
                  Ses Metni
                </span>
              )}
            </div>
          )}

          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <Tag className="w-3 h-3 text-[var(--text-muted)] mt-0.5 shrink-0" />
              {item.tags.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-muted)]"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 flex items-center justify-between border-t border-[var(--border)] bg-black/10">
        <span className="text-[10px] text-[var(--text-muted)]">{formattedDate}</span>
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1 text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--accent-light)] transition-colors p-1"
        >
          <span>Kaynağa Git</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </article>
  )
}
