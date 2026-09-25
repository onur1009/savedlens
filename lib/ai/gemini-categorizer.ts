import 'server-only'
import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai'

/**
 * Gemini-powered intelligent categorization engine for SavedLens.
 * Analyzes post captions, titles, hashtags and context using Google Gemini Flash
 * to accurately classify social media bookmarks into categories.
 * 
 * Supports both built-in smart categories AND user's custom collections.
 */

// ── Types ────────────────────────────────────────────────────────

export interface GeminiCategorizationResult {
  category: string
  collectionName: string
  confidence: number
  summary: string
  tags: string[]
  reasoning: string
}

export interface CategorizationInput {
  id: string
  caption: string | null
  title: string | null
  transcript?: string | null
  author?: string | null
  hashtags?: string[]
  permalink?: string | null
}

interface UserCollection {
  id: string
  name: string
  color?: string | null
  icon?: string | null
}

// ── Gemini Client (Singleton) ────────────────────────────────────

let _geminiModel: GenerativeModel | null = null

function getGeminiModel(): GenerativeModel | null {
  if (_geminiModel) return _geminiModel

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY
  if (!apiKey || apiKey.includes('your-') || apiKey.length < 10) {
    return null
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  _geminiModel = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: {
      temperature: 0.1, // Very low for consistent classification
      maxOutputTokens: 512,
      responseMimeType: 'application/json',
    },
  })

  return _geminiModel
}

// ── Built-in Category Definitions ────────────────────────────────

const BUILTIN_CATEGORIES = [
  {
    id: 'recipe',
    name: '🍳 Yemek & Mutfak Tarifleri',
    description: 'Yemek tarifleri, pişirme videoları, malzeme listeleri, mutfak ipuçları, kahvaltı, tatlı, meze, salata, smoothie vb.',
    color: '#f59e0b',
    icon: 'chef-hat',
  },
  {
    id: 'health',
    name: '🩺 Sağlık, Diyet & Fitness',
    description: 'Doktor tavsiyeleri, sağlık bilgileri, diyet programları, egzersiz, fitness, spor, beslenme, tedavi yöntemleri vb.',
    color: '#06b6d4',
    icon: 'heart-pulse',
  },
  {
    id: 'productivity',
    name: '⚡ Yapay Zeka & Kodlama',
    description: 'Yazılım, programlama, yapay zeka araçları, AI prompt\'ları, teknoloji haberleri, developer ipuçları, SaaS ürünleri vb.',
    color: '#6366f1',
    icon: 'code',
  },
  {
    id: 'finance',
    name: '💰 Finans, Borsa & Girişim',
    description: 'Borsa analizleri, kripto, yatırım tavsiyeleri, girişimcilik, startup, ekonomi, pasif gelir, bütçe yönetimi vb.',
    color: '#10b981',
    icon: 'trending-up',
  },
  {
    id: 'motivation_mindset',
    name: '💡 Kişisel Gelişim & Zihin',
    description: 'Motivasyon, felsefe, psikoloji, zihin yapısı, alışkanlıklar, disiplin, özgüven, kariyer gelişimi vb.',
    color: '#f97316',
    icon: 'lightbulb',
  },
  {
    id: 'travel',
    name: '📍 Gezi, Rota & Mekanlar',
    description: 'Seyahat rotaları, mekan önerileri, kafe/restoran tanıtımları, otel incelemeleri, şehir rehberleri, tatil planları vb.',
    color: '#3b82f6',
    icon: 'map-pin',
  },
  {
    id: 'product',
    name: '🛍️ Ürün İnceleme & Fırsatlar',
    description: 'Ürün incelemeleri, alışveriş önerileri, indirimler, kombin önerileri, teknoloji ürünleri, ev eşyaları, dekorasyon vb.',
    color: '#f43f5e',
    icon: 'ticket',
  },
  {
    id: 'book_movie',
    name: '📚 Kitap, Dizi, Film & Oyun',
    description: 'Kitap önerileri, film/dizi incelemeleri, Netflix, sinema, oyun tavsiyeleri, kültür-sanat vb.',
    color: '#8b5cf6',
    icon: 'book-open',
  },
]

// ── Core Categorization Functions ────────────────────────────────

/**
 * Builds the system prompt for Gemini, including user's custom collections
 */
