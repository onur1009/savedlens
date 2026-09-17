import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { SavedItem } from '@/lib/mock-data'
import DashboardExplorer from '@/components/dashboard/DashboardExplorer'

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

  // Fetch real bookmarks (with collections join) and user collections in parallel
  const [bookmarksRes, collectionsRes] = await Promise.all([
    supabase
      .from('bookmarks')
      .select('*, bookmark_collections(collection_id, collections(id, name, color))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(150),
    supabase
      .from('collections')
      .select('id, name, color, icon')
      .eq('user_id', user.id)
      .order('name', { ascending: true }),
  ])

  if (bookmarksRes.error) {
    console.error('Error fetching bookmarks:', bookmarksRes.error)
  }

  const userCollections = (collectionsRes.data || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    color: c.color || '#6366f1',
    icon: c.icon || 'folder',
  }))

  // Map database rows to SavedItem format including collection info
  const items: SavedItem[] = (bookmarksRes.data || []).map((b: any) => {
    const colObj = b.bookmark_collections?.[0]?.collections
    return {
      id: b.id,
      url: b.permalink,
      platform: b.platform,
      title: b.author_name ? `${b.author_name} (@${b.author_username})` : b.caption?.slice(0, 60) || 'Kayıtlı İçerik',
      description: b.caption,
      thumbnail_url: (b.stored_media_urls && b.stored_media_urls[0]) || (b.media_urls && b.media_urls[0]) || null,
      summary: b.ai_summary,
      tags: b.ai_tags || [],
      extractors: b.extractors ?? null,
      starred: b.is_favorite ?? false,
      created_at: b.created_at,
      author_username: b.author_username,
      author_avatar: b.author_avatar,
      media_type: b.media_type,
      stored_media_urls: b.stored_media_urls || [],
      collection_id: colObj?.id || null,
      collection_name: colObj?.name || null,
      collection_color: colObj?.color || null,
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
