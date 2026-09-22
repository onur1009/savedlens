import 'server-only'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { planSmartCategory } from '@/lib/ai/smart-categorizer'
import { formatBookmarkTitle, extractRealAuthor } from '@/lib/bookmark-formatter'

export const maxDuration = 60 // Extended execution for batch processing

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

    // 3. In-memory category and collection planning for all bookmarks
    const missingColsMap = new Map<string, { name: string; color: string; icon: string }>()
    const plannedBookmarks: Array<{
      b: (typeof bookmarks)[0]
      plan: ReturnType<typeof planSmartCategory>
      cleanTitle: string
      targetColKey: string
    }> = []

    for (const b of bookmarks) {
      const realAuthor = extractRealAuthor(b.caption, b.author_username || b.author_name)
      const cleanTitle = formatBookmarkTitle(b.caption, b.permalink, realAuthor.name)
      const plan = planSmartCategory(cleanTitle, b.caption, realAuthor.username)
      const targetColKey = plan.collectionName.toLowerCase().trim()

      plannedBookmarks.push({ b, plan, cleanTitle, targetColKey })

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
          name: plan.collectionName,
          color: plan.collectionColor,
          icon: plan.collectionIcon,
        })
      }
    }

    // 4. Batch create any missing collections
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

    // 5. Build bookmark updates, relationships, and lightweight patch map
    const bookmarkUpdates: BookmarkUpdateRow[] = []
    const bcToInsertMap = new Map<string, { bookmark_id: string; collection_id: string }>()
    const patchMap: Record<string, PatchData> = {}
    const nowIso = new Date().toISOString()

    for (const { b, plan, targetColKey } of plannedBookmarks) {
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
        category: plan.category,
        ai_summary: plan.summary,
        ai_tags: plan.tags,
        extractors: {
          ...(b.extractors || {}),
          ...plan.extractors,
        },
        status: 'completed',
        updated_at: nowIso,
      })

      patchMap[b.id] = {
        category: plan.category,
        summary: plan.summary,
        tags: plan.tags,
        collection_id: colRecord?.id || null,
        collection_name: colRecord?.name || null,
        collection_color: colRecord?.color || null,
      }
    }

    // 6. High-speed Chunked Batch Upsert for bookmarks (80 per chunk, concurrency: 3)
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

    // 7. High-speed Chunked Batch Upsert for bookmark_collections
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

    // 8. Fetch finalized collections list with counts
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

    return NextResponse.json({
      success: true,
      processedCount: bookmarkUpdates.length,
      total: bookmarks.length,
      patchMap,
      collections: formattedCollections,
      message: `${bookmarkUpdates.length} içerik başarıyla analiz edildi ve akıllı kategorilerine yerleştirildi.`,
    })
  } catch (err) {
    console.error('[batch-categorize] Unexpected error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Toplu kategorizasyon sırasında hata oluştu' },
      { status: 500 }
    )
  }
}
