const { createClient } = require('@supabase/supabase-js');
const client = createClient(
  'https://xdicvknkhwtdmffhyhpx.supabase.co',
  'sb_publishable_ax8qn1-ZBNiHTzNeq8MXLg_XBSlmnNB'
);

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
