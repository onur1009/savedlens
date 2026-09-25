import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { BookmarkCategory } from '@/lib/mock-data'
import { extractHashtags } from '@/lib/ai/extractor'

export interface SmartCategoryPlan {
  category: BookmarkCategory
  collectionName: string
  collectionColor: string
  collectionIcon: string
  tags: string[]
  summary: string
  extractors: Record<string, boolean>
}

// Curated category templates for dynamic collection generation
const CATEGORY_TEMPLATES: Record<
  string,
  {
    category: BookmarkCategory
    name: string
    color: string
    icon: string
    keywords: RegExp
    hashtags: string[]
  }
> = {
  recipe_food: {
    category: 'recipe',
    name: '🍳 Yemek & Mutfak Tarifleri',
    color: '#f59e0b',
    icon: 'chef-hat',
    keywords:
      /\bpatates\b|patatesli|patatesler|tarif|tarifi|tarifler|yemek|yemekler|tatlı|tatli|tatlısı|kek\b|pasta|kurabiye|çorba|corba|makarna|börek|borek|kahvaltı|kahvalti|pilav|salata|salatası|meze|mutfak|lezzet|lezzetli|nefis|tavuk|köfte|nohut|mücver|dondurma|jelly|çılbır|risotto|limonata|poğaça|pogaça|dürüm|durum|cheesecake|mealprep|fırında|tencere|kısık ateş|pişirin|pişir|afiyet olsun|pudra şekeri|zeytinyağı|sarımsak|malzeme|malzemeler|porsiyon|proteinli|atıştırmalık|smoothie|kahve tarifi|gurme|yeme içme|veggie|flatbread|bisküvi|çikolata|cikolata|tahin|tahinli|pekmez|peynir|kaşar|yoğurt|yogurt|süt|krema|tereyağı|tereyag|un\b|şeker|tuz\b|karabiber|pulbiber|kekik|kimyon|fırın|airfryer|tava\b|haşla|kızart|doğra|dilimle|karıştır|çırp|ekmek|sos\b|humus|pizza|burger|makarna sosu/i,
    hashtags: [
      'tarif',
      'tarifi',
      'yemektarifi',
      'yemektarifleri',
      'yemek',
      'food',
      'recipe',
      'lezzet',
      'tatli',
      'tatlı',
      'mutfak',
      'nefisyemektarifleri',
      'pratiktarifler',
      'kahvalti',
      'kahvaltı',
      'salata',
      'meze',
      'dondurma',
      'makarna',
      'cheesecake',
      'dürüm',
      'mealprep',
      'gurme',
      'sunum',
      'sunumönemlidir',
      'enfes',
      'yemekneredeyenir',
    ],
  },
  ai_coding: {
    category: 'productivity',
    name: '⚡ Yapay Zeka & Kodlama',
    color: '#6366f1',
    icon: 'code',
    keywords:
      /\bkod\b|\bcode\b|yazılım|yazilim|developer|geliştirici|programlama|react|nextjs|javascript|typescript|python|\bcss\b|\bhtml\b|\bsql\b|yapay zeka|yapayzeka|\bai\b|chat[\s-]?gpt|gpt-4|claude|gemini|prompt engineering|\bprompt\b|github|\brepo\b|\bapi\b|fullstack|backend|frontend|yazılımcı|vibe coding|coding|chatbot|\bmcp\b|open source|docker|kubernetes|terminal|ide\b|saas|sibergüvenlik|siber güvenlik|makine öğrenimi|derin öğrenme|llm\b|transformer\b|huggingface|devops|postgresql|supabase|tailwindcss|cursor|windsurf|copilot|anthropic|openai/i,
    hashtags: [
      'yazilim',
      'yazılım',
      'kod',
      'kodlama',
      'yapayzeka',
      'ai',
      'developer',
      'software',
      'coding',
      'tech',
      'teknoloji',
      'github',
      'nextjs',
      'react',
      'python',
      'chatgpt',
      'prompt',
      'mcp',
      'vibecoding',
      'automation',
      'sibergüvenlik',
      'cursor',
    ],
  },
  finance_business: {
    category: 'finance',
    name: '💰 Finans, Borsa & Girişim',
    color: '#10b981',
    icon: 'trending-up',
    keywords:
      /\bpara\b|finans|yatırım|yatirim|borsa|hisse|hisseler|kripto|crypto|bitcoin|btc|ethereum|altın|dolar|euro|faiz|enflasyon|fon|pasif gelir|girişim|girisim|girişimcilik|start-up|startup|milyoner|zengin|gelir|bütçe|tasarruf|finansal özgürlük|temettü|portföy|ekonomi|piyasa|fed\b|faiz kararı|bist\b|nasdaq|sp500/i,
    hashtags: [
      'finans',
      'para',
      'yatirim',
      'yatırım',
      'borsa',
      'hisse',
      'kripto',
      'bitcoin',
      'altin',
      'girisimcilik',
      'startup',
      'pasifgelir',
      'tasarruf',
      'ekonomi',
      'dolar',
      'temettu',
    ],
  },
  motivation_mindset: {
    category: 'motivation_mindset',
    name: '💡 Kişisel Gelişim & Zihin',
    color: '#f97316',
    icon: 'lightbulb',
    keywords:
      /\bbaşarı\b|basari|motivasyon|özgüven|ozguven|kişisel gelişim|kisisel gelisim|felsefe|stoacılık|stoic|alışkanlık|aliskanlik|disiplin|odaklanma|psikoloji|zihin yapısı|mindset|hedef|kariyer|liderlik|zaman yönetimi|verimli gün|uyanış|farkındalık|mental sağlık|mentor|özsaygı|öz şefkat|irade|atomik alışkanlıklar/i,
    hashtags: [
      'motivasyon',
      'kisiselgelisim',
      'kişiselgelişim',
      'basari',
      'başarı',
      'disiplin',
      'mindset',
      'psikoloji',
      'felsefe',
      'aliskanlik',
      'hedef',
      'kariyer',
      'liderlik',
      'farkindalik',
    ],
  },
  health_fitness: {
    category: 'health',
    name: '🩺 Sağlık, Diyet & Fitness',
    color: '#06b6d4',
    icon: 'heart-pulse',
    keywords:
      /doktor|hekim|cerrah|uzm\.?\s*dr|op\.?\s*dr|prof\.?\s*dr|doç\.?\s*dr|dyt\b|diyetisyen|hastane|hospital|klinik|clinic|ameliyat|tedavi|muayene|hastalık|hastalik|sağlık|saglik|botoks|botox|dolgu|estetik|diş hekimi|dermatolog|cildiye|psikolog|psikiyatri|fizik tedavi|diyet\b|kilo\b|zayıfla|kalori|beslenme uzmanı|uzun yaşam|longevity|check-up|tahlil|ultrason|sağlıklı yaşam|saglikli yasam|iç bacak|egzersiz|fitness|antrenman|spor\b|pilates|kardiyo|postür|omurga|fizyoterapi/i,
    hashtags: [
      'doktor',
      'saglik',
      'sağlık',
      'hekim',
      'hastane',
      'klinik',
      'tedavi',
      'ameliyat',
      'estetik',
      'botoks',
      'diyetisyen',
      'diyet',
      'kilo',
      'zayiflama',
      'beslenme',
      'health',
      'medical',
      'doctor',
      'fit',
      'fitness',
      'egzersiz',
      'psikoloji',
    ],
  },
  travel_explore: {
    category: 'travel',
    name: '📍 Gezi, Rota & Mekanlar',
    color: '#3b82f6',
    icon: 'map-pin',
    keywords:
      /istanbul|ankara|izmir|antalya|bodrum|kaş|kas|kapadokya|muğla|mugla|fethiye|datça|datca|bali|ubud|mekan|mekanlar|restoran|restaurant|cafe|kafe|kahveci|gezi|otel|hotel|rota|rotası|seyahat|travel|tatil|plaj|beach|koy\b|manzara|gezi rehber|şehir rehber|konaklama|karaköy|kadıköy|beşiktaş|moda|nişantaşı|beyoğlu|balat|itinerary|dolce far niente|uçak bileti|vize|pasaport/i,
    hashtags: [
      'gezi',
      'seyahat',
      'travel',
      'mekan',
      'kafe',
      'cafe',
      'istanbul',
      'tatil',
      'otel',
      'kahve',
      'datca',
      'datça',
      'bali',
      'ubud',
    ],
  },
  products_shopping: {
    category: 'product',
    name: '🛍️ Ürün İnceleme & Fırsatlar',
    color: '#f43f5e',
    icon: 'ticket',
    keywords:
      /indirim|satın al|satin al|kupon|fırsat|kampanya|trendyol|hepsiburada|amazon|zara|mango|kombin|alışveriş|çanta|ayakkabı|kulaklık|telefon|laptop|parfüm|parfum|link biyoda|link bio|biyodaki link|fiyatı|gardırop|outfit|satışta link/i,
    hashtags: [
      'indirim',
      'firsat',
      'kampanya',
      'alisveris',
      'alışveriş',
      'urunonerisi',
      'ürün',
      'kombin',
      'trendyol',
      'parfum',
      'parfüm',
    ],
  },
  book_movie_games: {
    category: 'book_movie',
    name: '📚 Kitap, Dizi, Film & Oyun',
    color: '#8b5cf6',
    icon: 'book-open',
    keywords:
      /kitap|film|dizi|netflix|sinema|roman|okuma|yazar|oneri dizi|öneri dizi|imdb|spoiler|karakter|bölüm|bolum|sezon|belgesel|kitap önerisi|film önerisi|kitaplar|filmler|diziler|tiyatro|steam oyun|oyunlar|\bgaming\b|\bgame\b|çizgi dizi/i,
    hashtags: [
      'kitap',
      'film',
      'dizi',
      'sinema',
      'kitaponerisi',
      'filmonerisi',
      'netflix',
      'dizionerisi',
      'okudumbitti',
      'kitapkurdu',
      'gaming',
      'oyun',
    ],
  },
  home_decor: {
    category: 'product',
    name: '🛋️ Ev Dekorasyonu & Mobilya',
    color: '#ec4899',
    icon: 'shopping-bag',
    keywords:
      /mobilya|dekorasyon|iç mimar|koltuk|dolap|cabinet|interior|sofa|yatak|temizlik|tasarım mobilya|ikea|home office|tadilat|ev dekorasyonu/i,
    hashtags: [
      'mobilya',
      'dekorasyon',
      'temizlik',
      'cleaning',
      'interior',
      'homeoffice',
      'ikea',
      'evdekorasyonu',
    ],
  },
}

