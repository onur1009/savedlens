import 'server-only'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { scanLibraryForCollection } from '@/lib/ai/collection-matcher'

export const maxDuration = 60

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: collectionId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const admin = createAdminClient()
    const db = supabase || admin

    // 1. Fetch collection details
    const { data: collection, error: colErr } = await db
      .from('collections')
      .select('id, name, color, icon')
      .eq('id', collectionId)
      .eq('user_id', user.id)
      .single()

    if (colErr || !collection) {
      return NextResponse.json({ error: 'Koleksiyon bulunamadı' }, { status: 404 })
    }

    // 2. Scan entire user library
    const scanResult = await scanLibraryForCollection(
      db,
      user.id,
      collection.id,
      collection.name
    )

    return NextResponse.json({
      success: true,
      collectionId: collection.id,
      collectionName: collection.name,
      scannedCount: scanResult.scannedCount,
      matchedCount: scanResult.matchedCount,
      message: scanResult.matchedCount > 0
        ? `"${collection.name}" için kütüphanenizdeki ${scanResult.scannedCount} içerik tarandı ve ${scanResult.matchedCount} içerik bu kategoriye eklendi! 🎉`
        : `"${collection.name}" için kütüphanenizdeki ${scanResult.scannedCount} içerik tarandı, yeni eşleşen içerik bulunamadı.`,
    })
  } catch (err) {
    console.error('[Collection Scan Route Error]:', err)
    return NextResponse.json(
      { error: 'Tarama sırasında hata oluştu: ' + (err instanceof Error ? err.message : String(err)) },
      { status: 500 }
    )
  }
}
