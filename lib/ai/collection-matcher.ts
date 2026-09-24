import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'

export interface BookmarkMatchTarget {
  id: string
  caption?: string | null
  ai_summary?: string | null
  ai_tags?: string[] | null
  title?: string | null
  permalink?: string
  category?: string | null
}

/**
 * Normalizes Turkish and English strings for matching
 */
export function normalizeTurkish(str: string | null | undefined): string {
  if (!str) return ''
  return str
    .toLocaleLowerCase('tr-TR')
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '')
    .trim()
}

/**
 * Extracts linguistic stem from a Turkish word
 */
export function getStem(word: string): string {
  if (word.length < 4) return word
  return word.replace(/(leri|ları|lerin|ların|lerin|lerin|ler|lar|nin|nın|den|dan|deki|daki|de|da|e|a|i|ı|u|ü|le|la|li|lı|lu|lü)$/, '')
}

/**
 * Broad semantic synonym & keyword dictionary for common social media categories
 */
const DOMAIN_SYNONYMS: Record<string, string[]> = {
  araba: ['otomobil', 'arac', 'car', 'cars', 'bmw', 'mercedes', 'porsche', 'audi', 'ferrari', 'motor', 'surus', 'otomotiv', 'drift', 'jant', 'supercar', 'suv', 'ehliyet', 'garaj', 'hiz', 'otoban'],
  otomobil: ['araba', 'arac', 'car', 'cars', 'bmw', 'mercedes', 'porsche', 'audi', 'motor', 'surus', 'otomotiv', 'drift'],
  arac: ['araba', 'otomobil', 'car', 'motor'],
  motor: ['motosiklet', 'honda', 'yamaha', 'ducati', 'kawasaki', 'harley', 'kask', 'surus', 'motorcu', 'motovlog'],
  motosiklet: ['motor', 'honda', 'yamaha', 'ducati', 'kawasaki', 'kask', 'surus', 'biker'],
  
  kahve: ['coffee', 'latte', 'espresso', 'v60', 'barista', 'demleme', 'cafe', 'kafe', 'aeropress', 'roaster', 'cekirdek', 'cappuccino', 'filtre kahve'],
  kafe: ['kahve', 'cafe', 'mekan', 'restoran', 'coffee'],
  
  tasarim: ['design', 'ui', 'ux', 'mockup', 'logo', 'tipografi', 'dekorasyon', 'mimari', 'grafik', 'figma', 'canva', 'designer', 'estetik', 'dizayn', 'layout'],
  mimari: ['tasarim', 'ic mimar', 'dekorasyon', 'bina', 'ev turu', 'ev', 'oda', 'mobilya', 'architecture', 'interior'],
  dekorasyon: ['mobilya', 'ic mimar', 'ev turu', 'tasarim', 'dekor', 'ikea', 'koltuk', 'interior'],

  yazilim: ['kod', 'kodlama', 'developer', 'react', 'nextjs', 'python', 'javascript', 'typescript', 'coding', 'github', 'software', 'frontend', 'backend', 'fullstack', 'api', 'supabase'],
  kod: ['yazilim', 'developer', 'react', 'nextjs', 'python', 'javascript', 'coding', 'github', 'programlama'],
  kodlama: ['yazilim', 'kod', 'developer', 'programming', 'python', 'javascript'],
  yapayzeka: ['ai', 'chatgpt', 'gpt', 'claude', 'gemini', 'prompt', 'midjourney', 'llm', 'deep learning', 'machine learning', 'otomasyon'],
  ai: ['yapay zeka', 'yapayzeka', 'chatgpt', 'prompt', 'gemini', 'claude', 'llm'],

  finans: ['para', 'yatirim', 'borsa', 'hisse', 'kripto', 'crypto', 'bitcoin', 'btc', 'altin', 'dolar', 'euro', 'fon', 'temettu', 'ekonomi', 'gelir', 'butce', 'tasarruf', 'bist', 'nasdaq'],
  kripto: ['crypto', 'bitcoin', 'btc', 'ethereum', 'eth', 'binance', 'coin', 'altcoin', 'solana', 'blockchain', 'cuzdan'],
  borsa: ['hisse', 'yatirim', 'finans', 'temettu', 'bist', 'nasdaq', 'sp500', 'portfoy', 'al-sat', 'piyasa'],
  yatirim: ['finans', 'para', 'borsa', 'kripto', 'altin', 'fon', 'gayrimenkul', 'pasif gelir', 'temettu'],

  saglik: ['doktor', 'hekim', 'hastane', 'klinik', 'tedavi', 'ameliyat', 'diyet', 'fitness', 'beslenme', 'ilac', 'vitamin', 'tahlil', 'estetik', 'cildiye', 'dis'],
  fitness: ['spor', 'antrenman', 'kilo', 'kas', 'gym', 'workout', 'diyet', 'protein', 'pilates', 'kardiyo', 'egzersiz'],
  spor: ['fitness', 'antrenman', 'futbol', 'basketbol', 'kosu', 'gym', 'pilates', 'egzersiz'],
  diyet: ['beslenme', 'kilo', 'kalori', 'zayiflama', 'protein', 'diyetisyen', 'detoks', 'fit'],

  yemek: ['tarif', 'tarifi', 'yemekler', 'tatli', 'pasta', 'mutfak', 'lezzet', 'corba', 'makarna', 'borek', 'kahvalti', 'salata', 'meze', 'recipe', 'food', 'asci', 'nefis'],
  tarif: ['yemek', 'yemektarifi', 'tatli', 'pasta', 'mutfak', 'lezzet', 'malzeme', 'pisir', 'recipe'],
  tatli: ['pasta', 'kek', 'kurabiye', 'cikolata', 'cheesecake', 'dondurma', 'serbetli', 'tatlisi', 'dessert'],

  film: ['sinema', 'dizi', 'movie', 'cinema', 'netflix', 'imdb', 'belgesel', 'aktor', 'fragman', 'film onerisi', 'dizi onerisi', 'spoiler', 'sahne'],
  dizi: ['film', 'sinema', 'netflix', 'sezon', 'bolum', 'dizi onerisi', 'hbomax', 'series'],
  sinema: ['film', 'dizi', 'yonetmen', 'vizyon', 'cinema', 'movie'],
  kitap: ['roman', 'yazar', 'okuma', 'kitapkurdu', 'okudumbitti', 'book', 'edebiyat', 'siir', 'kutuphane', 'kitap onerisi'],

  gezi: ['seyahat', 'travel', 'mekan', 'rota', 'otel', 'tatil', 'plaj', 'koy', 'istanbul', 'vize', 'pasaport', 'itinerary', 'gezgin'],
  seyahat: ['gezi', 'travel', 'tatil', 'otel', 'ucak', 'rota', 'itinerary'],
  mekan: ['restoran', 'cafe', 'kafe', 'kahveci', 'gezi', 'bar', 'lezzet', 'otel'],

  kedi: ['kediler', 'cat', 'cats', 'kitten', 'miyav', 'pati', 'yavru kedi', 'veteriner'],
  kopek: ['kopekler', 'dog', 'dogs', 'puppy', 'hav', 'pati', 'yavru kopek', 'veteriner'],
  hayvan: ['kedi', 'kopek', 'pati', 'veteriner', 'kus', 'pet'],

  moda: ['kombin', 'outfit', 'giyim', 'stil', 'tarz', 'zara', 'mango', 'elbise', 'ayakkabi', 'canta', 'makyaj', 'beauty', 'fashion'],
  kombin: ['moda', 'outfit', 'giyim', 'stil', 'zara', 'elbise', 'ayakkabi', 'tarz'],
  makyaj: ['kozmetik', 'ruj', 'fondoten', 'cilt bakimi', 'skincare', 'guzellik', 'beauty'],

  ingilizce: ['english', 'vocab', 'kelime', 'grammar', 'speaking', 'ielts', 'toefl', 'phrasal', 'telaffuz', 'ceviri', 'yabanci dil'],
  muzik: ['sarki', 'music', 'konser', 'gitar', 'piyano', 'playlist', 'spotify', 'ses', 'vokal', 'sanatci'],
  psikoloji: ['terapi', 'zihin', 'mental', 'farkindalik', 'motivasyon', 'kaygi', 'depresyon', 'iliski', 'psikolog'],
  felsefe: ['stoacilik', 'stoic', 'dusunur', 'filozof', 'hayat', 'anlam', 'nietzsche', 'socrates', 'marcus aurelius'],
  girisim: ['startup', 'girisimcilik', 'kurucu', 'founder', 'sirket', 'is', 'proje', 'saas', 'yatirim'],
}

