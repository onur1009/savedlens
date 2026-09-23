import 'server-only'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const admin = createAdminClient()

    const { data: item, error } = await admin
      .from('bookmarks')
      .select('*, bookmark_collections(collection_id, collections(id, name, color))')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error || !item) {
      return NextResponse.json({ error: 'İçerik bulunamadı' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      item,
    })
  } catch (err) {
    console.error('Get bookmark error:', err)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const admin = createAdminClient()

    // Delete associations first
    await supabase.from('bookmark_collections').delete().eq('bookmark_id', id)
    try {
      await admin.from('bookmark_collections').delete().eq('bookmark_id', id)
    } catch {
      // admin fallback
    }

    let { error } = await supabase
      .from('bookmarks')
      .delete()
      .eq('id', id)

    if (error) {
      const adminRes = await admin
        .from('bookmarks')
        .delete()
        .eq('id', id)
      error = adminRes.error
    }

    if (error) {
      console.error('Bookmark delete error:', error)
      return NextResponse.json({ error: 'İçerik silinemedi' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'İçerik silindi' })
  } catch (err) {
    console.error('Delete handler error:', err)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const admin = createAdminClient()

    // Verify bookmark exists and belongs to the user
    let { data: existingBookmark } = await supabase
      .from('bookmarks')
      .select('id, user_id')
      .eq('id', id)
      .single()

    if (!existingBookmark) {
      const adminFind = await admin
        .from('bookmarks')
        .select('id, user_id')
        .eq('id', id)
        .single()
      existingBookmark = adminFind.data
    }

    if (!existingBookmark) {
      return NextResponse.json({ error: 'İçerik bulunamadı' }, { status: 404 })
    }

    // Check ownership: must be the owner, or claimable if unowned / legacy guest
    const isOwner = existingBookmark.user_id === user.id
    const isClaimable = !existingBookmark.user_id || existingBookmark.user_id === '00000000-0000-0000-0000-000000000001'

    if (!isOwner && !isClaimable) {
      return NextResponse.json({ error: 'Bu içeriği değiştirme yetkiniz yok' }, { status: 403 })
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (isClaimable) {
      updates.user_id = user.id
    }

    // 1. Handle Collection assignment / removal
    if ('collection_id' in body) {
      const colId = body.collection_id || null
      updates.collection_id = colId

      // Remove previous collection assignment in join table
      await supabase.from('bookmark_collections').delete().eq('bookmark_id', id)
      try {
        await admin.from('bookmark_collections').delete().eq('bookmark_id', id)
      } catch {}

      // If a valid collection_id is provided, link it
      if (colId) {
        const { error: insertError } = await supabase
          .from('bookmark_collections')
          .insert({
            bookmark_id: id,
            collection_id: colId,
          })
        if (insertError) {
          try {
            await admin.from('bookmark_collections').insert({
              bookmark_id: id,
              collection_id: colId,
            })
          } catch {}
        }
      }
    }

    // 2. Handle category and extractor updates
    if (typeof body.category === 'string') {
      updates.category = body.category
    }
    if (body.extractors && typeof body.extractors === 'object') {
      updates.extractors = body.extractors
    }
    if (body.actionable_data && typeof body.actionable_data === 'object') {
      updates.actionable_data = body.actionable_data
    }
    if (typeof body.is_favorite === 'boolean') {
      updates.is_favorite = body.is_favorite
    }
    if (Array.isArray(body.tags)) {
      updates.ai_tags = body.tags
    }
    if (typeof body.summary === 'string') {
      updates.ai_summary = body.summary
    }

    // 3. Perform update on bookmarks table
    let { error: updateError } = await supabase
      .from('bookmarks')
      .update(updates)
      .eq('id', id)

    if (updateError) {
      const adminUp = await admin
        .from('bookmarks')
        .update(updates)
        .eq('id', id)
      updateError = adminUp.error
    }

    if (updateError) {
      console.error('Bookmark update error:', updateError)
      return NextResponse.json({ error: 'İçerik güncellenemedi: ' + updateError.message }, { status: 500 })
    }

    // 4. Return bookmark with joined collection info
    let { data: updatedItem } = await supabase
      .from('bookmarks')
      .select('*, bookmark_collections(collection_id, collections(id, name, color))')
      .eq('id', id)
      .single()

    if (!updatedItem) {
      const adminItem = await admin
        .from('bookmarks')
        .select('*, bookmark_collections(collection_id, collections(id, name, color))')
        .eq('id', id)
        .single()
      updatedItem = adminItem.data
    }

    return NextResponse.json({
      success: true,
      item: updatedItem,
    })
  } catch (err) {
    console.error('Patch handler error:', err)
    return NextResponse.json({ error: 'Sunucu hatası: ' + (err instanceof Error ? err.message : String(err)) }, { status: 500 })
  }
}
