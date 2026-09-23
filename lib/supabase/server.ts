import 'server-only'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Creates server-side Supabase client using cookie store.
 * Requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
 * Hardcoded credentials have been removed.
 */
const DEFAULT_SUPABASE_URL = 'https://xdicvknkhwtdmffhyhpx.supabase.co'
const DEFAULT_SUPABASE_KEY = 'sb_publishable_ax8qn1-ZBNiHTzNeq8MXLg_XBSlmnNB'

export async function createClient() {
  const cookieStore = await cookies()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY

  return createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll called from a Server Component
          }
        },
      },
    }
  )
}
