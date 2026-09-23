import 'server-only'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { isSupabaseConfigured } from '@/lib/mock-data'
import { formatBookmarkTitle, extractRealAuthor } from '@/lib/bookmark-formatter'
import { corsHeaders } from '@/lib/cors'
import { resolveAuthenticatedUserId } from '@/lib/auth/resolve-user'

const MobileIngestSchema = z.object({
  url: z.string().optional(),
  text: z.string().optional(),
  token: z.string().optional(),
})

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 200, headers: corsHeaders(request) })
}

function extractUrlFromText(text?: string | null): string | null {
  if (!text) return null
  const match = text.match(/https?:\/\/[^\s]+/i)
  return match ? match[0] : null
}

export async function GET(request: Request) {
  const headers = corsHeaders(request)
  const { searchParams } = new URL(request.url)
  const targetUrl = searchParams.get('url') || searchParams.get('text')
  const token = searchParams.get('token')

  if (!targetUrl) {
    return NextResponse.json({ error: 'Lütfen bir url parametresi belirtin' }, { status: 400, headers })
  }

  return processMobileIngest(targetUrl, token, request)
}

export async function POST(request: Request) {
  const headers = corsHeaders(request)

  try {
    const json = await request.json().catch(() => ({}))
    const parsed = MobileIngestSchema.safeParse(json)
    const bodyUrl = parsed.success ? parsed.data.url || parsed.data.text : null
    const bodyToken = parsed.success ? parsed.data.token : null

    const targetUrl = bodyUrl || extractUrlFromText(json.text)

    if (!targetUrl) {
      return NextResponse.json({ error: 'Geçerli bir bağlantı veya metin bulunamadı' }, { status: 400, headers })
    }

    return processMobileIngest(targetUrl, bodyToken, request)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Sunucu hatası'
    return NextResponse.json({ error: message }, { status: 500, headers })
  }
}

async function processMobileIngest(rawUrlOrText: string, bodyToken: string | null | undefined, request: Request) {
  const headers = corsHeaders(request)
  const extractedUrl = extractUrlFromText(rawUrlOrText) || rawUrlOrText
  if (!extractedUrl.startsWith('http')) {
    return NextResponse.json({ error: 'Geçerli bir http/https URL adresi bulunamadı' }, { status: 400, headers })
  }

  // Resolve user authenticated ID strictly without guessing (SEC-01)
  const userId = await resolveAuthenticatedUserId(request, bodyToken)

  const platform = extractedUrl.includes('instagram.com')
    ? 'instagram'
    : extractedUrl.includes('tiktok.com')
    ? 'tiktok'
    : extractedUrl.includes('youtube.com') || extractedUrl.includes('youtu.be')
    ? 'youtube'
    : extractedUrl.includes('twitter.com') || extractedUrl.includes('x.com')
    ? 'twitter'
    : 'web'

  // Standard title format
  const realAuthor = extractRealAuthor(rawUrlOrText, platform)
  const cleanTitle = formatBookmarkTitle(rawUrlOrText, extractedUrl, realAuthor.name)

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      success: true,
      offline: true,
      title: cleanTitle,
      message: "SavedLens'e Kaydedildi! 🚀",
      url: extractedUrl,
    }, { headers })
  }

  if (!userId) {
    return NextResponse.json({
      error: 'Bu işlem için geçerli bir SavedLens oturumu veya API tokenı gereklidir. Lütfen SavedLens > Ayarlar > Mobil sayfasından tokenınızı kontrol edin.',
    }, { status: 401, headers })
  }

  const { createAdminClient } = await import('@/lib/supabase/admin')
  const admin = createAdminClient()

  const bookmarkRow = {
    user_id: userId,
    platform,
    permalink: extractedUrl,
    author_username: realAuthor.username,
    author_name: realAuthor.name,
    caption: rawUrlOrText.length > 30 ? rawUrlOrText : cleanTitle,
    media_type: platform === 'youtube' || platform === 'tiktok' || extractedUrl.includes('/reel/') ? 'video' : 'image',
    media_urls: [],
    stored_media_urls: [],
    ai_summary: `${cleanTitle} — Mobil Paylaşım ile SavedLens'e eklendi.`,
    ai_tags: [platform, 'mobil'],
    extractors: {},
    is_favorite: false,
  }

  const { data: dbItem, error: dbErr } = await admin
    .from('bookmarks')
    .upsert(bookmarkRow, { onConflict: 'user_id,permalink' })
    .select('id, user_id, platform, permalink, caption, created_at')
    .single()

  if (dbErr) {
    console.error('[mobile/ingest] DB Error:', dbErr)
    return NextResponse.json({ error: 'İçerik kütüphaneye kaydedilemedi' }, { status: 500, headers })
  }

  return NextResponse.json({
    success: true,
    title: cleanTitle,
    message: "SavedLens'e Kaydedildi! 🚀",
    url: extractedUrl,
    id: dbItem?.id,
  }, { headers })
}
