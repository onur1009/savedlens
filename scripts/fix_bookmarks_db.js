const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
  process.exit(1);
}

const supabase = createClient(url, key);

function extractRealAuthor(caption, existingAuthor) {
  if (existingAuthor && existingAuthor !== 'instagram_user' && existingAuthor !== 'kullanıcı') {
    return { username: existingAuthor, name: existingAuthor };
  }

  if (caption) {
    const trMatch = caption.match(/^([A-Za-z0-9_.]+)\s+adlı kullanıcının/i);
    if (trMatch && trMatch[1]) {
      return { username: trMatch[1], name: trMatch[1] };
    }

    const enMatch = caption.match(/^(?:Photo|Video|Reel)\s+by\s+([A-Za-z0-9_.]+)\s+on/i);
    if (enMatch && enMatch[1]) {
      return { username: enMatch[1], name: enMatch[1] };
    }

    const byMatch = caption.match(/by\s+@?([A-Za-z0-9_.]+)/i);
    if (byMatch && byMatch[1]) {
      return { username: byMatch[1], name: byMatch[1] };
    }
  }

  return { username: 'instagram_creator', name: 'Instagram İçeriği' };
}

function cleanCaptionText(caption) {
  if (!caption) return caption;
  let clean = caption.trim();
  clean = clean.replace(
    /^[A-Za-z0-9_.]+\s+adlı kullanıcının\s+[^:]*tarihli\s*(?:Reel\s+videosu|fotoğrafı|gönderisi|videosu)?[:\s]*/i,
    ''
  );
  clean = clean.replace(
    /^(?:Photo|Video|Reel)\s+by\s+[A-Za-z0-9_.]+\s+on\s+[^:]*[:\s]*/i,
    ''
  );
  clean = clean.replace(/^May be an image of\s+/i, '');
  return clean.trim();
}

async function run() {
  const { data: bms, error } = await supabase
    .from('bookmarks')
    .select('id, permalink, author_username, author_name, caption');

  if (error) {
    console.error('Error fetching bookmarks:', error);
    return;
  }

  console.log(`Found ${bms.length} total bookmarks.`);
  let updatedCount = 0;

  for (const b of bms) {
    const realAuthor = extractRealAuthor(b.caption, b.author_username);
    const cleanedCaption = cleanCaptionText(b.caption);

    const shouldUpdate =
      (b.author_username === 'instagram_user' || !b.author_username) &&
      realAuthor.username !== 'instagram_user';

    if (shouldUpdate) {
      console.log(`[Updating #${b.id}] From: ${b.author_username} -> To: ${realAuthor.username}`);
      const { error: updateError } = await supabase
        .from('bookmarks')
        .update({
          author_username: realAuthor.username,
          author_name: realAuthor.name,
          caption: cleanedCaption,
        })
        .eq('id', b.id);

      if (updateError) {
        console.error(`Error updating #${b.id}:`, updateError.message);
      } else {
        updatedCount++;
      }
    }
  }

  console.log(`Finished! Updated ${updatedCount} bookmarks.`);
}

run();
