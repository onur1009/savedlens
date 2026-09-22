import 'server-only'
import { NextResponse } from 'next/server'
import { isSupabaseConfigured, MOCK_BOOKMARKS } from '@/lib/mock-data'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const format = (searchParams.get('format') || 'csv').toLowerCase()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let items: Array<Record<string, any>> = []

    if (isSupabaseConfigured()) {
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
      }

      const { fetchAllUserBookmarks } = await import('@/lib/supabase/fetch-all')
      items = await fetchAllUserBookmarks(supabase, user.id, '*')
    } else {
      // Offline fallback: use mock bookmarks
      items = MOCK_BOOKMARKS
    }

    if (format === 'json') {
      const jsonContent = JSON.stringify(items, null, 2)
      return new NextResponse(jsonContent, {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="savedlens_export_${new Date().toISOString().slice(0, 10)}.json"`,
        },
      })
    }

    // Default: CSV format (with UTF-8 BOM \uFEFF for seamless Excel Turkish character compatibility)
    const headers = [
      'Platform',
      'Yazar',
      'Kullanıcı Adı',
      'Bağlantı (Permalink)',
      'Medya Türü',
      'Açıklama (Caption)',
      'AI Özeti',
      'Etiketler',
      'Kalıcı Medya URL',
      'Favori',
      'Kaydedilme Tarihi',
    ]

    const escapeCsv = (val: string | number | boolean | null | undefined) => {
      if (val === null || val === undefined) return '""'
      const str = String(val).replace(/"/g, '""')
      return `"${str}"`
    }

    const csvRows = [headers.join(',')]

    for (const item of items) {
      const tags = Array.isArray(item.ai_tags)
        ? item.ai_tags.join('; ')
        : Array.isArray(item.tags)
        ? item.tags.join('; ')
        : ''

      const storedUrl = Array.isArray(item.stored_media_urls) && item.stored_media_urls.length > 0
        ? item.stored_media_urls[0]
        : item.thumbnail_url || ''

      const row = [
        escapeCsv(item.platform),
        escapeCsv(item.author_name || item.author_username || ''),
        escapeCsv(item.author_username ? `@${item.author_username}` : ''),
        escapeCsv(item.permalink || item.url || ''),
        escapeCsv(item.media_type || 'image'),
        escapeCsv(item.caption || item.description || ''),
        escapeCsv(item.ai_summary || item.summary || ''),
        escapeCsv(tags),
        escapeCsv(storedUrl),
        escapeCsv(item.is_favorite || item.starred ? 'Evet' : 'Hayır'),
        escapeCsv(item.saved_at || item.created_at || ''),
      ]
      csvRows.push(row.join(','))
    }

    const csvData = '\uFEFF' + csvRows.join('\r\n')

    return new NextResponse(csvData, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="savedlens_export_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    })
  } catch (err) {
    console.error('Export error:', err)
    return NextResponse.json({ error: 'Dışa aktarma hatası oluştu' }, { status: 500 })
  }
}
