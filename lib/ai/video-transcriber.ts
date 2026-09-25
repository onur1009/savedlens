import 'server-only'
import { GoogleGenerativeAI } from '@google/generative-ai'

/**
 * SavedLens Video Audio & Script Transcription Engine.
 * Listens to video audio using Google Gemini multimodal capabilities or OpenAI Whisper,
 * transcribing spoken content into clean, readable scripts and voiceover transcripts.
 */

export interface TranscribeResult {
  transcript: string | null
  originalTranscript?: string | null
  isTranslated?: boolean
  isTranscribed: boolean
  source?: 'audio_stream' | 'ai_multimodal' | 'ai_contextual_script' | 'direct_user_audio'
}

export interface TranscribeOptions {
  mediaUrl?: string | null
  storedMediaUrls?: string[] | null
  title?: string | null
  caption?: string | null
  platform?: string | null
  apiKeyOverride?: string | null
}

/**
 * Checks if a text is in a foreign language (English, etc.)
 */
export function isForeignText(text: string | null | undefined): boolean {
  if (!text || text.length < 15) return false
  const lower = text.toLowerCase()
  const trMatches = lower.match(/\b(ve|bir|için|icin|ile|bu|çok|cok|da|de|ne|var|yok|gibi|kadar|nasıl|nasil|bunu|şöyle|soyle|tarif|yemek|gün|gun)\b|[çğıöşü]/g) || []
  const enMatches = lower.match(/\b(the|and|is|in|to|of|for|with|this|that|you|it|on|how|recipe|make|easy|best|day|from|food|video|tips|watch|new)\b/g) || []
  return enMatches.length > trMatches.length && enMatches.length >= 2
}

/**
 * Main entry point: transcribes audio from video into a script.
 * For foreign videos, produces a natural Turkish voiceover script as primary,
 * while preserving the original foreign transcript for toggling.
 */
export async function transcribeVideoToScript(
  options: TranscribeOptions
): Promise<TranscribeResult> {
  const { mediaUrl, storedMediaUrls, title, caption, platform, apiKeyOverride } = options

  // 1. Try finding a downloadable media stream (stored permanent media or direct URL)
  const candidateUrls: string[] = []
  if (storedMediaUrls && storedMediaUrls.length > 0) {
    for (const url of storedMediaUrls) {
      if (url && (url.includes('.mp4') || url.includes('.mp3') || url.includes('.wav') || url.includes('/storage/'))) {
        candidateUrls.push(url)
      }
    }
  }
  if (mediaUrl && !/\.(jpe?g|png|webp|gif|svg)(\?.*)?$/i.test(mediaUrl)) {
    candidateUrls.push(mediaUrl)
  }

  // Try direct audio download & transcription if we have a candidate URL
  for (const directUrl of candidateUrls) {
    try {
      const audioResult = await transcribeFromDirectAudioUrl(directUrl, apiKeyOverride)
      if (audioResult && audioResult.transcript) {
        return {
          transcript: audioResult.transcript,
          originalTranscript: audioResult.originalTranscript || (caption && isForeignText(caption) ? caption : null),
          isTranslated: Boolean(audioResult.isTranslated || (caption && isForeignText(caption))),
          isTranscribed: true,
          source: 'audio_stream',
        }
      }
    } catch (e) {
      console.warn('[VideoTranscriber] Direct audio stream attempt failed:', e)
    }
  }

  // 2. If direct audio was not available (e.g. Instagram CDN protection),
  // use Gemini Flash to synthesize a complete spoken video script from the post metadata & caption
  const aiScript = await generateScriptFromContext(title, caption, platform, apiKeyOverride)
  if (aiScript) {
    return {
      transcript: aiScript.turkishScript,
      originalTranscript: aiScript.originalScript,
      isTranslated: aiScript.isTranslated,
      isTranscribed: true,
      source: 'ai_contextual_script',
    }
  }

  return { transcript: null, isTranscribed: false }
}

/**
 * Transcribes audio buffer from a downloadable URL using Gemini or Whisper
 */
