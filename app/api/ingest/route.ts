import 'server-only'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { isSupabaseConfigured } from '@/lib/mock-data'

// ── Schema ──────────────────────────────────────────────────────
const IngestSchema = z.object({
  url: z.string().url('Geçerli bir URL giriniz'),
})

// ── Platform detection ──────────────────────────────────────────
function detectPlatform(url: string): string {
  if (/instagram\.com/i.test(url)) return 'instagram'
  if (/tiktok\.com/i.test(url)) return 'tiktok'
  if (/youtube\.com|youtu\.be/i.test(url)) return 'youtube'
  if (/twitter\.com|x\.com/i.test(url)) return 'twitter'
  if (/linkedin\.com/i.test(url)) return 'linkedin'
  return 'web'
}

// ── Metadata scraper (server-side, no CORS) ────────────────────
async function scrapeMetadata(url: string) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(6000),
    })

    if (!res.ok) throw new Error(`HTTP ${res.status}`)
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

    return { title, description, thumbnail_url }
  } catch {
    // Graceful fallback defaults based on domain
    let guessedTitle = 'Kaydedilen İçerik'
    let guessedThumbnail = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80'

    if (url.includes('instagram.com')) {
      guessedTitle = 'Instagram Gönderisi'
      guessedThumbnail = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&q=80'
    } else if (url.includes('tiktok.com')) {
      guessedTitle = 'TikTok Videosu'
      guessedThumbnail = 'https://images.unsplash.com/photo-1445116572660-236099ec97a0?w=800&q=80'
    } else if (url.includes('youtube.com') || url.includes('youtu.be')) {
      guessedTitle = 'YouTube Videosu'
      guessedThumbnail = 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80'
    } else if (url.includes('linkedin.com')) {
      guessedTitle = 'LinkedIn Paylaşımı'
      guessedThumbnail = 'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=800&q=80'
    }

    return { title: guessedTitle, description: url, thumbnail_url: guessedThumbnail }
  }
}

// ── Smart summary with OpenAI & Offline Fallback ────────────────
async function generateSummary(
  title: string | null,
  description: string | null
): Promise<{ summary: string | null; tags: string[]; extractors: Record<string, boolean> }> {
  const combined = `${title ?? ''} ${description ?? ''}`.toLowerCase()
  const apiKey = process.env.OPENAI_API_KEY
  const isRealApiKey = apiKey && !apiKey.includes('your-openai') && apiKey.startsWith('sk-')

  // Offline / rule-based fallback
  if (!isRealApiKey) {
    const tags: string[] = []
    if (/tarif|yemek|tatlı|kek|mutfak|lezzet/i.test(combined)) tags.push('tarif', 'yemek')
    if (/istanbul|mekan|restoran|otel|cafe|gezi/i.test(combined)) tags.push('istanbul', 'mekan', 'seyahat')
    if (/indirim|kod|kupon|fırsat|kampanya/i.test(combined)) tags.push('indirim', 'fırsat')
    if (/kod|react|nextjs|javascript|python|yazılım/i.test(combined)) tags.push('yazılım', 'teknoloji')
    if (/tasarım|ui|ux|figma|trend/i.test(combined)) tags.push('tasarım', 'ui')
    if (tags.length === 0) tags.push('kaydedilen', 'sosyalMedya')

    const summary = title
      ? `${title} — Yapay zeka ile otomatik özetlendi ve kütüphanenize eklendi.`
      : 'Sosyal medya bağlantısı başarıyla kaydedildi.'

    return {
      summary,
      tags,
      extractors: {
        recipe: /tarif|yemek|tatlı/i.test(combined),
        location: /istanbul|mekan|restoran|cafe/i.test(combined),
        discount: /indirim|kod|kupon/i.test(combined),
        code: /kod|yazılım|react|nextjs/i.test(combined),
      },
    }
  }

  // OpenAI live call
  const prompt = `Sen bir içerik analiz asistanısın.
İçerik başlığı: ${title ?? '-'}
İçerik açıklaması: ${description ?? '-'}

Görevlerin:
1. Türkçe 2 cümlelik özet yaz (summary)
2. 3-5 Türkçe etiket belirle (tags) — JSON string array olarak
3. İçeriğin türünü tespit et (extractors boolean nesnesi): recipe, location, discount, code

Yanıtı SADECE şu JSON formatında ver:
{
  "summary": "...",
  "tags": ["...", "..."],
  "extractors": { "recipe": false, "location": false, "discount": false, "code": false }
}`

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 300,
      }),
      signal: AbortSignal.timeout(15000),
    })

    if (!res.ok) throw new Error(`OpenAI error ${res.status}`)
    const data = await res.json()
    const parsed = JSON.parse(data.choices[0].message.content)
    return {
      summary: parsed.summary ?? null,
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      extractors: typeof parsed.extractors === 'object' ? parsed.extractors : {},
    }
  } catch {
    return {
      summary: title ? `${title} hakkında özet.` : null,
      tags: ['içerik'],
      extractors: {},
    }
  }
}

// ── POST /api/ingest ────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = IngestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { url } = parsed.data
    const platform = detectPlatform(url)

    // Parallel: scrape + AI
    const meta = await scrapeMetadata(url)
    const { summary, tags, extractors } = await generateSummary(
      meta.title,
      meta.description
    )

    // Check offline mode
    if (!isSupabaseConfigured()) {
      const simulatedItem = {
        id: `offline-${Date.now()}`,
        url,
        platform,
        title: meta.title || url,
        description: meta.description || 'Sosyal medyadan kaydedilen içerik.',
        thumbnail_url: meta.thumbnail_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80',
        summary,
        tags,
        extractors,
        starred: false,
        created_at: new Date().toISOString(),
        author_username: platform === 'instagram' ? 'instagram_user' : 'user',
        media_type: 'image',
        stored_media_urls: meta.thumbnail_url ? [meta.thumbnail_url] : [],
      }

      return NextResponse.json({
        success: true,
        offline: true,
        title: simulatedItem.title,
        item: simulatedItem,
      })
    }

    // Online mode: verify auth and upsert into Supabase
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const { data: item, error: dbError } = await supabase
      .from('saved_items')
      .upsert(
        {
          user_id: user.id,
          url,
          platform,
          title: meta.title,
          description: meta.description,
          thumbnail_url: meta.thumbnail_url,
          summary,
          tags,
          extractors,
        },
        { onConflict: 'user_id,url', ignoreDuplicates: false }
      )
      .select()
      .single()

    if (dbError) {
      console.error('[ingest] DB error:', dbError)
      return NextResponse.json({ error: 'Veritabanı hatası' }, { status: 500 })
    }

    return NextResponse.json({ success: true, title: item.title ?? url, item })
  } catch (err) {
    console.error('[ingest] Unexpected error:', err)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
