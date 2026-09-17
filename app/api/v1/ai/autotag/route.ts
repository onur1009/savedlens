import 'server-only'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { isSupabaseConfigured } from '@/lib/mock-data'

const AutoTagSchema = z.object({
  caption: z.string().optional(),
  text: z.string().optional(),
  bookmark_id: z.string().optional(),
})

export async function POST(request: Request) {
  try {
    const json = await request.json()
    const parsed = AutoTagSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const contentText = (parsed.data.caption || parsed.data.text || '').trim()
    const apiKey = process.env.OPENAI_API_KEY
    const isRealApiKey = apiKey && !apiKey.includes('your-openai') && apiKey.startsWith('sk-')

    // If no text or no real API key, return smart defaults/fallback
    if (!contentText || !isRealApiKey) {
      const fallbackTags: string[] = []
      if (/tarif|yemek|tatlı|kek|mutfak/i.test(contentText)) fallbackTags.push('tarif', 'yemek')
      if (/istanbul|mekan|restoran|otel|cafe|gezi/i.test(contentText)) fallbackTags.push('istanbul', 'mekan', 'seyahat')
      if (/indirim|kod|kupon|fırsat|kampanya/i.test(contentText)) fallbackTags.push('indirim', 'fırsat')
      if (/kod|react|nextjs|javascript|python|yazılım/i.test(contentText)) fallbackTags.push('yazılım', 'teknoloji')
      if (/tasarım|ui|ux|figma|trend/i.test(contentText)) fallbackTags.push('tasarım', 'ui')
      if (fallbackTags.length === 0) fallbackTags.push('içerik', 'sosyalMedya', 'kaydedilen')

      const fallbackSummary = contentText
        ? contentText.slice(0, 120) + (contentText.length > 120 ? '...' : '')
        : 'Kaydedilen sosyal medya içeriği.'

      return NextResponse.json({
        success: true,
        offline: true,
        summary: fallbackSummary,
        tags: fallbackTags,
        extractors: {
          recipe: /tarif|yemek|tatlı|malzeme/i.test(contentText),
          location: /istanbul|mekan|restoran|otel|cafe/i.test(contentText),
          discount: /indirim|kod|kupon|fırsat/i.test(contentText),
          code: /kod|yazılım|react|nextjs/i.test(contentText),
        },
      })
    }

    const prompt = `Sen bir sosyal medya içerik analiz uzmanısın (SavedLens tarzı).
Aşağıdaki gönderi metnini analiz et:
"${contentText}"

Görevler:
1. Türkçe 2 cümlelik net bir özet oluştur (summary).
2. İçeriğin konusunu en iyi anlatan 3 ila 5 adet Türkçe tek kelimelik etiket belirle (tags).
3. Varsa eyleme dönüştürülebilir ögeleri işaretle (extractors boolean nesnesi):
   - "recipe": Yemek tarifi / pişirme adımı var mı?
   - "location": Şehir, mekan, restoran veya gezi noktası var mı?
   - "discount": İndirim kodu, kupon veya kampanya var mı?
   - "code": Kod parçası veya yazılım kütüphanesi var mı?

Yanıtını SADECE şu JSON yapısında ver:
{
  "summary": "...",
  "tags": ["etiket1", "etiket2", "etiket3"],
  "extractors": {
    "recipe": false,
    "location": false,
    "discount": false,
    "code": false
  }
}`

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
        temperature: 0.2,
        max_tokens: 350,
      }),
      signal: AbortSignal.timeout(15000),
    })

    if (!res.ok) {
      throw new Error(`OpenAI API error ${res.status}`)
    }

    const data = await res.json()
    const result = JSON.parse(data.choices[0].message.content)

    // If online and bookmark_id provided, update bookmark record
    if (parsed.data.bookmark_id && isSupabaseConfigured()) {
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = await createClient()
      await supabase
        .from('bookmarks')
        .update({
          ai_summary: result.summary,
          ai_tags: result.tags,
          extractors: result.extractors,
          updated_at: new Date().toISOString(),
        })
        .eq('id', parsed.data.bookmark_id)
    }

    return NextResponse.json({
      success: true,
      summary: result.summary,
      tags: result.tags,
      extractors: result.extractors,
    })
  } catch (err) {
    console.error('AI Auto-tag error:', err)
    return NextResponse.json({
      success: false,
      error: 'AI etiketleme gerçekleştirilemedi',
      summary: null,
      tags: ['içerik'],
      extractors: {},
    }, { status: 500 })
  }
}