function generateIntelligentSummary(
  category: BookmarkCategory,
  title: string | null | undefined,
  caption: string | null | undefined,
  templateName: string
): string {
  const cleanTitle = title?.replace(/[\r\n]+/g, ' ').trim() || ''
  const firstLine = caption?.split('\n').map((s) => s.trim()).filter(Boolean)[0] || ''
  const subject =
    cleanTitle.length > 5 && cleanTitle.length < 75
      ? cleanTitle
      : firstLine.length > 5 && firstLine.length < 75
      ? firstLine
      : ''

  if (category === 'recipe') {
    if (subject) return `${subject} — Malzeme listesi ve yapılış adımları.`
    return 'Lezzetli ve pratik tarif / mutfak önerisi.'
  }
  if (category === 'productivity') {
    if (subject) return `${subject} — Kodlama, yapay zeka ve üretkenlik ipuçları.`
    return 'Yazılım, yapay zeka araçları ve teknoloji rehberi.'
  }
  if (category === 'health') {
    if (subject) return `${subject} — Sağlık, beslenme ve uzman tavsiyeleri.`
    return 'Sağlık, diyetisyen ve tıp bilgilendirmesi.'
  }
  if (category === 'travel') {
    if (subject) return `${subject} — Rota, seyahat ve mekan rehberi.`
    return 'Şehir rehberi, rota ve mekan önerisi.'
  }
  if (category === 'product') {
    if (subject) return `${subject} — Ürün incelemesi ve önerisi.`
    return 'Ürün incelemesi, indirim ve alışveriş önerisi.'
  }
  if (category === 'book_movie') {
    if (subject) return `${subject} — Kitap, dizi ve film incelemesi.`
    return 'Kitap, dizi ve film önerisi.'
  }
  if (category === 'finance') {
    if (subject) return `${subject} — Finans, borsa ve yatırım analizi.`
    return 'Finans, borsa ve yatırım değerlendirmesi.'
  }
  if (category === 'motivation_mindset') {
    if (subject) return `${subject} — Kişisel gelişim ve motivasyon rehberi.`
    return 'Kişisel gelişim, üretkenlik ve zihin yapısı.'
  }
  return subject ? `${subject} kütüphanenizde arşivlendi.` : `${templateName} kategorisinde arşivlendi.`
}

