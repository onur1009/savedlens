import 'server-only'
import { NextResponse } from 'next/server'
import { generateEmbedding } from '@/lib/ai/embeddings'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { isSupabaseConfigured, type SavedItem } from '@/lib/mock-data'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-savedlens-token, X-Requested-With',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS })
}

interface MatchResultRow {
  id: string
  permalink: string
  title: string | null
  description: string | null
  summary: string | null
  transcript: string | null
  category: string | null
  actionable_data: Record<string, unknown> | null
  thumbnail_url: string | null
  platform: string | null
  similarity: number
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')?.trim()

    if (!query) {
      return NextResponse.json({ success: true, items: [] }, { headers: CORS_HEADERS })
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        success: true,
        offline: true,
        items: [],
      }, { headers: CORS_HEADERS })
    }

    // Resolve user auth
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const admin = createAdminClient()

    let userId = user?.id
    if (!userId) {
      const { data: profiles } = await admin.from('profiles').select('id').limit(1)
      if (profiles && profiles.length > 0) {
        userId = profiles[0].id
      }
    }

    // 1. Generate query embedding
    const queryVector = await generateEmbedding(query)

    if (queryVector) {
      // 2. Query Supabase pgvector RPC
      const { data: rpcMatches, error: rpcError } = await admin.rpc('match_saved_items', {
        query_embedding: queryVector,
        match_threshold: 0.2,
        match_count: 20,
        p_user_id: userId || null,
      })

      if (!rpcError && Array.isArray(rpcMatches) && rpcMatches.length > 0) {
        const items: SavedItem[] = (rpcMatches as MatchResultRow[]).map((row) => ({
          id: row.id,
          url: row.permalink,
          platform: row.platform,
          title: row.title,
          description: row.description,
          thumbnail_url: row.thumbnail_url,
          summary: row.summary,
          tags: [],
          extractors: null,
          starred: false,
          created_at: new Date().toISOString(),
          category: row.category,
          actionable_data: row.actionable_data,
          transcript: row.transcript,
        }))

        return NextResponse.json({
          success: true,
          mode: 'semantic',
          query,
          count: items.length,
          items,
        }, { headers: CORS_HEADERS })
      }
    }

    // 3. Fallback: text search if embeddings not yet calculated or RPC unavailable
    let dbQuery = admin
      .from('bookmarks')
      .select('*, bookmark_collections(collections(id, name, color))')
      .or(`caption.ilike.%${query}%,author_username.ilike.%${query}%,ai_summary.ilike.%${query}%`)
      .order('created_at', { ascending: false })
      .limit(20)

    if (userId) {
      dbQuery = dbQuery.eq('user_id', userId)
    }

    const { data: fallbackRows } = await dbQuery

    const fallbackItems: SavedItem[] = (fallbackRows || []).map((b) => ({
      id: b.id,
      url: b.permalink,
      platform: b.platform,
      title: b.author_name || b.author_username || b.permalink,
      description: b.caption,
      thumbnail_url: b.media_urls?.[0] || null,
      summary: b.ai_summary,
      tags: b.ai_tags || [],
      extractors: b.extractors ?? null,
      starred: b.is_favorite ?? false,
      created_at: b.created_at,
      author_username: b.author_username,
      author_avatar: b.author_avatar,
      media_type: b.media_type,
      category: b.category || null,
      actionable_data: b.actionable_data || null,
      transcript: b.transcript || null,
    }))

    return NextResponse.json({
      success: true,
      mode: 'fallback_text',
      query,
      count: fallbackItems.length,
      items: fallbackItems,
    }, { headers: CORS_HEADERS })

  } catch (err) {
    console.error('[Semantic Search] Unexpected error:', err)
    return NextResponse.json(
      { error: 'Arama sırasında sunucu hatası' },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}
