import 'server-only'
import { createClient } from '@supabase/supabase-js'

const DEFAULT_SUPABASE_URL = 'https://xdicvknkhwtdmffhyhpx.supabase.co'
const DEFAULT_SERVICE_ROLE_KEY = 'sb_secret_U9mYUXb_2e1RAXN4AhNieQ_KVwMWIw9'

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || DEFAULT_SERVICE_ROLE_KEY

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
