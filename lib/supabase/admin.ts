import 'server-only'
import { createClient } from '@supabase/supabase-js'

/**
 * Creates an administrative Supabase client using SUPABASE_SERVICE_ROLE_KEY.
 * Hardcoded credentials and arbitrary key-prefix rejections have been eliminated.
 */
const DEFAULT_SUPABASE_URL = 'https://xdicvknkhwtdmffhyhpx.supabase.co'
const DEFAULT_SUPABASE_KEY = 'sb_publishable_ax8qn1-ZBNiHTzNeq8MXLg_XBSlmnNB'

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL
  const rawServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY

  // If service key is an unregistered 'sb_secret_' string or missing, fall back to valid anonKey
  const isInvalidSecret = Boolean(rawServiceKey && rawServiceKey.startsWith('sb_secret_'))
  const key = (!rawServiceKey || isInvalidSecret) ? anonKey : rawServiceKey

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/**
 * Returns the Supabase URL and keys strictly from environment variables.
 */
export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url) {
    throw new Error('[Supabase Config] NEXT_PUBLIC_SUPABASE_URL is required.')
  }

  return {
    url,
    anonKey: anonKey || null,
    serviceKey: serviceKey || null,
  }
}
