import 'server-only'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateApiToken } from '@/lib/auth/resolve-user'
import { corsHeaders } from '@/lib/cors'

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 200, headers: corsHeaders(request) })
}

/**
 * GET /api/v1/tokens
 * Lists active API tokens for the logged in user.
 * If user has no tokens, auto-generates their first token and returns the rawToken.
 */
export async function GET(request: Request) {
  const headers = corsHeaders(request)

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401, headers })
    }

    const admin = createAdminClient()

    // Query active tokens
    const { data: tokens, error } = await admin
      .from('api_tokens')
      .select('id, label, created_at, last_used_at')
      .eq('user_id', user.id)
      .is('revoked_at', null)
      .order('created_at', { ascending: false })

    if (error) {
      // If table doesn't exist yet (migration pending), provide a friendly fallback
      console.warn('[Tokens API] api_tokens table query warning:', error.message)
      return NextResponse.json({
        success: true,
        tokens: [],
        activeToken: null,
        notice: 'Migration pending for api_tokens table',
      }, { headers })
    }

    // If user has no active token, create their first one
    if (!tokens || tokens.length === 0) {
      const { rawToken, tokenHash } = generateApiToken()
      const { data: inserted, error: insertErr } = await admin
        .from('api_tokens')
        .insert({
          user_id: user.id,
          token_hash: tokenHash,
          label: 'Varsayılan Senkronizasyon Tokenı',
        })
        .select('id, label, created_at, last_used_at')
        .single()

      if (!insertErr && inserted) {
        return NextResponse.json({
          success: true,
          tokens: [inserted],
          activeToken: rawToken,
        }, { headers })
      }
    }

    return NextResponse.json({
      success: true,
      tokens: tokens || [],
      activeToken: null, // Existing tokens are hashed; rawToken only shown upon generation
    }, { headers })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Sunucu hatası'
    return NextResponse.json({ error: message }, { status: 500, headers })
  }
}

/**
 * POST /api/v1/tokens
 * Generates a new API token for extension, mobile, or telegram sync.
 * Returns rawToken only once upon generation.
 */
export async function POST(request: Request) {
  const headers = corsHeaders(request)

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401, headers })
    }

    const body = await request.json().catch(() => ({}))
    const label = typeof body.label === 'string' && body.label.trim() ? body.label.trim() : 'Extension Token'

    const { rawToken, tokenHash } = generateApiToken()
    const admin = createAdminClient()

    const { data: inserted, error: insertError } = await admin
      .from('api_tokens')
      .insert({
        user_id: user.id,
        token_hash: tokenHash,
        label,
      })
      .select('id, label, created_at')
      .single()

    if (insertError) {
      console.error('[Tokens API] Insert error:', insertError)
      return NextResponse.json({ error: 'Token kaydedilemedi: ' + insertError.message }, { status: 500, headers })
    }

    return NextResponse.json({
      success: true,
      rawToken,
      token: inserted,
      message: 'Yeni SavedLens API tokenı başarıyla üretildi.',
    }, { headers })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Sunucu hatası'
    return NextResponse.json({ error: message }, { status: 500, headers })
  }
}

/**
 * DELETE /api/v1/tokens
 * Revokes an existing API token.
 */
export async function DELETE(request: Request) {
  const headers = corsHeaders(request)

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401, headers })
    }

    const { searchParams } = new URL(request.url)
    const tokenId = searchParams.get('id')

    if (!tokenId) {
      return NextResponse.json({ error: 'Token kimliği gereklidir.' }, { status: 400, headers })
    }

    const admin = createAdminClient()
    const { error: revokeError } = await admin
      .from('api_tokens')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', tokenId)
      .eq('user_id', user.id)

    if (revokeError) {
      return NextResponse.json({ error: 'Token iptal edilemedi' }, { status: 500, headers })
    }

    return NextResponse.json({ success: true, message: 'Token başarıyla iptal edildi.' }, { headers })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Sunucu hatası'
    return NextResponse.json({ error: message }, { status: 500, headers })
  }
}
