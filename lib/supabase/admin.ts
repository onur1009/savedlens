import 'server-only'
import { createClient } from '@supabase/supabase-js'

/**
 * Creates an administrative Supabase client.
 * Uses SUPABASE_SERVICE_ROLE_KEY if valid, or NEXT_PUBLIC_SUPABASE_ANON_KEY as fallback.
 * Strictly reads from environment variables without hardcoded credentials.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !url.trim()) {
    throw new Error(
      '[Supabase Admin] NEXT_PUBLIC_SUPABASE_URL is not defined in environment variables.'
    )
  }

  // If serviceRoleKey starts with 'sb_secret_', Supabase PostgREST rejects it as unregistered.
  // In that case, or if serviceRoleKey is missing, fall back to anonKey.
  const isInvalidSecret = Boolean(serviceRoleKey && serviceRoleKey.startsWith('sb_secret_'))
  const key = (!serviceRoleKey || isInvalidSecret) ? anonKey : serviceRoleKey

  if (!key || !key.trim()) {
    throw new Error(
      '[Supabase Admin] Neither a valid SUPABASE_SERVICE_ROLE_KEY nor NEXT_PUBLIC_SUPABASE_ANON_KEY is defined in environment variables.'
    )
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/**
 * Returns the Supabase URL and keys from environment variables.
 * Does NOT contain any hardcoded fallback keys.
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
