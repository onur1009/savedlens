const { createClient } = require('@supabase/supabase-js');
const url = 'https://xdicvknkhwtdmffhyhpx.supabase.co';
const anonKey = 'sb_publishable_ax8qn1-ZBNiHTzNeq8MXLg_XBSlmnNB';
const invalidSecretKey = 'sb_secret_U9mYUXb_2e1RAXN4AhNieQ_KVwMWIw9';

function getAdminClient() {
  const envKey = process.env.SUPABASE_SERVICE_ROLE_KEY || invalidSecretKey;
  // Check if key is valid (not sb_secret_ format which PostgREST rejects)
  const isInvalidKey = !envKey || envKey.startsWith('sb_secret_');
  const activeKey = isInvalidKey ? (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || anonKey) : envKey;

  return createClient(url, activeKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

async function run() {
  const admin = getAdminClient();
  const res = await admin.from('bookmarks').select('id').limit(1);
  console.log('Admin query status:', res.status, res.error ? res.error.message : 'OK');
}
run();
