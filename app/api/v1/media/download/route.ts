import 'server-only'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { isSupabaseConfigured } from '@/lib/mock-data'

const MediaDownloadSchema = z.object({
  bookmark_id: z.string().optional(),
  media_urls: z.array(z.string().url()).min(1, 'En az 1 medya bağlantısı gereklidir'),
})

export async function POST(request: Request) {
  try {
    const json = await request.json()
    const parsed = MediaDownloadSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { bookmark_id, media_urls } = parsed.data

    // Check offline mode
    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        success: true,
        offline: true,
        message: 'Çevrimdışı geliştirme modu: Medyalar kalıcı arşiv için simüle edildi.',
        stored_media_urls: media_urls,
        count: media_urls.length,
      })
    }

    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const storedUrls: string[] = []

    // Download & upload to Supabase Storage
    for (let i = 0; i < media_urls.length; i++) {
      const sourceUrl = media_urls[i]
      try {
        const response = await fetch(sourceUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          signal: AbortSignal.timeout(10000),
        })

        if (!response.ok) {
          storedUrls.push(sourceUrl)
          continue
        }

        const arrayBuffer = await response.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const contentType = response.headers.get('content-type') || 'image/jpeg'
        const ext = contentType.includes('video') ? 'mp4' : 'jpg'
        const fileName = `${user.id}/${Date.now()}_${i}.${ext}`

        // Upload to storage bucket 'bookmarks-media'
        const { error: uploadError } = await supabase.storage
          .from('bookmarks-media')
          .upload(fileName, buffer, {
            contentType,
            upsert: true,
          })

        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage
            .from('bookmarks-media')
            .getPublicUrl(fileName)
          storedUrls.push(publicUrlData.publicUrl)
        } else {
          storedUrls.push(sourceUrl)
        }
      } catch (e) {
        console.error('Failed to download/upload media:', sourceUrl, e)
        storedUrls.push(sourceUrl)
      }
    }

    // Update bookmark record if bookmark_id provided
    if (bookmark_id) {
      await supabase
        .from('bookmarks')
        .update({ stored_media_urls: storedUrls, updated_at: new Date().toISOString() })
        .eq('id', bookmark_id)
        .eq('user_id', user.id)
    }

    return NextResponse.json({
      success: true,
      stored_media_urls: storedUrls,
      count: storedUrls.length,
    })
  } catch (err) {
    console.error('Media download error:', err)
    return NextResponse.json({ error: 'Medya indirme ve yedekleme hatası' }, { status: 500 })
  }
}
