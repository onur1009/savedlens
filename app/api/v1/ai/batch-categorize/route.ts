import 'server-only'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { planSmartCategory } from '@/lib/ai/smart-categorizer'
import { formatBookmarkTitle, extractRealAuthor } from '@/lib/bookmark-formatter'
import { extractHashtags } from '@/lib/ai/extractor'

export const maxDuration = 120 // Extended for AI batch processing

interface BookmarkUpdateRow {
  id: string
  user_id: string
  platform: string
  permalink: string
  category: string
  ai_summary: string
  ai_tags: string[]
  extractors: Record<string, unknown>
  status: string
  updated_at: string
}

interface PatchData {
  category: string
  summary: string
  tags: string[]
  collection_id: string | null
  collection_name: string | null
  collection_color: string | null
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    // 1. Fetch user bookmarks (lean select without 1000 limit)
    const { fetchAllUserBookmarks } = await import('@/lib/supabase/fetch-all')
    const bookmarks = await fetchAllUserBookmarks<{
      id: string
      user_id: string
      platform: string
      permalink: string
      caption: string | null
      author_username: string | null
      author_name: string | null
      extractors: Record<string, unknown> | null
    }>(
      supabase,
      user.id,
      'id, user_id, platform, permalink, caption, author_username, author_name, extractors'
    )

    if (!bookmarks || bookmarks.length === 0) {
      return NextResponse.json({
        success: true,
        processedCount: 0,
        total: 0,
        patchMap: {},
        collections: [],
        message: 'Kategorize edilecek içerik bulunamadı.',
      })
    }

    // 2. Fetch existing collections
    const { data: existingCols } = await supabase
      .from('collections')
      .select('id, name, color, icon')
      .eq('user_id', user.id)

    const colMap = new Map<string, { id: string; name: string; color: string; icon: string }>()
    for (const c of existingCols || []) {
      colMap.set(c.name.toLowerCase().trim(), c)
    }

    // 3. Try Gemini AI categorization first
    let useGemini = false
    let geminiResults = new Map<string, { category: string; collectionName: string; confidence: number; summary: string; tags: string[]; reasoning: string }>()

    try {
      const { isGeminiAvailable, batchCategorizeWithGemini } = await import('@/lib/ai/gemini-categorizer')

      if (isGeminiAvailable()) {
        useGemini = true
        console.log(`[batch-categorize] Using Gemini AI for ${bookmarks.length} bookmarks`)

        const inputs = bookmarks.map((b) => ({
          id: b.id,
          caption: b.caption,
          title: formatBookmarkTitle(b.caption, b.permalink, extractRealAuthor(b.caption, b.author_username || b.author_name).name),
          author: b.author_username || b.author_name,
          hashtags: extractHashtags(b.caption || ''),
          permalink: b.permalink,
        }))

        geminiResults = await batchCategorizeWithGemini(inputs, existingCols || [])
        console.log(`[batch-categorize] Gemini categorized ${geminiResults.size}/${bookmarks.length} bookmarks`)
      }
    } catch (err) {
      console.warn('[batch-categorize] Gemini unavailable, using regex fallback:', err instanceof Error ? err.message : String(err))
    }

    // 4. Build category plans — Gemini results + regex fallback for uncategorized
    const missingColsMap = new Map<string, { name: string; color: string; icon: string }>()
    const plannedBookmarks: Array<{
      b: (typeof bookmarks)[0]
      category: string
      collectionName: string
      collectionColor: string
      collectionIcon: string
      summary: string
      tags: string[]
      extractors: Record<string, boolean>
      targetColKey: string
    }> = []

    // Category metadata for Gemini results
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

    for (const b of bookmarks) {
      const geminiResult = geminiResults.get(b.id)

      let category: string
      let collectionName: string
      let collectionColor: string
      let collectionIcon: string
      let summary: string
      let tags: string[]
      let extractors: Record<string, boolean>

      if (geminiResult) {
        // Use Gemini AI result
        category = geminiResult.category
        const meta = CATEGORY_META[category] || CATEGORY_META.other
        collectionName = geminiResult.collectionName || meta.name
        collectionColor = meta.color
        collectionIcon = meta.icon
        summary = geminiResult.summary
        tags = geminiResult.tags || []
        extractors = {
          recipe: category === 'recipe',
          health: category === 'health',
          code: category === 'productivity',
          location: category === 'travel',
          discount: category === 'product',
        }

        // Check if Gemini pointed to a user custom collection
        if (existingCols) {
          const matchedCustom = existingCols.find(
            (c) => c.name === collectionName || c.name.toLowerCase() === collectionName.toLowerCase()
          )
          if (matchedCustom) {
            collectionName = matchedCustom.name
            collectionColor = matchedCustom.color || collectionColor
            collectionIcon = matchedCustom.icon || collectionIcon
          }
        }
      } else {
        // Fallback to regex-based categorization
        const realAuthor = extractRealAuthor(b.caption, b.author_username || b.author_name)
        const cleanTitle = formatBookmarkTitle(b.caption, b.permalink, realAuthor.name)
        const plan = planSmartCategory(cleanTitle, b.caption, realAuthor.username, existingCols || [])
        category = plan.category
        collectionName = plan.collectionName
        collectionColor = plan.collectionColor
        collectionIcon = plan.collectionIcon
        summary = plan.summary
        tags = plan.tags
        extractors = plan.extractors as Record<string, boolean>
      }

      const targetColKey = collectionName.toLowerCase().trim()
      plannedBookmarks.push({
        b,
        category,
        collectionName,
        collectionColor,
        collectionIcon,
        summary,
        tags,
        extractors,
        targetColKey,
      })

      // Check if collection exists
      let colRecord = colMap.get(targetColKey)
      if (!colRecord) {
        for (const [key, val] of colMap.entries()) {
          if (key.includes(targetColKey) || targetColKey.includes(key)) {
            colRecord = val
            break
          }
        }
      }

      if (!colRecord && !missingColsMap.has(targetColKey)) {
        missingColsMap.set(targetColKey, {
          name: collectionName,
          color: collectionColor,
          icon: collectionIcon,
        })
      }
    }

