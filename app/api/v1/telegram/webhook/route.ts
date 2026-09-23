import 'server-only'
import { NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { isSupabaseConfigured } from '@/lib/mock-data'
import { formatBookmarkTitle, extractRealAuthor } from '@/lib/bookmark-formatter'
import { corsHeaders } from '@/lib/cors'
import { createAdminClient } from '@/lib/supabase/admin'

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 200, headers: corsHeaders(request) })
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
  const headers = corsHeaders(request)
  const { searchParams } = new URL(request.url)
  const setup = searchParams.get('setup')
  const botToken = process.env.TELEGRAM_BOT_TOKEN || 'DEMO_BOT_TOKEN'
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET

  if (setup === '1') {
    const webhookUrl = 'https://savedlens.vercel.app/api/v1/telegram/webhook'
    try {
      let setUrl = `https://api.telegram.org/bot${botToken}/setWebhook?url=${encodeURIComponent(webhookUrl)}`
      if (webhookSecret) {
        setUrl += `&secret_token=${encodeURIComponent(webhookSecret)}`
      }
      const res = await fetch(setUrl)
      const data = await res.json()
      return NextResponse.json({ success: true, telegram_response: data }, { headers })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Webhook setup failed'
      return NextResponse.json({ error: message }, { status: 500, headers })
    }
  }

  return NextResponse.json({
    message: 'SavedLens Telegram Bot Webhook Active. Use POST for webhook updates.',
    bot_configured: Boolean(process.env.TELEGRAM_BOT_TOKEN),
  }, { headers })
}

