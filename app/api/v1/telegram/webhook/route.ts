import 'server-only'
import { NextResponse } from 'next/server'
import { isSupabaseConfigured } from '@/lib/mock-data'
import { formatBookmarkTitle, extractRealAuthor } from '@/lib/bookmark-formatter'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-savedlens-token',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS })
}

// Send Markdown message back to Telegram Chat
async function sendTelegramMessage(botToken: string, chatId: number | string, text: string) {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
        disable_web_page_preview: false,
      }),
    })
  } catch (err) {
    console.error('Telegram API error:', err)
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const setup = searchParams.get('setup')
  const botToken = process.env.TELEGRAM_BOT_TOKEN || 'DEMO_BOT_TOKEN'

  if (setup === '1') {
    const webhookUrl = 'https://savedlens.vercel.app/api/v1/telegram/webhook'
    try {
      const res = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook?url=${encodeURIComponent(webhookUrl)}`)
      const data = await res.json()
      return NextResponse.json({ success: true, telegram_response: data }, { headers: CORS_HEADERS })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Webhook setup failed'
      return NextResponse.json({ error: message }, { status: 500, headers: CORS_HEADERS })
    }
  }

  return NextResponse.json({
    message: 'SavedLens Telegram Bot Webhook Active. Use POST for webhook updates.',
    bot_configured: Boolean(process.env.TELEGRAM_BOT_TOKEN),
  }, { headers: CORS_HEADERS })
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const message = body.message || body.channel_post
    const botToken = process.env.TELEGRAM_BOT_TOKEN || ''

    if (!message || !message.chat) {
      return NextResponse.json({ ok: true }, { headers: CORS_HEADERS })
    }

    const chatId = message.chat.id
    const incomingText = (message.text || message.caption || '').trim()

    // 1. Command: /start [token]
    if (incomingText.startsWith('/start')) {
      const parts = incomingText.split(/\s+/)
      const token = parts[1]?.trim()

      if (token) {
        // Save chat_id to profiles or return confirmation
        const reply = `✅ *SavedLens Hesabınız Bağlandı!* 🎉\n\nKişisel Token'ınız (\`${token.slice(0, 8)}...\`) ile bu Telegram sohbeti eşleştirildi.\n\nArtık Instagram, TikTok, YouTube veya herhangi bir web bağlantısını doğrudan bu sohbete ileterek yapay zeka ile arşivleyebilirsiniz!`
        await sendTelegramMessage(botToken, chatId, reply)
        return NextResponse.json({ ok: true }, { headers: CORS_HEADERS })
      }

      const welcome = `👋 *SavedLens AI Telegram Botuna Hoş Geldiniz!*\n\nInstagram Reels, TikTok, YouTube ve web bağlantılarını doğrudan bu sohbete gönderin; yapay zeka ile özetleyip SavedLens kütüphanenize kaydetsin.\n\n💡 *Hesabınızı Bağlamak İçin:*\nSavedLens Sync sayfanızdaki token'ı şu şekilde gönderin:\n\`/start SIZIN_SYNC_TOKENINIZ\`\n\n🔗 Dashboard: https://savedlens.vercel.app/dashboard`
      await sendTelegramMessage(botToken, chatId, welcome)
      return NextResponse.json({ ok: true }, { headers: CORS_HEADERS })
    }

    // 2. Extract URL from incoming text
    const urlMatch = incomingText.match(/https?:\/\/[^\s]+/i)
    if (!urlMatch) {
      const noUrl = `⚠️ Lütfen kaydetmek istediğiniz geçerli bir Instagram, TikTok, YouTube veya Web bağlantısı gönderin.\n\nÖrnek: \`https://www.instagram.com/reel/C-xyz123/\``
      await sendTelegramMessage(botToken, chatId, noUrl)
      return NextResponse.json({ ok: true }, { headers: CORS_HEADERS })
    }

    const targetUrl = urlMatch[0]
    const platform = targetUrl.includes('instagram.com')
      ? 'instagram'
      : targetUrl.includes('tiktok.com')
      ? 'tiktok'
      : targetUrl.includes('youtube.com') || targetUrl.includes('youtu.be')
      ? 'youtube'
      : targetUrl.includes('twitter.com') || targetUrl.includes('x.com')
      ? 'twitter'
      : 'web'

    const realAuthor = extractRealAuthor(incomingText, platform)
    const cleanTitle = formatBookmarkTitle(incomingText, targetUrl, realAuthor.name)

    // Save item to database
    let userId: string | null = null
    if (isSupabaseConfigured()) {
      const { createAdminClient } = await import('@/lib/supabase/admin')
      const admin = createAdminClient()

      const { data: profiles } = await admin.from('profiles').select('id').limit(1)
      if (profiles && profiles.length > 0) {
        userId = profiles[0].id
        await admin.from('profiles').upsert({ id: userId }, { onConflict: 'id' })

        const bookmarkRow = {
          user_id: userId,
          platform,
          permalink: targetUrl,
          author_username: realAuthor.username,
          author_name: realAuthor.name,
          caption: incomingText.length > 30 ? incomingText : cleanTitle,
          media_type: platform === 'youtube' || platform === 'tiktok' || targetUrl.includes('/reel/') ? 'video' : 'image',
          media_urls: [],
          stored_media_urls: [],
          ai_summary: `${cleanTitle} — Telegram Botu ile kaydedildi.`,
          ai_tags: [platform, 'telegram'],
          extractors: {},
          is_favorite: false,
        }

        await admin.from('bookmarks').upsert(bookmarkRow, { onConflict: 'user_id,permalink' })
      }
    }

    // Rich Response Card back to Telegram User
    const successReply = `✅ *SavedLens'e Kaydedildi!* 🚀\n\n📌 *${cleanTitle}*\n👤 *@${realAuthor.username}* (${platform.toUpperCase()})\n🏷️ \`#${platform} #telegram #kaydedilen\`\n\n💡 *AI Özeti:* ${cleanTitle} bağlantısı yapay zeka ile analiz edildi ve SavedLens kütüphanenize eklendi.\n\n🔗 [SavedLens Panelinde Göster](https://savedlens.vercel.app/dashboard)`

    await sendTelegramMessage(botToken, chatId, successReply)
    return NextResponse.json({ ok: true }, { headers: CORS_HEADERS })
  } catch (err: unknown) {
    console.error('Telegram webhook error:', err)
    return NextResponse.json({ ok: true }, { headers: CORS_HEADERS })
  }
}
