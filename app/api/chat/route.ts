import 'server-only'
import { NextResponse } from 'next/server'
import { generateEmbedding } from '@/lib/ai/embeddings'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { isSupabaseConfigured, MOCK_SAVED_ITEMS, type SavedItem } from '@/lib/mock-data'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-savedlens-token, X-Requested-With',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS })
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface RetrievedBookmark {
  id: string
  permalink: string
  title: string
  summary: string | null
  description: string | null
  transcript: string | null
  category: string | null
  actionable_data: Record<string, unknown> | null
  thumbnail_url: string | null
}

export async function POST(request: Request) {
  try {
    const json = await request.json().catch(() => ({}))
    const { message, history = [] } = json

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Soru veya mesaj metni gereklidir.' }, { status: 400, headers: CORS_HEADERS })
    }

    const apiKey = process.env.OPENAI_API_KEY
    const isRealApiKey = apiKey && !apiKey.includes('your-openai') && apiKey.startsWith('sk-')

    let retrievedItems: RetrievedBookmark[] = []

    // 1. If Supabase is configured, retrieve via pgvector / semantic search
    if (isSupabaseConfigured()) {
      try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        const admin = createAdminClient()

        let userId = user?.id
        if (!userId) {
          const { data: profiles } = await admin.from('profiles').select('id').limit(1)
          if (profiles && profiles.length > 0) userId = profiles[0].id
        }

        // Vector search
        const queryVector = await generateEmbedding(message)
        if (queryVector) {
          const { data: matches, error: rpcError } = await admin.rpc('match_saved_items', {
            query_embedding: queryVector,
            match_threshold: 0.15,
            match_count: 5,
            p_user_id: userId || null,
          })

          if (!rpcError && Array.isArray(matches) && matches.length > 0) {
            retrievedItems = matches.map((m: RetrievedBookmark) => ({
              id: m.id,
              permalink: m.permalink,
              title: m.title || 'İçerik',
              summary: m.summary,
              description: m.description,
              transcript: m.transcript,
              category: m.category,
              actionable_data: m.actionable_data,
              thumbnail_url: m.thumbnail_url,
            }))
          }
        }

        // Fallback: search by keywords in Supabase
        if (retrievedItems.length === 0) {
          const searchKeywords = message.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3).slice(0, 3)
          let queryBuilder = admin
            .from('bookmarks')
            .select('id, permalink, author_name, author_username, caption, ai_summary, transcript, category, actionable_data, media_urls')
            .order('created_at', { ascending: false })
            .limit(5)

          if (userId) queryBuilder = queryBuilder.eq('user_id', userId)
          if (searchKeywords.length > 0) {
            queryBuilder = queryBuilder.ilike('caption', `%${searchKeywords[0]}%`)
          }

          const { data: fallbackRows } = await queryBuilder
          if (fallbackRows && fallbackRows.length > 0) {
            retrievedItems = fallbackRows.map((r) => ({
              id: r.id,
              permalink: r.permalink,
              title: r.author_name || r.author_username || 'Kayıtlı İçerik',
              summary: r.ai_summary,
              description: r.caption,
              transcript: r.transcript,
              category: r.category,
              actionable_data: r.actionable_data,
              thumbnail_url: r.media_urls?.[0] || null,
            }))
          }
        }
      } catch (dbErr) {
        console.warn('[Chat RAG] Database search warning:', dbErr)
      }
    }

    // 2. Offline / Mock fallback if no database items retrieved
    if (retrievedItems.length === 0) {
      const qLower = message.toLowerCase()
      const matchedMocks = MOCK_SAVED_ITEMS.filter((item: SavedItem) => {
        return (
          item.title?.toLowerCase().includes(qLower) ||
          item.description?.toLowerCase().includes(qLower) ||
          item.summary?.toLowerCase().includes(qLower) ||
          item.tags?.some((t) => qLower.includes(t.toLowerCase())) ||
          (qLower.includes('tarif') && item.category === 'recipe') ||
          (qLower.includes('kahve') && item.category === 'travel') ||
          (qLower.includes('yer') && item.category === 'travel')
        )
      }).slice(0, 5)

      retrievedItems = (matchedMocks.length > 0 ? matchedMocks : MOCK_SAVED_ITEMS.slice(0, 3)).map((m) => ({
        id: m.id,
        permalink: m.url,
        title: m.title || 'İçerik',
        summary: m.summary,
        description: m.description,
        transcript: m.transcript || null,
        category: m.category || null,
        actionable_data: (m.actionable_data as Record<string, unknown>) || null,
        thumbnail_url: m.thumbnail_url,
      }))
    }

    // 3. Build Context Prompt for LLM
    const contextLines = retrievedItems.map((item, idx) => {
      let extraInfo = ''
      if (item.actionable_data) {
        if ('ingredients' in item.actionable_data && Array.isArray(item.actionable_data.ingredients)) {
          extraInfo += `\n- Malzemeler: ${(item.actionable_data.ingredients as string[]).join(', ')}`
        }
        if ('locations' in item.actionable_data && Array.isArray(item.actionable_data.locations)) {
          extraInfo += `\n- Mekanlar: ${(item.actionable_data.locations as Array<{ name: string; city: string }>).map((l) => `${l.name} (${l.city})`).join(', ')}`
        }
        if ('estimated_price' in item.actionable_data) {
          extraInfo += `\n- Fiyat: ${item.actionable_data.estimated_price}`
        }
      }
      return `[İçerik ${idx + 1}]
Başlık: ${item.title}
Bağlantı: ${item.permalink}
Kategori: ${item.category || 'Belirtilmemiş'}
Özet: ${item.summary || item.description || '-'}
Ses Deşifresi (Transcript): ${item.transcript ? item.transcript.slice(0, 300) : 'Yok'}${extraInfo}`
    }).join('\n\n')

    // 4. If offline / no OpenAI key, return structured simulated answer
    if (!isRealApiKey) {
      let offlineAnswer = `SavedLens İkinci Beyin Kütüphanenizde **${retrievedItems.length}** ilgili içerik buldum:\n\n`
      retrievedItems.forEach((item) => {
        offlineAnswer += `• **[${item.title}](${item.permalink})**\n  _${item.summary || item.description?.slice(0, 100)}_\n`
        if (item.actionable_data && 'ingredients' in item.actionable_data) {
          const ings = (item.actionable_data.ingredients as string[]).slice(0, 3).join(', ')
          offlineAnswer += `  📋 _Öne çıkan malzemeler: ${ings}..._\n`
        }
        if (item.actionable_data && 'locations' in item.actionable_data) {
          const locs = (item.actionable_data.locations as Array<{ name: string }>).map((l) => l.name).join(', ')
          offlineAnswer += `  📍 _Önerilen lokasyonlar: ${locs}_\n`
        }
        offlineAnswer += '\n'
      })
      offlineAnswer += '💡 _Canlı OpenAI anahtarı tanımlandığında GPT-4o-mini derinlemesine RAG yanıtları üretecektir._'

      return NextResponse.json({
        success: true,
        answer: offlineAnswer,
        sources: retrievedItems,
        offline: true,
      }, { headers: CORS_HEADERS })
    }

    // 5. Generate RAG Answer with GPT-4o-mini
    const systemPrompt = `Sen SavedLens İkinci Beyin Yapay Zeka Asistanısın (Recall, Quiki ve Sorti benzeri multimodal akıllı kütüphane asistanı).
Kullanıcının kaydettiği Instagram Reels, TikTok ve web içeriklerine tam erişimin var.

KULLANICININ KÜTÜPHANESİNDEN ÇEKİLEN BAĞLAM:
${contextLines}

TALİMATLAR:
1. Kullanıcının sorusunu yalnızca ve doğrudan yukarıdaki kütüphane bağlamına dayanarak yanıtla.
2. Bahsettiğin her içerik için mutlaka [İçerik Başlığı](Bağlantı) formatında tıklanabilir bağlantı ver.
3. Eğer soru bir tarifle ilgiliyse: malzemeleri ve püf noktalarını maddeler halinde listele.
4. Eğer mekan/geziyle ilgiliyse: mekan isimlerini ve konum bilgilerini net olarak belirt.
5. Samimi, net, son derece yararlı ve profesyonel bir Türkçe kullan.`

    const apiMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-4).map((h: { role: string; content: string }) => ({
        role: h.role as 'user' | 'assistant',
        content: h.content,
      })),
      { role: 'user', content: message },
    ]

    const completionRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: apiMessages,
        temperature: 0.3,
        max_tokens: 800,
      }),
      signal: AbortSignal.timeout(25000),
    })

    if (!completionRes.ok) {
      throw new Error(`OpenAI API error ${completionRes.status}`)
    }

    const compData = await completionRes.json()
    const answer = compData.choices?.[0]?.message?.content || 'Yanıt üretilemedi.'

    return NextResponse.json({
      success: true,
      answer,
      sources: retrievedItems,
    }, { headers: CORS_HEADERS })

  } catch (err) {
    console.error('[Chat API] Error:', err)
    return NextResponse.json(
      { error: 'Yapay zeka asistanı yanıt verirken bir hata oluştu.' },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}
