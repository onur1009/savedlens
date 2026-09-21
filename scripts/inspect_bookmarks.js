const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY must be set.');
  process.exit(1);
}

const client = createClient(url, key);

async function inspect() {
  const { data: bms, error } = await client
    .from('bookmarks')
    .select('id, permalink, author_username, author_name, caption, media_type, ai_summary')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Total sample count:', bms.length);
  for (let i = 0; i < bms.length; i++) {
    const b = bms[i];
    console.log('\n--- Item ' + (i + 1) + ' ---');
    console.log('ID:', b.id);
    console.log('Permalink:', b.permalink);
    console.log('Author:', b.author_username, 'Name:', b.author_name);
    console.log('Caption:', b.caption?.slice(0, 100));
    console.log('Summary:', b.ai_summary?.slice(0, 100));
  }
}

inspect();
