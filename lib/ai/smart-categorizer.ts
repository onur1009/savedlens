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
  ai_coding: {
    category: 'productivity',
    name: '⚡ Yapay Zeka & Kodlama',
    color: '#6366f1',
    icon: 'code',
    keywords:
      /\bkod\b|\bcode\b|yazılım|yazilim|developer|geliştirici|programlama|programlar|react|nextjs|javascript|typescript|python|\bcss\b|\bhtml\b|\bsql\b|yapay zeka|yapayzeka|\bai\b|chat[\s-]?gpt|claude|gemini|prompt|figma|\bui\b|\bux\b|tasarım|tasarim|tasarla|notion|excel|freelance|üretkenlik|verimlilik|kariyer|\biş\b|iş fikri|tool|araç|arac|\bmcp\b|ajan|agent|github|\brepo\b|\bapi\b|fullstack|backend|frontend|yazılımcı|teknoloji|tech|otomasyon|automation|remote|wfh|vibe coding|coding|cmo|lansman|chatbot|bot\b|terminal|ide\b|saas|mac mini|apple|windows|bilgisayar|sibergüvenlik|siber güvenlik|chrome|browser|tarayıcı|scraper|premiere|photoshop|mockup|vfx|lut\b|mocap|cgi\b|video edit|altyazı|kurgu|tutorial|efekt|pazarlama|dijital pazarlama|projectionmapping|speed ramp|pomelli/i,
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
      'remotework',
      'remotejobs',
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
      'premierepro',
      'photoshop',
      'mockup',
      'windows',
      'tasarim',
      'tasarım',
      'ui',
      'ux',
      'dijital',
    ],
  },
  recipe_food: {
    category: 'recipe',
    name: '🍳 Yemek & Mutfak Tarifleri',
    color: '#f59e0b',
    icon: 'chef-hat',
    keywords:
      /tarif|tarifi|tarifler|yemek|yemekler|tatlı|tatli|tatlısı|kek|pasta|kurabiye|çorba|corba|makarna|börek|borek|kahvaltı|kahvalti|pilav|salata|salatası|meze|mutfak|lezzet|lezzetli|nefis|tavuk|köfte|nohut|mücver|dondurma|jelly|çılbır|risotto|limonata|poğaça|pogaça|dürüm|durum|cheesecake|mealprep|fırında|tencere|kısık ateş|pişirin|afiyet olsun|pudra şekeri|zeytinyağı|sarımsak|malzeme|malzemeler|porsiyon|proteinli|atıştırmalık|smoothie|kahve tarifi|gurme|yeme içme|veggie|flatbread|sastojci|leće|potatoes|carrots|broccoli|recipes in my bio|memasak|bisküvi|çikolata|cikolata/i,
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
    ],
  },
  health_fitness: {
    category: 'health',
    name: '🩺 Sağlık, Diyet & Fitness',
    color: '#10b981',
    icon: 'heart-pulse',
    keywords:
      /(?:uzm|op|prof|doç|doc)\.?\s*dr\.?|\bdr\.\s+[a-zğüşıöç]|@dr[a-z0-9_]+|\bdoktor\b|\bhekim\b|\bcerrah\b|\btabip\b|\bdr\b|\bdyt\b|\bdiyetisyen\b|photo by (?:dr|dyt)|hastane|hospital|klinik|clinic|ameliyat|tedavi|muayene|hastalık|hastalik|sağlık|saglik|botoks|botox|dolgu|estetik|diş hekimi|dermatolog|cildiye|psikolog|psikiyatri|fizik tedavi|diyetisyen|diyet\b|kilo\b|zayıfla|kalori|beslenme|uzun yaşam|longevity|check-up|tahlil|ultrason|hemoroid|sağlıklı yaşam|saglikli yasam|fit\b|protein|iç bacak|egzersiz|fitness|antrenman|spor\b|direnkartal|azye|psikoloji|terapi/i,
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
      'azye',
      'psikoloji',
    ],
  },
  home_decor: {
    category: 'product',
    name: '🛋️ Ev Dekorasyonu & Mobilya',
    color: '#ec4899',
    icon: 'shopping-bag',
    keywords:
      /mobilya|dekorasyon|iç mimar|koltuk|dolap|cabinet|interior|noithat|sofa|yatak|temizlik|cleaning|küf|tasarım mobilya|ikea|einrichtung|home office|süpürgelik|lifehack|plumbing|thietkenoithat/i,
    hashtags: [
      'mobilya',
      'dekorasyon',
      'temizlik',
      'cleaning',
      'interior',
      'noithat',
      'homeoffice',
      'ikea',
      'thietkenoithat',
      'evdekorasyonu',
    ],
  },
  travel_explore: {
    category: 'travel',
    name: '📍 Gezi, Rota & Mekanlar',
    color: '#3b82f6',
    icon: 'map-pin',
    keywords:
      /istanbul|ankara|izmir|antalya|bodrum|kaş|kas|kapadokya|muğla|mugla|fethiye|datça|datca|bali|ubud|mekan|mekanlar|restoran|restaurant|cafe|kafe|kahve|kahveci|coffee|gezi|otel|hotel|rota|rotası|seyahat|travel|tatil|plaj|beach|koy\b|manzara|gezi rehber|şehir rehber|konaklama|karaköy|kadıköy|beşiktaş|moda|nişantaşı|beyoğlu|balat|bali trip|itinerary|dolce far niente|summer|uçak/i,
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
      /fiyat|satın al|satin al|indirim|kod[u]?\b|kupon|fırsat|kampanya|ürün|urun|link\b|linki|link bio|biyoda|öneri|tavsiye|trendyol|hepsiburada|amazon|zara|mango|kombin|alışveriş|çanta|ayakkabı|kulaklık|telefon|laptop|monitör|klavye|parfüm|parfum|kumaş|bambu|whisky|sartorial/i,
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
      /kitap|film|dizi|netflix|sinema|roman|okuma|yazar|oneri dizi|öneri dizi|imdb|spoiler|karakter|bölüm|bolum|sezon|belgesel|kitap önerisi|film önerisi|kitaplar|filmler|diziler|tiyatro|sinemalar|seyirlik|steam oyun|oyunlar|\bgaming\b|\bgame\b|tyndalston|ghost\b|🎮|çizgi dizi|superman|\bdc\b/i,
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
}

/**
 * Plans the smart category, collection name, tags and summary from raw content.
 */
export function planSmartCategory(
  title: string | null | undefined,
  caption: string | null | undefined,
  author: string | null | undefined
): SmartCategoryPlan {
  const rawText = `${title || ''} ${caption || ''} ${author || ''}`
  const text = rawText.toLowerCase()
  const hashtags = extractHashtags(rawText)

  for (const [, tmpl] of Object.entries(CATEGORY_TEMPLATES)) {
    const matchesKeywords = tmpl.keywords.test(text)
    const matchesHashtags = hashtags.some((h) => tmpl.hashtags.includes(h))

    if (matchesKeywords || matchesHashtags) {
      let customSummary = `${title || 'Gönderi'} — ${tmpl.name} kategorisinde arşivlendi.`
      if (tmpl.category === 'recipe') customSummary = 'Lezzetli ve pratik tarif / mutfak önerisi.'
      else if (tmpl.category === 'productivity') customSummary = 'Yapay zeka, kodlama ve teknoloji rehberi.'
      else if (tmpl.category === 'health') customSummary = 'Sağlık, diyetisyen ve tıp bilgilendirmesi.'
      else if (tmpl.category === 'travel') customSummary = 'Şehir rehberi, rota ve mekan önerisi.'

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
