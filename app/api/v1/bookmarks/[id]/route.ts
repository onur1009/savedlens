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

    const updates: Record<string, any> = {}
    if (typeof body.is_favorite === 'boolean') {
      updates.is_favorite = body.is_favorite
    }
    if (Array.isArray(body.tags)) {
      updates.ai_tags = body.tags
    }

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('bookmarks')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Bookmark update error:', error)
      return NextResponse.json({ error: 'Güncellenemedi' }, { status: 500 })
    }

    return NextResponse.json({ success: true, item: data })
  } catch (err) {
    console.error('Patch handler error:', err)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
