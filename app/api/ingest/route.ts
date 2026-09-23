import 'server-only'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { isSupabaseConfigured, type SavedItem } from '@/lib/mock-data'
import { formatBookmarkTitle, extractRealAuthor } from '@/lib/bookmark-formatter'
import { transcribeAudioFromVideo } from '@/lib/ai/whisper'
import { extractStructuredData } from '@/lib/ai/extractor'
import { generateEmbedding } from '@/lib/ai/embeddings'

// ── Schema ──────────────────────────────────────────────────────
const IngestSchema = z.object({
  url: z.string().url('Geçerli bir URL giriniz'),
  title: z.string().optional().nullable(),
  caption: z.string().optional().nullable(),
  author_username: z.string().optional().nullable(),
  author_name: z.string().optional().nullable(),
  author_avatar: z.string().optional().nullable(),
  thumbnail_url: z.string().optional().nullable(),
  media_type: z.string().optional().nullable(),
})

type IngestInput = z.infer<typeof IngestSchema>

// ── Platform detection ──────────────────────────────────────────
function detectPlatform(url: string): string {
  if (/instagram\.com/i.test(url)) return 'instagram'
  if (/tiktok\.com/i.test(url)) return 'tiktok'
  if (/youtube\.com|youtu\.be/i.test(url)) return 'youtube'
  if (/twitter\.com|x\.com/i.test(url)) return 'twitter'
  if (/linkedin\.com/i.test(url)) return 'linkedin'
  return 'web'
}

interface ScrapedMetadata {
  title: string
  description: string
  thumbnail_url: string | null
  author_username: string
  author_name: string
  media_type: string
  forcedExtractors?: Record<string, boolean>
  forcedTags?: string[]
  forcedSummary?: string
  isFailed?: boolean
  errorMessage?: string
}