/**
 * Calculates a match score between a collection name and a bookmark
 */
export function calculateCollectionMatchScore(
  collectionName: string,
  bookmark: BookmarkMatchTarget
): { score: number; isMatch: boolean; reasons: string[] } {
  const normCol = normalizeTurkish(collectionName)
  
  // Extract words and tokens from collection name (ignoring emojis & punctuation)
  const colWords = normCol
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3)

  if (colWords.length === 0) {
    return { score: 0, isMatch: false, reasons: [] }
  }

  const caption = normalizeTurkish(bookmark.caption)
  const tags = (bookmark.ai_tags || []).map(normalizeTurkish)
  const summary = normalizeTurkish(bookmark.ai_summary)
  const title = normalizeTurkish(bookmark.title)
  const category = normalizeTurkish(bookmark.category)

  let score = 0
  const reasons: string[] = []

  for (const word of colWords) {
    const stem = getStem(word)

    // 1. Direct hashtag / tags match (+40 points)
    for (const tag of tags) {
      if (tag === word) {
        score += 40
        reasons.push(`Etiket tam eşleşti: #${tag}`)
      } else if (tag.includes(word) || (word.length >= 4 && tag.startsWith(stem))) {
        score += 25
        reasons.push(`Etiket kökü eşleşti: #${tag}`)
      }
    }

    // 2. Title match (+35 points)
    if (title && (title.includes(word) || (stem.length >= 4 && title.includes(stem)))) {
      score += 35
      reasons.push(`Başlıkta "${word}" bulundu`)
    }

    // 3. AI Summary match (+25 points)
    if (summary && (summary.includes(word) || (stem.length >= 4 && summary.includes(stem)))) {
      score += 25
      reasons.push(`Özette "${word}" bulundu`)
    }

    // 4. Caption exact word match (+20 points)
    const captionWordRegex = new RegExp(`\\b${word}\\b`, 'i')
    if (captionWordRegex.test(caption)) {
      score += 20
      reasons.push(`Açıklamada "${word}" geçti`)
    } else if (caption.includes(word) || (stem.length >= 4 && caption.includes(stem))) {
      score += 15
      reasons.push(`Açıklamada "${stem}" kökü geçti`)
    }

    // 5. Category name alignment (+20 points)
    if (category && (category.includes(word) || word.includes(category))) {
      score += 20
      reasons.push(`Kategori eşleşti: ${category}`)
    }

    // 6. Domain-specific synonyms & related concepts (+15 to +25 points)
    const syns = DOMAIN_SYNONYMS[word] || DOMAIN_SYNONYMS[stem] || []
    for (const syn of syns) {
      if (tags.includes(syn)) {
        score += 25
        reasons.push(`Eş anlamlı etiket: #${syn}`)
      } else if (caption.includes(syn)) {
        score += 15
        reasons.push(`İlişkili terim: "${syn}"`)
      } else if (summary.includes(syn) || title.includes(syn)) {
        score += 15
        reasons.push(`İlişkili kavram: "${syn}"`)
      }
    }
  }

  // Threshold: >= 25 is a confident match
  const isMatch = score >= 25
  return { score, isMatch, reasons }
}

