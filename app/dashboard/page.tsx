import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { SavedItem } from '@/lib/mock-data'
import DashboardExplorer from '@/components/dashboard/DashboardExplorer'
import { formatBookmarkTitle, extractRealAuthor } from '@/lib/bookmark-formatter'
import { fetchAllUserBookmarks } from '@/lib/supabase/fetch-all'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const firstName =
    user.user_metadata?.full_name?.split(' ')[0] ||
    user.email?.split('@')[0] ||
    'Kullanıcı'

  // Fetch real bookmarks (with collections join) without 1000 row cap, and user collections in parallel
  // Note: embedding and raw_metadata are excluded to avoid sending ~25MB of vector arrays over SSR
  const BOOKMARK_SELECT_FIELDS = 'id, permalink, platform, caption, author_username, author_name, author_avatar, stored_media_urls, media_urls, ai_summary, ai_tags, extractors, is_favorite, created_at, media_type, status, error_message, category, actionable_data, bookmark_collections(collection_id, collections(id, name, color))'

  let rawBookmarks: RawBookmarkRow[] = []
  let rawCollectionsData: unknown[] = []

  try {
    const [fetchedBookmarks, collectionsRes] = await Promise.all([
      fetchAllUserBookmarks<RawBookmarkRow>(
        supabase,
        user.id,
        BOOKMARK_SELECT_FIELDS
      ),
      supabase
        .from('collections')
        .select('id, name, color, icon')
        .eq('user_id', user.id)
        .order('name', { ascending: true }),
    ])
    rawBookmarks = fetchedBookmarks || []
    rawCollectionsData = collectionsRes.data || []
  } catch (fetchErr) {
    console.error('[DashboardPage] Veri getirme hatası:', fetchErr)
  }

  interface RawCollectionRow {
    id: string
    name: string
    color?: string | null
    icon?: string | null
  }

  interface RawBookmarkRow {
    id: string
    permalink: string
    platform: string | null
    caption: string | null
    author_username?: string | null
    author_name?: string | null
    author_avatar?: string | null
    stored_media_urls?: string[] | null
    media_urls?: string[] | null
    ai_summary?: string | null
    ai_tags?: string[] | null
    extractors?: Record<string, boolean> | null
    is_favorite?: boolean | null
    created_at: string
    media_type?: string | null
    status?: 'processing' | 'completed' | 'failed' | null
    error_message?: string | null
    transcript?: string | null
    category?: string | null
    actionable_data?: Record<string, unknown> | null
    bookmark_collections?: Array<{
      collections?: {
        id: string
        name: string
        color?: string | null
      }
    }>
  }

  const userCollections = ((rawCollectionsData as unknown as RawCollectionRow[]) || []).map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color || '#6366f1',
    icon: c.icon || 'folder',
  }))

  // Map database rows to SavedItem format including collection info
  const items: SavedItem[] = (rawBookmarks || []).map((b) => {
    const colObj = b.bookmark_collections?.[0]?.collections
    const realAuthor = extractRealAuthor(b.caption, b.author_username || b.author_name)
    const cleanTitle = formatBookmarkTitle(b.caption, b.permalink, realAuthor.name)

    return {
      id: b.id,
      url: b.permalink,
      platform: b.platform,
      title: cleanTitle,
      description: b.caption,
      thumbnail_url: (b.stored_media_urls && b.stored_media_urls[0]) || (b.media_urls && b.media_urls[0]) || null,
      summary: b.ai_summary || null,
      tags: b.ai_tags || [],
      extractors: b.extractors ?? null,
      starred: b.is_favorite ?? false,
      created_at: b.created_at,
      author_username: realAuthor.username,
      author_avatar: b.author_avatar || undefined,
      media_type: b.media_type || undefined,
      stored_media_urls: b.stored_media_urls || [],
      collection_id: colObj?.id || null,
      collection_name: colObj?.name || null,
      collection_color: colObj?.color || null,
      status: b.status || 'completed',
      error_message: b.error_message || null,
      transcript: b.transcript || null,
      category: b.category || null,
      actionable_data: b.actionable_data || null,
    }
  })

  return (
    <div className="flex flex-col gap-3 sm:gap-4 animate-fade-up">
      {/* Compact Header Greeting & Stats Bar */}
      <div className="flex items-center justify-between gap-2 pb-1 border-b border-white/5">
        <div className="flex items-baseline gap-2.5">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            Merhaba, {firstName} 👋
          </h1>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border)] font-medium">
            {items.length} kayıtlı içerik
          </span>
        </div>
      </div>

      {/* Interactive Explorer (Unified Search + Quick Categorization + Filters + Grid) */}
      <Suspense fallback={<div className="text-xs text-[var(--text-muted)] py-4">Kütüphane yükleniyor...</div>}>
        <DashboardExplorer
          initialItems={items}
          userCollections={userCollections}
          offlineMode={false}
        />
      </Suspense>
    </div>
  )
}
