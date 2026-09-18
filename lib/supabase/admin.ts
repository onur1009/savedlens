import 'server-only'
import { createClient } from '@supabase/supabase-js'

const DEFAULT_SUPABASE_URL = 'https://xdicvknkhwtdmffhyhpx.supabase.co'
const DEFAULT_ANON_KEY = 'sb_publishable_ax8qn1-ZBNiHTzNeq8MXLg_XBSlmnNB'

/**
 * Resolve the best available Supabase key.
 * Priority: SUPABASE_SERVICE_ROLE_KEY (JWT format) > NEXT_PUBLIC_SUPABASE_ANON_KEY > default anon key
 *
 * Supabase local dev uses `sb_secret_` prefix which is NOT valid for production.
 * Supabase production service role keys start with `eyJ` (JWT).
 */
function resolveKey(): string {
  const envServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  // Valid JWT service role key (production format starts with eyJ)
  if (envServiceKey && envServiceKey.startsWith('eyJ')) {
    return envServiceKey
  }

  // Fallback to anon key (works for RLS-compatible operations)
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_ANON_KEY
}

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL
  const key = resolveKey()

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/**
 * Returns the Supabase URL and anon key for direct REST calls.
 * Use this when you need to make HTTP calls with proper auth headers.
 */
export function getSupabaseConfig() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_ANON_KEY,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || null,
  }
}
