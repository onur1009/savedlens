import 'server-only'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { MOCK_BOOKMARKS, MOCK_COLLECTIONS, MOCK_TAGS } from '@/lib/mock-data'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Önce giriş yapmalısınız' }, { status: 401 })
    }

    // 1. Insert Collections
    for (const col of MOCK_COLLECTIONS) {
      await supabase.from('collections').upsert({
        user_id: user.id,
        name: col.name,
        color: col.color,
      }, { onConflict: 'user_id,name' })
    }

    // 2. Insert Tags
    for (const tag of MOCK_TAGS) {
      await supabase.from('tags').upsert({
        user_id: user.id,
        name: tag.name,
      }, { onConflict: 'user_id,name' })
    }

    // 3. Insert Bookmarks
    for (const b of MOCK_BOOKMARKS) {
      await supabase.from('bookmarks').upsert({
        user_id: user.id,
        platform: b.platform,
        external_id: b.external_id,
        permalink: b.permalink,
        author_username: b.author_username,
        author_name: b.author_name,
        author_avatar: b.author_avatar,
        caption: b.caption,
        media_type: b.media_type,
        media_urls: b.media_urls,
        stored_media_urls: b.stored_media_urls,
        ai_summary: b.ai_summary,
        ai_tags: b.ai_tags,
        extractors: b.extractors,
        is_favorite: b.is_favorite,
      }, { onConflict: 'user_id,permalink' })
    }

    return NextResponse.json({
      success: true,
      message: 'Örnek Dewey verileri Supabase veritabanınıza başarıyla yüklendi!',
      bookmarksCount: MOCK_BOOKMARKS.length,
      collectionsCount: MOCK_COLLECTIONS.length,
    })
  } catch (err: unknown) {
    console.error('Seed error:', err)
    const msg = err instanceof Error ? err.message : 'Bilinmeyen hata'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
