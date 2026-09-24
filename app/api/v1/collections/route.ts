import 'server-only'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const CreateCollectionSchema = z.object({
  name: z.string().min(1, 'Koleksiyon adı zorunludur').max(50),
  color: z.string().default('#6366f1'),
  icon: z.string().default('folder'),
  scanLibrary: z.boolean().default(true),
})

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const admin = createAdminClient()
    const db = supabase || admin
    const { data: collections, error } = await db
      .from('collections')
      .select('*, bookmark_collections(count)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[collections GET] Error:', error)
      return NextResponse.json({ error: 'Koleksiyonlar getirilemedi' }, { status: 500 })
    }

    interface RawCollection {
      id: string
      name: string
      color?: string | null
      icon?: string | null
      bookmark_collections?: Array<{ count?: number }>
      created_at: string
    }

    const formatted = ((collections as unknown as RawCollection[]) || []).map((col) => ({
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
    const db = supabase || admin
    const colName = parsed.data.name.trim()

    const { data: collection, error } = await db
      .from('collections')
      .insert({
        user_id: user.id,
        name: colName,
        color: parsed.data.color,
        icon: parsed.data.icon,
      })
      .select()
      .single()

    if (error) {
      console.error('[collections POST] Error:', error)
      return NextResponse.json({ error: 'Koleksiyon oluşturulamadı: ' + error.message }, { status: 500 })
    }

    let scannedCount = 0
    let matchedCount = 0
    let matchedBookmarkIds: string[] = []

    // Scan entire library and automatically categorize matching bookmarks
    if (parsed.data.scanLibrary !== false) {
      try {
        const { scanLibraryForCollection } = await import('@/lib/ai/collection-matcher')
        const scanRes = await scanLibraryForCollection(db, user.id, collection.id, colName)
        scannedCount = scanRes.scannedCount
        matchedCount = scanRes.matchedCount
        matchedBookmarkIds = scanRes.matchedBookmarkIds
      } catch (scanErr) {
        console.error('[collections POST] Library scan error:', scanErr)
      }
    }

    return NextResponse.json({
      success: true,
      collection: {
        ...collection,
        count: matchedCount,
      },
      scannedCount,
      matchedCount,
      matchedBookmarkIds,
      message: matchedCount > 0
        ? `"${colName}" kategorisi oluşturuldu! Kütüphanenizdeki ${scannedCount} içerik tarandı ve ${matchedCount} içerik otomatik olarak bu kategoriye eklendi! 🎉`
        : `"${colName}" kategorisi oluşturuldu. Kütüphanenizdeki ${scannedCount} içerik tarandı ancak henüz eşleşen içerik bulunamadı.`,
    })
  } catch (err) {
    console.error('[collections POST] Unexpected error:', err)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
