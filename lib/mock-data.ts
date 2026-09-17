/**
 * SavedLens V2.0 — Mock Data & Types
 * Dewey (getdewey.co) Unified Data Model
 * Offline-first development mode
 */

export interface Collection {
  id: string
  name: string
  color: string
  icon?: string
  count: number
  created_at: string
}

export interface Tag {
  id: string
  name: string
  count: number
}

export interface Bookmark {
  id: string
  user_id?: string
  platform: 'instagram' | 'twitter' | 'tiktok' | 'linkedin' | 'youtube' | 'web' | 'custom'
  external_id?: string
  permalink: string
  author_username: string
  author_name?: string
  author_avatar?: string
  caption: string
  media_type: 'image' | 'video' | 'carousel' | 'article'
  media_urls: string[]
  stored_media_urls: string[] // Permanent cloud backup (S3 / R2 / Supabase Storage)
  ai_summary: string
  ai_tags: string[]
  extractors?: {
    recipe?: boolean
    location?: boolean
    discount?: boolean
    transcript?: boolean
    code?: boolean
  }
  is_favorite: boolean
  is_archived?: boolean
  collections?: string[] // collection IDs
  saved_at: string
  created_at: string
}

// Backward-compatible SavedItem for existing views
export interface SavedItem {
  id: string
  url: string
  platform: string | null
  title: string | null
  description: string | null
  thumbnail_url: string | null
  summary: string | null
  tags: string[] | null
  extractors: {
    recipe?: boolean
    location?: boolean
    discount?: boolean
    transcript?: boolean
    code?: boolean
  } | null
  starred: boolean
  created_at: string
  author_username?: string
  author_avatar?: string
  media_type?: string
  stored_media_urls?: string[]
  collection_id?: string | null
  collection_name?: string | null
  collection_color?: string | null
}

export const MOCK_COLLECTIONS: Collection[] = [
  { id: 'c1', name: 'UI & Tasarım Trendleri', color: '#6366f1', icon: 'palette', count: 4, created_at: new Date().toISOString() },
  { id: 'c2', name: 'Yemek & Gurme Tarifler', color: '#f59e0b', icon: 'utensils', count: 3, created_at: new Date().toISOString() },
  { id: 'c3', name: 'Yapay Zeka & Promptlar', color: '#10b981', icon: 'sparkles', count: 5, created_at: new Date().toISOString() },
  { id: 'c4', name: 'Gezilecek Yerler & Rotalar', color: '#ec4899', icon: 'map-pin', count: 3, created_at: new Date().toISOString() },
  { id: 'c5', name: 'Yazılım & Web Geliştirme', color: '#3b82f6', icon: 'code', count: 4, created_at: new Date().toISOString() },
]

export const MOCK_TAGS: Tag[] = [
  { id: 't1', name: 'tasarım', count: 8 },
  { id: 't2', name: 'yapayZeka', count: 6 },
  { id: 't3', name: 'tarif', count: 5 },
  { id: 't4', name: 'nextjs', count: 4 },
  { id: 't5', name: 'istanbul', count: 4 },
  { id: 't6', name: 'verimlilik', count: 3 },
  { id: 't7', name: 'seyahat', count: 3 },
  { id: 't8', name: 'indirim', count: 2 },
]

