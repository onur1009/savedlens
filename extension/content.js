/**
 * SavedLens Instagram Content Script
 * Manifest V3 - Extracts saved posts, reels, carousels, captions and authors
 */

// Helper to extract clean permalink and shortcode
function parseInstagramLink(href) {
  if (!href) return null
  const match = href.match(/\/(p|reel)\/([A-Za-z0-9_-]+)/)
  if (match) {
    return {
      type: match[1],
      shortcode: match[2],
      url: `https://www.instagram.com/${match[1]}/${match[2]}/`,
    }
  }
  return null
}

// Scrapes currently rendered saved post cards from Instagram DOM
function extractSavedItemsFromDOM() {
  const extracted = []
  const seenShortcodes = new Set()

  // Selector for post links in saved collection grid
  const links = document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]')

  links.forEach((a) => {
    const parsed = parseInstagramLink(a.getAttribute('href') || a.href)
    if (!parsed || seenShortcodes.has(parsed.shortcode)) return
    seenShortcodes.add(parsed.shortcode)

    // Find image thumbnail
    const img = a.querySelector('img')
    const mediaUrl = img ? img.src : null
    const altText = img ? (img.getAttribute('alt') || '') : ''

    // Detect media type
    let mediaType = 'image'
    if (parsed.type === 'reel') {
      mediaType = 'video'
    } else if (a.querySelector('svg[aria-label*="Carousel"], svg[aria-label*="Döngü"]')) {
      mediaType = 'carousel'
    }

    // Try to extract author if present in alt text or nearby links
    let authorUsername = 'instagram_user'
    const authorMatch = altText.match(/Photo by ([^on]+) on/i) || altText.match(/Fotoğraf: ([^,]+)/i)
    if (authorMatch && authorMatch[1]) {
      authorUsername = authorMatch[1].trim().replace(/[@\s]/g, '')
    }

    extracted.push({
      platform: 'instagram',
      external_id: parsed.shortcode,
      permalink: parsed.url,
      author: {
        username: authorUsername,
        full_name: authorUsername,
        avatar_url: '',
      },
      content: {
        caption: altText || 'Instagram Kaydedilen Gönderi',
        media_type: mediaType,
        media_urls: mediaUrl ? [mediaUrl] : [],
      },
      saved_at: new Date().toISOString(),
    })
  })

  return extracted
}

// Listen for commands from the extension popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'PING') {
    const isSavedPage = window.location.href.includes('/saved')
    sendResponse({
      status: 'OK',
      url: window.location.href,
      isSavedPage,
    })
    return true
  }

  if (request.action === 'EXTRACT_SAVED_POSTS') {
    try {
      const items = extractSavedItemsFromDOM()
      sendResponse({
        success: true,
        count: items.length,
        items,
        pageUrl: window.location.href,
      })
    } catch (err) {
      sendResponse({ success: false, error: err.message })
    }
    return true
  }
})