/**
 * Infers a canonical category from the collection name if applicable
 */
export function inferCategoryFromCollectionName(collectionName: string): string | null {
  const norm = normalizeTurkish(collectionName)
  if (/tarif|yemek|mutfak|tatli|pasta|lezzet|recipe|food|borek|kahve|kafe|asci/i.test(norm)) return 'recipe'
  if (/saglik|doktor|hekim|hastane|fitness|spor|diyet|beslenme|antrenman|gym/i.test(norm)) return 'health'
  if (/yazilim|kod|developer|programlama|react|nextjs|python|javascript|yapayzeka|ai|chatgpt|tech/i.test(norm)) return 'productivity'
  if (/finans|borsa|para|yatirim|kripto|crypto|bitcoin|hisse|temettu|ekonomi|dolar/i.test(norm)) return 'finance'
  if (/motivasyon|zihin|gelisim|felsefe|psikoloji|mindset|mental|terapi/i.test(norm)) return 'motivation_mindset'
  if (/gezi|seyahat|mekan|rota|otel|tatil|travel|itinerary|gezgin/i.test(norm)) return 'travel'
  if (/urun|indirim|firsat|alisveris|moda|kombin|elbise|ayakkabi|stil|product/i.test(norm)) return 'product'
  if (/kitap|film|dizi|sinema|netflix|roman|yazar|movie|cinema|series/i.test(norm)) return 'book_movie'
  return null
}

