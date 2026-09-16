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

  // Fetch real bookmarks from Supabase for this user
  const { data: bookmarksData, error } = await supabase
    .from('bookmarks')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('Error fetching bookmarks:', error)
  }

  // Map database rows to SavedItem format
  const items: SavedItem[] = (bookmarksData || []).map((b) => ({
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
  }))

  return (
    <div className="flex flex-col gap-6 animate-fade-up">
      {/* Header greeting */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          Merhaba, {firstName} 👋
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-0.5">
          {items.length} kayıtlı içerik
        </p>
      </div>

      {/* Interactive Explorer (QuickSaveBar + Search + Platform + Tags + Grid) */}
      <Suspense fallback={<div className="text-xs text-[var(--text-muted)]">Kütüphane yükleniyor...</div>}>
        <DashboardExplorer initialItems={items} offlineMode={false} />
      </Suspense>
    </div>
  )
}