/**
 * Plans the smart category, collection name, tags and summary using
 * a Scored Multi-Factor Classification Engine.
 */
export function planSmartCategory(
  title: string | null | undefined,
  caption: string | null | undefined,
  author: string | null | undefined,
  userCollections?: Array<{ id: string; name: string; color?: string | null; icon?: string | null }>
): SmartCategoryPlan {
  const rawText = `${title || ''} ${caption || ''} ${author || ''}`
  const text = rawText.toLowerCase()
  const hashtags = extractHashtags(rawText)

  // 1. Check user's custom collections first!
  if (userCollections && userCollections.length > 0) {
    const { calculateCollectionMatchScore } = require('./collection-matcher')
    let bestUserCol: { col: (typeof userCollections)[0]; score: number } | null = null

    for (const col of userCollections) {
      const match = calculateCollectionMatchScore(col.name, {
        title,
        caption,
        ai_tags: hashtags,
      })
      if (match.isMatch && (!bestUserCol || match.score > bestUserCol.score)) {
        bestUserCol = { col, score: match.score }
      }
    }

    if (bestUserCol && bestUserCol.score >= 25) {
      const col = bestUserCol.col
      const mergedTags = Array.from(new Set([col.name.toLowerCase().replace(/[^a-z0-9ğüşıöç]/g, ''), ...hashtags])).filter(Boolean).slice(0, 7)
      return {
        category: 'other',
        collectionName: col.name,
        collectionColor: col.color || '#6366f1',
        collectionIcon: col.icon || 'folder',
        tags: mergedTags.length > 0 ? mergedTags : ['koleksiyon'],
        summary: generateIntelligentSummary('other', title, caption, col.name),
        extractors: {},
      }
    }
  }

  const scores: Record<string, number> = {}

  for (const [key, tmpl] of Object.entries(CATEGORY_TEMPLATES)) {
    let score = 0
    const matches = text.match(new RegExp(tmpl.keywords.source, 'gi')) || []
    score += matches.length * 10

    for (const h of hashtags) {
      if (tmpl.hashtags.includes(h)) score += 20 // 20 points per matching hashtag
    }
    scores[key] = score
  }

  // Cross-category guardrails:
  // 1. Food/Recipe Priority: recipes must NEVER be classified as AI/Coding!
  if (scores.recipe_food > 0) {
    scores.ai_coding = Math.max(0, scores.ai_coding - 100)
    scores.products_shopping = Math.max(0, scores.products_shopping - 30)
  }

  // 2. Doctor/Health Priority
  if (scores.health_fitness > 0 && /doktor|hekim|hasta|tedavi|ameliyat|uzm\.?\s*dr|dyt\b/i.test(text)) {
    scores.health_fitness += 25
  }

  // Sort candidate categories by highest confidence score
  const sortedCandidates = Object.entries(scores).sort((a, b) => b[1] - a[1])
  const best = sortedCandidates[0]

  if (best && best[1] >= 10) {
    const tmpl = CATEGORY_TEMPLATES[best[0]]
    const customSummary = generateIntelligentSummary(tmpl.category, title, caption, tmpl.name)
    const primaryTags = tmpl.hashtags.filter((h) => text.includes(h)).slice(0, 3)
    const mergedTags = Array.from(new Set([...primaryTags, ...hashtags])).slice(0, 7)

    return {
      category: tmpl.category,
      collectionName: tmpl.name,
      collectionColor: tmpl.color,
      collectionIcon: tmpl.icon,
      tags: mergedTags.length > 0 ? mergedTags : [tmpl.name.split(' ')[1]?.toLowerCase() || 'genel'],
      summary: customSummary,
      extractors: {
        recipe: tmpl.category === 'recipe',
        health: tmpl.category === 'health',
        code: tmpl.category === 'productivity',
        location: tmpl.category === 'travel',
        discount: tmpl.category === 'product' && /indirim|fırsat|kampanya/i.test(text),
      },
    }
  }

  // Fallback category
  const fallbackTags = hashtags.length > 0 ? hashtags.slice(0, 5) : ['genel', 'kaydedilen']
  return {
    category: 'other',
    collectionName: '📌 Genel Arşiv',
    collectionColor: '#6b7280',
    collectionIcon: 'folder',
    tags: fallbackTags,
    summary: `${title || 'Sosyal Medya Gönderisi'} kütüphanenize başarıyla kaydedildi.`,
    extractors: {},
  }
}

