'use client'

import { useEffect, useState, useRef, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'

function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )
}
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
  Video,
  Calendar,
  ShieldCheck,
  Folder,
  Plus,
  Loader2,
  Play,
  Image as ImageIcon,
  Copy,
  ShoppingBag,
  HeartPulse,
  BookOpen,
  Upload,
  Key,
  Edit3,
  Save,
  Search,
  Volume2,
} from 'lucide-react'
import type { SavedItem } from '@/lib/mock-data'
import { formatBookmarkTitle, extractRealAuthor, extractInstagramShortcode } from '@/lib/bookmark-formatter'

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

function safeEncodeURIComponent(str: string | null | undefined): string {
  if (!str) return ''
  try {
    const sanitized = str.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '')
    return encodeURIComponent(sanitized)
  } catch {
    return encodeURIComponent(str.replace(/[^\x00-\x7F]/g, ''))
  }
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

const SMART_CATEGORIES = [
  { id: 'recipe', label: 'Tarifler', icon: ChefHat, color: '#f59e0b', desc: 'Yemek & Tatlı' },
  { id: 'health', label: 'Sağlık & Doktor', icon: HeartPulse, color: '#10b981', desc: 'Tıp, Hekim, Tedavi' },
  { id: 'productivity', label: 'Yazılım & AI', icon: Code2, color: '#6366f1', desc: 'Kod & Verimlilik' },
  { id: 'travel', label: 'Gezi & Mekan', icon: MapPin, color: '#3b82f6', desc: 'Kafe & Rota' },
  { id: 'product', label: 'Ürün & İndirim', icon: ShoppingBag, color: '#ec4899', desc: 'Fırsat & Kampanya' },
  { id: 'book_movie', label: 'Kitap & Dizi', icon: BookOpen, color: '#8b5cf6', desc: 'Film & İnceleme' },
  { id: 'other', label: 'Diğer', icon: Tag, color: '#a1a1aa', desc: 'Genel İçerik' },
]

