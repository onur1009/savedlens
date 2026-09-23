import 'server-only'
import { createClient } from '@supabase/supabase-js'

/**
 * Creates an administrative Supabase client using SUPABASE_SERVICE_ROLE_KEY.
 * Hardcoded credentials and arbitrary key-prefix rejections have been eliminated.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !serviceRoleKey) {
    throw new Error(
      '[Supabase Admin] NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY ortam değişkenleri zorunludur. Hardcoded fallback kaldırıldı.'
    )
  }

  return createClient(url, serviceRoleKey, {
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