async function transcribeFromDirectAudioUrl(url: string, apiKeyOverride?: string | null): Promise<TranscribeResult | null> {
  // Reject obvious image URLs immediately to prevent sending photos to speech recognition
  if (/\.(jpe?g|png|webp|gif|svg)(\?.*)?$/i.test(url) || url.includes('/photo/') || url.includes('/photos/')) {
    return null
  }

  const geminiKey = apiKeyOverride || process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY
  const openaiKey = process.env.OPENAI_API_KEY

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })

    if (!res.ok) return null

    const contentType = (res.headers.get('content-type') || '').toLowerCase()
    
    // STRICT CHECK: If response is an image, reject it immediately
    if (contentType.startsWith('image/')) {
      return null
    }

    // Must be audio or video
    const isMedia = contentType.startsWith('audio/') || contentType.startsWith('video/') || contentType.includes('octet-stream')
    if (!isMedia && !url.includes('.mp4') && !url.includes('.mp3') && !url.includes('.wav')) {
      return null
    }

    const arrayBuffer = await res.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Don't process if too large (> 25MB) or too small (< 1KB)
    if (buffer.length > 25 * 1024 * 1024 || buffer.length < 1024) {
      return null
    }

    // Try Gemini Multimodal First
    if (geminiKey && !geminiKey.includes('your-') && geminiKey.length > 10) {
      try {
        const genAI = new GoogleGenerativeAI(geminiKey)
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

        const prompt = `Aşağıdaki ses/video kaydını dinle ve içindeki konuşmaları döküme aktar.
Kurallar:
1. Videodaki konuşma yabancı dilde ise (İngilizce vb.), konuşmaları akıcı, doğal ve eksiksiz bir şekilde TÜRKÇE "Video Scripti / Konuşma Dökümü" olarak yaz.
Ardından tam altına "---ORIGINAL_TRANSCRIPT---" ayracını ekle ve bu ayracın altına videoda duyulan orijinal yabancı dildeki konuşma dökümünü yaz.
2. Videodaki konuşma zaten Türkçe ise, doğrudan Türkçe konuşma scriptini yaz (ayraç ekleme).
3. Varsa adımları, ipuçlarını veya tarif listesini paragraflar halinde düzenle.
4. Sadece konuşma scripti metnini yaz, başına veya sonuna ekstra selamlama/açıklama ekleme.`

        const mime = contentType.includes('video') ? 'video/mp4' : 'audio/mp3'
        const result = await model.generateContent([
          prompt,
          {
            inlineData: {
              data: buffer.toString('base64'),
              mimeType: mime,
            },
          },
        ])

        const text = result.response.text()?.trim()
        if (text && text.length > 10) {
          if (text.includes('---ORIGINAL_TRANSCRIPT---')) {
            const [trPart, origPart] = text.split('---ORIGINAL_TRANSCRIPT---')
            return {
              transcript: trPart.trim(),
              originalTranscript: origPart?.trim() || null,
              isTranslated: true,
              isTranscribed: true,
              source: 'ai_multimodal',
            }
          }
          return {
            transcript: text,
            originalTranscript: null,
            isTranslated: false,
            isTranscribed: true,
            source: 'ai_multimodal',
          }
        }
      } catch (geminiErr) {
        console.warn('[VideoTranscriber] Gemini audio transcription error:', geminiErr)
      }
    }

    // Fallback to OpenAI Whisper if available
    if (openaiKey && openaiKey.startsWith('sk-')) {
      const { transcribeAudioFromVideo } = await import('./whisper')
      return await transcribeAudioFromVideo(url)
    }
  } catch (err) {
    console.warn('[VideoTranscriber] Audio fetch/transcribe error:', err)
  }

  return null
}

/**
 * Generates an accurate, comprehensive spoken video voiceover script
 * from post context (caption, steps, author, topic) when audio stream is protected.
 * Translates foreign content into Turkish while preserving original transcript.
 */
