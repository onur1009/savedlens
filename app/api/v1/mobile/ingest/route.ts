import 'server-only'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { isSupabaseConfigured } from '@/lib/mock-data'
import { formatBookmarkTitle, extractRealAuthor } from '@/lib/bookmark-formatter'

const MobileIngestSchema = z.object({
  url: z.string().optional(),
  text: z.string().optional(),
  token: z.string().optional(),
})

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-savedlens-token, X-Requested-With',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS })
}

function extractUrlFromText(text?: string | null): string | null {
  if (!text) return null
  const match = text.match(/https?:\/\/[^\s]+/i)
  return match ? match[0] : null
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const targetUrl = searchParams.get('url') || searchParams.get('text')
  const token = searchParams.get('token')

  if (!targetUrl) {
    return NextResponse.json({ error: 'Lütfen bir url parametresi belirtin' }, { status: 400, headers: CORS_HEADERS })
  }

  return processMobileIngest(targetUrl, token, request)
}

export async function POST(request: Request) {
  try {
    const json = await request.json().catch(() => ({}))
    const parsed = MobileIngestSchema.safeParse(json)
    const bodyUrl = parsed.success ? parsed.data.url || parsed.data.text : null
    const bodyToken = parsed.success ? parsed.data.token : null

    const targetUrl = bodyUrl || extractUrlFromText(json.text)

    if (!targetUrl) {
      return NextResponse.json({ error: 'Geçerli bir bağlantı veya metin bulunamadı' }, { status: 400, headers: CORS_HEADERS })
    }

    return processMobileIngest(targetUrl, bodyToken, request)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Sunucu hatası'
    return NextResponse.json({ error: message }, { status: 500, headers: CORS_HEADERS })
  }
}

async function processMobileIngest(rawUrlOrText: string, bodyToken: string | null | undefined, request: Request) {
  const extractedUrl = extractUrlFromText(rawUrlOrText) || rawUrlOrText
  if (!extractedUrl.startsWith('http')) {
    return NextResponse.json({ error: 'Geçerli bir http/https URL adresi bulunamadı' }, { status: 400, headers: CORS_HEADERS })
  }

  // Resolve user token
  const authHeader = request.headers.get('authorization') || request.headers.get('x-savedlens-token')
  const headerToken = authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : null
  const finalToken = headerToken || bodyToken || null

  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  let userId: string | null = null

  const { createAdminClient } = await import('@/lib/supabase/admin')
  const admin = createAdminClient()

  if (finalToken && finalToken !== 'demo-user-token-offline') {
    if (UUID_REGEX.test(finalToken)) {
      userId = finalToken
    } else {
      const { data: profile } = await admin.from('profiles').select('id').eq('id', finalToken).single()
      if (profile?.id) {
        userId = profile.id
      }
    }
  }

  // Resilient fallback to default profile if online
  if (!userId && isSupabaseConfigured()) {
    const { data: profiles } = await admin.from('profiles').select('id').limit(1)
    if (profiles && profiles.length > 0) {
      userId = profiles[0].id
    }
  }

  // Delegate to main ingest logic via internal API or database insert
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

  if (!isSupabaseConfigured() || !userId) {
    return NextResponse.json({
      success: true,
      offline: true,
      title: cleanTitle,
      message: "SavedLens'e Kaydedildi! 🚀",
      url: extractedUrl,
    }, { headers: CORS_HEADERS })
  }

  // Ensure profile row exists to satisfy foreign key
  await admin.from('profiles').upsert({ id: userId }, { onConflict: 'id' }).select('id')

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

  const { data: dbItem, error } = await admin
    .from('bookmarks')
    .upsert(bookmarkRow, { onConflict: 'user_id,permalink' })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Kaydetme hatası: ' + error.message }, { status: 500, headers: CORS_HEADERS })
  }

  return NextResponse.json({
    success: true,
    id: dbItem.id,
    title: cleanTitle,
    author: `@${realAuthor.username}`,
    message: "SavedLens'e Başarıyla Kaydedildi! 🚀",
    url: extractedUrl,
  }, { headers: CORS_HEADERS })
}
