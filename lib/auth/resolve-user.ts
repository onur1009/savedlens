import 'server-only'
import { createHash, randomBytes } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Yeni bir kullanıcıya özel API token üretir. Yalnızca oturum açmış
 * kullanıcı kendi token'ını oluşturabilir (bkz. /api/v1/tokens route'u).
 * Ham token yalnızca bir kez, üretim anında kullanıcıya gösterilir;
 * veritabanında sadece sha256 hash'i saklanır.
 */
export function generateApiToken(): { rawToken: string; tokenHash: string } {
  const rawToken = 'sl_' + randomBytes(32).toString('hex')
  const tokenHash = createHash('sha256').update(rawToken).digest('hex')
  return { rawToken, tokenHash }
}

/**
 * Bir isteğin kimliğini GÜVENLİ şekilde çözer.
 * Sıra:
 *  (1) Supabase session cookie (tarayıcı / SSR oturumu)
 *  (2) Hash'lenmiş API token (sl_ ile başlayan extension / mobil / Telegram token'ları)
 *  (3) Mevcut kayıtlı profil UUID doğrulaması (geçiş dönemi için, tahmin YOK)
 *
 * Hiçbiri geçerli değilse null döner — ASLA tahmin veya varsayılan kullanıcıya düşülmez.
 */
export async function resolveAuthenticatedUserId(
  request: Request,
  fallbackToken?: string | null
): Promise<string | null> {
  // 1) Tarayıcı / SSR session cookie kontrolü
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.id) {
      return user.id
    }
  } catch (cookieErr) {
    // Cookie yoksa veya ayrıştırılamazsa token kontrolüne geç
  }

  // 2) Bearer API token / x-savedlens-token başlığı kontrolü
  const authHeader = request.headers.get('authorization') || request.headers.get('x-savedlens-token')
  let rawToken = authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : null

  if (!rawToken && fallbackToken) {
    rawToken = fallbackToken.replace(/^Bearer\s+/i, '').trim()
  }

  if (!rawToken || rawToken === 'demo-user-token-offline') {
    return null
  }

  // 2a) Güvenli SavedLens API Token'ı (sl_ ile başlayan hash'li anahtarlar)
  if (rawToken.startsWith('sl_')) {
    const tokenHash = createHash('sha256').update(rawToken).digest('hex')
    try {
      const admin = createAdminClient()
      const { data: tokenRow, error } = await admin
        .from('api_tokens')
        .select('user_id, revoked_at')
        .eq('token_hash', tokenHash)
        .is('revoked_at', null)
        .maybeSingle()

      if (!error && tokenRow?.user_id) {
        // Son kullanım zamanını arka planda güncelle (isteği geciktirme)
        Promise.resolve(
          admin
            .from('api_tokens')
            .update({ last_used_at: new Date().toISOString() })
            .eq('token_hash', tokenHash)
        ).catch(() => {})

        return tokenRow.user_id
      }
    } catch (tokenErr) {
      console.warn('[resolveAuthenticatedUserId] Token sorgulama uyarısı:', tokenErr)
    }

    return null
  }

  // 2b) Geçiş dönemi: Eğer kullanıcı mevcut profil UUID'sini göndermişse,
  // doğrulamak için profiles tablosunda tam eşleşme aranır.
  // Tahmin, rastgele ilk kullanıcı seçimi veya e-posta benzerliği ASLA yapılmaz.
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (UUID_REGEX.test(rawToken)) {
    try {
      const admin = createAdminClient()
      const { data: profile } = await admin
        .from('profiles')
        .select('id')
        .eq('id', rawToken)
        .maybeSingle()

      if (profile?.id) {
        return profile.id
      }
    } catch {}
  }

  return null
}