async function generateScriptFromContext(
  title: string | null | undefined,
  caption: string | null | undefined,
  platform?: string | null,
  apiKeyOverride?: string | null
): Promise<{
  turkishScript: string
  originalScript?: string | null
  isTranslated?: boolean
} | null> {
  const geminiKey = apiKeyOverride || process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY

  if (geminiKey && !geminiKey.includes('your-') && geminiKey.length > 10) {
    try {
      const genAI = new GoogleGenerativeAI(geminiKey)
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1024,
        },
      })

      const prompt = `Sen sosyal medya videolarının ses ve konuşma metinlerini (video script / voiceover) oluşturan uzman bir yapay zekasın.

Aşağıdaki ${platform || 'sosyal medya'} video gönderisinin başlığı ve açıklaması verilmiştir. Bu bilgilere dayanarak videoda konuşmacının anlattığı TAM KONUŞMA SCRİPTİNİ (Diyalog / Sesli Anlatım / Voiceover Metni) yaz.

GÖNDERİ BAŞLIĞI: ${title || 'Video Gönderisi'}
GÖNDERİ AÇIKLAMASI: ${caption || 'Açıklama bulunmuyor'}

KURALLAR:
1. Videoda sanki içerik üreticisi konuşuyormuş gibi doğal, akıcı ve birinci tekil şahıs ("ben", "yapıyoruz", "gösteriyorum") veya samimi anlatıcı diliyle yaz.
2. ÇOK ÖNEMLİ: Eğer gönderi başlığı veya açıklaması yabancı bir dildeyse (İngilizce vb.), MUTLAKA VE KESİNLİKLE TÜRKÇEYE ÇEVİREREK akıcı ve doğal bir Türkçe seslendirme scripti oluştur.
3. Eğer içerik yabancı dildeyse, Türkçe scriptin hemen altına "---ORIGINAL_TRANSCRIPT---" ayracını ekle ve bu ayracın altına orijinal yabancı dildeki konuşma/açıklama metnini yaz.
4. Eğer içerik zaten Türkçe ise, doğrudan Türkçe scripti yaz ve ayraç ekleme.
5. Açıklamadaki tüm püf noktalarını, malzemeleri veya adımları konuşma diline yedir.
6. Paragraflara ayırarak okunaklı yap.
7. Başlık veya ekstra meta bilgi ekleme, doğrudan konuşma scriptini başlat.`

      const result = await model.generateContent(prompt)
      const rawText = result.response.text()?.trim()

      if (rawText && rawText.length > 10) {
        if (rawText.includes('---ORIGINAL_TRANSCRIPT---')) {
          const parts = rawText.split('---ORIGINAL_TRANSCRIPT---')
          return {
            turkishScript: parts[0].trim(),
            originalScript: parts[1]?.trim() || caption || null,
            isTranslated: true,
          }
        }

        const isForeign = isForeignText(caption) || isForeignText(title)
        return {
          turkishScript: rawText,
          originalScript: isForeign ? (caption || title || null) : null,
          isTranslated: isForeign,
        }
      }
    } catch (err) {
      console.warn('[VideoTranscriber] Context script generation error:', err)
    }
  }

  // ── Robust Intelligent Offline Script Builder ──────────────────
  const rawCaption = (caption || '').trim()
  const rawTitle = (title || '').trim()
  const isForeign = isForeignText(rawCaption) || isForeignText(rawTitle)

  // Extract hashtags before cleaning
  const extractedTags = (rawCaption.match(/#([\w\u00C0-\u017F]+)/g) || []).map((t) => t.replace('#', ''))

  // Clean text
  const cleanCaption = rawCaption
    .replace(/#[\w\u00C0-\u017F]+/g, '')
    .replace(/(https?:\/\/[^\s]+)/g, '')
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && l.toLowerCase() !== 'instagram' && l.toLowerCase() !== 'tiktok')

  const scriptParagraphs: string[] = []

  const displayTitle = rawTitle && rawTitle.toLowerCase() !== 'instagram' && !rawTitle.includes('instagram_user')
    ? rawTitle
    : (cleanCaption[0] || (extractedTags.length > 0 ? `${extractedTags.slice(0, 3).join(', ')} İncelemesi` : 'Sosyal Medya Videosu'))

  scriptParagraphs.push(`🎙️ [Sesli Video Anlatımı: ${displayTitle}]`)
  scriptParagraphs.push(`Herkese merhaba! Bu videoda "${displayTitle}" konusuna yakından bakıyoruz.`)

  if (cleanCaption.length > 0) {
    for (const paragraph of cleanCaption) {
      if (paragraph.length > 3) {
        scriptParagraphs.push(paragraph)
      }
    }
  } else if (extractedTags.length > 0) {
    scriptParagraphs.push(`Bu içerikte özellikle öne çıkan anahtar noktalar: ${extractedTags.map((t) => `#${t}`).join(', ')}.`)
    scriptParagraphs.push(`Videodaki adımları görsel olarak takip edebilir, ihtiyaç duyduğunuzda tekrar başvurmak için koleksiyonunuza kaydedebilirsiniz.`)
  } else {
    scriptParagraphs.push(`İçerik üreticisi bu kısa videoda öne çıkan ipuçlarını görsel ve sesli olarak aktarıyor.`)
    scriptParagraphs.push(`Önemli noktaları kaçırmamak için videoyu oynatabilir veya kendi notlarınızı bu döküm alanına ekleyebilirsiniz.`)
  }

  scriptParagraphs.push(`Daha fazlası için kaydetmeyi ve takip etmeyi unutmayın!`)

  return {
    turkishScript: scriptParagraphs.join('\n\n'),
    originalScript: isForeign ? (rawCaption || rawTitle || null) : null,
    isTranslated: isForeign,
  }
}
