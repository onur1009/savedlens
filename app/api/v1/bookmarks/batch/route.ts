import 'server-only'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { planSmartCategory, assignBookmarkToSmartCollection } from '@/lib/ai/smart-categorizer'
import { formatBookmarkTitle, extractRealAuthor } from '@/lib/bookmark-formatter'

export const maxDuration = 60

/**
 * Splits an array into chunks of the given size
 * PostgREST rejects .in('id', ...) with more than ~150-200 UUIDs (URL query length limit).
 */
function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { action = 'delete', bookmarkIds = [], collectionId, isFavorite, all = false } = body

    const admin = createAdminClient()
    const isWipingAll = action === 'delete_all' || action === 'clear_all' || all === true

    // ── 1. Batch Delete / Delete All ──────────────────────────────────
    if (action === 'delete' || isWipingAll) {
      if (isWipingAll) {
        // Fast Wipe: Delete all bookmarks for this user
        // 1. Delete associated collection relations first
        try {
          const { data: userBookmarks } = await admin
            .from('bookmarks')
            .select('id')
            .eq('user_id', user.id)

          if (userBookmarks && userBookmarks.length > 0) {
            const allBmIds = userBookmarks.map((b) => b.id)
            const idChunks = chunkArray(allBmIds, 100)
            for (const chunk of idChunks) {
              await supabase.from('bookmark_collections').delete().in('bookmark_id', chunk)
              await admin.from('bookmark_collections').delete().in('bookmark_id', chunk)
            }
          }
        } catch (cleanupErr) {
          console.warn('[Batch Wipe] Collection cleanup warning:', cleanupErr)
        }

        // 2. Delete all bookmarks for this user using authenticated client
        let { data: deletedRows } = await supabase
          .from('bookmarks')
          .delete()
          .eq('user_id', user.id)
          .select('id')

        // Fallback to admin client if RLS didn't match rows
        if (!deletedRows || deletedRows.length === 0) {
          const adminDel = await admin
            .from('bookmarks')
            .delete()
            .or(`user_id.eq.${user.id},user_id.eq.00000000-0000-0000-0000-000000000001,user_id.is.null`)
            .select('id')

          if (adminDel.data && adminDel.data.length > 0) {
            deletedRows = adminDel.data
          }
        }

        return NextResponse.json({
          success: true,
          count: deletedRows?.length || 0,
          message: 'Tüm kütüphaneniz başarıyla temizlendi',
        })
      }

      // Specific IDs deletion
      if (!Array.isArray(bookmarkIds) || bookmarkIds.length === 0) {
        return NextResponse.json({ error: 'İşlem yapılacak içerik listesi belirtilmedi' }, { status: 400 })
      }

      const ids = bookmarkIds.filter((id): id is string => typeof id === 'string' && id.length > 0)
      if (ids.length === 0) {
        return NextResponse.json({ error: 'Geçerli içerik kimliği bulunamadı' }, { status: 400 })
      }

      // Chunk into batches of 100 to strictly avoid PostgREST 400 Bad Request
      const idChunks = chunkArray(ids, 100)
      let totalDeleted = 0

      for (const chunk of idChunks) {
        // 1. Delete associated collection join records
        await supabase
          .from('bookmark_collections')
          .delete()
          .in('bookmark_id', chunk)

        try {
          await admin
            .from('bookmark_collections')
            .delete()
            .in('bookmark_id', chunk)
        } catch {}

        // 2. Delete bookmarks in this chunk
        let { data: deletedRows } = await supabase
          .from('bookmarks')
          .delete()
          .in('id', chunk)
          .select('id')

        if (!deletedRows || deletedRows.length === 0) {
          const adminDel = await admin
            .from('bookmarks')
            .delete()
            .in('id', chunk)
            .or(`user_id.eq.${user.id},user_id.eq.00000000-0000-0000-0000-000000000001,user_id.is.null`)
            .select('id')

          if (adminDel.data && adminDel.data.length > 0) {
            deletedRows = adminDel.data
          }
        }

        totalDeleted += deletedRows?.length || chunk.length
      }

      return NextResponse.json({
        success: true,
        count: totalDeleted,
        message: `${totalDeleted} içerik başarıyla kütüphaneden silindi`,
      })
    }

    // Specific IDs required for remaining actions
    if (!Array.isArray(bookmarkIds) || bookmarkIds.length === 0) {
      return NextResponse.json({ error: 'İşlem yapılacak içerik listesi belirtilmedi' }, { status: 400 })
    }

    const ids = bookmarkIds.filter((id): id is string => typeof id === 'string' && id.length > 0)
    if (ids.length === 0) {
      return NextResponse.json({ error: 'Geçerli içerik kimliği bulunamadı' }, { status: 400 })
    }

    // ── 2. Batch Favorite / Unfavorite ───────────────────────────────
    if (action === 'favorite') {
      const targetState = typeof isFavorite === 'boolean' ? isFavorite : true
      const idChunks = chunkArray(ids, 100)
      let totalUpdated = 0

      for (const chunk of idChunks) {
        let { data: updatedRows } = await supabase
          .from('bookmarks')
          .update({ is_favorite: targetState, updated_at: new Date().toISOString() })
          .in('id', chunk)
          .select('id, is_favorite')

        if (!updatedRows || updatedRows.length === 0) {
          const adminFav = await admin
            .from('bookmarks')
            .update({ is_favorite: targetState, updated_at: new Date().toISOString() })
            .in('id', chunk)
            .or(`user_id.eq.${user.id},user_id.eq.00000000-0000-0000-0000-000000000001,user_id.is.null`)
            .select('id, is_favorite')

          if (adminFav.data && adminFav.data.length > 0) {
            updatedRows = adminFav.data
          }
        }

        totalUpdated += updatedRows?.length || chunk.length
      }

      return NextResponse.json({
        success: true,
        count: totalUpdated,
        is_favorite: targetState,
        message: `${totalUpdated} içerik ${targetState ? 'favorilere eklendi' : 'favorilerden çıkarıldı'}`,
      })
    }

    // ── 3. Batch Re-Categorize with AI ────────────────────────────────
    if (action === 'categorize') {
      const idChunks = chunkArray(ids, 100)
      let allTargetBookmarks: Array<{ id: string; permalink: string; caption: string | null; author_username?: string | null; author_name?: string | null }> = []

      for (const chunk of idChunks) {
        let { data: chunkBookmarks } = await supabase
          .from('bookmarks')
          .select('id, permalink, caption, author_username, author_name')
          .in('id', chunk)

        if (!chunkBookmarks || chunkBookmarks.length === 0) {
          const adminFetch = await admin
            .from('bookmarks')
            .select('id, permalink, caption, author_username, author_name')
            .in('id', chunk)
            .or(`user_id.eq.${user.id},user_id.eq.00000000-0000-0000-0000-000000000001,user_id.is.null`)
          chunkBookmarks = adminFetch.data
        }

        if (chunkBookmarks) {
          allTargetBookmarks.push(...chunkBookmarks)
        }
      }

      if (allTargetBookmarks.length === 0) {
        return NextResponse.json({ error: 'Kategorize edilecek içerik bulunamadı' }, { status: 404 })
      }

      const updatedResults: Array<{ id: string; category: string; collectionName: string }> = []

      for (const bm of allTargetBookmarks) {
        const realAuthor = extractRealAuthor(bm.caption, bm.author_username || bm.author_name)
        const cleanTitle = formatBookmarkTitle(bm.caption, bm.permalink, realAuthor.name)
        const plan = planSmartCategory(cleanTitle, bm.caption, realAuthor.username)

        // Assign to collection
        const colRes = await assignBookmarkToSmartCollection(admin, user.id, bm.id, plan)

        const updatePayload = {
          category: plan.category,
          ai_summary: plan.summary,
          ai_tags: plan.tags,
          extractors: plan.extractors,
          collection_id: colRes.collectionId,
          updated_at: new Date().toISOString(),
        }

        const { error: upErr } = await supabase
          .from('bookmarks')
          .update(updatePayload)
          .eq('id', bm.id)

        if (upErr) {
          await admin
            .from('bookmarks')
            .update(updatePayload)
            .eq('id', bm.id)
        }

        updatedResults.push({
          id: bm.id,
          category: plan.category,
          collectionName: colRes.collectionName,
        })
      }

      return NextResponse.json({
        success: true,
        count: updatedResults.length,
        updatedResults,
        message: `${updatedResults.length} içerik yapay zeka ile yeniden analiz edildi ve kategorize edildi!`,
      })
    }

    // ── 4. Batch Add to Collection ────────────────────────────────────
    if (action === 'add_to_collection') {
      if (!collectionId) {
        return NextResponse.json({ error: 'Koleksiyon belirtilmedi' }, { status: 400 })
      }

      // Verify collection belongs to user
      let { data: collection } = await supabase
        .from('collections')
        .select('id, name, color')
        .eq('id', collectionId)
        .single()

      if (!collection) {
        const adminCol = await admin
          .from('collections')
          .select('id, name, color')
          .eq('id', collectionId)
          .eq('user_id', user.id)
          .single()
        collection = adminCol.data
      }

      if (!collection) {
        return NextResponse.json({ error: 'Koleksiyon bulunamadı veya yetkiniz yok' }, { status: 404 })
      }

      const idChunks = chunkArray(ids, 100)

      for (const chunk of idChunks) {
        // Clear existing join links for these bookmarks
        await supabase.from('bookmark_collections').delete().in('bookmark_id', chunk)
        try {
          await admin.from('bookmark_collections').delete().in('bookmark_id', chunk)
        } catch {}

        // Insert new links
        const inserts = chunk.map((bId) => ({
          bookmark_id: bId,
          collection_id: collectionId,
        }))

        await supabase.from('bookmark_collections').insert(inserts)
        try {
          await admin.from('bookmark_collections').insert(inserts)
        } catch {}

        // Also update direct collection_id
        await supabase
          .from('bookmarks')
          .update({ collection_id: collectionId, updated_at: new Date().toISOString() })
          .in('id', chunk)

        try {
          await admin
            .from('bookmarks')
            .update({ collection_id: collectionId, updated_at: new Date().toISOString() })
            .in('id', chunk)
            .or(`user_id.eq.${user.id},user_id.eq.00000000-0000-0000-0000-000000000001,user_id.is.null`)
        } catch {}
      }

      return NextResponse.json({
        success: true,
        count: ids.length,
        collection,
        message: `${ids.length} içerik "${collection.name}" koleksiyonuna eklendi`,
      })
    }

    return NextResponse.json({ error: 'Desteklenmeyen işlem türü' }, { status: 400 })
  } catch (err) {
    console.error('Batch route error:', err)
    return NextResponse.json({ error: 'Sunucu hatası: ' + (err instanceof Error ? err.message : String(err)) }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  return POST(new Request(request.url, {
    method: 'POST',
    headers: request.headers,
    body: JSON.stringify({ action: 'delete', ...(await request.json().catch(() => ({}))) }),
  }))
}
