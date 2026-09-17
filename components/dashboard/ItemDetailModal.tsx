'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
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
} from 'lucide-react'
import type { SavedItem } from '@/lib/mock-data'

interface ItemDetailModalProps {
  item: SavedItem | null
  onClose: () => void
  onItemUpdated?: (updatedItem: SavedItem) => void
  onItemDeleted?: (deletedId: string) => void
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
}: {
  item: SavedItem
  onClose: () => void
  onItemUpdated?: (updatedItem: SavedItem) => void
  onItemDeleted?: (deletedId: string) => void
}) {
  const [copied, setCopied] = useState(false)
  const [discountCopied, setDiscountCopied] = useState(false)
  const [isFavorite, setIsFavorite] = useState(item.starred ?? false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    setIsFavorite(item.starred ?? false)
    setImageError(false)
  }, [item])

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

  const formattedDate = new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(item.created_at))

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

  // Try extracting promo code or recipe steps from text
  const textContent = `${item.title || ''} ${item.description || ''}`
  const promoMatch = textContent.match(/kod[u]?\s*[:=\s]\s*([A-Z0-9_-]{4,15})/i) || textContent.match(/(CLOUD\d{4}|INDIRIM\d{2}|YAZILIM\d{2})/i)
  const promoCode = promoMatch ? promoMatch[1] : 'SAVEDLENS2026'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="glass relative w-full max-w-4xl max-h-[90vh] rounded-3xl border border-[var(--border)] overflow-hidden shadow-2xl flex flex-col md:flex-row animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button Top Right */}
        <button
          onClick={onClose}
          aria-label="Kapat"
          className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-black/60 hover:bg-black/90 text-zinc-300 hover:text-white flex items-center justify-center border border-white/10 transition-colors backdrop-blur-md"
        >
          <X className="w-5 h-5" />
        </button>

        {/* ── Left Column: Media & Platforms ────────────────── */}
        <div className="w-full md:w-5/12 bg-black/40 flex flex-col justify-between border-b md:border-b-0 md:border-r border-[var(--border)] relative overflow-hidden">
          {item.thumbnail_url && !imageError ? (
            <div className="relative w-full aspect-[4/3] md:aspect-auto md:h-full min-h-[280px] bg-black/60 overflow-hidden">
              <Image
                src={item.thumbnail_url}
                alt={item.title ?? 'İçerik görseli'}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 40vw"
                onError={() => setImageError(true)}
              />

              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

              {/* Platform & Media Type Badges */}
              <div className="absolute top-4 left-4 flex items-center gap-2">
                <span
                  className="px-3 py-1 rounded-full text-white text-xs font-bold uppercase shadow-lg tracking-wider"
                  style={{ backgroundColor: platformColor }}
                >
                  {item.platform ?? 'Web'}
                </span>

                {item.media_type && (
                  <span className="px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-zinc-200 text-xs font-medium flex items-center gap-1.5 border border-white/10">
                    {item.media_type === 'carousel' && <Layers className="w-3.5 h-3.5 text-indigo-400" />}
                    {item.media_type === 'video' && <Video className="w-3.5 h-3.5 text-rose-400" />}
                    {item.media_type === 'article' && <FileText className="w-3.5 h-3.5 text-sky-400" />}
                    <span>
                      {item.media_type === 'carousel'
                        ? 'Döngü'
                        : item.media_type === 'video'
                        ? 'Video'
                        : item.media_type === 'article'
                        ? 'Makale'
                        : 'Görsel'}
                    </span>
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
            <div className="w-full h-full min-h-[280px] p-8 flex flex-col items-center justify-center text-center bg-gradient-to-br from-indigo-950/40 via-purple-950/20 to-black">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-xl mb-3"
                style={{ backgroundColor: platformColor }}
              >
                {platform.slice(0, 2).toUpperCase()}
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                {item.platform ?? 'Web'} İçeriği
              </span>
              <span className="text-[11px] text-zinc-500 mt-1 max-w-[200px] truncate">
                {item.url}
              </span>
            </div>
          )}
        </div>

        {/* ── Right Column: AI Insights & Content ───────────── */}
        <div className="w-full md:w-7/12 flex flex-col justify-between max-h-[70vh] md:max-h-[85vh] overflow-y-auto p-6 md:p-8 space-y-6">
          <div className="space-y-5">
            {/* Author info & date */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                {item.author_avatar ? (
                  <img
                    src={item.author_avatar}
                    alt={item.author_username || 'Yazar'}
                    className="w-8 h-8 rounded-full object-cover border border-[var(--border)]"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[var(--accent-subtle)] text-xs flex items-center justify-center font-bold text-[var(--accent-light)]">
                    @
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                    {item.author_username ? `@${item.author_username}` : 'Bilinmeyen Yazar'}
                  </h4>
                  <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
                    <Calendar className="w-3 h-3" />
                    <span>{formattedDate}</span>
                  </div>
                </div>
              </div>

              {/* Star toggle */}
              <button
                onClick={handleToggleFavorite}
                className="p-2 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] border border-[var(--border)] text-zinc-400 hover:text-amber-400 transition-colors"
                title={isFavorite ? 'Favorilerden Çıkar' : 'Favorilere Ekle'}
              >
                <Star
                  className={`w-4 h-4 ${
                    isFavorite ? 'fill-amber-400 text-amber-400' : ''
                  }`}
                />
              </button>
            </div>

            {/* Title */}
            <h2 className="text-lg md:text-xl font-bold text-[var(--text-primary)] leading-snug">
              {item.title ?? item.url}
            </h2>

            {/* AI Summary Card */}
            {item.summary && (
              <div className="p-4 rounded-2xl bg-[var(--accent-subtle)]/30 border border-[var(--accent)]/30 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-[var(--accent-light)]">
                  <Sparkles className="w-4 h-4" />
                  <span>Yapay Zeka Özeti</span>
                </div>
                <p className="text-xs md:text-sm text-[var(--text-secondary)] leading-relaxed">
                  {item.summary}
                </p>
              </div>
            )}

            {/* Structured Extractors */}
            {hasExtractors && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Akıllı İçerik Çıkarımları
                </h4>

                {/* Recipe Extractor */}
                {item.extractors?.recipe && (
                  <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-800/40 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
                      <ChefHat className="w-4 h-4" />
                      <span>Tarif & Mutfak Kartı</span>
                    </div>
                    <p className="text-xs text-amber-200/80 leading-relaxed">
                      Bu içerik yemek/tatlı tarifi olarak tespit edildi. Malzemeler ve hazırlık adımları kütüphanenize indekslendi.
                    </p>
                  </div>
                )}

                {/* Location Extractor */}
                {item.extractors?.location && (
                  <div className="p-3.5 rounded-xl bg-blue-950/20 border border-blue-800/40 flex items-center justify-between gap-3">
                    <div className="space-y-1">
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
                      className="px-3 py-1.5 rounded-lg bg-blue-600/80 hover:bg-blue-600 text-white text-xs font-semibold flex items-center gap-1 shrink-0 transition-colors"
                    >
                      <span>Haritada Aç</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}

                {/* Discount Extractor */}
                {item.extractors?.discount && (
                  <div className="p-3.5 rounded-xl bg-green-950/20 border border-green-800/40 flex items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs font-semibold text-green-300">
                        <Ticket className="w-4 h-4" />
                        <span>İndirim & Fırsat Kodu</span>
                      </div>
                      <p className="text-xs text-green-200/80">
                        Tespit edilen kupon kodu: <code className="font-mono font-bold text-green-300 bg-green-900/50 px-1.5 py-0.5 rounded">{promoCode}</code>
                      </p>
                    </div>
                    <button
                      onClick={() => handleCopyDiscount(promoCode)}
                      className="px-3 py-1.5 rounded-lg bg-green-600/80 hover:bg-green-600 text-white text-xs font-semibold flex items-center gap-1 shrink-0 transition-colors"
                    >
                      {discountCopied ? <Check className="w-3.5 h-3.5" /> : <Ticket className="w-3.5 h-3.5" />}
                      <span>{discountCopied ? 'Kopyalandı!' : 'Kodu Al'}</span>
                    </button>
                  </div>
                )}

                {/* Code Extractor */}
                {item.extractors?.code && (
                  <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-800/40 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-cyan-300">
                      <Code2 className="w-4 h-4" />
                      <span>Kod & Geliştirici Snippet</span>
                    </div>
                    <div className="bg-black/60 p-3 rounded-lg border border-cyan-800/30 text-[11px] font-mono text-cyan-200 overflow-x-auto">
                      <code>{item.description?.slice(0, 160) || '// Kod parçacığı'}</code>
                    </div>
                  </div>
                )}

                {/* Transcript Extractor */}
                {item.extractors?.transcript && (
                  <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-800/40 space-y-1">
                    <div className="flex items-center gap-2 text-xs font-semibold text-purple-300">
                      <Mic2 className="w-4 h-4" />
                      <span>Ses Transkripti</span>
                    </div>
                    <p className="text-xs text-purple-200/80">
                      Video sesi metne dönüştürülerek arama indeksine eklendi.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Original Caption / Full Text */}
            {item.description && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Orijinal Açıklama
                </h4>
                <div className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] text-xs text-[var(--text-secondary)] leading-relaxed max-h-40 overflow-y-auto whitespace-pre-wrap">
                  {item.description}
                </div>
              </div>
            )}

            {/* Tags */}
            {item.tags && item.tags.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Etiketler
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2.5 py-1 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-secondary)] flex items-center gap-1 transition-colors"
                    >
                      <Tag className="w-3 h-3 text-[var(--accent-light)]" />
                      <span>#{tag}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Bottom Action Toolbar ───────────────────────── */}
          <div className="pt-4 border-t border-[var(--border)] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyLink}
                className="px-3 py-2 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] border border-[var(--border)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1.5 transition-colors"
                title="Bağlantıyı Kopyala"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                <span>{copied ? 'Kopyalandı!' : 'Paylaş'}</span>
              </button>

              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-3 py-2 rounded-xl bg-rose-950/30 hover:bg-rose-950/60 border border-rose-800/40 text-xs font-medium text-rose-300 hover:text-rose-200 flex items-center gap-1.5 transition-colors disabled:opacity-50"
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
              className="btn-primary text-xs font-semibold py-2 px-4 rounded-xl flex items-center gap-2 shadow-lg hover:shadow-indigo-500/20"
            >
              <span>Orijinal Gönderiye Git</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