function buildCategorizationPrompt(
  userCollections: UserCollection[]
): string {
  let categoriesList = BUILTIN_CATEGORIES.map(
    (c) => `- "${c.id}" → ${c.name}: ${c.description}`
  ).join('\n')

  if (userCollections.length > 0) {
    const customList = userCollections
      .map((c) => `- "custom:${c.id}" → ${c.name}`)
      .join('\n')
    categoriesList += `\n\nKullanıcının özel koleksiyonları (BUNLARA ÖNCELİK VER!):\n${customList}`
  }

  return `Sen sosyal medya gönderilerini kategorize eden bir Türkçe AI asistansın. 
Görevin: Gönderilerin açıklama metni, başlığı, varsa video konuşma metni (script) ve hashtaglerini DERİNLEMESİNE analiz ederek en doğru kategoriyi belirlemek.

MEVCUT KATEGORİLER:
${categoriesList}
- "other" → 📌 Genel Arşiv: Hiçbir kategoriye uymayan gönderiler

KURALLAR:
1. Kullanıcının özel koleksiyonları varsa MUTLAKA bunları öncelikli değerlendir. Eğer gönderi bir özel koleksiyonla güçlü eşleşiyorsa onu seç.
2. Varsa "Video Konuşma Metni / Script" alanını EN ÖNCELİKLİ ve güvenilir kaynak olarak değerlendir (özellikle video/reels gönderilerinde açıklamalar boş veya sadece hashtag olduğunda konuşma metni asıl içeriği verir).
3. Gönderinin bağlamını anla — sadece kelimelere bakma, CÜMLENİN ANLAMINI kavra.
4. Bir tarif gönderisini asla "kodlama" veya "ürün" kategorisine koyma.
5. Doktor/sağlık içeriklerini mutlaka "health" kategorisine koy.
6. Emin değilsen "other" yerine en yakın kategoriyi seç (güven skoru düşük olabilir).
7. Türkçe ve İngilizce karışık içerikleri anlayabilmelisin.
8. Hashtagler çok güçlü ipuçlarıdır — bunlara büyük önem ver.
9. Summary'yi Türkçe yaz ve içeriği özetleyen kısa, anlamlı bir cümle olsun.
10. Tags dizisi en fazla 7 eleman içersin ve gönderinin konusunu yansıtsın.

JSON YANIT FORMATI (başka bir şey yazma):
{
  "category": "kategori_id",
  "collectionName": "Koleksiyon Adı (emoji ile)",
  "confidence": 0.0-1.0,
  "summary": "Gönderinin Türkçe özeti (1-2 cümle)",
  "tags": ["etiket1", "etiket2"],
  "reasoning": "Neden bu kategoriyi seçtiğinin kısa açıklaması"
}
`
}

/**
 * Categorize a single bookmark using Gemini Flash
 */
