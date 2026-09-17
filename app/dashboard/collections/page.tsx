import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Collection, Bookmark } from '@/lib/mock-data'
import CollectionsExplorer from '@/components/dashboard/CollectionsExplorer'

export default async function CollectionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const [colRes, bmRes] = await Promise.all([
    supabase
      .from('collections')
      .select('*, bookmark_collections(bookmark_id)')
      .eq('user_id', user.id)
      .order('name'),
    supabase
      .from('bookmarks')
      .select('*, bookmark_collections(collection_id)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100),
  ])

  const collections: Collection[] = (colRes.data || []).map((col: any) => ({
    id: col.id,
    name: col.name,
    color: col.color || '#6366f1',
    icon: col.icon || 'folder',
    count: col.bookmark_collections?.length || 0,
    created_at: col.created_at,
  }))

  const bookmarks: Bookmark[] = (bmRes.data || []).map((b: any) => ({
    id: b.id,
    user_id: b.user_id,
    platform: b.platform,
    external_id: b.external_id,
    permalink: b.permalink,
    author_username: b.author_username,
    author_name: b.author_name,
    author_avatar: b.author_avatar,
    caption: b.caption,
    media_type: b.media_type,
    media_urls: b.media_urls || [],
    stored_media_urls: b.stored_media_urls || [],
    ai_summary: b.ai_summary,
    ai_tags: b.ai_tags || [],
    extractors: b.extractors,
    is_favorite: b.is_favorite,
    collections: b.bookmark_collections?.map((bc: any) => bc.collection_id) || [],
    saved_at: b.saved_at || b.created_at,
    created_at: b.created_at,
  }))

  return (
    <CollectionsExplorer
      initialCollections={collections}
      initialBookmarks={bookmarks}
    />
  )
}
