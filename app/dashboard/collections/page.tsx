import { isSupabaseConfigured, MOCK_COLLECTIONS, MOCK_BOOKMARKS } from '@/lib/mock-data'
import type { Collection, Bookmark } from '@/lib/mock-data'
import CollectionsExplorer from '@/components/dashboard/CollectionsExplorer'

export default async function CollectionsPage() {
  let collections: Collection[] = []
  let bookmarks: Bookmark[] = []

  if (isSupabaseConfigured()) {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const [colRes, bmRes] = await Promise.all([
        supabase.from('collections').select('*').eq('user_id', user.id),
        supabase.from('bookmarks').select('*').eq('user_id', user.id).limit(30),
      ])
      collections = (colRes.data as Collection[]) || []
      bookmarks = (bmRes.data as Bookmark[]) || []
    }
  } else {
    collections = MOCK_COLLECTIONS
    bookmarks = MOCK_BOOKMARKS
  }

  return (
    <CollectionsExplorer
      initialCollections={collections}
      initialBookmarks={bookmarks}
    />
  )
}