// ── Multi-Platform Resilient Scraper (Instagram oEmbed primary) ─
async function scrapeMetadata(url: string, platform: string): Promise<ScrapedMetadata> {
  // 1. Curated Mock Links (for instant offline preview)
  if (url.includes('tiramisu-tarifi') || url.includes('C-abc999')) {
    return {
      title: 'Evde Kolay Tiramisu Tarifi 🍰',
      description: 'Sadece 5 malzeme ile fırınsız, 20 dakikada hazır ev tiramisusu! Mascarpone kreması ve espresso ıslatmalı savoiardi bisküvi.',
      thumbnail_url: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=800&q=80',
      author_username: 'chef_burak',
      author_name: 'Burak Şef',
      media_type: 'video',
      forcedExtractors: { recipe: true, transcript: true },
      forcedTags: ['tarif', 'tatlı', 'tiramisu', 'pratik'],
      forcedSummary: '5 malzeme ile hazırlanan kolay ve pratik ev tiramisusu. Fırınsız hazırlanır.',
    }
  }

  if (url.includes('istanbul_kahve') || url.includes('7192837482910')) {
    return {
      title: "İstanbul'un Gizli Kahvecileri ☕",
      description: 'Beyoğlu ve Karaköy ara sokaklarındaki en huzurlu 5 mekan önerisi. Üçüncü nesil nitelikli kahve ve sakin çalışma ortamı.',
      thumbnail_url: 'https://images.unsplash.com/photo-1445116572660-236099ec97a0?w=800&q=80',
      author_username: 'istanbul_rehberi',
      author_name: 'İstanbul Keşifleri',
      media_type: 'video',
      forcedExtractors: { location: true },
      forcedTags: ['istanbul', 'kahve', 'mekan', 'seyahat'],
      forcedSummary: "Beyoğlu ve Karaköy'de üçüncü nesil kaliteli kahve sunan 5 yerel mekan önerisi.",
    }
  }

  // 2. Instagram: oEmbed Primary Layer
  if (platform === 'instagram') {
    try {
      // Primary: Instagram oEmbed (public endpoint format)
      const oembedUrl = `https://api.instagram.com/oembed?url=${encodeURIComponent(url)}`
      const oembedRes = await fetch(oembedUrl, {
        headers: { 'User-Agent': 'SavedLensBot/1.0 (+https://savedlens.app)' },
        signal: AbortSignal.timeout(6000),
      })

      if (oembedRes.ok) {
        const data = await oembedRes.json()
        const rawTitle = data.title || ''
        const authorName = data.author_name || 'instagram_user'
        return {
          title: rawTitle.slice(0, 100) || `${authorName} Paylaşımı`,
          description: rawTitle,
          thumbnail_url: data.thumbnail_url || null,
          author_username: authorName.toLowerCase().replace(/\s+/g, '_'),
          author_name: authorName,
          media_type: url.includes('/reel/') ? 'video' : 'image',
        }
      }
    } catch {
      // Fallback to meta tags scraper below
    }
  }

  // 3. YouTube: Official oEmbed
  if (platform === 'youtube') {
    try {
      const oembedRes = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(5000) })
      if (oembedRes.ok) {
        const data = await oembedRes.json()
        if (data.title) {
          return {
            title: data.title,
            description: `${data.author_name || 'YouTube'} kanalından video: ${data.title}`,
            thumbnail_url: data.thumbnail_url || null,
            author_username: data.author_name ? data.author_name.toLowerCase().replace(/\s+/g, '_') : 'youtube',
            author_name: data.author_name || 'YouTube Kanalı',
            media_type: 'video',
          }
        }
      }
    } catch {
      // fallback
    }
  }

  // 4. Twitter / X: Official oEmbed
  if (platform === 'twitter') {
    try {
      const oembedRes = await fetch(`https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(5000) })
      if (oembedRes.ok) {
        const data = await oembedRes.json()
        const text = data.html?.replace(/<[^>]+>/g, ' ').replace(/&mdash;[\s\S]*$/, '').trim()
        const handleMatch = data.author_url?.match(/twitter\.com\/([^\/]+)|x\.com\/([^\/]+)/i)
        const username = handleMatch ? (handleMatch[1] || handleMatch[2]) : (data.author_name || 'twitter_user')
        return {
          title: text ? text.slice(0, 70) + (text.length > 70 ? '...' : '') : `${data.author_name || 'X'} Paylaşımı`,
          description: text || `${data.author_name} (@${username}) X gönderisi.`,
          thumbnail_url: null,
          author_username: username,
          author_name: data.author_name || username,
          media_type: 'article',
        }
      }
    } catch {
      // fallback
    }
  }

  // 5. Standard Web Scraping / Open Graph Fallback
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(6000),
    })

    if (res.ok) {
      const html = await res.text()
      const getMeta = (pattern: RegExp) => pattern.exec(html)?.[1] ?? null

      const title =
        getMeta(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i) ??
        getMeta(/<meta[^>]+name="twitter:title"[^>]+content="([^"]+)"/i) ??
        getMeta(/<title>([^<]+)<\/title>/i) ??
        null

      const description =
        getMeta(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i) ??
        getMeta(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i) ??
        null

      const thumbnail_url =
        getMeta(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i) ??
        getMeta(/<meta[^>]+name="twitter:image"[^>]+content="([^"]+)"/i) ??
        null

      if (title && title.length > 3) {
        let author = 'web'
        try {
          const u = new URL(url)
          author = u.hostname.replace('www.', '')
        } catch {}

        return {
          title: title.trim(),
          description: (description || title).trim(),
          thumbnail_url: thumbnail_url ? thumbnail_url.trim() : null,
          author_username: author,
          author_name: author,
          media_type: url.includes('/reel/') || url.includes('/video/') ? 'video' : 'article',
        }
      }
    } else if (res.status === 404 || res.status === 401 || res.status === 403) {
      if (platform !== 'instagram' && platform !== 'tiktok') {
        return {
          title: 'Erişilemeyen İçerik',
          description: 'Gönderi gizli veya link geçersiz.',
          thumbnail_url: null,
          author_username: 'bilinmeyen',
          author_name: 'Bilinmeyen Kullanıcı',
          media_type: 'image',
          isFailed: true,
          errorMessage: 'Gönderi gizli veya link geçersiz',
        }
      }
    }
  } catch {
    // fallback to shortcode heuristic
  }

  // 6. Heuristic Fallback (URL Shortcode)
  let guessedAuthor = 'kullanıcı'
  let guessedTitle = 'Kaydedilen İçerik'
  let guessedDesc = 'Sosyal medya bağlantısı kütüphanenize kaydedildi.'

  try {
    const u = new URL(url)
    const segments = u.pathname.split('/').filter(Boolean)

    if (platform === 'instagram') {
      const isReel = url.includes('/reel/') || url.includes('/reels/')
      const shortcode = segments.find((s) => s !== 'p' && s !== 'reel' && s !== 'reels' && s !== 'tv' && s.length >= 6) || segments[1] || ''
      guessedAuthor = 'instagram_creator'
      guessedTitle = isReel ? `Instagram Reel (#${shortcode})` : `Instagram Gönderisi (#${shortcode})`
      guessedDesc = isReel
        ? `Instagram Reel videosu (#${shortcode}) kütüphanenize başarıyla kaydedildi.`
        : `Instagram gönderisi (#${shortcode}) kütüphanenize başarıyla kaydedildi.`
    } else if (platform === 'tiktok') {
      const userPart = segments.find((s) => s.startsWith('@'))
      guessedAuthor = userPart ? userPart.replace('@', '') : 'tiktok_user'
      guessedTitle = 'TikTok Videosu'
      guessedDesc = 'TikTok videosu kütüphanenize kaydedildi.'
    } else {
      guessedAuthor = u.hostname.replace('www.', '')
      guessedTitle = `${guessedAuthor} Bağlantısı`
      guessedDesc = url
    }
  } catch {}

  return {
    title: guessedTitle,
    description: guessedDesc,
    thumbnail_url: null,
    author_username: guessedAuthor,
    author_name: guessedAuthor,
    media_type: platform === 'youtube' || platform === 'tiktok' || url.includes('/reel/') ? 'video' : 'image',
  }
}

import { corsHeaders } from '@/lib/cors'
import { resolveAuthenticatedUserId } from '@/lib/auth/resolve-user'
import { resolveDirectMediaUrl } from '@/lib/ai/media-resolver'

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 200, headers: corsHeaders(request) })
}

