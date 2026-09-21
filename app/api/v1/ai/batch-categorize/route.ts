import 'server-only'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { planSmartCategory } from '@/lib/ai/smart-categorizer'
import { formatBookmarkTitle, extractRealAuthor } from '@/lib/bookmark-formatter'
import type { SavedItem } from '@/lib/mock-data'

export const maxDuration = 120 // Allow extended serverless execution for batch AI

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    // 1. Fetch user bookmarks
    const { data: bookmarks, error: fetchErr } = await supabase
      .from('bookmarks')
      .select('*, bookmark_collections(collection_id, collections(id, name, color))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10000)

    if (fetchErr) {
      console.error('[batch-categorize] Fetch error:', fetchErr)
      return NextResponse.json({ error: 'İçerikler alınamadı: ' + fetchErr.message }, { status: 500 })
    }

    if (!bookmarks || bookmarks.length === 0) {
      return NextResponse.json({ success: true, processedCount: 0, updatedItems: [], collections: [] })
    }

    // 2. Fetch or initialize user collections
    const { data: existingCols } = await supabase
      .from('collections')
      .select('id, name, color, icon')
      .eq('user_id', user.id)

    const colMap = new Map<string, { id: string; name: string; color: string; icon: string }>()
    for (const c of existingCols || []) {
      colMap.set(c.name.toLowerCase().trim(), c)
    }

    const updatedItems: SavedItem[] = []
    let updatedCount = 0
    const bcToInsert: Array<{ bookmark_id: string; collection_id: string }> = []

    // 3. Process bookmarks and determine matching/new collections
    for (const b of bookmarks) {
      const realAuthor = extractRealAuthor(b.caption, b.author_username || b.author_name)
      const cleanTitle = formatBookmarkTitle(b.caption, b.permalink, realAuthor.name)

      // Intelligent Tag & Category Planning
      const plan = planSmartCategory(cleanTitle, b.caption, realAuthor.username)

      // Check if matching collection exists for this user
      const targetColKey = plan.collectionName.toLowerCase().trim()
      let colRecord = colMap.get(targetColKey)

      if (!colRecord) {
        // Also check by partial match
        for (const [key, val] of colMap.entries()) {
          if (key.includes(targetColKey) || targetColKey.includes(key)) {
            colRecord = val
            break
          }
        }
      }

      // If no matching collection, dynamically CREATE a new category/collection for this user!
      if (!colRecord) {
        const { data: newCol, error: colErr } = await supabase
          .from('collections')
          .insert({
            user_id: user.id,
            name: plan.collectionName,
            color: plan.collectionColor,
            icon: plan.collectionIcon,
          })
          .select('id, name, color, icon')
          .maybeSingle()

        if (newCol) {
          colRecord = newCol
          colMap.set(targetColKey, newCol)
        } else {
          console.warn('[batch-categorize] Could not create collection:', colErr?.message)
        }
      }

      if (colRecord) {
        bcToInsert.push({
          bookmark_id: b.id,
          collection_id: colRecord.id,
        })
      }

      const updatePayload = {
        category: plan.category,
        ai_summary: plan.summary,
        ai_tags: plan.tags,
        extractors: {
          ...(b.extractors || {}),
          ...plan.extractors,
        },
        status: 'completed',
        updated_at: new Date().toISOString(),
      }

      const { error: updateErr } = await supabase
        .from('bookmarks')
        .update(updatePayload)
        .eq('id', b.id)

      if (!updateErr) {
        updatedCount++
      }

      updatedItems.push({
        id: b.id,
        url: b.permalink,
        platform: b.platform,
        title: cleanTitle,
        description: b.caption,
        thumbnail_url: (b.stored_media_urls && b.stored_media_urls[0]) || (b.media_urls && b.media_urls[0]) || null,
        summary: plan.summary,
        tags: plan.tags,
        extractors: updatePayload.extractors,
        starred: b.is_favorite ?? false,
        created_at: b.created_at,
        author_username: realAuthor.username,
        author_avatar: b.author_avatar || undefined,
        media_type: b.media_type || undefined,
        stored_media_urls: b.stored_media_urls || [],
        collection_id: colRecord?.id || null,
        collection_name: colRecord?.name || null,
        collection_color: colRecord?.color || null,
        status: 'completed',
        error_message: null,
        transcript: b.transcript || null,
        category: plan.category,
        actionable_data: b.actionable_data || null,
      })
    }

    // 4. Batch upsert bookmark_collections relationships
    if (bcToInsert.length > 0) {
      for (let i = 0; i < bcToInsert.length; i += 50) {
        const chunk = bcToInsert.slice(i, i + 50)
        await supabase
          .from('bookmark_collections')
          .upsert(chunk, { onConflict: 'bookmark_id,collection_id' })
      }
    }

    // 5. Fetch finalized collections list
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
      processedCount: updatedCount,
      total: bookmarks.length,
      updatedItems,
      collections: formattedCollections,
      message: `${updatedCount} içerik başarıyla analiz edildi ve uygun kategorilere/koleksiyonlara atandı.`,
    })
  } catch (err) {
    console.error('[batch-categorize] Unexpected error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Toplu kategorizasyon sırasında hata oluştu' },
      { status: 500 }
    )
  }
}