/**
 * Finds an existing collection or creates a new one in the database,
 * then links the bookmark to it in `bookmark_collections`.
 */
export async function assignBookmarkToSmartCollection(
  db: SupabaseClient,
  userId: string,
  bookmarkId: string,
  plan: SmartCategoryPlan
): Promise<{ collectionId: string; collectionName: string }> {
  // 1. Fetch user's existing collections
  const { data: existingCols } = await db
    .from('collections')
    .select('id, name')
    .eq('user_id', userId)

  const collections = existingCols || []

  // Normalize target collection name
  const targetClean = plan.collectionName.toLowerCase().replace(/[^a-z0-9ğüşıöç]/g, '')

  let matched = collections.find((c) => {
    const cClean = c.name.toLowerCase().replace(/[^a-z0-9ğüşıöç]/g, '')
    return (
      cClean === targetClean ||
      c.name.toLowerCase().includes(plan.collectionName.toLowerCase()) ||
      plan.collectionName.toLowerCase().includes(c.name.toLowerCase())
    )
  })

  // 2. If not found, create new category / collection for this user!
  if (!matched) {
    const { data: newCol, error: createErr } = await db
      .from('collections')
      .insert({
        user_id: userId,
        name: plan.collectionName,
        color: plan.collectionColor,
        icon: plan.collectionIcon,
      })
      .select('id, name')
      .maybeSingle()

    if (newCol) {
      matched = newCol
    } else if (createErr) {
      console.warn('[smart-categorizer] Collection insert fallback:', createErr.message)
      // Retry select in case of race condition
      const { data: retryCol } = await db
        .from('collections')
        .select('id, name')
        .eq('user_id', userId)
        .eq('name', plan.collectionName)
        .maybeSingle()
      if (retryCol) matched = retryCol
    }
  }

  // 3. Link bookmark to collection in `bookmark_collections`
  if (matched?.id) {
    await db
      .from('bookmark_collections')
      .upsert(
        {
          bookmark_id: bookmarkId,
          collection_id: matched.id,
        },
        { onConflict: 'bookmark_id,collection_id' }
      )
      .select()
  }

  return {
    collectionId: matched?.id || '',
    collectionName: matched?.name || plan.collectionName,
  }
}

