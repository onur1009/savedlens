import 'server-only'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { transcribeVideoToScript } from '@/lib/ai/video-transcriber'
import { GoogleGenerativeAI } from '@google/generative-ai'

export const maxDuration = 60

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // In production require auth, but permit testing in dev/internal environments
    if (!user && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { bookmark_id, apiKey: clientApiKey, audio_base64, mime_type } = body

    if (!bookmark_id) {
      return NextResponse.json({ error: 'bookmark_id parametresi gereklidir' }, { status: 400 })
    }

    const admin = createAdminClient()

    // 1. Fetch bookmark (user-scoped first, then admin fallback for imported/demo items)
    let bm: any = null
    if (user) {
      const { data } = await admin
        .from('bookmarks')
        .select('id, user_id, permalink, caption, author_name, author_username, media_type, media_urls, stored_media_urls, platform, extractors, actionable_data')
        .eq('id', bookmark_id)
        .eq('user_id', user.id)
        .maybeSingle()
      bm = data
    }

    if (!bm) {
      const { data, error: fetchErr } = await admin
        .from('bookmarks')
        .select('id, user_id, permalink, caption, author_name, author_username, media_type, media_urls, stored_media_urls, platform, extractors, actionable_data')
        .eq('id', bookmark_id)
        .maybeSingle()

      if (fetchErr || !data) {
        return NextResponse.json({ error: 'Gönderi bulunamadı' }, { status: 404 })
      }
      bm = data
    }

    const effectiveApiKey = clientApiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY
    let finalTranscript: string | null = null
    let finalOriginalTranscript: string | null = null
    let isTranslated: boolean = false
    let source: string = 'ai_script_generator'

    // 2. If user uploaded a direct audio/video clip
    if (audio_base64) {
      if (!effectiveApiKey || effectiveApiKey.includes('your-') || effectiveApiKey.length < 10) {
        return NextResponse.json({
          error: 'Ses/video dosyasını doğrudan dinlemek için geçerli bir Gemini API Anahtarı gereklidir. Lütfen modal üzerinden veya Ayarlar sayfasından anahtarınızı girin.',
        }, { status: 400 })
      }

      try {
        const genAI = new GoogleGenerativeAI(effectiveApiKey)
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

        const prompt = `Aşağıdaki ses/video kaydını dinle ve içindeki konuşmaları döküme aktar.
Kurallar:
1. Videodaki konuşma yabancı dilde ise (İngilizce vb.), konuşmaları akıcı, doğal ve eksiksiz bir şekilde TÜRKÇE "Video Scripti / Konuşma Dökümü" olarak yaz.
Ardından tam altına "---ORIGINAL_TRANSCRIPT---" ayracını ekle ve bu ayracın altına videoda duyulan orijinal yabancı dildeki konuşma dökümünü yaz.
2. Videodaki konuşma zaten Türkçe ise, doğrudan Türkçe konuşma scriptini yaz (ayraç ekleme).
3. Varsa adımları, ipuçlarını veya tarif listesini paragraflar halinde düzenle.
4. Sadece konuşma scripti metnini yaz, başına veya sonuna ekstra açıklama ekleme.`

        const result = await model.generateContent([
          prompt,
          {
            inlineData: {
              data: audio_base64,
              mimeType: mime_type || 'audio/mp3',
            },
          },
        ])

        const text = result.response.text()?.trim()
        if (text && text.length > 10) {
          if (text.includes('---ORIGINAL_TRANSCRIPT---')) {
            const parts = text.split('---ORIGINAL_TRANSCRIPT---')
            finalTranscript = parts[0].trim()
            finalOriginalTranscript = parts[1]?.trim() || null
            isTranslated = true
          } else {
            finalTranscript = text
            finalOriginalTranscript = null
            isTranslated = false
          }
          source = 'direct_user_audio'
        }
      } catch (uploadErr) {
        console.warn('[Transcribe Route] Direct audio processing error:', uploadErr)
        const errMsg = uploadErr instanceof Error ? uploadErr.message : String(uploadErr)
        if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('API key not valid')) {
          return NextResponse.json({ error: 'Girilen Gemini API anahtarı geçersiz. Lütfen anahtarınızı kontrol edin.' }, { status: 400 })
        }
        if (errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('quota')) {
          return NextResponse.json({ error: 'Gemini API kotanız dolmuş görünüyor. Lütfen daha sonra tekrar deneyin.' }, { status: 429 })
        }
      }
    }

    // 3. Automated Video Transcription / Voiceover Generation Engine
    if (!finalTranscript) {
      const title = bm.caption ? bm.caption.slice(0, 100) : `${bm.author_username || 'Kullanıcı'} Reels Videosu`
      const transcribeResult = await transcribeVideoToScript({
        mediaUrl: (bm.stored_media_urls && bm.stored_media_urls[0]) || (bm.media_urls && bm.media_urls[0]) || null,
        storedMediaUrls: bm.stored_media_urls,
        title,
        caption: bm.caption,
        platform: bm.platform,
        apiKeyOverride: effectiveApiKey,
      })

      finalTranscript = transcribeResult.transcript
      finalOriginalTranscript = transcribeResult.originalTranscript || null
      isTranslated = Boolean(transcribeResult.isTranslated)
      source = transcribeResult.source || 'ai_contextual_script'
    }

    if (!finalTranscript) {
      return NextResponse.json({
        error: 'Video konuşma dökümü çıkarılamadı. Gönderide ses veya açıklama bulunmuyor olabilir.',
      }, { status: 422 })
    }

    // 4. Update bookmark in database using admin client to ensure reliable write
    const updatedExtractors = {
      ...(typeof bm.extractors === 'object' && bm.extractors !== null ? bm.extractors : {}),
      transcript: true,
    }

    const updatedActionableData = {
      ...(typeof bm.actionable_data === 'object' && bm.actionable_data !== null ? bm.actionable_data : {}),
      ...(finalOriginalTranscript ? { original_transcript: finalOriginalTranscript } : {}),
      is_translated: isTranslated,
    }

    const { error: updateErr } = await admin
      .from('bookmarks')
      .update({
        transcript: finalTranscript,
        extractors: updatedExtractors,
        actionable_data: updatedActionableData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookmark_id)

    if (updateErr) {
      console.warn('[Transcribe Route] DB update error:', updateErr)
    }

    return NextResponse.json({
      success: true,
      transcript: finalTranscript,
      original_transcript: finalOriginalTranscript,
      is_translated: isTranslated,
      source,
      message: isTranslated
        ? 'Video dinlendi, Türkçe seslendirme metnine çevrildi ve orijinal metin korundu! 🇹🇷'
        : 'Video dinlendi ve konuşma scripti başarıyla oluşturuldu! 🎉',
    })
  } catch (err) {
    console.error('[Transcribe Route Error]:', err)
    return NextResponse.json(
      { error: 'Deşifre sırasında bir hata oluştu: ' + (err instanceof Error ? err.message : String(err)) },
      { status: 500 }
    )
  }
}
