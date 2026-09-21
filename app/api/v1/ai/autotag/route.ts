import 'server-only'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { isSupabaseConfigured } from '@/lib/mock-data'
import { extractStructuredData } from '@/lib/ai/extractor'

const AutoTagSchema = z.object({
  caption: z.string().optional(),
  text: z.string().optional(),
  title: z.string().optional(),
  bookmark_id: z.string().optional(),
})

export async function POST(request: Request) {
  try {
    const json = await request.json()
    const parsed = AutoTagSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const contentText = (parsed.data.caption || parsed.data.text || '').trim()
    const titleText = (parsed.data.title || '').trim()

    // 1. Run robust structured extraction (GPT-4o-mini if API key present, or high-accuracy Turkish heuristic)
    const result = await extractStructuredData(titleText || null, contentText || null, null)

    // 2. If online and bookmark_id provided, persist update to database
    if (parsed.data.bookmark_id && isSupabaseConfigured()) {
      try {
        const { createAdminClient } = await import('@/lib/supabase/admin')
        const admin = createAdminClient()
        await admin
          .from('bookmarks')
          .update({
            category: result.category,
            ai_summary: result.summary,
            ai_tags: result.tags,
            extractors: result.extractors,
            actionable_data: result.actionable_data,
            updated_at: new Date().toISOString(),
          })
          .eq('id', parsed.data.bookmark_id)
      } catch (dbErr) {
        console.warn('[autotag] DB update warning:', dbErr)
      }
    }

    return NextResponse.json({
      success: true,
      category: result.category,
      summary: result.summary,
      tags: result.tags,
      extractors: result.extractors,
      actionable_data: result.actionable_data,
    })
  } catch (err) {
    console.error('AI Auto-tag error:', err)
    return NextResponse.json({
      success: false,
      error: 'AI etiketleme gerçekleştirilemedi: ' + (err instanceof Error ? err.message : String(err)),
      category: 'other',
      summary: null,
      tags: ['içerik'],
      extractors: {},
    }, { status: 500 })
  }
}