export default function ItemDetailModal(props: ItemDetailModalProps) {
  if (!props.item) return null
  return <ItemDetailModalContent key={props.item.id} {...props} item={props.item} />
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
  const isClient = useIsClient()
  const [copied, setCopied] = useState(false)
  const [discountCopied, setDiscountCopied] = useState(false)
  const [recipeCopied, setRecipeCopied] = useState(false)
  const [transcriptCopied, setTranscriptCopied] = useState(false)
  const [transcript, setTranscript] = useState<string | null>(item.transcript || null)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcribeMessage, setTranscribeMessage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isEditingScript, setIsEditingScript] = useState(false)
  const [editedScript, setEditedScript] = useState(item.transcript || '')
  const [showKeyInput, setShowKeyInput] = useState(false)
  const [customKey, setCustomKey] = useState('')
  const [isFavorite, setIsFavorite] = useState(item.starred ?? false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [showPlayer, setShowPlayer] = useState(false)

  // Categorization & Tags State
  const [currentCategory, setCurrentCategory] = useState<string>(item.category || 'other')
  const [isSavingCategory, setIsSavingCategory] = useState(false)
  const [collections, setCollections] = useState<CollectionOption[]>(userCollections)
  const [currentColId, setCurrentColId] = useState<string | null>(item.collection_id || null)
  const [newColName, setNewColName] = useState('')
  const [isCreatingCol, setIsCreatingCol] = useState(false)
  const [isCreatingColForm, setIsCreatingColForm] = useState(false)
  const [isSavingCol, setIsSavingCol] = useState(false)

  const [tags, setTags] = useState<string[]>(item.tags || [])
  const [newTagInput, setNewTagInput] = useState('')
  const [isSavingTags, setIsSavingTags] = useState(false)
  const [isAutoCategorizing, setIsAutoCategorizing] = useState(false)
  const [autoCatMessage, setAutoCatMessage] = useState<string | null>(null)

  // Scroll locking (prevents background body scroll and layout misalignment)
  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [])

  // Smart Category Assignment
  async function handleSelectCategory(catId: string) {
    setCurrentCategory(catId)
    setIsSavingCategory(true)

    const updatedExtractors = {
      ...(item.extractors || {}),
      recipe: catId === 'recipe',
      location: catId === 'travel',
      discount: catId === 'product' ? (item.extractors?.discount ?? true) : false,
      code: catId === 'productivity',
      health: catId === 'health',
    }

    const updated = {
      ...item,
      category: catId,
      extractors: updatedExtractors,
    }

    if (onItemUpdated) {
      onItemUpdated(updated)
    }

    try {
      await fetch(`/api/v1/bookmarks/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: catId,
          extractors: updatedExtractors,
        }),
      })
    } catch (err) {
      console.error('Failed to update category:', err)
    } finally {
      setIsSavingCategory(false)
    }
  }

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
  const isBackedUp = Boolean(item.stored_media_urls && item.stored_media_urls.length > 0)
  const isInstagram = platform === 'instagram'
  const isReel =
    (item.url && (item.url.includes('/reel/') || item.url.includes('/reels/'))) ||
    (isInstagram && item.media_type === 'video') ||
    platform === 'tiktok'

  const realAuthor = extractRealAuthor(item.description, item.author_username)
  const cleanTitle = formatBookmarkTitle(item.description, item.url, realAuthor.name)
  const shortcode = extractInstagramShortcode(item.url)

  const formattedDate = new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(item.created_at))

  const isVideoContent = Boolean(
    isReel ||
    item.media_type === 'video' ||
    platform === 'youtube' ||
    platform === 'tiktok' ||
    item.transcript
  )
  const [activeTab, setActiveTab] = useState<'script' | 'summary' | 'categories'>(
    isVideoContent ? 'script' : 'summary'
  )
  const [scriptSearchQuery, setScriptSearchQuery] = useState('')
  const scriptWords = transcript ? transcript.trim().split(/\s+/).filter(Boolean).length : 0
  const scriptReadTimeMinutes = Math.max(1, Math.ceil(scriptWords / 130))


  // 1. Assign collection
  async function handleAssignCollection(collectionId: string | null) {
    setIsSavingCol(true)
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
    const colors = ['#e1306c', '#6366f1', '#10b981', '#f59e0b', '#06b6d4', '#ec4899', '#8b5cf6']
    const randomColor = colors[Math.floor(Math.random() * colors.length)]

    try {
      const res = await fetch('/api/v1/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newColName.trim(),
          color: randomColor,
        }),
      })
      const data = await res.json()

      if (res.ok && data.collection) {
        const created = {
          id: data.collection.id,
          name: data.collection.name,
          color: data.collection.color || randomColor,
        }
        setCollections((prev) => [created, ...prev])
        setNewColName('')
        setIsCreatingColForm(false)
        await handleAssignCollection(created.id)
      }
    } catch (err) {
      console.error('Failed to create collection:', err)
    } finally {
      setIsCreatingCol(false)
    }
  }

  // 3. Add custom tag helper
  async function commitNewTag(rawText: string) {
    const cleanTag = rawText.trim().replace(/^#/, '').toLowerCase()
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

  async function handleAddTag(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      await commitNewTag(newTagInput)
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
          title: item.title,
          caption: `${item.title || ''} ${item.description || ''}`,
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        const mergedTags = Array.from(new Set([...tags, ...(data.tags || [])]))
        setTags(mergedTags)
        if (data.category) {
          setCurrentCategory(data.category)
        }

        const updatedItem = {
          ...item,
          category: data.category || item.category,
          summary: data.summary || item.summary,
          tags: mergedTags,
          extractors: data.extractors || item.extractors,
          actionable_data: data.actionable_data || item.actionable_data,
        }

        if (onItemUpdated) {
          onItemUpdated(updatedItem)
        }

        setAutoCatMessage('✨ Yapay zeka ile otomatik kategorize edildi ve güncellendi!')
        setTimeout(() => setAutoCatMessage(null), 5000)
      }
    } catch (err) {
      console.error('Auto categorize failed:', err)
    } finally {
      setIsAutoCategorizing(false)
    }
  }

  // 6. On-demand Video Audio Transcription & Script Generation
  async function handleTranscribeVideo(audioBase64?: string, mimeType?: string) {
    setIsTranscribing(true)
    setTranscribeMessage(null)

    try {
      const storedKey = typeof window !== 'undefined' ? localStorage.getItem('savedlens_gemini_key') || customKey : customKey
      const res = await fetch('/api/v1/ai/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookmark_id: item.id,
          apiKey: storedKey ? storedKey.trim() : undefined,
          audio_base64: audioBase64 || undefined,
          mime_type: mimeType || undefined,
        }),
      })
      const data = await res.json()
      if (res.ok && data.success && data.transcript) {
        setTranscript(data.transcript)
        setEditedScript(data.transcript)
        setTranscribeMessage(data.message || 'Video deşifresi başarıyla çıkarıldı!')
        if (onItemUpdated) {
          onItemUpdated({
            ...item,
            transcript: data.transcript,
            extractors: {
              ...(item.extractors || {}),
              transcript: true,
            },
          })
        }
      } else {
        setTranscribeMessage(data.error || 'Deşifre yapılamadı')
      }
    } catch {
      setTranscribeMessage('Bağlantı hatası oluştu')
    } finally {
      setIsTranscribing(false)
    }
  }

  function handleAudioFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 25 * 1024 * 1024) {
      setTranscribeMessage('⚠️ Seçilen medya 25MB\'tan küçük olmalıdır.')
      return
    }

    setTranscribeMessage(`"${file.name}" yükleniyor ve ses dinleniyor...`)
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const base64 = result.split(',')[1]
      handleTranscribeVideo(base64, file.type || 'audio/mp3')
    }
    reader.readAsDataURL(file)
  }

  async function handleSaveEditedScript() {
    if (!editedScript.trim()) return
    setTranscript(editedScript.trim())
    setIsEditingScript(false)

    try {
      await fetch(`/api/v1/bookmarks/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: editedScript.trim() }),
      })
      if (onItemUpdated) {
        onItemUpdated({ ...item, transcript: editedScript.trim() })
      }
      setTranscribeMessage('✨ Script başarıyla güncellendi ve kaydedildi!')
      setTimeout(() => setTranscribeMessage(null), 4000)
    } catch {
      setTranscribeMessage('Script kaydedilirken hata oluştu')
    }
  }

  function handleSaveCustomKey(key: string) {
    const trimmed = key.trim()
    setCustomKey(trimmed)
    if (typeof window !== 'undefined') {
      if (trimmed) {
        localStorage.setItem('savedlens_gemini_key', trimmed)
      } else {
        localStorage.removeItem('savedlens_gemini_key')
      }
    }
    setShowKeyInput(false)
    setTranscribeMessage(trimmed ? '🔑 Gemini API anahtarınız kaydedildi!' : 'API anahtarı temizlendi.')
    setTimeout(() => setTranscribeMessage(null), 3000)
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

  if (!isClient) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md overflow-hidden animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl h-[92vh] max-h-[92vh] md:h-[88vh] rounded-2xl md:rounded-3xl bg-[#121218] border border-white/10 shadow-[0_30px_100px_rgba(0,0,0,0.95)] flex flex-col md:flex-row overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Universal Floating Close Button - Always visible on top right */}
        <button
          onClick={onClose}
          aria-label="Kapat"
          className="absolute top-3 right-3 sm:top-4 sm:right-4 z-40 p-2 sm:p-2.5 rounded-xl bg-black/80 hover:bg-zinc-800 text-white border border-white/20 backdrop-blur-md transition-all shadow-xl hover:scale-105 active:scale-95"
          title="Kapat (ESC)"
        >
          <X className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
        </button>

        {/* ── Left Column: Media & Platform Showcase ─────────── */}
        <div className="w-full md:w-5/12 h-[20vh] sm:h-[26vh] min-h-[140px] sm:min-h-[180px] max-h-[28vh] md:h-full md:max-h-none bg-[#0d0d12] flex flex-col justify-between border-b md:border-b-0 md:border-r border-white/10 relative overflow-hidden shrink-0">
          {showPlayer && shortcode ? (
            <div className="relative w-full h-full min-h-[140px] sm:min-h-[180px] md:min-h-full bg-black flex flex-col items-center justify-center">
              <iframe
                src={`https://www.instagram.com/reel/${shortcode}/embed/`}
                className="w-full h-full border-0"
                allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                allowFullScreen
                title="Instagram Reel"
              />
              <button
                type="button"
                onClick={() => setShowPlayer(false)}
                className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/80 hover:bg-black text-white text-[11px] font-semibold border border-white/20 backdrop-blur-md flex items-center gap-1 z-20 shadow-lg"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Görsele Dön</span>
              </button>
            </div>
          ) : item.thumbnail_url && !imageError ? (
            <div className="relative w-full h-full min-h-[140px] sm:min-h-[180px] bg-black/60 overflow-hidden group">
              <Image
                src={item.thumbnail_url}
                alt={cleanTitle}
                fill
                unoptimized
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 40vw"
                onError={() => setImageError(true)}
              />

              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#121218] via-transparent to-black/30" />

              {/* Platform & Reel Badges */}
              <div className="absolute top-4 left-4 flex items-center gap-2 flex-wrap z-10">
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

                {isTranscribing && (
                  <span className="px-3 py-1 rounded-full bg-purple-600/90 text-white text-xs font-bold shadow-lg flex items-center gap-1.5 animate-pulse border border-purple-400/40">
                    <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                    <span>AI Dinliyor...</span>
                  </span>
                )}
              </div>

              {/* Central Play Button for Reels */}
              {isReel && shortcode && (
                <button
                  type="button"
                  onClick={() => setShowPlayer(true)}
                  className="absolute inset-0 m-auto w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-black/70 hover:bg-pink-600/90 backdrop-blur-md border border-white/30 text-white flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-[0_0_30px_rgba(225,48,108,0.5)] z-20 group"
                  title="Reels Oynat"
                >
                  <Play className="w-6 h-6 sm:w-7 sm:h-7 fill-white text-white ml-1 transition-transform group-hover:scale-110" />
                </button>
              )}

              {/* Backup status pill */}
              {isBackedUp && (
                <div className="absolute bottom-4 left-4 px-3 py-1 rounded-lg bg-emerald-950/90 backdrop-blur-md border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 shadow-lg z-10">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Kalıcı Arşivde Yedekli</span>
                </div>
              )}

              {/* Bottom Right Reels Oynat toggle button */}
              {shortcode && (
                <button
                  type="button"
                  onClick={() => setShowPlayer(true)}
                  className="absolute bottom-4 right-4 px-3 py-1.5 rounded-xl bg-pink-600/90 hover:bg-pink-600 text-white text-xs font-semibold backdrop-blur-md border border-white/20 flex items-center gap-1.5 transition-all shadow-lg z-10 hover:shadow-pink-500/30"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Reels İzle</span>
                </button>
              )}
            </div>
          ) : (
            <div className="w-full h-full min-h-[140px] sm:min-h-[180px] p-4 sm:p-6 flex flex-col items-center justify-center text-center bg-gradient-to-br from-zinc-900 via-[#161622] to-black">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-xl mb-3"
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

              {shortcode && (
                <button
                  type="button"
                  onClick={() => setShowPlayer(true)}
                  className="mt-3 px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg transition-all"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Reels Oynat</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Right Column: Categorization, AI & Content ───────── */}
        <div className="w-full md:w-7/12 flex-1 h-full flex flex-col justify-between overflow-y-auto p-3.5 sm:p-5 md:p-7 space-y-4 sm:space-y-5 bg-[#121218] scrollbar-thin">
          <div className="space-y-4">
            {/* 1. Header: Author info on left, Star on right (Close button is floating top right) */}
            <div className="flex items-center justify-between gap-4 pb-3 border-b border-white/10 pr-10">
              <div className="flex items-center gap-2.5 min-w-0">
                {item.author_avatar ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={item.author_avatar}
                    alt={realAuthor.username}
                    className="w-8 h-8 rounded-full object-cover border border-white/10 shadow-sm shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-500/20 to-purple-500/20 text-xs flex items-center justify-center font-bold text-pink-400 border border-pink-500/30 shrink-0">
                    @
                  </div>
                )}
                <div className="min-w-0">
                  <h4 className="text-xs sm:text-sm font-bold text-white leading-tight truncate">
                    @{realAuthor.username}
                  </h4>
                  <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-0.5">
                    {realAuthor.name && realAuthor.name !== realAuthor.username && (
                      <span className="text-zinc-300 font-medium truncate max-w-[140px]">{realAuthor.name} •</span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-zinc-500" />
                      <span>{formattedDate}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Action buttons: Star */}
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
              </div>
            </div>

            {/* 2. Title */}
            <h2 className="text-base sm:text-lg md:text-xl font-bold text-white leading-snug">
              {cleanTitle}
            </h2>

            {/* 3. Segmented 3-Tab Navigation Bar */}
            <div className="flex items-center gap-1 p-1 bg-zinc-900/90 rounded-2xl border border-white/10 shadow-inner">
              <button
                type="button"
                onClick={() => setActiveTab('script')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'script'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                }`}
              >
                <Mic2 className="w-3.5 h-3.5" />
                <span>Döküm (Script)</span>
                {transcript ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                ) : isTranscribing ? (
                  <Loader2 className="w-3 h-3 animate-spin text-purple-300" />
                ) : null}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('summary')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'summary'
                    ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Özeti & Çıkarımlar</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('categories')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'categories'
                    ? 'bg-zinc-700 text-white shadow-md'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                }`}
              >
                <Tag className="w-3.5 h-3.5" />
                <span>Kategori & Klasör</span>
              </button>
            </div>

            {/* ── TAB 1: SCRIPT & DÖKÜM ────────────────────────────── */}
            {activeTab === 'script' && (
              <div className="space-y-3.5 animate-fade-in">
                {/* Hidden File Input for Direct Audio/Video Upload */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAudioFileSelected}
                  accept="audio/*,video/*"
                  className="hidden"
                />

                {/* Sub-header Bar: Stats & Main Action Buttons */}
                <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-white/10 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-bold text-purple-300">
                        <Volume2 className="w-4 h-4 text-purple-400 shrink-0" />
                        <span>Video Ses Dökümü (Script)</span>
                      </div>
                      {transcript && (
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          📝 Yaklaşık {scriptWords} kelime • ⏱ {scriptReadTimeMinutes} dk okuma
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleTranscribeVideo()}
                        disabled={isTranscribing}
                        className="px-2.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-purple-600/25 disabled:opacity-50 cursor-pointer"
                        title="Videonun sesini dinle ve script olarak dök"
                      >
                        {isTranscribing ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Dinleniyor...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                            <span>{transcript ? 'Yeniden Dinle' : 'Videoyu Dinle & Script Çıkar'}</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isTranscribing}
                        className="px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors border border-white/10 cursor-pointer disabled:opacity-50"
                        title="Bilgisayarınızdan video veya ses dosyası seçin"
                      >
                        <Upload className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="hidden sm:inline">Dosyadan Dinlet</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowKeyInput(!showKeyInput)}
                        className={`p-2 rounded-xl border text-xs transition-colors cursor-pointer ${
                          customKey
                            ? 'bg-emerald-950/40 text-emerald-300 border-emerald-700/50'
                            : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200 border-white/10'
                        }`}
                        title={customKey ? 'Gemini API Anahtarı Aktif' : 'Gemini API Anahtarı Tanımla'}
                      >
                        <Key className="w-3.5 h-3.5" />
                      </button>

                      {transcript && !isEditingScript && (
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(transcript)
                            setTranscriptCopied(true)
                            setTimeout(() => setTranscriptCopied(false), 2500)
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-white/10 cursor-pointer"
                        >
                          {transcriptCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{transcriptCopied ? 'Kopyalandı!' : 'Kopyala'}</span>
                        </button>
                      )}

                      {transcript && (
                        <button
                          type="button"
                          onClick={() => {
                            if (isEditingScript) {
                              handleSaveEditedScript()
                            } else {
                              setIsEditingScript(true)
                              setEditedScript(transcript)
                            }
                          }}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border cursor-pointer ${
                            isEditingScript
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-sm'
                              : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-white/10'
                          }`}
                        >
                          {isEditingScript ? (
                            <>
                              <Save className="w-3.5 h-3.5 text-white" />
                              <span>Kaydet</span>
                            </>
                          ) : (
                            <>
                              <Edit3 className="w-3.5 h-3.5 text-zinc-400" />
                              <span>Düzenle</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Search within script input */}
                  {transcript && !isEditingScript && (
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                      <input
                        type="text"
                        value={scriptSearchQuery}
                        onChange={(e) => setScriptSearchQuery(e.target.value)}
                        placeholder="Transkript içinde kelime veya konu ara..."
                        className="w-full pl-9 pr-8 py-1.5 rounded-xl bg-black/50 border border-white/10 text-xs text-white placeholder:text-zinc-500 outline-none focus:border-purple-500 transition-colors"
                      />
                      {scriptSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setScriptSearchQuery('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Inline API Key settings */}
                {showKeyInput && (
                  <div className="p-3.5 rounded-2xl bg-black/80 border border-purple-500/40 space-y-2.5 animate-fade-in">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-purple-400" />
                        <span>Google Gemini API Anahtarı</span>
                      </span>
                      <a
                        href="https://aistudio.google.com/app/apikey"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-purple-300 hover:text-white underline"
                      >
                        Ücretsiz Anahtar Al ↗
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="password"
                        defaultValue={customKey}
                        placeholder="AIzaSy... (Gemini API Key)"
                        id="input-gemini-key"
                        className="flex-1 bg-zinc-900 border border-white/15 px-3 py-1.5 rounded-xl text-xs text-white outline-none focus:border-purple-400 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const el = document.getElementById('input-gemini-key') as HTMLInputElement
                          handleSaveCustomKey(el ? el.value : '')
                        }}
                        className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold cursor-pointer shrink-0"
                      >
                        Kaydet
                      </button>
                    </div>
                    <p className="text-[10px] text-zinc-400 leading-normal">
                      Anahtarınız yalnızca yerel tarayıcınızda (localStorage) saklanır ve doğrudan Gemini ses analiz motorunu çalıştırmak için kullanılır.
                    </p>
                  </div>
                )}

                {/* Message Toast */}
                {transcribeMessage && (
                  <div className="text-xs text-purple-200 bg-purple-900/30 p-2.5 rounded-xl border border-purple-700/40 animate-fade-in flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-purple-300 shrink-0" />
                    <span>{transcribeMessage}</span>
                  </div>
                )}

                {/* Audio Wave Loading Animation State */}
                {isTranscribing && (
                  <div className="p-8 rounded-2xl bg-gradient-to-br from-purple-950/40 via-indigo-950/20 to-black border border-purple-600/40 flex flex-col items-center justify-center text-center space-y-4 shadow-[0_0_30px_rgba(168,85,247,0.2)]">
                    <div className="flex items-center gap-1.5 h-8">
                      <span className="w-1.5 h-4 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.4s]" />
                      <span className="w-1.5 h-8 bg-pink-500 rounded-full animate-bounce [animation-delay:-0.2s]" />
                      <span className="w-1.5 h-6 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-1.5 h-10 bg-purple-400 rounded-full animate-bounce [animation-delay:-0.1s]" />
                      <span className="w-1.5 h-5 bg-pink-400 rounded-full animate-bounce" />
                    </div>
                    <div>
                      <h5 className="text-sm font-bold text-white">Gemini Video Sesini Çözümlüyor...</h5>
                      <p className="text-xs text-purple-300/80 mt-1">Konuşmalar yüksek doğrulukla deşifre edilip script olarak dökülüyor.</p>
                    </div>
                  </div>
                )}

                {/* Transcript Body or Empty State */}
                {!isTranscribing && transcript ? (
                  isEditingScript ? (
                    <div className="space-y-2">
                      <textarea
                        value={editedScript}
                        onChange={(e) => setEditedScript(e.target.value)}
                        rows={10}
                        className="w-full p-4 rounded-2xl bg-black/70 border border-purple-500/50 text-xs text-white leading-relaxed font-sans outline-none focus:ring-1 focus:ring-purple-400 resize-y"
                        placeholder="Video konuşma metnini düzenleyin..."
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setIsEditingScript(false)}
                          className="px-3 py-1.5 rounded-xl text-xs text-zinc-400 hover:text-white"
                        >
                          Vazgeç
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveEditedScript}
                          className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md cursor-pointer"
                        >
                          Değişiklikleri Kaydet
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-black/50 border border-purple-900/30 text-xs text-purple-100/90 leading-relaxed max-h-[380px] overflow-y-auto whitespace-pre-wrap font-sans selection:bg-purple-500/30 space-y-2 scrollbar-thin">
                      {transcript.split('\n').map((paragraph, idx) => {
                        const isQueryMatch = scriptSearchQuery.trim() && paragraph.toLowerCase().includes(scriptSearchQuery.toLowerCase())
                        return (
                          <p
                            key={idx}
                            className={`p-2 rounded-xl transition-colors ${
                              isQueryMatch ? 'bg-purple-900/40 border border-purple-500/40 text-white' : 'hover:bg-white/[0.02]'
                            }`}
                          >
                            {paragraph}
                          </p>
                        )
                      })}
                    </div>
                  )
                ) : !isTranscribing && (
                  <div className="p-8 rounded-2xl bg-gradient-to-br from-purple-950/20 via-zinc-900/40 to-black border border-purple-900/30 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-purple-900/30 border border-purple-700/40 text-purple-400 flex items-center justify-center mx-auto">
                      <Mic2 className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h5 className="text-sm font-bold text-white">Bu video için henüz ses deşifresi çıkarılmadı</h5>
                      <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                        Sessiz ortamlarda videoyu izlemek yerine metnini okuyun, notlarınıza kaydedin veya aratın.
                      </p>
                    </div>
                    <div className="pt-2 flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleTranscribeVideo()}
                        className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 flex items-center gap-2 transition-all cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        <span>Videoyu Dinle & Script Çıkar</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── TAB 2: AI ÖZETİ & ÇIKARIMLAR ──────────────────────── */}
            {activeTab === 'summary' && (
              <div className="space-y-3.5 animate-fade-in">
                {/* 1. AI Summary Card with 1-Click Auto-Categorize Action */}
                <div className="p-4 rounded-2xl bg-[var(--accent-subtle)]/30 border border-[var(--accent)]/30 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[var(--accent-light)]">
                      <Sparkles className="w-4 h-4" />
                      <span>Yapay Zeka Analizi & Özeti</span>
                    </div>

                    <button
                      type="button"
                      onClick={handleAiAutoCategorize}
                      disabled={isAutoCategorizing}
                      className="px-2.5 py-1 rounded-lg bg-indigo-600/80 hover:bg-indigo-600 text-white text-[11px] font-semibold flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
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

                {/* 2. Structured Extractors */}
                {(() => {
                  const actData = (item.actionable_data || {}) as Record<string, unknown>
                  const recipeIngredients: string[] = Array.isArray(actData.ingredients) ? (actData.ingredients as string[]) : []
                  const recipeSteps: string[] = Array.isArray(actData.steps) ? (actData.steps as string[]) : []
                  const travelLocations: Array<{ name: string; city?: string; maps_query?: string }> = Array.isArray(actData.locations) ? (actData.locations as Array<{ name: string; city?: string; maps_query?: string }>) : []
                  const productName = actData.product_name ? String(actData.product_name) : null
                  const productBrand = actData.brand ? String(actData.brand) : null
                  const productPrice = actData.estimated_price ? String(actData.estimated_price) : null
                  const prepTime = actData.prep_time ? String(actData.prep_time) : null

                  return (
                    <div className="space-y-3">
                      {/* Recipe Extractor */}
                      {(item.category === 'recipe' || item.extractors?.recipe || recipeIngredients.length > 0) && (
                        <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-800/40 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                              <ChefHat className="w-4 h-4 text-amber-400" />
                              <span>Tarif & Malzeme Listesi</span>
                            </div>
                            {Boolean(prepTime) && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-900/50 text-amber-200 border border-amber-700/50 font-semibold">
                                ⏱ {prepTime}
                              </span>
                            )}
                          </div>

                          {recipeIngredients.length > 0 ? (
                            <div className="space-y-2">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                                {recipeIngredients.map((ing, i) => (
                                  <div
                                    key={i}
                                    className="p-2 rounded-xl bg-black/30 border border-amber-900/30 text-xs text-amber-100 flex items-start gap-2"
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                                    <span>{ing}</span>
                                  </div>
                                ))}
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  const text = `🛒 ${cleanTitle} Malzemeleri:\n` + recipeIngredients.map((i) => `• ${i}`).join('\n')
                                  navigator.clipboard.writeText(text)
                                  setRecipeCopied(true)
                                  setTimeout(() => setRecipeCopied(false), 2500)
                                }}
                                className="w-full py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                              >
                                {recipeCopied ? (
                                  <>
                                    <Check className="w-4 h-4 text-emerald-300" />
                                    <span>Malzemeler Panoya Kopyalandı! ✓</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-4 h-4" />
                                    <span>Malzemeleri Kopyala (Alışveriş Listesi)</span>
                                  </>
                                )}
                              </button>
                            </div>
                          ) : (
                            <p className="text-xs text-amber-200/80 leading-relaxed">
                              Yemek/tatlı tarifi tespit edildi. Yapay zeka ile tam malzeme listesini çıkarmak için yukarıdaki &quot;AI ile Kategorize Et&quot; butonuna tıklayabilirsiniz.
                            </p>
                          )}

                          {recipeSteps.length > 0 && (
                            <div className="pt-2 border-t border-amber-900/30 space-y-1.5">
                              <span className="text-[11px] font-bold text-amber-300 uppercase">Hazırlanış Adımları:</span>
                              <ol className="list-decimal list-inside text-xs text-amber-100/90 space-y-1">
                                {recipeSteps.map((step, idx) => (
                                  <li key={idx} className="leading-relaxed">{step}</li>
                                ))}
                              </ol>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Travel Extractor */}
                      {(item.category === 'travel' || item.extractors?.location || travelLocations.length > 0) && (
                        <div className="p-3.5 rounded-2xl bg-blue-950/30 border border-blue-800/40 space-y-2.5">
                          <div className="flex items-center gap-2 text-xs font-bold text-blue-300">
                            <MapPin className="w-4 h-4 text-blue-400" />
                            <span>Mekan & Seyahat Konumları</span>
                          </div>

                          {travelLocations.length > 0 ? (
                            <div className="space-y-1.5">
                              {travelLocations.map((loc, idx) => {
                                const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${safeEncodeURIComponent(loc.maps_query || `${loc.name} ${loc.city || ''}`)}`
                                return (
                                  <div
                                    key={idx}
                                    className="flex items-center justify-between p-2.5 rounded-xl bg-black/30 border border-blue-900/30 text-xs text-blue-100"
                                  >
                                    <div>
                                      <p className="font-bold text-white">{loc.name}</p>
                                      {loc.city && <p className="text-[11px] text-blue-300">{loc.city}</p>}
                                    </div>
                                    <a
                                      href={mapsUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-colors"
                                    >
                                      <span>Google Maps&apos;te Ara</span>
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                  </div>
                                )
                              })}
                            </div>
                          ) : (
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-xs text-blue-200/80">
                                Keşfedilen lokasyonu Google Maps üzerinde arayın.
                              </p>
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${safeEncodeURIComponent(cleanTitle)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-md transition-colors"
                              >
                                <span>Google Maps&apos;te Ara</span>
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Product Extractor */}
                      {(item.category === 'product' || Boolean(productName)) && (
                        <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-800/40 flex items-center justify-between gap-3">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                              <ShoppingBag className="w-4 h-4 text-emerald-400" />
                              <span>{productName || 'Öne Çıkan Ürün'}</span>
                            </div>
                            {Boolean(productBrand) && (
                              <p className="text-[11px] text-emerald-200/70">Marka: {productBrand}</p>
                            )}
                          </div>
                          {Boolean(productPrice) && (
                            <span className="px-3 py-1 rounded-xl bg-emerald-900/60 text-emerald-300 border border-emerald-600/40 text-xs font-bold">
                              {productPrice}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Promo / Discount */}
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
                            type="button"
                            onClick={() => handleCopyDiscount(promoCode)}
                            className="px-3 py-1 rounded-lg bg-green-600/80 hover:bg-green-600 text-white text-xs font-semibold flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                          >
                            {discountCopied ? <Check className="w-3.5 h-3.5" /> : <Ticket className="w-3.5 h-3.5" />}
                            <span>{discountCopied ? 'Kopyalandı!' : 'Kodu Al'}</span>
                          </button>
                        </div>
                      )}

                      {/* Code Snippet */}
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
                  )
                })()}

                {/* Original Caption */}
                {item.description && (
                  <div className="space-y-1.5 pt-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                      Orijinal Açıklama
                    </h4>
                    <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/10 text-xs text-zinc-300 leading-relaxed max-h-36 overflow-y-auto whitespace-pre-wrap">
                      {item.description}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── TAB 3: KATEGORİLER & KLASÖR ──────────────────────── */}
            {activeTab === 'categories' && (
              <div className="space-y-3.5 animate-fade-in">
                {/* 1. Akıllı Kategori Seçici Barı (Category Selector) */}
                <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-white/10 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-zinc-200">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      <span>Akıllı Kategori:</span>
                    </div>
                    {isSavingCategory && (
                      <span className="text-[11px] text-purple-400 flex items-center gap-1 font-medium">
                        <Loader2 className="w-3 h-3 animate-spin" /> Güncelleniyor...
                      </span>
                    )}
                  </div>

                  {/* 6 Core Smart Categories */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {SMART_CATEGORIES.map((cat) => {
                      const isSelected = currentCategory === cat.id
                      const Icon = cat.icon
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => handleSelectCategory(cat.id)}
                          className={`px-2.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-between border text-left cursor-pointer ${
                            isSelected
                              ? 'ring-1 shadow-md font-bold'
                              : 'bg-zinc-800/40 text-zinc-400 border-white/5 hover:bg-zinc-800 hover:text-zinc-200'
                          }`}
                          style={{
                            backgroundColor: isSelected ? `${cat.color}25` : undefined,
                            borderColor: isSelected ? cat.color : undefined,
                            color: isSelected ? '#ffffff' : undefined,
                            boxShadow: isSelected ? `0 0 15px ${cat.color}30` : undefined,
                          }}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: cat.color }} />
                            <span className="truncate">{cat.label}</span>
                          </div>
                          {isSelected && <Check className="w-3 h-3 shrink-0" style={{ color: cat.color }} />}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* 2. Özel Koleksiyon / Klasör Seçici Bar */}
                <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-white/10 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-zinc-200">
                      <Folder className="w-4 h-4 text-amber-400" />
                      <span>Koleksiyon / Klasör:</span>
                    </div>
                    {isSavingCol && (
                      <span className="text-[11px] text-indigo-400 flex items-center gap-1 font-medium">
                        <Loader2 className="w-3 h-3 animate-spin" /> Kaydediliyor...
                      </span>
                    )}
                  </div>

                  {/* Fast Pills Row */}
                  <div className="flex flex-wrap items-center gap-1.5 max-h-36 overflow-y-auto pr-1">
                    <button
                      type="button"
                      onClick={() => handleAssignCollection(null)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 border cursor-pointer ${
                        !currentColId
                          ? 'bg-zinc-700 text-white border-white/40 shadow-sm ring-1 ring-white/20'
                          : 'bg-zinc-800/60 text-zinc-400 border-white/10 hover:bg-zinc-800 hover:text-zinc-200'
                      }`}
                    >
                      <span>📂 Klasörsüz</span>
                      {!currentColId && <Check className="w-3 h-3 text-emerald-400" />}
                    </button>

                    {collections.map((col) => {
                      const isSelected = currentColId === col.id
                      return (
                        <button
                          key={col.id}
                          type="button"
                          onClick={() => handleAssignCollection(col.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 border cursor-pointer ${
                            isSelected
                              ? 'ring-2 ring-white/40 shadow-md font-bold'
                              : 'border-white/10 hover:border-white/20'
                          }`}
                          style={{
                            backgroundColor: isSelected ? col.color : `${col.color}22`,
                            color: isSelected ? '#ffffff' : (col.color === '#ffffff' ? '#e4e4e7' : col.color),
                            borderColor: isSelected ? 'rgba(255,255,255,0.4)' : `${col.color}40`,
                          }}
                        >
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: isSelected ? '#ffffff' : col.color }}
                          />
                          <span className="truncate max-w-[130px]">{col.name}</span>
                          {isSelected && <Check className="w-3 h-3 text-white ml-0.5" />}
                        </button>
                      )
                    })}

                    {/* Inline New Folder Form Toggle */}
                    {!isCreatingColForm ? (
                      <button
                        type="button"
                        onClick={() => setIsCreatingColForm(true)}
                        className="px-2.5 py-1.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 border border-dashed border-white/20 text-zinc-300 hover:text-white text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Yeni Klasör</span>
                      </button>
                    ) : (
                      <form onSubmit={handleCreateAndAssignCollection} className="flex items-center gap-1.5 w-full sm:w-auto mt-1">
                        <input
                          type="text"
                          value={newColName}
                          onChange={(e) => setNewColName(e.target.value)}
                          placeholder="Yeni klasör adı..."
                          autoFocus
                          className="bg-black/60 px-3 py-1.5 rounded-xl text-xs text-white border border-indigo-500/50 outline-none w-44"
                        />
                        <button
                          type="submit"
                          disabled={!newColName.trim() || isCreatingCol}
                          className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1 shrink-0 disabled:opacity-50 cursor-pointer"
                        >
                          {isCreatingCol ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                          <span>Ekle</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsCreatingColForm(false)
                            setNewColName('')
                          }}
                          className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-200 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </form>
                    )}
                  </div>
                </div>

                {/* 3. Interactive Tag Editor */}
                <div className="space-y-2 p-3.5 rounded-2xl bg-zinc-900/60 border border-white/10">
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
                          className="text-zinc-500 hover:text-rose-400 transition-colors p-0.5 cursor-pointer"
                          title="Etiketi kaldır"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}

                    <input
                      type="text"
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      onKeyDown={handleAddTag}
                      onBlur={() => commitNewTag(newTagInput)}
                      placeholder="+ Etiket ekle (Enter)..."
                      className="bg-black/40 px-2.5 py-1 rounded-lg text-xs text-white border border-white/10 outline-none focus:border-indigo-500 placeholder:text-zinc-500 w-36"
                    />
                  </div>
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
    </div>,
    document.body
  )
}
