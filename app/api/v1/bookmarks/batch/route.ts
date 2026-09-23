import 'server-only'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const body = await request.json()
    const { action = 'delete', bookmarkIds, collectionId } = body

    if (!Array.isArray(bookmarkIds) || bookmarkIds.length === 0) {
      return NextResponse.json({ error: 'İşlem yapılacak içerik listesi belirtilmedi' }, { status: 400 })
    }

    // Safety cap: max 1000 items per batch request
    const ids = bookmarkIds.slice(0, 1000).filter((id): id is string => typeof id === 'string' && id.length > 0)
    if (ids.length === 0) {
      return NextResponse.json({ error: 'Geçerli içerik kimliği bulunamadı' }, { status: 400 })
    }

    const admin = createAdminClient()

    if (action === 'delete') {
      // 1. Delete associated collection join records
      await admin
        .from('bookmark_collections')
        .delete()
        .in('bookmark_id', ids)

      // 2. Delete bookmarks owned by this user
      const { data: deletedRows, error: deleteError } = await admin
        .from('bookmarks')
        .delete()
        .in('id', ids)
        .eq('user_id', user.id)
        .select('id')

      if (deleteError) {
        console.error('[Batch Delete Error]:', deleteError)
        return NextResponse.json({ error: 'İçerikler silinemedi: ' + deleteError.message }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        count: deletedRows?.length || 0,
        message: `${deletedRows?.length || ids.length} içerik başarıyla silindi`,
      })
    }

    if (action === 'add_to_collection') {
      if (!collectionId) {
        return NextResponse.json({ error: 'Koleksiyon belirtilmedi' }, { status: 400 })
      }

      // Verify collection belongs to user
      const { data: collection, error: colError } = await admin
        .from('collections')
        .select('id')
        .eq('id', collectionId)
        .eq('user_id', user.id)
        .single()

      if (colError || !collection) {
        return NextResponse.json({ error: 'Koleksiyon bulunamadı veya yetkiniz yok' }, { status: 404 })
      }

      // Verify bookmark ownership
      const { data: userBookmarks } = await admin
        .from('bookmarks')
        .select('id')
        .in('id', ids)
        .eq('user_id', user.id)

      const validIds = (userBookmarks || []).map(b => b.id)

      if (validIds.length > 0) {
        // Clear existing collection assignment
        await admin
          .from('bookmark_collections')
          .delete()
          .in('bookmark_id', validIds)

        // Insert new links
        const inserts = validIds.map(bId => ({
          bookmark_id: bId,
          collection_id: collectionId,
        }))

        await admin.from('bookmark_collections').insert(inserts)

        // Also update direct collection_id on bookmark for backward compatibility
        await admin
          .from('bookmarks')
          .update({ collection_id: collectionId, updated_at: new Date().toISOString() })
          .in('id', validIds)
          .eq('user_id', user.id)
      }

      return NextResponse.json({
        success: true,
        count: validIds.length,
        message: `${validIds.length} içerik koleksiyona eklendi`,
      })
    }

    return NextResponse.json({ error: 'Desteklenmeyen işlem türü' }, { status: 400 })
  } catch (err) {
    console.error('Batch route error:', err)
    return NextResponse.json({ error: 'Sunucu hatası: ' + (err instanceof Error ? err.message : String(err)) }, { status: 500 })
  }
}

// Support DELETE method as well
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const body = await request.json()
    const { bookmarkIds } = body

    if (!Array.isArray(bookmarkIds) || bookmarkIds.length === 0) {
      return NextResponse.json({ error: 'Silinecek içerik listesi belirtilmedi' }, { status: 400 })
    }

    const ids = bookmarkIds.slice(0, 1000).filter((id): id is string => typeof id === 'string' && id.length > 0)
    const admin = createAdminClient()

    await admin.from('bookmark_collections').delete().in('bookmark_id', ids)

    const { data: deletedRows, error: deleteError } = await admin
      .from('bookmarks')
      .delete()
      .in('id', ids)
      .eq('user_id', user.id)
      .select('id')

    if (deleteError) {
      console.error('[Batch Delete Error]:', deleteError)
      return NextResponse.json({ error: 'Silme işlemi başarısız: ' + deleteError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      count: deletedRows?.length || 0,
      message: `${deletedRows?.length || ids.length} içerik kütüphaneden temizlendi`,
    })
  } catch (err) {
    console.error('Batch DELETE error:', err)
    return NextResponse.json({ error: 'Sunucu hatası: ' + (err instanceof Error ? err.message : String(err)) }, { status: 500 })
  }
}