// ── Category metadata lookup for Gemini results ──────────────────

const CATEGORY_META: Record<string, { name: string; color: string; icon: string }> = {
  recipe: { name: '🍳 Yemek & Mutfak Tarifleri', color: '#f59e0b', icon: 'chef-hat' },
  health: { name: '🩺 Sağlık, Diyet & Fitness', color: '#06b6d4', icon: 'heart-pulse' },
  productivity: { name: '⚡ Yapay Zeka & Kodlama', color: '#6366f1', icon: 'code' },
  finance: { name: '💰 Finans, Borsa & Girişim', color: '#10b981', icon: 'trending-up' },
  motivation_mindset: { name: '💡 Kişisel Gelişim & Zihin', color: '#f97316', icon: 'lightbulb' },
  travel: { name: '📍 Gezi, Rota & Mekanlar', color: '#3b82f6', icon: 'map-pin' },
  product: { name: '🛍️ Ürün İnceleme & Fırsatlar', color: '#f43f5e', icon: 'ticket' },
  book_movie: { name: '📚 Kitap, Dizi, Film & Oyun', color: '#8b5cf6', icon: 'book-open' },
  other: { name: '📌 Genel Arşiv', color: '#6b7280', icon: 'folder' },
}

/**
 * AI-powered categorization: tries Gemini Flash first, falls back to regex.
 * This is the primary entry point for all categorization.
 */
