/**
 * Formats raw scraped bookmark data into clean, human-readable titles,
 * authors, and thumbnails for Instagram, TikTok, Twitter, YouTube, and Web.
 */

export function sanitizeSurrogates(str: string): string {
  if (!str) return ''
  return str.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '')
}

export function formatBookmarkTitle(
  caption?: string | null,
  permalink?: string,
  authorName?: string | null
): string {
  if (!caption) {
    if (authorName && authorName !== 'instagram_user' && authorName !== 'kullanıcı') {
      return `${authorName} Paylaşımı`
    }
    return 'Instagram İçeriği'
  }

  let clean = caption.trim()

  // Remove Turkish Instagram boilerplate prefixes
  clean = clean.replace(
    /^[A-Za-z0-9_.]+\s+adlı kullanıcının\s+[^:]*tarihli\s*(?:Reel\s+videosu|fotoğrafı|gönderisi|videosu)?[:\s]*/i,
    ''
  )

  // Remove English Instagram boilerplate prefixes
  clean = clean.replace(
    /^(?:Photo|Video|Reel)\s+by\s+[A-Za-z0-9_.]+\s+on\s+[^:]*[:\s]*/i,
    ''
  )
  clean = clean.replace(/^May be an image of\s+/i, '')
  clean = clean.trim()

  if (!clean || clean.length < 3) {
    if (authorName && authorName !== 'instagram_user' && authorName !== 'kullanıcı') {
      return `${authorName} Paylaşımı`
    }
    return 'Instagram Gönderisi'
  }

  // Get the first sentence or first line up to 75 characters
  const lines = clean.split('\n').map((l) => l.trim()).filter(Boolean)
  const firstLine = lines[0] || clean

  if (firstLine.length > 75) {
    const sliced = firstLine.slice(0, 72)
    return sanitizeSurrogates(sliced).trim() + '...'
  }
  return sanitizeSurrogates(firstLine)
}

export function extractRealAuthor(
  caption?: string | null,
  existingAuthor?: string | null
): { username: string; name: string } {
  if (existingAuthor && existingAuthor !== 'instagram_user' && existingAuthor !== 'kullanıcı') {
    return { username: existingAuthor, name: existingAuthor }
  }

  if (caption) {
    // Check Turkish: "username adlı kullanıcının..."
    const trMatch = caption.match(/^([A-Za-z0-9_.]+)\s+adlı kullanıcının/i)
    if (trMatch && trMatch[1]) {
      return { username: trMatch[1], name: trMatch[1] }
    }

    // Check English: "Reel by username on..."
    const enMatch = caption.match(/^(?:Photo|Video|Reel)\s+by\s+([A-Za-z0-9_.]+)\s+on/i)
    if (enMatch && enMatch[1]) {
      return { username: enMatch[1], name: enMatch[1] }
    }

    // Check "by @username"
    const byMatch = caption.match(/by\s+@?([A-Za-z0-9_.]+)/i)
    if (byMatch && byMatch[1]) {
      return { username: byMatch[1], name: byMatch[1] }
    }
  }

  return { username: 'instagram_creator', name: 'Instagram İçeriği' }
}

export function extractInstagramShortcode(url?: string | null): string | null {
  if (!url) return null
  const match = url.match(/\/(p|reel|reels)\/([A-Za-z0-9_-]+)/)
  return match ? match[2] : null
}