export async function POST(request: Request) {
  const headers = corsHeaders(request)

  try {
    // 0) Verify webhook secret from Telegram (SEC-03)
    const secretHeader = request.headers.get('x-telegram-bot-api-secret-token')
    const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET
    if (webhookSecret && secretHeader !== webhookSecret) {
      console.warn('[Telegram Webhook] Invalid secret token received')
      return NextResponse.json({ ok: true }, { headers }) // ignore silently
    }

    const body = await request.json().catch(() => ({}))
    const message = body.message || body.channel_post
    const botToken = process.env.TELEGRAM_BOT_TOKEN || ''

    if (!message || !message.chat) {
      return NextResponse.json({ ok: true }, { headers })
    }

    const chatId = message.chat.id
    const incomingText = (message.text || message.caption || '').trim()
    const admin = createAdminClient()

    // 1) Command: /start [token] -> Verify against api_tokens & link to telegram_links
    if (incomingText.startsWith('/start')) {
      const parts = incomingText.split(/\s+/)
      const rawToken = parts[1]?.trim()

      if (!rawToken) {
        const welcome = `👋 *SavedLens AI Telegram Botuna Hoş Geldiniz!*\n\nInstagram Reels, TikTok, YouTube ve web bağlantılarını bu sohbete ileterek kütüphanenize kaydedebilirsiniz.\n\n💡 *Hesabınızı Bağlamak İçin:*\nSavedLens > Ayarlar > Senkronizasyon sayfanızdan tokenınızı kopyalayın ve buraya şu şekilde gönderin:\n\`/start SIZIN_TOKENINIZ\`\n\n🔗 Dashboard: https://savedlens.vercel.app/dashboard/settings/sync`
        await sendTelegramMessage(botToken, chatId, welcome)
        return NextResponse.json({ ok: true }, { headers })
      }

      let matchedUserId: string | null = null

      if (rawToken.startsWith('sl_')) {
        const tokenHash = createHash('sha256').update(rawToken).digest('hex')
        const { data: tokenRow } = await admin
          .from('api_tokens')
          .select('user_id')
          .eq('token_hash', tokenHash)
          .is('revoked_at', null)
          .maybeSingle()

        if (tokenRow?.user_id) {
          matchedUserId = tokenRow.user_id
        }
      } else {
        // Transition support: verify against profiles table
        const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        if (UUID_REGEX.test(rawToken)) {
          const { data: prof } = await admin
            .from('profiles')
            .select('id')
            .eq('id', rawToken)
            .maybeSingle()
          if (prof?.id) {
            matchedUserId = prof.id
          }
        }
      }

      if (!matchedUserId) {
        await sendTelegramMessage(
          botToken,
          chatId,
          '❌ *Geçersiz veya Süresi Dolmuş Token!*\n\nLütfen SavedLens > Ayarlar > Senkronizasyon sayfasından güncel tokenınızı kopyalayıp tekrar deneyin:\n`/start SIZIN_TOKENINIZ`'
        )
        return NextResponse.json({ ok: true }, { headers })
      }

      // Link chat_id <-> user_id in telegram_links table
      const { error: linkErr } = await admin
        .from('telegram_links')
        .upsert({ chat_id: chatId, user_id: matchedUserId, linked_at: new Date().toISOString() }, { onConflict: 'chat_id' })

      if (linkErr) {
        console.warn('[Telegram Webhook] telegram_links upsert warning:', linkErr.message)
      }

      const successConnect = `✅ *SavedLens Hesabınız Başarıyla Bağlandı!* 🎉\n\nArtık bu sohbete Instagram, TikTok, YouTube veya web linki gönderdiğinizde, içerikler doğrudan sizin SavedLens kütüphanenize eklenecektir.\n\nBir Reels veya video linki gönderip deneyebilirsiniz!`
      await sendTelegramMessage(botToken, chatId, successConnect)
      return NextResponse.json({ ok: true }, { headers })
    }

    // 2) Extract URL from incoming text
    const urlMatch = incomingText.match(/https?:\/\/[^\s]+/i)
    if (!urlMatch) {
      const noUrl = `⚠️ Lütfen kaydetmek istediğiniz geçerli bir Instagram, TikTok, YouTube veya Web bağlantısı gönderin.\n\nÖrnek: \`https://www.instagram.com/reel/C-xyz123/\``
      await sendTelegramMessage(botToken, chatId, noUrl)
      return NextResponse.json({ ok: true }, { headers })
    }

    // 3) Verify that chat_id has a linked user account (SEC-03)
    let linkedUserId: string | null = null
    try {
      const { data: linkRow } = await admin
        .from('telegram_links')
        .select('user_id')
        .eq('chat_id', chatId)
        .maybeSingle()

      if (linkRow?.user_id) {
        linkedUserId = linkRow.user_id
      }
    } catch (dbLinkErr) {
      console.warn('[Telegram Webhook] Link lookup error:', dbLinkErr)
    }

    if (!linkedUserId) {
      const needLinkMsg = `⚠️ *Hesabınız Henüz Bağlı Değil!*\n\nGönderdiğiniz içeriklerin kütüphanenize eklenebilmesi için önce hesabınızı bağlamalısınız.\n\n👉 SavedLens panelinizden tokenınızı alın: https://savedlens.vercel.app/dashboard/settings/sync\n\nArdından buraya gönderin:\n\`/start SIZIN_TOKENINIZ\``
      await sendTelegramMessage(botToken, chatId, needLinkMsg)
      return NextResponse.json({ ok: true }, { headers })
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

    // Save strictly under the authenticated linkedUserId
    if (isSupabaseConfigured()) {
      const bookmarkRow = {
        user_id: linkedUserId,
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

    // Rich Response Card back to Telegram User
    const successReply = `✅ *SavedLens'e Kaydedildi!* 🚀\n\n📌 *${cleanTitle}*\n👤 *@${realAuthor.username}* (${platform.toUpperCase()})\n🏷️ \`#${platform} #telegram #kaydedilen\`\n\n💡 *AI Özeti:* ${cleanTitle} bağlantısı yapay zeka ile analiz edildi ve SavedLens kütüphanenize eklendi.\n\n🔗 [SavedLens Panelinde Göster](https://savedlens.vercel.app/dashboard)`

    await sendTelegramMessage(botToken, chatId, successReply)
    return NextResponse.json({ ok: true }, { headers })
  } catch (err: unknown) {
    console.error('Telegram webhook error:', err)
    return NextResponse.json({ ok: true }, { headers })
  }
}