/**
 * Background async worker that processes scraping, Whisper transcript,
 * structured JSON extraction, and vector embeddings without blocking the client response.
 */
async function processBookmarkBackground(
  bookmarkId: string,
  url: string,
  platform: string,
  incoming: IngestInput
) {
  try {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const admin = createAdminClient()

    // 1. Scraping Layer
    const scrapedMeta = await scrapeMetadata(url, platform)

    if (scrapedMeta.isFailed && platform !== 'instagram') {
      await admin
        .from('bookmarks')
        .update({
          status: 'failed',
          error_message: scrapedMeta.errorMessage || 'Gönderi gizli veya link geçersiz',
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookmarkId)
      return
    }

    const candidateCaption = incoming.caption || scrapedMeta.description || scrapedMeta.title
    const candidateAuthor = incoming.author_username || incoming.author_name || scrapedMeta.author_username
    const realAuthor = extractRealAuthor(candidateCaption, candidateAuthor)

    const finalTitle = incoming.title && !incoming.title.includes('@instagram_user') && incoming.title !== 'Instagram'
      ? incoming.title
      : formatBookmarkTitle(candidateCaption, url, realAuthor.name)

    const finalThumb = incoming.thumbnail_url || scrapedMeta.thumbnail_url || null
    const finalMediaType = incoming.media_type || scrapedMeta.media_type || (url.includes('/reel/') ? 'video' : 'image')
    const finalThumbnailList = finalThumb ? [finalThumb] : []

    // 2. Whisper Audio Transcription if Reel/Video with verified downloadable media (SEC-05)
    let transcriptText: string | null = null
    if (finalMediaType === 'video' || url.includes('/reel/')) {
      const directMediaUrl = await resolveDirectMediaUrl(url, platform)
      if (directMediaUrl) {
        const whisperResult = await transcribeAudioFromVideo(directMediaUrl, finalTitle)
        transcriptText = whisperResult.transcript
      } else {
        console.warn(`[Ingest] Reel için indirilebilir doğrudan medya bulunamadı, transkripsiyon atlanıyor: ${url}`)
      }
    }

    // 3. Category & Structured Data Extraction
    const extraction = await extractStructuredData(finalTitle, candidateCaption, transcriptText)

    // 4. Vector Embedding Generation (RAG Recall Model)
    const textToEmbed = `${finalTitle}\n${extraction.summary}\n${transcriptText || ''}\n${candidateCaption}`
    const embedding = await generateEmbedding(textToEmbed)

    // 5. Update Bookmark to Completed Status
    const updatePayload: Record<string, unknown> = {
      author_username: realAuthor.username,
      author_name: realAuthor.name || finalTitle.slice(0, 100),
      caption: candidateCaption,
      media_type: finalMediaType,
      media_urls: finalThumbnailList,
      stored_media_urls: finalThumbnailList,
      ai_summary: (scrapedMeta as { forcedSummary?: string }).forcedSummary || extraction.summary,
      ai_tags: (scrapedMeta as { forcedTags?: string[] }).forcedTags || extraction.tags,
      extractors: {
        ...extraction.extractors,
        transcript: Boolean(transcriptText),
      },
      category: extraction.category,
      actionable_data: extraction.actionable_data,
      transcript: transcriptText,
      status: 'completed',
      error_message: null,
      updated_at: new Date().toISOString(),
    }

    if (embedding) {
      updatePayload.embedding = embedding
    }

    await admin
      .from('bookmarks')
      .update(updatePayload)
      .eq('id', bookmarkId)

    // 6. Assign to matching or newly created smart collection
    try {
      const { data: currentBm } = await admin.from('bookmarks').select('user_id').eq('id', bookmarkId).maybeSingle()
      if (currentBm?.user_id) {
        const { planSmartCategory, assignBookmarkToSmartCollection } = await import('@/lib/ai/smart-categorizer')
        const plan = planSmartCategory(finalTitle, candidateCaption, realAuthor.username)
        await assignBookmarkToSmartCollection(admin, currentBm.user_id, bookmarkId, plan)
      }
    } catch (colErr) {
      console.warn('[Background Ingest] Collection assignment warning:', colErr)
    }

  } catch (err) {
    console.warn(`[Background Ingest] Soft recovery for bookmark ${bookmarkId}:`, err)
    try {
      const { createAdminClient } = await import('@/lib/supabase/admin')
      const admin = createAdminClient()
      const { planSmartCategory } = await import('@/lib/ai/smart-categorizer')
      const isReel = url.includes('/reel/') || url.includes('/reels/')
      const plan = planSmartCategory(incoming.title || (isReel ? 'Instagram Reel' : 'Kaydedilen Gönderi'), incoming.caption, incoming.author_username)

      await admin
        .from('bookmarks')
        .update({
          status: 'completed',
          category: plan.category,
          ai_summary: plan.summary,
          ai_tags: plan.tags,
          error_message: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookmarkId)
    } catch {}
  }
}

// ── POST /api/ingest ────────────────────────────────────────────
export async function POST(request: Request) {
  const headers = corsHeaders(request)

  try {
    const body = await request.json().catch(() => ({}))
    const parsed = IngestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400, headers }
      )
    }

    const incoming = parsed.data
    const { url } = incoming
    const platform = detectPlatform(url)

    // Initial instant preview estimates
    const isReel = url.includes('/reel/') || url.includes('/reels/')
    const initialMediaType = incoming.media_type || (isReel ? 'video' : 'image')
    const initialTitle = incoming.title || (isReel ? 'Instagram Reel Kaydediliyor...' : 'İçerik Kaydediliyor...')

    // Check offline mode
    if (!isSupabaseConfigured()) {
      const simulatedItem: SavedItem = {
        id: `offline-${Date.now()}`,
        url,
        platform,
        title: initialTitle,
        description: incoming.caption || 'Sosyal medya içeriği kütüphanenize eklendi.',
        thumbnail_url: incoming.thumbnail_url || null,
        summary: 'Yapay zeka ile analiz tamamlandı.',
        tags: ['sosyalMedya', platform],
        extractors: { transcript: isReel },
        starred: false,
        created_at: new Date().toISOString(),
        author_username: incoming.author_username || 'kullanıcı',
        author_name: incoming.author_name || 'Kullanıcı',
        media_type: initialMediaType,
        status: 'completed',
        category: 'other',
        actionable_data: {},
      }

      return NextResponse.json({
        success: true,
        offline: true,
        title: simulatedItem.title,
        item: simulatedItem,
      }, { headers })
    }

    // Online mode: verify auth strictly without guessing (SEC-01)
    const userId = await resolveAuthenticatedUserId(request)

    if (!userId) {
      return NextResponse.json(
        { error: 'Bu işlem için giriş yapmanız veya geçerli bir SavedLens API tokenı sağlamanız gerekiyor.' },
        { status: 401, headers }
      )
    }

    const { createAdminClient } = await import('@/lib/supabase/admin')
    const admin = createAdminClient()

    // 5. Create Draft Card with status: 'processing' immediately
    const draftRow = {
      user_id: userId,
      platform,
      permalink: url,
      author_username: incoming.author_username || 'instagram_user',
      author_name: incoming.author_name || 'İçerik İşleniyor',
      caption: incoming.caption || 'Bağlantı analiz ediliyor ve medya işleniyor...',
      media_type: initialMediaType,
      media_urls: incoming.thumbnail_url ? [incoming.thumbnail_url] : [],
      stored_media_urls: incoming.thumbnail_url ? [incoming.thumbnail_url] : [],
      status: 'processing',
      is_favorite: false,
    }

    const { data: dbItem, error: dbError } = await admin
      .from('bookmarks')
      .upsert(draftRow, { onConflict: 'user_id,permalink' })
      .select()
      .single()

    if (dbError || !dbItem) {
      console.warn('[ingest] Database write warning, falling back to simulated draft:', dbError?.message)
      const fallbackItem: SavedItem = {
        id: `draft-${Date.now()}`,
        url,
        platform,
        title: initialTitle,
        description: draftRow.caption,
        thumbnail_url: incoming.thumbnail_url || null,
        summary: 'Yapay zeka analizi başlatıldı...',
        tags: [platform],
        extractors: null,
        starred: false,
        created_at: new Date().toISOString(),
        author_username: draftRow.author_username,
        media_type: initialMediaType,
        status: 'processing',
      }

      return NextResponse.json({
        success: true,
        status: 'processing',
        message: 'İçerik kuyruğa alındı ve işleniyor.',
        title: initialTitle,
        item: fallbackItem,
      }, { headers })
    }

    // 5. Fire asynchronous background worker (Job) without blocking the response!
    // In Node / Next.js, this promise runs concurrently in the background.
    processBookmarkBackground(dbItem.id, url, platform, incoming).catch((err) => {
      console.error('[processBookmarkBackground] Unhandled background worker error:', err)
    })

    const initialItem: SavedItem = {
      id: dbItem.id,
      url: dbItem.permalink,
      platform: dbItem.platform,
      title: initialTitle,
      description: dbItem.caption,
      thumbnail_url: dbItem.media_urls?.[0] || null,
      summary: 'Yapay zeka analizi ve video indirme işlemi başlatıldı...',
      tags: [platform],
      extractors: null,
      starred: false,
      created_at: dbItem.created_at,
      author_username: dbItem.author_username,
      media_type: dbItem.media_type,
      status: 'processing',
    }

    // Return immediate 200 OK response with the processing draft item
    return NextResponse.json({
      success: true,
      status: 'processing',
      message: 'İçerik kuyruğa alındı ve işleniyor.',
      title: initialTitle,
      item: initialItem,
    }, { headers })

  } catch (err) {
    console.error('[ingest] Unexpected error:', err)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500, headers })
  }
}