/**
 * Scans the user's entire library against a specific collection.
 * If matching bookmarks were previously in another category/collection,
 * pulls them out and reassigns them to this new category/collection.
 */
export async function scanLibraryForCollection(
  supabase: SupabaseClient,
  userId: string,
  collectionId: string,
  collectionName: string
): Promise<{
  scannedCount: number
  matchedCount: number
  transferredCount: number
  matchedBookmarkIds: string[]
}> {
  const admin = createAdminClient()
  const db = supabase || admin

  // 1. Fetch all user bookmarks without 1000 limit
  const { fetchAllUserBookmarks } = await import('@/lib/supabase/fetch-all')
  const bookmarks = await fetchAllUserBookmarks<BookmarkMatchTarget & { collection_id?: string | null }>(
    db,
    userId,
    'id, permalink, caption, ai_summary, ai_tags, category, collection_id'
  )

  if (!bookmarks || bookmarks.length === 0) {
    return { scannedCount: 0, matchedCount: 0, transferredCount: 0, matchedBookmarkIds: [] }
  }

  // 2. Identify matches and detect transfers from other categories/collections
  const matchedBookmarkIds: string[] = []
  const mappedCategory = inferCategoryFromCollectionName(collectionName)
  let transferredCount = 0

  for (const bm of bookmarks) {
    const { isMatch } = calculateCollectionMatchScore(collectionName, bm)
    if (isMatch) {
      matchedBookmarkIds.push(bm.id)
      if (bm.collection_id && bm.collection_id !== collectionId) {
        transferredCount++
      } else if (mappedCategory && bm.category && bm.category !== mappedCategory && bm.category !== 'other') {
        transferredCount++
      }
    }
  }

  if (matchedBookmarkIds.length === 0) {
    return { scannedCount: bookmarks.length, matchedCount: 0, transferredCount: 0, matchedBookmarkIds: [] }
  }

  // 3. Chunk transfer into new collection (100 items per chunk)
  const CHUNK_SIZE = 100
  for (let i = 0; i < matchedBookmarkIds.length; i += CHUNK_SIZE) {
    const chunk = matchedBookmarkIds.slice(i, i + CHUNK_SIZE)

    // Pull from previous collections in junction table so they belong to this new matching category
    await db
      .from('bookmark_collections')
      .delete()
      .in('bookmark_id', chunk)

    const inserts = chunk.map((bId) => ({
      bookmark_id: bId,
      collection_id: collectionId,
    }))

    const { error: insErr } = await db.from('bookmark_collections').insert(inserts)
    if (insErr) {
      // Fallback with admin client
      await admin.from('bookmark_collections').insert(inserts)
    }

    // Update collection_id and category on bookmarks table (moving them from old category/collection)
    const updatePayload: Record<string, unknown> = {
      collection_id: collectionId,
      updated_at: new Date().toISOString(),
    }
    if (mappedCategory) {
      updatePayload.category = mappedCategory
    }

    await db
      .from('bookmarks')
      .update(updatePayload)
      .in('id', chunk)
  }

  return {
    scannedCount: bookmarks.length,
    matchedCount: matchedBookmarkIds.length,
    transferredCount,
    matchedBookmarkIds,
  }
}