    // 5. Batch create any missing collections
    if (missingColsMap.size > 0) {
      const toInsert = Array.from(missingColsMap.values()).map((c) => ({
        user_id: user.id,
        name: c.name,
        color: c.color,
        icon: c.icon,
      }))

      const { data: createdCols, error: colCreateErr } = await supabase
        .from('collections')
        .insert(toInsert)
        .select('id, name, color, icon')

      if (colCreateErr) {
        console.warn('[batch-categorize] Batch collection creation warning:', colCreateErr.message)
      } else if (createdCols) {
        for (const c of createdCols) {
          colMap.set(c.name.toLowerCase().trim(), c)
        }
      }
    }

    // 6. Build bookmark updates, relationships, and lightweight patch map
    const bookmarkUpdates: BookmarkUpdateRow[] = []
    const bcToInsertMap = new Map<string, { bookmark_id: string; collection_id: string }>()
    const patchMap: Record<string, PatchData> = {}
    const nowIso = new Date().toISOString()

    for (const planned of plannedBookmarks) {
      const { b, targetColKey } = planned
      let colRecord = colMap.get(targetColKey)
      if (!colRecord) {
        for (const [key, val] of colMap.entries()) {
          if (key.includes(targetColKey) || targetColKey.includes(key)) {
            colRecord = val
            break
          }
        }
      }

      if (colRecord) {
        const linkKey = `${b.id}:${colRecord.id}`
        bcToInsertMap.set(linkKey, {
          bookmark_id: b.id,
          collection_id: colRecord.id,
        })
      }

      bookmarkUpdates.push({
        id: b.id,
        user_id: b.user_id,
        platform: b.platform || 'web',
        permalink: b.permalink,
        category: planned.category,
        ai_summary: planned.summary,
        ai_tags: planned.tags,
        extractors: {
          ...(b.extractors || {}),
          ...planned.extractors,
        },
        status: 'completed',
        updated_at: nowIso,
      })

      patchMap[b.id] = {
        category: planned.category,
        summary: planned.summary,
        tags: planned.tags,
        collection_id: colRecord?.id || null,
        collection_name: colRecord?.name || null,
        collection_color: colRecord?.color || null,
      }
    }

    // 7. High-speed Chunked Batch Upsert for bookmarks (80 per chunk, concurrency: 3)
    const CHUNK_SIZE = 80
    const bookmarkChunks: BookmarkUpdateRow[][] = []
    for (let i = 0; i < bookmarkUpdates.length; i += CHUNK_SIZE) {
      bookmarkChunks.push(bookmarkUpdates.slice(i, i + CHUNK_SIZE))
    }

    const CONCURRENCY = 3
    for (let i = 0; i < bookmarkChunks.length; i += CONCURRENCY) {
      const slice = bookmarkChunks.slice(i, i + CONCURRENCY)
      await Promise.all(
        slice.map(async (chunk) => {
          const { error } = await supabase
            .from('bookmarks')
            .upsert(chunk, { onConflict: 'id' })
          if (error) {
            console.warn('[batch-categorize] Bookmark batch upsert chunk error:', error.message)
          }
        })
      )
    }

    // 8. High-speed Chunked Batch Upsert for bookmark_collections
    const bcList = Array.from(bcToInsertMap.values())
    const bcChunks: Array<typeof bcList> = []
    for (let i = 0; i < bcList.length; i += CHUNK_SIZE) {
      bcChunks.push(bcList.slice(i, i + CHUNK_SIZE))
    }

    for (let i = 0; i < bcChunks.length; i += CONCURRENCY) {
      const slice = bcChunks.slice(i, i + CONCURRENCY)
      await Promise.all(
        slice.map(async (chunk) => {
          const { error } = await supabase
            .from('bookmark_collections')
            .upsert(chunk, { onConflict: 'bookmark_id,collection_id' })
          if (error) {
            console.warn('[batch-categorize] Collection link batch upsert chunk error:', error.message)
          }
        })
      )
    }

    // 9. Fetch finalized collections list with counts
    const { data: finalCols } = await supabase
      .from('collections')
      .select('*, bookmark_collections(count)')
      .eq('user_id', user.id)
      .order('name', { ascending: true })

    interface RawColRes {
      id: string
      name: string
      color: string
      icon: string
      bookmark_collections?: Array<{ count?: number }>
    }

    const formattedCollections = ((finalCols as unknown as RawColRes[]) || []).map((c) => ({
      id: c.id,
      name: c.name,
      color: c.color || '#6366f1',
      icon: c.icon || 'folder',
      count: c.bookmark_collections?.[0]?.count || 0,
    }))

    const aiNote = useGemini
      ? ` (Gemini AI ile ${geminiResults.size} gönderi derinlemesine analiz edildi)`
      : ' (Anahtar kelime eşleştirmesi ile kategorize edildi)'

    return NextResponse.json({
      success: true,
      processedCount: bookmarkUpdates.length,
      total: bookmarks.length,
      patchMap,
      collections: formattedCollections,
      message: `${bookmarkUpdates.length} içerik başarıyla analiz edildi ve akıllı kategorilerine yerleştirildi${aiNote}.`,
    })
  } catch (err) {
    console.error('[batch-categorize] Unexpected error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Toplu kategorizasyon sırasında hata oluştu' },
      { status: 500 }
    )
  }
}

