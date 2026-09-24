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
  Loader2,
  AlertCircle,
  Copy,
  Check,
  ShoppingBag,
  HeartPulse,
  BookOpen,
  Trash2,
  TrendingUp,
  Lightbulb,
} from 'lucide-react'
import { useState, memo } from 'react'

interface Extractors {
  recipe?: boolean
  location?: boolean
  discount?: boolean
  transcript?: boolean
  code?: boolean
  [key: string]: boolean | undefined
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
  status?: 'processing' | 'completed' | 'failed'
  error_message?: string | null
  transcript?: string | null
  category?: string | null
  actionable_data?: Record<string, unknown> | null
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

const trDateFormatter = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'short',
})

const ItemCard = memo(function ItemCard({
  item,
  onClick,
  isSelected = false,
  isSelectionMode = false,
  onToggleSelect,
  onDelete,
}: {
  item: ItemCardData
  onClick?: () => void
  isSelected?: boolean
  isSelectionMode?: boolean
  onToggleSelect?: (e: React.MouseEvent) => void
  onDelete?: (e: React.MouseEvent) => void
}) {
  const [starred, setStarred] = useState(item.starred ?? false)
  const [imgError, setImgError] = useState(false)
  const [copiedRecipe, setCopiedRecipe] = useState(false)

  const platform = item.platform?.toLowerCase() ?? 'web'
  const platformColor = PLATFORM_COLORS[platform] ?? '#7c5cfc'
  const hasExtractors = item.extractors && Object.keys(item.extractors).length > 0
  const isBackedUp = Boolean(item.stored_media_urls && item.stored_media_urls.length > 0)
  const isReel =
    (item.url && (item.url.includes('/reel/') || item.url.includes('/reels/'))) ||
    (platform === 'instagram' && item.media_type === 'video') ||
    platform === 'tiktok'

  const isProcessing = item.status === 'processing'
  const isFailed = item.status === 'failed'

  // Boilerplate fallback usernames that should not be shown
  const BOILERPLATE_USERNAMES = ['instagram_creator', 'instagram_user', 'user', 'kullanici']
  const displayAuthor = item.author_username && !BOILERPLATE_USERNAMES.includes(item.author_username.toLowerCase())
    ? item.author_username
    : null

  const aspectClass = isReel ? 'aspect-[9/13]' : 'aspect-[16/10]'

  const formattedDate = item.created_at
    ? trDateFormatter.format(new Date(item.created_at))
    : ''

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

  const actData = (item.actionable_data || {}) as Record<string, unknown>
  const recipeIngredients: string[] = Array.isArray(actData.ingredients) ? (actData.ingredients as string[]) : []
  const travelLocations: Array<{ name: string; city?: string; maps_query?: string }> = Array.isArray(actData.locations) ? (actData.locations as Array<{ name: string; city?: string; maps_query?: string }>) : []
  const productPrice = actData.estimated_price ? String(actData.estimated_price) : null
  const productName = actData.product_name ? String(actData.product_name) : null

  function handleCopyRecipe(e: React.MouseEvent) {
    e.stopPropagation()
    if (recipeIngredients.length === 0) return

    const textToCopy = `🛒 ${item.title || 'Tarif'} Alışveriş Listesi:\n\n` + recipeIngredients.map((ing) => `• ${ing}`).join('\n')
    navigator.clipboard.writeText(textToCopy)
    setCopiedRecipe(true)
    setTimeout(() => setCopiedRecipe(false), 2500)
  }

  // Location query for Google Maps action
  const firstLocation = travelLocations[0]
  const mapsSearchUrl = firstLocation
    ? `https://www.google.com/maps/search/?api=1&query=${safeEncodeURIComponent(firstLocation.maps_query || `${firstLocation.name} ${firstLocation.city || ''}`)}`
    : `https://www.google.com/maps/search/?api=1&query=${safeEncodeURIComponent(item.title || 'Mekan')}`

  return (
    <article
      onClick={(e) => {
        if (isSelectionMode && onToggleSelect) {
          onToggleSelect(e)
        } else {
          onClick?.()
        }
      }}
      className={`bg-[#15151e] border card-lift rounded-2xl overflow-hidden group relative flex flex-col justify-between cursor-pointer transition-all duration-300 ${
        isSelected
          ? 'border-[var(--accent)] ring-2 ring-[var(--accent)]/50 bg-[var(--accent)]/5 shadow-[0_0_25px_var(--accent-glow)]'
          : isProcessing
          ? 'border-purple-500/40 shadow-[0_0_25px_rgba(168,85,247,0.15)]'
          : isFailed
          ? 'border-rose-800/50 bg-rose-950/10'
          : 'border-white/10 hover:border-[var(--accent)]/50 hover:shadow-[0_12px_36px_rgba(0,0,0,0.45)]'
      }`}
    >
      <div>
        {/* ── Processing State Skeleton Card ──────────────────────── */}
        {isProcessing && (
          <div className={`relative w-full ${aspectClass} overflow-hidden bg-gradient-to-br from-purple-950/50 via-indigo-950/30 to-black/80 p-5 flex flex-col justify-between`}>
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full text-white text-[10px] font-bold tracking-wide uppercase bg-purple-600 animate-pulse">
                İşleniyor
              </span>
              <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
            </div>

            <div className="space-y-2 text-center py-4">
              <div className="w-10 h-10 rounded-xl bg-purple-600/30 text-purple-300 border border-purple-500/40 flex items-center justify-center mx-auto animate-bounce">
                <Video className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-white">Analiz Ediliyor...</p>
              <p className="text-[10px] text-zinc-400 leading-tight">
                Video ve ses çözümleniyor, özet çıkarılıyor.
              </p>
            </div>

            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-full w-2/3 animate-pulse" />
            </div>
          </div>
        )}

        {/* ── Failed Scraping State Card ─────────────────────────── */}
        {isFailed && (
          <div className={`relative w-full ${aspectClass} overflow-hidden bg-gradient-to-br from-rose-950/50 via-zinc-900 to-black p-5 flex flex-col justify-between`}>
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full text-white text-[10px] font-bold tracking-wide uppercase bg-rose-700">
                Erişilemedi
              </span>
              <AlertCircle className="w-4 h-4 text-rose-400" />
            </div>

            <div className="space-y-1.5 text-center py-4">
              <div className="w-10 h-10 rounded-xl bg-rose-900/40 text-rose-300 border border-rose-700/40 flex items-center justify-center mx-auto">
                <AlertCircle className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-rose-300">
                {item.error_message || 'Gönderi gizli veya link geçersiz'}
              </p>
              <p className="text-[10px] text-zinc-400">
                Instagram gizlilik ayarları veya silinmiş gönderi nedeniyle içerik çekilemedi.
              </p>
            </div>

            <span className="text-[9px] text-zinc-500 truncate font-mono">
              {item.url}
            </span>
          </div>
        )}

        {/* ── Standard Media Preview (When Completed) ────────────── */}
        {!isProcessing && !isFailed && item.thumbnail_url && !imgError && (
          <div className={`relative w-full ${aspectClass} overflow-hidden bg-black/50`}>
            <Image
              src={item.thumbnail_url}
              alt={item.title ?? 'İçerik görseli'}
              fill
              unoptimized
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
              onError={() => setImgError(true)}
            />

            {/* Selection Checkbox (Top Left) */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onToggleSelect?.(e)
              }}
              className={`absolute top-2.5 left-2.5 z-20 w-7 h-7 rounded-xl border flex items-center justify-center transition-all ${
                isSelected
                  ? 'bg-[var(--accent)] border-[var(--accent)] text-white opacity-100 shadow-lg scale-105 ring-2 ring-white/30'
                  : isSelectionMode
                  ? 'bg-black/80 border-white/60 text-transparent opacity-100 hover:border-white hover:bg-black'
                  : 'bg-black/65 border-white/40 text-transparent hover:border-white/90 hover:bg-black/85 opacity-0 md:opacity-0 group-hover:opacity-100 max-md:opacity-70'
              }`}
              title={isSelected ? 'Seçimi Kaldır' : 'Seç'}
            >
              <Check className="w-4 h-4 stroke-[3] text-white" />
            </button>

            {/* Platform & Reel Badges */}
            <div className={`absolute top-2.5 flex items-center gap-1.5 flex-wrap transition-all ${
              isSelected || isSelectionMode ? 'left-11' : 'left-2.5 group-hover:left-11'
            }`}>
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

            {/* Top Right: Quick Delete Button & Category / Media type indicator */}
            <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5">
              {/* Quick Delete Trash Button */}
              {onDelete && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(e)
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-black/75 hover:bg-rose-600 text-zinc-300 hover:text-white border border-white/20 hover:border-rose-500/50 backdrop-blur-md transition-all shadow-md"
                  title="Kütüphaneden Sil"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}

              {item.category === 'recipe' && (
                <span className="px-2 py-0.5 rounded-full bg-amber-950/80 backdrop-blur-md text-amber-300 text-[10px] font-bold flex items-center gap-1 border border-amber-500/30">
                  <ChefHat className="w-3 h-3" />
                  <span>Tarif</span>
                </span>
              )}
              {item.category === 'health' && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 backdrop-blur-md text-emerald-300 text-[10px] font-bold flex items-center gap-1 border border-emerald-500/30">
                  <HeartPulse className="w-3 h-3" />
                  <span>Sağlık</span>
                </span>
              )}
              {item.category === 'productivity' && (
                <span className="px-2 py-0.5 rounded-full bg-indigo-950/80 backdrop-blur-md text-indigo-300 text-[10px] font-bold flex items-center gap-1 border border-indigo-500/30">
                  <Code2 className="w-3 h-3" />
                  <span>Kod & AI</span>
                </span>
              )}
              {item.category === 'finance' && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 backdrop-blur-md text-emerald-300 text-[10px] font-bold flex items-center gap-1 border border-emerald-500/30">
                  <TrendingUp className="w-3 h-3" />
                  <span>Finans</span>
                </span>
              )}
              {item.category === 'motivation_mindset' && (
                <span className="px-2 py-0.5 rounded-full bg-orange-950/80 backdrop-blur-md text-orange-300 text-[10px] font-bold flex items-center gap-1 border border-orange-500/30">
                  <Lightbulb className="w-3 h-3" />
                  <span>Gelişim</span>
                </span>
              )}
              {item.category === 'travel' && (
                <span className="px-2 py-0.5 rounded-full bg-blue-950/80 backdrop-blur-md text-blue-300 text-[10px] font-bold flex items-center gap-1 border border-blue-500/30">
                  <MapPin className="w-3 h-3" />
                  <span>Gezi</span>
                </span>
              )}
              {item.category === 'product' && (
                <span className="px-2 py-0.5 rounded-full bg-pink-950/80 backdrop-blur-md text-pink-300 text-[10px] font-bold flex items-center gap-1 border border-pink-500/30">
                  <ShoppingBag className="w-3 h-3" />
                  <span>Fırsat</span>
                </span>
              )}
              {item.category === 'book_movie' && (
                <span className="px-2 py-0.5 rounded-full bg-purple-950/80 backdrop-blur-md text-purple-300 text-[10px] font-bold flex items-center gap-1 border border-purple-500/30">
                  <BookOpen className="w-3 h-3" />
                  <span>Kültür</span>
                </span>
              )}
              {!isReel && item.media_type && !item.category && (
                <div className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-zinc-200 text-[10px] font-medium flex items-center gap-1 border border-white/10">
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
            </div>

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
        )}

        {!isProcessing && !isFailed && (!item.thumbnail_url || imgError) && (
          <div className={`relative w-full ${aspectClass} overflow-hidden bg-gradient-to-br from-indigo-950/40 via-purple-950/20 to-black/60 p-4 flex flex-col justify-between`}>
            {/* Selection Checkbox */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onToggleSelect?.(e)
              }}
              className={`absolute top-2.5 left-2.5 z-20 w-7 h-7 rounded-xl border flex items-center justify-center transition-all ${
                isSelected
                  ? 'bg-[var(--accent)] border-[var(--accent)] text-white opacity-100 shadow-lg scale-105 ring-2 ring-white/30'
                  : isSelectionMode
                  ? 'bg-black/80 border-white/60 text-transparent opacity-100 hover:border-white hover:bg-black'
                  : 'bg-black/65 border-white/40 text-transparent hover:border-white/90 hover:bg-black/85 opacity-0 md:opacity-0 group-hover:opacity-100 max-md:opacity-70'
              }`}
              title={isSelected ? 'Seçimi Kaldır' : 'Seç'}
            >
              <Check className="w-4 h-4 stroke-[3] text-white" />
            </button>

            <div className={`flex items-center justify-between transition-all ${
              isSelected || isSelectionMode ? 'pl-9' : 'pl-0 group-hover:pl-9'
            }`}>
              <div className="flex items-center gap-1.5">
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

              {onDelete && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(e)
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-black/75 hover:bg-rose-600 text-zinc-300 hover:text-white border border-white/20 hover:border-rose-500/50 backdrop-blur-md transition-all shadow-md z-20"
                  title="Kütüphaneden Sil"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
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

        {/* ── Content Card Body ───────────────────────────────────── */}
        <div className="p-3.5 sm:p-4 flex flex-col gap-2.5">
          {/* Author info & Assigned Collection badge */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              {displayAuthor ? (
                <>
                  <div className="w-4 h-4 rounded-full bg-[var(--bg-elevated)] text-[9px] flex items-center justify-center font-bold text-[var(--accent-light)] shrink-0">
                    @
                  </div>
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
          {Boolean(item.summary) && (
            <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed line-clamp-2 bg-[var(--bg-surface)] p-2 rounded-xl border border-[var(--border)]">
              {item.summary}
            </p>
          )}

          {/* ── Action Buttons for Recipe / Travel / Product (AŞAMA 3) ── */}
          {Boolean(item.category === 'recipe' || recipeIngredients.length > 0) && (
            <button
              onClick={handleCopyRecipe}
              className="w-full py-1.5 px-2.5 rounded-xl bg-amber-950/40 hover:bg-amber-900/60 border border-amber-600/40 text-amber-300 text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm"
              title="Tarif malzemelerini panoya kopyala"
            >
              {copiedRecipe ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">Malzemeler Kopyalandı! ✓</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Malzemeleri Kopyala (Alışveriş Listesi)</span>
                </>
              )}
            </button>
          )}

          {Boolean(item.category === 'travel' || travelLocations.length > 0) && (
            <a
              href={mapsSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="w-full py-1.5 px-2.5 rounded-xl bg-blue-950/40 hover:bg-blue-900/60 border border-blue-600/40 text-blue-300 text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm"
              title="Google Maps'te doğrudan konumu ara"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Google Maps&apos;te Ara ↗</span>
            </a>
          )}

          {Boolean(item.category === 'product' && productPrice) && (
            <div className="flex items-center justify-between px-2.5 py-1 rounded-lg bg-emerald-950/30 border border-emerald-500/20 text-[10px] text-emerald-300">
              <span className="flex items-center gap-1 font-medium">
                <ShoppingBag className="w-3 h-3" />
                <span>{productName || 'Ürün Fiyatı'}</span>
              </span>
              <span className="font-bold">{productPrice}</span>
            </div>
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
              {(item.extractors?.transcript === true || item.transcript) && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-purple-950/40 text-purple-300 border border-purple-800/40 text-[9px] font-medium">
                  <Mic2 className="w-2.5 h-2.5" />
                  Ses (Whisper)
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
})

export default ItemCard
