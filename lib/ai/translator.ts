import 'server-only'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { isForeignText } from './video-transcriber'

export interface TranslationInput {
  title?: string | null
  caption?: string | null
  transcript?: string | null
  platform?: string | null
  apiKeyOverride?: string | null
}

export interface TranslationOutput {
  translatedTitle: string
  translatedCaption: string
  translatedTranscript?: string | null
  originalTitle: string | null
  originalCaption: string | null
  originalTranscript: string | null
  isTranslated: boolean
}

/**
 * Translates social media post metadata (title, caption/description, and deşifre/transcript)
 * into fluent, natural Turkish using Gemini 2.0 Flash.
 * Always preserves the original foreign text for toggling.
 */
export async function translateBookmarkContent(
  input: TranslationInput
): Promise<TranslationOutput> {
  const { title, caption, transcript, platform, apiKeyOverride } = input

  const rawTitle = (title || '').trim()
  const rawCaption = (caption || '').trim()
  const rawTranscript = (transcript || '').trim()

  const isForeign = isForeignText(rawCaption) || isForeignText(rawTitle) || isForeignText(rawTranscript)

  // If not foreign and already in Turkish, return as is
  if (!isForeign && !input.apiKeyOverride) {
    return {
      translatedTitle: rawTitle,
      translatedCaption: rawCaption,
      translatedTranscript: rawTranscript || null,
      originalTitle: rawTitle || null,
      originalCaption: rawCaption || null,
      originalTranscript: rawTranscript || null,
      isTranslated: false,
    }
  }

  const geminiKey = apiKeyOverride || process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY

  if (geminiKey && !geminiKey.includes('your-') && geminiKey.length > 10) {
    try {
      const genAI = new GoogleGenerativeAI(geminiKey)
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
      })

      const prompt = `Sen profesyonel bir sosyal medya ve medya yer imi içerik çevirmenisin.
Aşağıdaki yabancı dildeki sosyal medya içeriğini analiz et.
Tüm metinleri (Başlık, Gönderi Açıklaması ve Video Konuşma/Deşifre Metni) doğal, akıcı ve eksiksiz bir TÜRKÇEYE çevir.

KURALLAR:
1. Başlığı anlaşılır, ilgi çekici ve Türkçe olarak çevir ("translatedTitle").
2. Açıklamadaki tüm püf noktalarını, adımları, malzemeleri veya detayları Türkçe çevir ("translatedCaption").
3. Varsa video konuşma/deşifre metnini Türkçe seslendirme ve konuşma diline uygun şekilde akıcı çevir ("translatedTranscript"). Eğer deşifre metni boşsa veya yoksa, açıklamayı baz alarak 2-3 paragraflık akıcı bir Türkçe video deşifresi oluştur.
4. Çeviriler samimi, birinci tekil veya anlatıcı diliyle akıcı olmalıdır ("yaptım", "gösteriyorum", "şöyle hazırlıyoruz").
5. Yanıtı yalnızca aşağıdaki JSON şemasına uygun olarak üret:

{
  "translatedTitle": "Türkçe Başlık",
  "translatedCaption": "Türkçe Açıklama",
  "translatedTranscript": "Türkçe Video Deşifresi"
}

GÖNDERİ BAŞLIĞI:
${rawTitle || 'Sosyal Medya Videosu'}

GÖNDERİ AÇIKLAMASI:
${rawCaption || 'Açıklama bulunmuyor'}

MEVCUT DEŞİFRE / KONUŞMA METNİ:
${rawTranscript || 'Henüz deşifre çıkarılmadı'}

PLATFORM: ${platform || 'Sosyal Medya'}`

      const result = await model.generateContent(prompt)
      const text = result.response.text()?.trim()

      if (text) {
        const parsed = JSON.parse(text)
        return {
          translatedTitle: parsed.translatedTitle || rawTitle,
          translatedCaption: parsed.translatedCaption || rawCaption,
          translatedTranscript: parsed.translatedTranscript || rawTranscript || null,
          originalTitle: rawTitle || null,
          originalCaption: rawCaption || null,
          originalTranscript: rawTranscript || null,
          isTranslated: true,
        }
      }
    } catch (err) {
      console.warn('[Translator] Gemini translation API error:', err)
    }
  }

  // Fallback offline translation / wrapper
  return {
    translatedTitle: rawTitle ? `🇹🇷 ${rawTitle}` : 'Sosyal Medya Gönderisi',
    translatedCaption: rawCaption,
    translatedTranscript: rawTranscript || null,
    originalTitle: rawTitle || null,
    originalCaption: rawCaption || null,
    originalTranscript: rawTranscript || null,
    isTranslated: isForeign,
  }
}
