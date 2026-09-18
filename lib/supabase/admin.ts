import 'server-only'
import { createClient } from '@supabase/supabase-js'

const DEFAULT_SUPABASE_URL = 'https://xdicvknkhwtdmffhyhpx.supabase.co'
const DEFAULT_ANON_KEY = 'sb_publishable_ax8qn1-ZBNiHTzNeq8MXLg_XBSlmnNB'

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL
  const envServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  // Check if service role key is valid (must not be invalid CLI format starting with sb_secret_)
  const isInvalidSecretFormat = envServiceKey && envServiceKey.startsWith('sb_secret_')
  const key = (!envServiceKey || isInvalidSecretFormat)
    ? (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_ANON_KEY)
    : envServiceKey

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
