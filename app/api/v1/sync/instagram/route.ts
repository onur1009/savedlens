import 'server-only'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { isSupabaseConfigured } from '@/lib/mock-data'

// Payload schema for Instagram sync (Dewey specification)
const InstagramAuthorSchema = z.object({
  username: z.string().default('instagram_user'),
  full_name: z.string().optional(),
  avatar_url: z.string().optional(),
})

const InstagramContentSchema = z.object({
  caption: z.string().default(''),
  media_type: z.enum(['image', 'video', 'carousel', 'article']).default('image'),
  media_urls: z.array(z.string()).default([]),
})

const InstagramItemSchema = z.object({
  platform: z.literal('instagram').default('instagram'),
  external_id: z.string().optional(),
  permalink: z.string().url('Geçerli bir Instagram bağlantısı giriniz'),
  author: InstagramAuthorSchema.optional(),
  content: InstagramContentSchema.optional(),
  saved_at: z.string().optional(),
})

const SyncBatchSchema = z.object({
  bookmarks: z.array(InstagramItemSchema).min(1, 'En az 1 gönderi gönderilmelidir'),
})

export async function POST(request: Request) {
  try {
    const json = await request.json()

    // Support both single item and array batch format
    let itemsToProcess = []
    if (Array.isArray(json.bookmarks)) {
      const parsed = SyncBatchSchema.safeParse(json)
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
      }
      itemsToProcess = parsed.data.bookmarks
    } else if (json.permalink) {
      const parsed = InstagramItemSchema.safeParse(json)
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
      }
      itemsToProcess = [parsed.data]
    } else {
      return NextResponse.json({ error: 'Geçersiz sync yükü formatı' }, { status: 400 })
    }

    // Check if running in offline mode
    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        success: true,
        offline: true,
        message: 'Çevrimdışı geliştirme modu: Instagram verileri başarıyla simüle edildi ve alındı.',
        count: itemsToProcess.length,
        items: itemsToProcess.map((item, idx) => ({
          id: `synced-${Date.now()}-${idx}`,
          permalink: item.permalink,
          author_username: item.author?.username,
          caption_preview: item.content?.caption?.slice(0, 50),
          status: 'simulated_synced',
        })),
      })
    }

    // Online mode: authenticate and persist to Supabase
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const insertedRows = []
    for (const item of itemsToProcess) {
      const row = {
        user_id: user.id,
        platform: 'instagram',
        external_id: item.external_id ?? null,
        permalink: item.permalink,
        author_username: item.author?.username ?? 'instagram_user',
        author_name: item.author?.full_name ?? null,
        author_avatar: item.author?.avatar_url ?? null,
        caption: item.content?.caption ?? '',
        media_type: item.content?.media_type ?? 'image',
        media_urls: item.content?.media_urls ?? [],
        stored_media_urls: item.content?.media_urls ?? [], // initial fallback
        saved_at: item.saved_at ? new Date(item.saved_at).toISOString() : new Date().toISOString(),
      }

      const { data, error } = await supabase
        .from('bookmarks')
        .upsert(row, { onConflict: 'user_id,permalink' })
        .select()
        .single()

      if (!error && data) {
        insertedRows.push(data)
      }
    }

    return NextResponse.json({
      success: true,
      count: insertedRows.length,
      synced_ids: insertedRows.map((r) => r.id),
    })
  } catch (err) {
    console.error('Instagram sync error:', err)
    return NextResponse.json({ error: 'Instagram senkronizasyonunda sunucu hatası' }, { status: 500 })
  }
}
