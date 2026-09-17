import 'server-only'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const CreateCollectionSchema = z.object({
  name: z.string().min(1, 'Koleksiyon adı zorunludur').max(50),
  color: z.string().default('#6366f1'),
  icon: z.string().default('folder'),
})

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const admin = createAdminClient()
    const { data: collections, error } = await admin
      .from('collections')
      .select('*, bookmark_collections(count)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[collections GET] Error:', error)
      return NextResponse.json({ error: 'Koleksiyonlar getirilemedi' }, { status: 500 })
    }

    const formatted = (collections || []).map((col: any) => ({
      id: col.id,
      name: col.name,
      color: col.color || '#6366f1',
      icon: col.icon || 'folder',
      count: col.bookmark_collections?.[0]?.count || 0,
      created_at: col.created_at,
    }))

    return NextResponse.json({ success: true, collections: formatted })
  } catch (err) {
    console.error('[collections GET] Unexpected error:', err)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const json = await request.json()
    const parsed = CreateCollectionSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const admin = createAdminClient()
    const { data: collection, error } = await admin
      .from('collections')
      .insert({
        user_id: user.id,
        name: parsed.data.name.trim(),
        color: parsed.data.color,
        icon: parsed.data.icon,
      })
      .select()
      .single()

    if (error) {
      console.error('[collections POST] Error:', error)
      return NextResponse.json({ error: 'Koleksiyon oluşturulamadı: ' + error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, collection })
  } catch (err) {
    console.error('[collections POST] Unexpected error:', err)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
