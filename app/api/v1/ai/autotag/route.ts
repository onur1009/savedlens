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

    let contentText = (parsed.data.caption || parsed.data.text || '').trim()
    let titleText = (parsed.data.title || '').trim()

    let transcriptText: string | null = null
    let bmData: any = null

    // 1. Fetch bookmark details if bookmark_id is provided
    if (parsed.data.bookmark_id && isSupabaseConfigured()) {
      try {
        const { createAdminClient } = await import('@/lib/supabase/admin')
        const admin = createAdminClient()
        const { data: bm } = await admin
          .from('bookmarks')
          .select('id, user_id, title, caption, platform, media_type, media_urls, stored_media_urls, transcript, author_username, author_name')
          .eq('id', parsed.data.bookmark_id)
          .maybeSingle()

        if (bm) {
          bmData = bm
          transcriptText = bm.transcript || null
          if (!contentText && bm.caption) contentText = bm.caption
          if (!titleText && bm.title) titleText = bm.title
        }
      } catch (fetchErr) {
        console.warn('[autotag] Fetch bookmark warning:', fetchErr)
      }
    }

    // 2. Automatically generate / extract transcript if missing
    let originalTranscriptText: string | null = null
    let isTranslatedContent: boolean = false
    if (!transcriptText && parsed.data.bookmark_id) {
      try {
        const { transcribeVideoToScript } = await import('@/lib/ai/video-transcriber')
        const mediaUrl = (bmData?.stored_media_urls && bmData.stored_media_urls[0]) || (bmData?.media_urls && bmData.media_urls[0]) || null
        const transcribeResult = await transcribeVideoToScript({
          mediaUrl,
          storedMediaUrls: bmData?.stored_media_urls,
          title: titleText || 'Video',
          caption: contentText,
          platform: bmData?.platform || 'web',
        })
        if (transcribeResult.transcript) {
          transcriptText = transcribeResult.transcript
          originalTranscriptText = transcribeResult.originalTranscript || null
          isTranslatedContent = Boolean(transcribeResult.isTranslated)
        }
      } catch (trErr) {
        console.warn('[autotag] Automatic video transcription warning:', trErr)
      }
    }

    // 3. Run structured data extraction utilizing the script data!
    const result = await extractStructuredData(titleText || null, contentText || null, transcriptText)

    // 4. Run smart categorization with Gemini AI using transcript data
    let finalCategory = result.category
    let finalSummary = result.summary
    let finalTags = result.tags

    if (bmData?.user_id && parsed.data.bookmark_id) {
      try {
        const { planSmartCategoryWithAI, assignBookmarkToSmartCollection } = await import('@/lib/ai/smart-categorizer')
        const { createAdminClient } = await import('@/lib/supabase/admin')
        const admin = createAdminClient()
        const { data: userCols } = await admin
          .from('collections')
          .select('id, name, color, icon')
          .eq('user_id', bmData.user_id)

        const plan = await planSmartCategoryWithAI(
          titleText || bmData.title,
          contentText || bmData.caption,
          bmData.author_username || bmData.author_name,
          userCols || [],
          parsed.data.bookmark_id,
          transcriptText
        )

        finalCategory = plan.category
        if (plan.summary) finalSummary = plan.summary
        if (plan.tags && plan.tags.length > 0) finalTags = plan.tags

        await assignBookmarkToSmartCollection(admin, bmData.user_id, parsed.data.bookmark_id, plan)
      } catch (planErr) {
        console.warn('[autotag] Smart categorization plan error:', planErr)
      }
    }

    const mergedActionableData = {
      ...(typeof result.actionable_data === 'object' && result.actionable_data !== null ? result.actionable_data : {}),
      ...(originalTranscriptText ? { original_transcript: originalTranscriptText } : {}),
      is_translated: isTranslatedContent,
    }

    // 5. If online and bookmark_id provided, persist category and script to database
    if (parsed.data.bookmark_id && isSupabaseConfigured()) {
      try {
        const { createAdminClient } = await import('@/lib/supabase/admin')
        const admin = createAdminClient()
        await admin
          .from('bookmarks')
          .update({
            category: finalCategory,
            ai_summary: finalSummary,
            ai_tags: finalTags,
            extractors: {
              ...result.extractors,
              transcript: Boolean(transcriptText),
            },
            actionable_data: mergedActionableData,
            transcript: transcriptText,
            updated_at: new Date().toISOString(),
          })
          .eq('id', parsed.data.bookmark_id)
      } catch (dbErr) {
        console.warn('[autotag] DB update warning:', dbErr)
      }
    }

    return NextResponse.json({
      success: true,
      category: finalCategory,
      summary: finalSummary,
      tags: finalTags,
      transcript: transcriptText,
      original_transcript: originalTranscriptText,
      is_translated: isTranslatedContent,
      extractors: {
        ...result.extractors,
        transcript: Boolean(transcriptText),
      },
      actionable_data: mergedActionableData,
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