export const MOCK_BOOKMARKS: Bookmark[] = [
  {
    id: 'b1',
    platform: 'instagram',
    external_id: '31948572918239123',
    permalink: 'https://www.instagram.com/p/C-xyz123/',
    author_username: 'tasarim_gunlugu',
    author_name: 'Tasarım Günlüğü',
    author_avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop&crop=faces',
    caption: '2026\'nın En İyi UI Tasarım Trendleri! Minimalist tipografi, mikro-animasyonlar ve fütüristik cam dokuları.',
    media_type: 'carousel',
    media_urls: [
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80',
      'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=800&q=80',
    ],
    stored_media_urls: [
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80',
    ],
    ai_summary: '2026 UI trendleri: Minimalist fluid tipografi, karanlık mod glassmorphism ve kullanıcı dikkatini odaklayan etkileşimli mikro-animasyonlar.',
    ai_tags: ['tasarım', 'ui', 'trendler', 'figma'],
    extractors: { code: false },
    is_favorite: true,
    collections: ['c1'],
    saved_at: '2026-09-16T15:00:00Z',
    created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
  {
    id: 'b2',
    platform: 'instagram',
    external_id: '31948572918239999',
    permalink: 'https://www.instagram.com/reel/C-abc999/',
    author_username: 'chef_burak',
    author_name: 'Burak Şef',
    author_avatar: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=120&h=120&fit=crop&crop=faces',
    caption: 'Evde Kolay Tiramisu Tarifi 🍰 Sadece 5 malzeme ile fırınsız, 20 dakikada hazır!',
    media_type: 'video',
    media_urls: ['https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=800&q=80'],
    stored_media_urls: ['https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=800&q=80'],
    ai_summary: '5 malzeme ile hazırlanan kolay ev tiramisusu. Mascarpone kreması ve espresso ıslatmalı savoiardi bisküvi.',
    ai_tags: ['tarif', 'tatlı', 'tiramisu', 'pratik'],
    extractors: { recipe: true },
    is_favorite: true,
    collections: ['c2'],
    saved_at: '2026-09-16T14:30:00Z',
    created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: 'b3',
    platform: 'tiktok',
    external_id: '7192837482910',
    permalink: 'https://www.tiktok.com/@istanbul_rehberi/video/7192837482910',
    author_username: 'istanbul_rehberi',
    author_name: 'İstanbul Keşifleri',
    author_avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&crop=faces',
    caption: 'İstanbul\'un Gizli Kahvecileri ☕ Beyoğlu ve Karaköy ara sokaklarındaki en huzurlu 5 mekan.',
    media_type: 'video',
    media_urls: ['https://images.unsplash.com/photo-1445116572660-236099ec97a0?w=800&q=80'],
    stored_media_urls: ['https://images.unsplash.com/photo-1445116572660-236099ec97a0?w=800&q=80'],
    ai_summary: 'Beyoğlu ve Karaköy\'de turist yoğunluğundan uzak, üçüncü nesil kaliteli kahve sunan 5 yerel mekan önerisi.',
    ai_tags: ['istanbul', 'kahve', 'mekan', 'seyahat'],
    extractors: { location: true, transcript: true },
    is_favorite: false,
    collections: ['c4'],
    saved_at: '2026-09-16T13:00:00Z',
    created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
  },
  {
    id: 'b4',
    platform: 'linkedin',
    external_id: 'urn:li:activity:71982348',
    permalink: 'https://www.linkedin.com/posts/onur-tech_ai-agents-productivity-activity-71982348',
    author_username: 'ayse_yildiz_ai',
    author_name: 'Ayşe Yıldız',
    author_avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&h=120&fit=crop&crop=faces',
    caption: '2026\'da Yapay Zeka Ajanları (AI Agents) Nasıl İnşa Edilir? Otonom iş akışları, MCP protokolü ve Tool Calling mimarisi.',
    media_type: 'article',
    media_urls: ['https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=800&q=80'],
    stored_media_urls: ['https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=800&q=80'],
    ai_summary: 'Model Context Protocol (MCP) ve otonom ajan mimarisinin şirket içi otomasyonlarda kullanım prensipleri.',
    ai_tags: ['yapayZeka', 'aiAgents', 'mcp', 'kariyer'],
    extractors: { code: true },
    is_favorite: true,
    collections: ['c3', 'c5'],
    saved_at: '2026-09-16T11:00:00Z',
    created_at: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
  },
  {
    id: 'b5',
    platform: 'twitter',
    external_id: '179283749281',
    permalink: 'https://x.com/firsatlar_tr/status/179283749281',
    author_username: 'firsatlar_tr',
    author_name: 'Fırsatlar & İndirimler',
    author_avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&h=120&fit=crop&crop=faces',
    caption: 'Geliştiriciler için tüm popüler cloud servislerinde geçerli %60 indirim kodu paylaşıldı: CLOUD2026 🎟️',
    media_type: 'image',
    media_urls: ['https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&q=80'],
    stored_media_urls: ['https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&q=80'],
    ai_summary: 'Bulut depolama ve sunucu sağlayıcılarında geçerli geliştirici indirim kuponu.',
    ai_tags: ['indirim', 'yazılım', 'fırsat'],
    extractors: { discount: true },
    is_favorite: false,
    collections: ['c5'],
    saved_at: '2026-09-16T09:00:00Z',
    created_at: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
  },
  {
    id: 'b6',
    platform: 'youtube',
    external_id: 'dQw4w9WgXcQ',
    permalink: 'https://www.youtube.com/watch?v=example3',
    author_username: 'kod_dunyasi',
    author_name: 'Kod Dünyası',
    author_avatar: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=120&h=120&fit=crop&crop=faces',
    caption: 'Next.js 16 + React 19 ile Modern Full-Stack Web Geliştirme Rehberi.',
    media_type: 'video',
    media_urls: ['https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80'],
    stored_media_urls: ['https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80'],
    ai_summary: 'Next.js 16 Proxy mimarisi, React 19 Server Components ve Supabase SSR ile uçtan uca modern web uygulaması yapımı.',
    ai_tags: ['nextjs', 'react', 'yazılım', 'webdev'],
    extractors: { transcript: true, code: true },
    is_favorite: true,
    collections: ['c5'],
    saved_at: '2026-09-15T18:00:00Z',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
  },
]

// Convert Bookmarks to legacy SavedItem format seamlessly
export const MOCK_ITEMS: SavedItem[] = MOCK_BOOKMARKS.map((b) => ({
  id: b.id,
  url: b.permalink,
  platform: b.platform,
  title: b.author_name ? `${b.author_name} (@${b.author_username})` : b.caption.slice(0, 60),
  description: b.caption,
  thumbnail_url: b.stored_media_urls[0] || b.media_urls[0] || null,
  summary: b.ai_summary,
  tags: b.ai_tags,
  extractors: b.extractors ?? null,
  starred: b.is_favorite,
  created_at: b.created_at,
  author_username: b.author_username,
  author_avatar: b.author_avatar,
  media_type: b.media_type,
  stored_media_urls: b.stored_media_urls,
}))

export const MOCK_USER = {
  id: 'mock-user-id',
  email: 'demo@savedlens.app',
  user_metadata: { full_name: 'Demo Kullanıcı' },
}

const DEFAULT_SUPABASE_URL = 'https://xdicvknkhwtdmffhyhpx.supabase.co'
const DEFAULT_SUPABASE_KEY = 'sb_publishable_ax8qn1-ZBNiHTzNeq8MXLg_XBSlmnNB'

/** Check if Supabase is properly configured */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY
  return (
    url.startsWith('https://') &&
    url.includes('.supabase.co') &&
    key.length > 20
  )
}
