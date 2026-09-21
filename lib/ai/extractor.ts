import 'server-only'
import type { BookmarkCategory, ActionableData } from '@/lib/mock-data'

export interface ExtractionResult {
  category: BookmarkCategory
  title: string
  summary: string
  tags: string[]
  actionable_data: ActionableData
  extractors: {
    recipe?: boolean
    location?: boolean
    discount?: boolean
    transcript?: boolean
    code?: boolean
    health?: boolean
  }
}

/**
 * Extracts hashtags (#etiket) from Turkish or international social media captions
 */
export function extractHashtags(text: string | null | undefined): string[] {
  if (!text) return []
  const matches = text.match(/#([a-zA-Z0-9_ğüşıöçĞÜŞİÖÇ]+)/g) || []
  return Array.from(new Set(matches.map((m) => m.slice(1).toLowerCase())))
}

/**
 * Robust Turkish rule-based fallback when OpenAI key is missing or call fails.
 * Accurately categorizes recipes, doctor/health, software/AI, travel spots, discounts/products, books/movies.
 */
export function extractOfflineFallback(
  title: string | null,
  caption: string | null,
  transcript: string | null
): ExtractionResult {
  const rawText = `${title || ''} ${caption || ''} ${transcript || ''}`
  const text = rawText.toLowerCase()
  const hashtags = extractHashtags(rawText)

  // 1. Recipe & Food (Tarifler, Yemekler, Tatlılar, Mutfak, Malzemeler, Dürüm, Fit Cheesecake, Mealprep, Beslenme)
  const isRecipe =
    /tarif|tarifi|tarifler|yemek|yemekler|tatlı|tatli|tatlısı|kek|pasta|kurabiye|çorba|corba|makarna|börek|borek|kahvaltı|kahvalti|pilav|salata|salatası|meze|mutfak|lezzet|lezzetli|nefis|tavuk|köfte|nohut|mücver|dondurma|jelly|çılbır|risotto|limonata|poğaça|pogaça|dürüm|durum|cheesecake|mealprep|fırında|tencere|kısık ateş|pişirin|afiyet olsun|pudra şekeri|zeytinyağı|sarımsak|malzeme|malzemeler|porsiyon|proteinli|atıştırmalık|smoothie|kahve tarifi|gurme|yeme içme|veggie|flatbread|sastojci|leće|potatoes|carrots|broccoli|recipes in my bio|memasak|bisküvi|çikolata|cikolata/i.test(text) ||
    hashtags.some((h) =>
      [
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
      ].includes(h)
    )

  if (isRecipe) {
    const sampleIngredients: string[] = []
    if (text.includes('tiramisu')) {
      sampleIngredients.push(
        '500g Mascarpone peyniri',
        '200g Savoiardi bisküvi',
        '3 adet yumurta sarısı',
        '1 bardak espresso kahve',
        'Kakao tozu'
      )
    } else if (text.includes('makarna')) {
      sampleIngredients.push('Haşlanmış makarna', 'Zeytinyağı ve sarımsak', 'İsteğe göre sos ve taze yeşillik')
    } else {
      sampleIngredients.push('Taze ana malzemeler', 'Zeytinyağı ve baharatlar', 'İsteğe göre sos ve garnitür')
    }

    const recipeTags = ['tarif', 'lezzet', 'yemek', 'mutfak']
    if (/tatlı|tatli|kek|pasta|cheesecake/i.test(text)) recipeTags.push('tatlı')
    if (/makarna/i.test(text)) recipeTags.push('makarna')
    if (/kahvaltı|kahvalti/i.test(text)) recipeTags.push('kahvaltı')
    if (/salata|meze/i.test(text)) recipeTags.push('salata')
    if (/fit|protein|diyet/i.test(text)) recipeTags.push('sağlıklıYemek')

    const mergedTags = Array.from(new Set([...recipeTags, ...hashtags])).slice(0, 7)

    return {
      category: 'recipe',
      title: title || 'Lezzetli Yemek & Tatlı Tarifi',
      summary: `${title || 'Özel Tarif'} — Pratik adımlarla hazırlanan lezzetli ev tarifi ve malzeme listesi.`,
      tags: mergedTags,
      actionable_data: {
        ingredients: sampleIngredients,
        steps: ['Tüm malzemeleri hazırlayın.', 'Adımları sırasıyla karıştırıp pişirin ve dinlendirin.'],
        prep_time: '15-30 dakika',
      },
      extractors: { recipe: true, transcript: Boolean(transcript) },
    }
  }

  // 2. Health & Doctor & Diet & Fitness (Doktorlar, Tıp, Sağlık, Klinik, Hastane, Tedavi, Botoks, Diyet, Zayıflama, Kilo, Estetik, Egzersiz)
  const hasDoctor =
    /(?:uzm|op|prof|doç|doc)\.?\s*dr\.?/i.test(text) ||
    /\bdr\.\s+[a-zğüşıöç]/i.test(text) ||
    /@dr[a-z0-9_]+/i.test(text) ||
    /\bdoktor\b|\bhekim\b|\bcerrah\b|\btabip\b|\bdr\b|\bdyt\b|\bdiyetisyen\b/i.test(text) ||
    /photo by (?:dr|dyt)/i.test(text)

  const isHealth =
    hasDoctor ||
    /hastane|hospital|klinik|clinic|ameliyat|tedavi|muayene|hastalık|hastalik|sağlık|saglik|botoks|botox|dolgu|estetik|diş hekimi|dermatolog|cildiye|psikolog|psikiyatri|fizik tedavi|diyetisyen|diyet\b|kilo\b|zayıfla|kalori|beslenme|uzun yaşam|longevity|check-up|tahlil|ultrason|hemoroid|sağlıklı yaşam|saglikli yasam|fit\b|protein|iç bacak|egzersiz|fitness|antrenman|spor\b|direnkartal|azye|psikoloji|terapi/i.test(
      text
    ) ||
    hashtags.some((h) =>
      [
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
      ].includes(h)
    )

  if (isHealth) {
    const doctorMatch = text.match(/(?:uzm\.\s*dr\.?|op\.\s*dr\.?|prof\.\s*dr\.?|doç\.\s*dr\.?|dr\.|dyt\.)\s*([a-zğüşıöç\s]+?)(?:on|in|at|\n|\.|,|$)/i)
    const doctorName = doctorMatch ? doctorMatch[0].trim() : undefined

    const healthTags = ['sağlık', 'doktor', 'tıp']
    if (/botoks|botox|dolgu|estetik/i.test(text)) healthTags.push('estetik', 'botoks')
    if (/diyet|diyetisyen|beslenme|kilo/i.test(text)) healthTags.push('beslenme', 'diyet')
    if (/egzersiz|fitness|spor|iç bacak/i.test(text)) healthTags.push('fitness', 'egzersiz')
    if (/hastane|klinik/i.test(text)) healthTags.push('klinik')
    if (/cerrah|ameliyat/i.test(text)) healthTags.push('cerrahi')

    const mergedTags = Array.from(new Set([...healthTags, ...hashtags])).slice(0, 7)

    return {
      category: 'health',
      title: title || (doctorName ? `${doctorName} Sağlık Bilgilendirmesi` : 'Sağlık & Tıp Rehberi'),
      summary: `${title || 'Sağlık ve Tıp'} — Uzman doktor bilgilendirmesi, tedavi ve sağlıklı yaşam ipuçları.`,
      tags: mergedTags,
      actionable_data: {
        doctor_name: doctorName,
        specialty: text.includes('cerrah') ? 'Genel Cerrahi' : text.includes('estetik') ? 'Dermatoloji & Medikal Estetik' : text.includes('diyet') ? 'Beslenme ve Diyetetik' : 'Uzman Hekim',
        clinic: text.includes('hastane') || text.includes('hastanesi') ? 'Sağlık Kuruluşu' : undefined,
        topics: healthTags,
      },
      extractors: { health: true, transcript: Boolean(transcript) },
    }
  }

  // 3. Productivity / Software / AI / Tech / Tools / Creative Media (Kod, Yazılım, Yapay Zeka, Tasarım, Araçlar, Video Kurgu, Marketing)
  const isCodeOrAI =
    /\bkod\b|\bcode\b|yazılım|yazilim|developer|geliştirici|programlama|programlar|react|nextjs|javascript|typescript|python|\bcss\b|\bhtml\b|\bsql\b|yapay zeka|yapayzeka|\bai\b|chat[\s-]?gpt|claude|gemini|prompt|figma|\bui\b|\bux\b|tasarım|tasarim|tasarla|notion|excel|freelance|üretkenlik|verimlilik|kariyer|\biş\b|iş fikri|tool|araç|arac|\bmcp\b|ajan|agent|github|\brepo\b|\bapi\b|fullstack|backend|frontend|yazılımcı|teknoloji|tech|otomasyon|automation|remote|wfh|vibe coding|coding|cmo|lansman|chatbot|bot\b|terminal|ide\b|saas|mac mini|apple|windows|bilgisayar|sibergüvenlik|siber güvenlik|chrome|browser|tarayıcı|scraper|premiere|photoshop|mockup|vfx|lut\b|mocap|cgi\b|video edit|altyazı|kurgu|tutorial|efekt|pazarlama|dijital pazarlama|projectionmapping|websites you should know|speed ramp|pomelli|fotoğrafçılık|fotoğraf çek|yüksek iso|çekim|site\b|sitesi|websites|app:|app name/i.test(
      text
    ) ||
    hashtags.some((h) =>
      [
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
      ].includes(h)
    )

  if (isCodeOrAI) {
    const techTags = ['yazılım', 'teknoloji', 'üretkenlik']
    if (/ai|yapay zeka|yapayzeka|prompt|chat[\s-]?gpt|agent|ajan/i.test(text)) techTags.push('yapayZeka')
    if (/nextjs|react|javascript|typescript|kod|python|github|repo/i.test(text)) techTags.push('kod', 'webdev')
    if (/figma|ui|ux|tasarım|tasarla|mockup/i.test(text)) techTags.push('tasarım')
    if (/premiere|video|altyazı|kurgu|vfx|cgi/i.test(text)) techTags.push('videoKurgu')
    if (/remote|wfh|kariyer|freelance|iş fikri/i.test(text)) techTags.push('kariyer', 'uzaktanÇalışma')

    const mergedTags = Array.from(new Set([...techTags, ...hashtags])).slice(0, 7)

    return {
      category: 'productivity',
      title: title || 'Yazılım & Yapay Zeka Rehberi',
      summary: `${title || 'Teknoloji & Verimlilik'} — Geliştiriciler ve üretkenlik arayanlar için faydalı teknik rehber ve ipuçları.`,
      tags: mergedTags,
      actionable_data: {},
      extractors: { code: true, transcript: Boolean(transcript) },
    }
  }

  // 4. Books & Movies & Games & Entertainment (Kitap, Film, Dizi, Sinema Önerileri, Oyunlar)
  const isBookOrMovie =
    /kitap|film|dizi|netflix|sinema|roman|okuma|yazar|oneri dizi|öneri dizi|imdb|spoiler|karakter|bölüm|bolum|sezon|belgesel|kitap önerisi|film önerisi|kitaplar|filmler|diziler|tiyatro|sinemalar|seyirlik|steam oyun|oyunlar|\bgaming\b|\bgame\b|tyndalston|ghost\b|🎮|çizgi dizi|superman|\bdc\b/i.test(
      text
    ) ||
    hashtags.some((h) =>
      [
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
      ].includes(h)
    )

  if (isBookOrMovie) {
    const mediaTags = ['öneri', 'kültürSanat']
    if (/kitap|roman|okuma|yazar/i.test(text)) mediaTags.push('kitap')
    if (/film|sinema|belgesel/i.test(text)) mediaTags.push('film')
    if (/dizi|netflix|sezon|bölüm/i.test(text)) mediaTags.push('dizi')
    if (/oyun|gaming|steam/i.test(text)) mediaTags.push('oyun')

    const mergedTags = Array.from(new Set([...mediaTags, ...hashtags])).slice(0, 7)

    return {
      category: 'book_movie',
      title: title || 'Kitap & Dizi/Film Önerisi',
      summary: `${title || 'Öneri'} — İzleme, oyun ve okuma listeleri için öne çıkan değerlendirmeler.`,
      tags: mergedTags,
      actionable_data: {},
      extractors: { transcript: Boolean(transcript) },
    }
  }

  // 5. Travel & Place detection (Mekanlar, Rotalar, Gezi, Kafeler, Şehirler, Tatil)
  const isTravel =
    /istanbul|ankara|izmir|antalya|bodrum|kaş|kas|kapadokya|muğla|mugla|fethiye|datça|datca|bali|ubud|mekan|mekanlar|restoran|restaurant|cafe|kafe|kahve|kahveci|coffee|gezi|otel|hotel|rota|rotası|seyahat|travel|tatil|plaj|beach|koy\b|manzara|gezi rehber|şehir rehber|konaklama|karaköy|kadıköy|beşiktaş|moda|nişantaşı|beyoğlu|balat|bali trip|itinerary|dolce far niente|summer|uçak/i.test(
      text
    ) ||
    hashtags.some((h) =>
      [
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
      ].includes(h)
    )

  if (isTravel) {
    const travelTags = ['gezi', 'mekan', 'seyahat', 'keşif']
    if (text.includes('kahve') || text.includes('cafe') || text.includes('kafe')) travelTags.push('kahve')
    if (text.includes('istanbul')) travelTags.push('istanbul')
    if (text.includes('otel') || text.includes('hotel') || text.includes('konaklama')) travelTags.push('konaklama')

    const mergedTags = Array.from(new Set([...travelTags, ...hashtags])).slice(0, 7)

    return {
      category: 'travel',
      title: title || 'Şehir Keşfi & Mekan Rehberi',
      summary: `${title || 'Mekan ve Rota Rehberi'} — Keyifli vakit geçirilebilecek seçkin lokasyon ve gezi önerisi.`,
      tags: mergedTags,
      actionable_data: {
        locations: [
          {
            name: title?.includes('Kahve') ? 'Karaköy & Beyoğlu Kahvecileri' : (title || 'Önerilen Lokasyon'),
            city: text.includes('izmir') ? 'İzmir' : text.includes('ankara') ? 'Ankara' : text.includes('antalya') ? 'Antalya' : 'İstanbul',
            maps_query: `${title || 'Seçkin Mekan'} Harita`,
          },
        ],
      },
      extractors: { location: true, transcript: Boolean(transcript) },
    }
  }

  // 6. Product / Design / Home / Interior / Gadgets / Shopping / Fashion (Mobilya, Dekorasyon, Alışveriş, İndirim)
  const isProduct =
    /fiyat|satın al|satin al|indirim|kod[u]?\b|kupon|fırsat|kampanya|ürün|urun|link\b|linki|link bio|biyoda|öneri|tavsiye|trendyol|hepsiburada|amazon|zara|mango|kombin|alışveriş|çanta|ayakkabı|kulaklık|telefon|laptop|monitör|klavye|mobilya|dekorasyon|iç mimar|koltuk|dolap|cabinet|interior|noithat|sofa|yatak|temizlik|cleaning|küf|tasarım mobilya|ikea|einrichtung|home office|backdrop|photography|fotoğrafçılık|embroidery|nakış|parfüm|parfum|kumaş|bambu|süpürgelik|lifehack|plumbing|design studio|product photos|whisky|sartorial/i.test(
      text
    ) ||
    hashtags.some((h) =>
      [
        'indirim',
        'firsat',
        'kampanya',
        'alisveris',
        'alışveriş',
        'urunonerisi',
        'ürün',
        'kombin',
        'trendyol',
        'mobilya',
        'dekorasyon',
        'temizlik',
        'cleaning',
        'interior',
        'noithat',
        'homeoffice',
        'ikea',
        'embroideryart',
        'thietkenoithat',
        'parfum',
        'parfüm',
      ].includes(h)
    )

  if (isProduct) {
    const hasDiscount = /indirim|kod[u]?|kupon|fırsat|kampanya|%\d+/i.test(text)
    const prodTags = hasDiscount ? ['indirim', 'fırsat', 'ürün'] : ['ürün', 'alışveriş', 'tavsiye']
    if (/mobilya|dekorasyon|interior|koltuk|ikea/i.test(text)) prodTags.push('evTasarım')
    if (/trendyol|amazon|online/i.test(text)) prodTags.push('online')

    const mergedTags = Array.from(new Set([...prodTags, ...hashtags])).slice(0, 7)

    return {
      category: 'product',
      title: title || (hasDiscount ? 'Özel İndirim & Fırsat' : 'Öne Çıkan Ürün & Tasarım'),
      summary: `${title || 'Ürün / İnceleme'} — Fiyat avantajı, ürün özellikleri veya tasarım detayları.`,
      tags: mergedTags,
      actionable_data: {
        product_name: title || 'İncelenen Ürün / Tasarım',
        brand: 'Seçkin Marka',
        estimated_price: hasDiscount ? 'İndirimli Fırsat' : 'Ürün İncelemesi',
      },
      extractors: { discount: hasDiscount, transcript: Boolean(transcript) },
    }
  }

  // 7. Generic fallback ('other')
  const fallbackTags = Array.from(new Set(['kaydedilen', 'sosyalMedya', ...hashtags])).slice(0, 5)
  return {
    category: 'other',
    title: title || 'Kaydedilen Sosyal Medya İçeriği',
    summary: `${title || 'İçerik'} kütüphanenize başarıyla eklendi.`,
    tags: fallbackTags,
    actionable_data: {},
    extractors: { transcript: Boolean(transcript) },
  }
}

/**
 * Extracts strictly structured JSON using OpenAI GPT-4o-mini.
 * Falls back to offline pattern matching if API key is not present.
 */
export async function extractStructuredData(
  title: string | null,
  caption: string | null,
  transcript: string | null
): Promise<ExtractionResult> {
  const apiKey = process.env.OPENAI_API_KEY
  const isRealApiKey = apiKey && !apiKey.includes('your-openai') && apiKey.startsWith('sk-')

  if (!isRealApiKey) {
    return extractOfflineFallback(title, caption, transcript)
  }

  const systemPrompt = `Sen sosyal medya içeriklerini (Instagram Reels, TikTok, YouTube, vb.) derinlemesine analiz edip kategoriye özel yapılandırılmış veriler çıkaran uzman bir veri analistisin.

GÖREV:
Girdi olarak verilen başlık, açıklama ve video ses deşifresi (transcript) metinlerini incele.
Açıklamalarda geçen metin içeriğini ve #hashtag'leri dikkate alarak aşağıdaki kategorilerden tam olarak birini seç:
- "recipe" (yemek, tatlı, içecek, mutfak tarifleri, malzemeler)
- "health" (doktor, tıp, hastane, klinik, ameliyat, tedavi, estetik, botoks, diyetisyen, sağlık tavsiyeleri)
- "productivity" (yapay zeka araçları, kodlama, yazılım dilleri, kariyer, remote work, üretkenlik)
- "travel" (mekanlar, kafeler, restoranlar, oteller, gezi rotaları, şehir rehberleri)
- "book_movie" (kitap, dizi, film inceleme ve önerileri, sinema)
- "product" (ürün tanıtımı, masa kurulumu, kıyafet, elektronik alet, indirimler)
- "other" (diğer tüm içerikler)

ÖNEMLİ KURALLAR:
1. SADECE JSON döndür. Başka hiçbir açıklama metni yazma.
2. "actionable_data":
   - Eğer category == "recipe" ise:
     { "ingredients": string[], "steps": string[], "prep_time"?: string }
   - Eğer category == "health" ise:
     { "doctor_name"?: string, "specialty"?: string, "clinic"?: string, "topics"?: string[] }
   - Eğer category == "travel" ise:
     { "locations": [{ "name": string, "city": string, "maps_query": string }] }
   - Eğer category == "product" ise:
     { "product_name": string, "brand"?: string, "estimated_price"?: string }
   - Diğer kategorilerde boş nesne {} döndür.
3. "summary": 2-3 cümlelik net, açıklayıcı Türkçe özet.
4. "tags": 3-6 adet hashtag niteliğinde Türkçe anahtar kelime array. Gönderide geçen hashtag'leri de dahil et.
5. "extractors": { "recipe": boolean, "location": boolean, "discount": boolean, "code": boolean, "health": boolean, "transcript": boolean }

JSON ŞEMASI:
{
  "category": "recipe" | "health" | "productivity" | "travel" | "book_movie" | "product" | "other",
  "title": "Kısa ve dikkat çekici başlık",
  "summary": "2-3 cümlelik özet...",
  "tags": ["tag1", "tag2", "tag3"],
  "actionable_data": { ... },
  "extractors": { "recipe": false, "location": false, "discount": false, "code": false, "health": false, "transcript": false }
}`

  const userContent = `İçerik Başlığı: ${title || '-'}
İçerik Açıklaması / Caption: ${caption || '-'}
Video Ses Deşifresi (Transcript): ${transcript || 'Yok'}`

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
        max_tokens: 700,
      }),
      signal: AbortSignal.timeout(20000),
    })

    if (!res.ok) {
      console.warn(`[Structured Extractor] OpenAI returned status ${res.status}`)
      return extractOfflineFallback(title, caption, transcript)
    }

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content
    if (!content) throw new Error('No content returned from OpenAI')

    const parsed = JSON.parse(content)
    const captionHashtags = extractHashtags(caption)
    const combinedTags = Array.from(
      new Set([...(Array.isArray(parsed.tags) ? parsed.tags : ['içerik']), ...captionHashtags])
    ).slice(0, 8)

    const cat = (parsed.category as BookmarkCategory) || 'other'

    return {
      category: cat,
      title: parsed.title || title || 'Kaydedilen İçerik',
      summary: parsed.summary || 'Özet üretildi.',
      tags: combinedTags,
      actionable_data: parsed.actionable_data || {},
      extractors: {
        recipe: cat === 'recipe' || Boolean(parsed.extractors?.recipe),
        location: cat === 'travel' || Boolean(parsed.extractors?.location),
        code: cat === 'productivity' || Boolean(parsed.extractors?.code),
        health: cat === 'health' || Boolean(parsed.extractors?.health),
        discount: Boolean(parsed.extractors?.discount),
        transcript: Boolean(transcript),
      },
    }
  } catch (err) {
    console.warn('[Structured Extractor] OpenAI exception, using fallback:', err instanceof Error ? err.message : String(err))
    return extractOfflineFallback(title, caption, transcript)
  }
}