export async function categorizeWithGemini(
  input: CategorizationInput,
  userCollections: UserCollection[] = []
): Promise<GeminiCategorizationResult | null> {
  const model = getGeminiModel()
  if (!model) return null

  const systemPrompt = buildCategorizationPrompt(userCollections)
  
  const postContent = [
    input.title ? `Başlık: ${input.title}` : '',
    input.caption ? `Açıklama: ${input.caption.slice(0, 1500)}` : '',
    input.transcript ? `Video Konuşma Metni / Script: ${input.transcript.slice(0, 2500)}` : '',
    input.hashtags?.length ? `Hashtagler: ${input.hashtags.map(h => '#' + h).join(' ')}` : '',
    input.author ? `Yazar: ${input.author}` : '',
    input.permalink ? `Link: ${input.permalink}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  if (!postContent.trim()) return null

  try {
    const result = await model.generateContent({
      contents: [
        { role: 'user', parts: [{ text: `${systemPrompt}\n\n--- GÖNDERİ ---\n${postContent}` }] },
      ],
    })

    const text = result.response.text()
    const parsed = JSON.parse(text) as GeminiCategorizationResult

    // Handle custom collection references
    if (parsed.category?.startsWith('custom:')) {
      const customId = parsed.category.replace('custom:', '')
      const customCol = userCollections.find((c) => c.id === customId)
      if (customCol) {
        parsed.category = 'other' // Use 'other' as the base category
        parsed.collectionName = customCol.name
      }
    }

    // Validate and normalize
    const validCategories = ['recipe', 'health', 'productivity', 'finance', 'motivation_mindset', 'travel', 'product', 'book_movie', 'other']
    if (!validCategories.includes(parsed.category)) {
      parsed.category = 'other'
    }

    return parsed
  } catch (err) {
    console.warn('[gemini-categorizer] Single categorization failed:', err instanceof Error ? err.message : String(err))
    return null
  }
}

/**
 * Batch categorize multiple bookmarks using Gemini Flash.
 * Groups items into batches of 10 for efficient API usage.
 */
export async function batchCategorizeWithGemini(
  inputs: CategorizationInput[],
  userCollections: UserCollection[] = []
): Promise<Map<string, GeminiCategorizationResult>> {
  const model = getGeminiModel()
  const results = new Map<string, GeminiCategorizationResult>()

  if (!model || inputs.length === 0) return results

  const BATCH_SIZE = 8 // 8 posts per Gemini call for optimal token efficiency
  const batches: CategorizationInput[][] = []

  for (let i = 0; i < inputs.length; i += BATCH_SIZE) {
    batches.push(inputs.slice(i, i + BATCH_SIZE))
  }

  const systemPrompt = buildBatchPrompt(userCollections)

  // Process batches with concurrency limit of 3
  const CONCURRENCY = 3
  for (let i = 0; i < batches.length; i += CONCURRENCY) {
    const batchSlice = batches.slice(i, i + CONCURRENCY)
    
    const promises = batchSlice.map(async (batch) => {
      try {
        const postsText = batch
          .map((input, idx) => {
            const parts = [
              `[GÖNDERİ ${idx + 1} | ID: ${input.id}]`,
              input.title ? `Başlık: ${input.title}` : '',
              input.caption ? `Açıklama: ${input.caption.slice(0, 800)}` : '',
              input.transcript ? `Video Konuşma Metni / Script: ${input.transcript.slice(0, 1200)}` : '',
              input.hashtags?.length ? `Hashtagler: ${input.hashtags.map(h => '#' + h).join(' ')}` : '',
              input.author ? `Yazar: ${input.author}` : '',
            ]
              .filter(Boolean)
              .join('\n')
            return parts
          })
          .join('\n\n---\n\n')

        const result = await model.generateContent({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemPrompt}\n\n--- GÖNDERİLER ---\n\n${postsText}` }],
            },
          ],
        })

        const text = result.response.text()
        const parsed = JSON.parse(text) as Record<string, GeminiCategorizationResult>

        // Map results back to bookmark IDs
        for (const [id, catResult] of Object.entries(parsed)) {
          if (catResult && catResult.category) {
            // Handle custom collection references
            if (catResult.category.startsWith('custom:')) {
              const customId = catResult.category.replace('custom:', '')
              const customCol = userCollections.find((c) => c.id === customId)
              if (customCol) {
                catResult.category = 'other'
                catResult.collectionName = customCol.name
              }
            }

            const validCategories = ['recipe', 'health', 'productivity', 'finance', 'motivation_mindset', 'travel', 'product', 'book_movie', 'other']
            if (!validCategories.includes(catResult.category)) {
              catResult.category = 'other'
            }

            results.set(id, catResult)
          }
        }
      } catch (err) {
        console.warn('[gemini-categorizer] Batch chunk failed:', err instanceof Error ? err.message : String(err))
      }
    })

    await Promise.all(promises)
  }

  return results
}

/**
 * Builds a batch categorization prompt for multiple posts
 */
function buildBatchPrompt(userCollections: UserCollection[]): string {
  let categoriesList = BUILTIN_CATEGORIES.map(
    (c) => `- "${c.id}" → ${c.name}: ${c.description}`
  ).join('\n')

  if (userCollections.length > 0) {
    const customList = userCollections
      .map((c) => `- "custom:${c.id}" → ${c.name}`)
      .join('\n')
    categoriesList += `\n\nKullanıcının özel koleksiyonları (BUNLARA ÖNCELİK VER!):\n${customList}`
  }

  return `Sen sosyal medya gönderilerini kategorize eden bir Türkçe AI asistansın.
Aşağıda birden fazla gönderi var. HER BİRİNİ ayrı ayrı analiz et ve en doğru kategoriyi belirle.

MEVCUT KATEGORİLER:
${categoriesList}
- "other" → 📌 Genel Arşiv: Hiçbir kategoriye uymayan gönderiler

KURALLAR:
1. Kullanıcının özel koleksiyonları varsa MUTLAKA bunları öncelikli değerlendir.
2. Varsa "Video Konuşma Metni / Script" alanını EN ÖNCELİKLİ ve güvenilir kaynak olarak kabul et (videodaki gerçek konuşma içeriğini yansıtır).
3. Gönderinin BAĞLAMINI ve ANLAMINI kavra — sadece kelimelere bakma.
4. Hashtagler çok güçlü ipuçlarıdır.
5. Summary'yi Türkçe yaz.
6. Tags dizisi en fazla 7 eleman içersin.

JSON YANIT FORMATI (her gönderi için ID'yi anahtar olarak kullan):
{
  "bookmark_id_1": {
    "category": "kategori_id",
    "collectionName": "Koleksiyon Adı (emoji ile)",
    "confidence": 0.0-1.0,
    "summary": "Gönderinin Türkçe özeti",
    "tags": ["etiket1", "etiket2"],
    "reasoning": "Kısa açıklama"
  },
  "bookmark_id_2": { ... }
}`
}

/**
 * Check if Gemini is configured and available
 */
export function isGeminiAvailable(): boolean {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY
  return Boolean(apiKey && !apiKey.includes('your-') && apiKey.length >= 10)
}
