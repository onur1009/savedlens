import 'server-only'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { translateBookmarkContent } from '@/lib/ai/translator'

export const maxDuration = 60

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { bookmark_id, apiKey: clientApiKey } = body

    if (!bookmark_id) {
      return NextResponse.json({ error: 'bookmark_id parametresi gereklidir' }, { status: 400 })
    }

    const admin = createAdminClient()

    // 1. Fetch bookmark
    let bm: any = null
    if (user) {
      const { data } = await admin
        .from('bookmarks')
        .select('*')
        .eq('id', bookmark_id)
        .eq('user_id', user.id)
        .maybeSingle()
      bm = data
    }

    if (!bm) {
      const { data, error: fetchErr } = await admin
        .from('bookmarks')
        .select('*')
        .eq('id', bookmark_id)
        .maybeSingle()

      if (fetchErr || !data) {
        return NextResponse.json({ error: 'Gönderi bulunamadı' }, { status: 404 })
      }
      bm = data
    }

    const effectiveApiKey = clientApiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY

    // If existing actionable_data already has translation, preserve or retranslate
    const actData = (bm.actionable_data || {}) as Record<string, unknown>
    const originalTitle = (actData.original_title as string) || bm.title
    const originalCaption = (actData.original_caption as string) || bm.caption
    const originalTranscript = (actData.original_transcript as string) || bm.transcript

    const translation = await translateBookmarkContent({
      title: originalTitle,
      caption: originalCaption,
      transcript: originalTranscript,
      platform: bm.platform,
      apiKeyOverride: effectiveApiKey,
    })

    const updatedActionableData = {
      ...actData,
      original_title: originalTitle,
      original_caption: originalCaption,
      original_transcript: originalTranscript,
      translated_title: translation.translatedTitle,
      translated_caption: translation.translatedCaption,
      translated_transcript: translation.translatedTranscript,
      is_translated: true,
    }

    const updatedExtractors = {
      ...(typeof bm.extractors === 'object' && bm.extractors !== null ? bm.extractors : {}),
      ...(translation.translatedTranscript ? { transcript: true } : {}),
    }

    // Update in database
    const { error: updateErr } = await admin
      .from('bookmarks')
      .update({
        actionable_data: updatedActionableData,
        extractors: updatedExtractors,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookmark_id)

    if (updateErr) {
      console.warn('[Translate Route] DB update error:', updateErr)
    }

    return NextResponse.json({
      success: true,
      translated_title: translation.translatedTitle,
      translated_caption: translation.translatedCaption,
      translated_transcript: translation.translatedTranscript,
      original_title: originalTitle,
      original_caption: originalCaption,
      original_transcript: originalTranscript,
      is_translated: true,
      message: 'Gönderi başlığı, açıklaması ve deşifresi başarıyla Türkçeye çevrildi! 🇹🇷',
    })
  } catch (err) {
    console.error('[Translate Route Error]:', err)
    return NextResponse.json(
      { error: 'Çeviri sırasında bir hata oluştu: ' + (err instanceof Error ? err.message : String(err)) },
      { status: 500 }
    )
  }
}
