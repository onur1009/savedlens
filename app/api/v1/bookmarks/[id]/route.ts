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
    await admin
      .from('bookmark_collections')
      .delete()
      .eq('bookmark_id', id)

    const { error } = await admin
      .from('bookmarks')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

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
    const { data: existingBookmark, error: findError } = await admin
      .from('bookmarks')
      .select('id, user_id')
      .eq('id', id)
      .single()

    if (findError || !existingBookmark) {
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
      await admin
        .from('bookmark_collections')
        .delete()
        .eq('bookmark_id', id)

      // If a valid collection_id is provided, link it
      if (colId) {
        const { error: insertError } = await admin
          .from('bookmark_collections')
          .insert({
            bookmark_id: id,
            collection_id: colId,
          })
        if (insertError) {
          console.warn('[PATCH bookmark] Collection link warning:', insertError.message)
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
    const { error: updateError } = await admin
      .from('bookmarks')
      .update(updates)
      .eq('id', id)

    if (updateError) {
      console.error('Bookmark update error:', updateError)
      return NextResponse.json({ error: 'İçerik güncellenemedi: ' + updateError.message }, { status: 500 })
    }

    // 4. Return bookmark with joined collection info
    const { data: updatedItem } = await admin
      .from('bookmarks')
      .select('*, bookmark_collections(collection_id, collections(id, name, color))')
      .eq('id', id)
      .single()

    return NextResponse.json({
      success: true,
      item: updatedItem,
    })
  } catch (err) {
    console.error('Patch handler error:', err)
    return NextResponse.json({ error: 'Sunucu hatası: ' + (err instanceof Error ? err.message : String(err)) }, { status: 500 })
  }
}
