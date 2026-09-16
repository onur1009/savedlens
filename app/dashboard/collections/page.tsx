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
    supabase.from('collections').select('*').eq('user_id', user.id).order('name'),
    supabase.from('bookmarks').select('*').eq('user_id', user.id).limit(60),
  ])

  const collections = (colRes.data as Collection[]) || []
  const bookmarks = (bmRes.data as Bookmark[]) || []

  return (
    <CollectionsExplorer
      initialCollections={collections}
      initialBookmarks={bookmarks}
    />
  )
}
