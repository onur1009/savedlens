import 'server-only'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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

    const db = supabase || createAdminClient()

    // 1. Handle Collection assignment / removal
    if ('collection_id' in body) {
      // Remove previous collection assignment
      await db
        .from('bookmark_collections')
        .delete()
        .eq('bookmark_id', id)

      // If a valid collection_id is provided, link it
      if (body.collection_id) {
        await db
          .from('bookmark_collections')
          .insert({
            bookmark_id: id,
            collection_id: body.collection_id,
          })
      }
    }

    // 2. Handle bookmark fields update (favorite, tags, summary)
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
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

    const { error: updateError } = await db
      .from('bookmarks')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Bookmark update error:', updateError)
      return NextResponse.json({ error: 'İçerik güncellenemedi' }, { status: 500 })
    }

    // 3. Return bookmark with joined collection info
    const { data: updatedItem } = await db
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
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
