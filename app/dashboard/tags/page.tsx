import { isSupabaseConfigured, MOCK_TAGS, MOCK_BOOKMARKS } from '@/lib/mock-data'
import type { Tag, Bookmark } from '@/lib/mock-data'
import TagsExplorer from '@/components/dashboard/TagsExplorer'

export default async function TagsPage() {
  let tags: Tag[] = []
  let bookmarks: Bookmark[] = []

  if (isSupabaseConfigured()) {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const [tagRes, bmRes] = await Promise.all([
        supabase.from('tags').select('*').eq('user_id', user.id),
        supabase.from('bookmarks').select('*').eq('user_id', user.id).limit(30),
      ])
      tags = (tagRes.data as Tag[]) || []
      bookmarks = (bmRes.data as Bookmark[]) || []
    }
  } else {
    tags = MOCK_TAGS
    bookmarks = MOCK_BOOKMARKS
  }

  return <TagsExplorer initialTags={tags} initialBookmarks={bookmarks} />
}