export async function planSmartCategoryWithAI(
  title: string | null | undefined,
  caption: string | null | undefined,
  author: string | null | undefined,
  userCollections?: Array<{ id: string; name: string; color?: string | null; icon?: string | null }>,
  bookmarkId?: string
): Promise<SmartCategoryPlan> {
  // Try Gemini first
  try {
    const { isGeminiAvailable, categorizeWithGemini } = await import('./gemini-categorizer')

    if (isGeminiAvailable()) {
      const hashtags = extractHashtags(`${title || ''} ${caption || ''}`)
      const geminiResult = await categorizeWithGemini(
        {
          id: bookmarkId || 'temp',
          caption: caption || null,
          title: title || null,
          author,
          hashtags,
        },
        userCollections || []
      )

      if (geminiResult && geminiResult.category) {
        const meta = CATEGORY_META[geminiResult.category] || CATEGORY_META.other

        // Check if Gemini assigned to a user custom collection
        let colName = geminiResult.collectionName || meta.name
        let colColor = meta.color
        let colIcon = meta.icon

        if (userCollections) {
          const matchedCol = userCollections.find(
            (c) => c.name === geminiResult.collectionName || c.name.toLowerCase() === geminiResult.collectionName?.toLowerCase()
          )
          if (matchedCol) {
            colName = matchedCol.name
            colColor = matchedCol.color || colColor
            colIcon = matchedCol.icon || colIcon
          }
        }

        return {
          category: geminiResult.category as BookmarkCategory,
          collectionName: colName,
          collectionColor: colColor,
          collectionIcon: colIcon,
          tags: geminiResult.tags || [],
          summary: geminiResult.summary || `${title || 'Gönderi'} kütüphanenize kaydedildi.`,
          extractors: {
            recipe: geminiResult.category === 'recipe',
            health: geminiResult.category === 'health',
            code: geminiResult.category === 'productivity',
            location: geminiResult.category === 'travel',
            discount: geminiResult.category === 'product',
          },
        }
      }
    }
  } catch (err) {
    console.warn('[smart-categorizer] Gemini categorization failed, falling back to regex:', err instanceof Error ? err.message : String(err))
  }

  // Fallback to regex-based categorization
  return planSmartCategory(title, caption, author, userCollections)
}

