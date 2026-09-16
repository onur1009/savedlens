import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Tag, Bookmark } from '@/lib/mock-data'
import TagsExplorer from '@/components/dashboard/TagsExplorer'

export default async function TagsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const [tagRes, bmRes] = await Promise.all([
    supabase.from('tags').select('*').eq('user_id', user.id).order('name'),
    supabase.from('bookmarks').select('*').eq('user_id', user.id).limit(60),
  ])

  const tags = (tagRes.data as Tag[]) || []
  const bookmarks = (bmRes.data as Bookmark[]) || []

  return <TagsExplorer initialTags={tags} initialBookmarks={bookmarks} />
}
