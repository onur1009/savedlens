/**
 * SavedLens Content Script (Manifest V3)
 * Handles Instagram saved collections, posts, reels, and general web page metadata extraction.
 */

if (!window.__SAVEDLENS_CONTENT_INJECTED__) {
  window.__SAVEDLENS_CONTENT_INJECTED__ = true

  // ── Auto-Sync Token on SavedLens Dashboard ────────────────────
  if (window.location.hostname.includes('savedlens.vercel.app') || window.location.hostname.includes('localhost')) {
    try {
      const syncToken = localStorage.getItem('savedlens_sync_token')
      if (syncToken && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ savedlens_sync_token: syncToken })
      }
    } catch {}

    window.addEventListener('savedlens-sync-token', (e) => {
      if (e.detail && e.detail.token && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ savedlens_sync_token: e.detail.token })
      }
    })
  }

  // ── Helper: parse Instagram links ─────────────────────────────
  function parseInstagramLink(href) {
    if (!href) return null
    const match = href.match(/\/(p|reel|reels)\/([A-Za-z0-9_-]+)/)
    if (match) {
      const type = match[1] === 'reels' ? 'reel' : match[1]
      return {
        type,
        shortcode: match[2],
        url: `https://www.instagram.com/${type}/${match[2]}/`,
      }
    }
    return null
  }

  // ── Helper: get best image resolution ─────────────────────────
  function getBestImageSrc(element) {
    if (!element) return null
    const img = element.tagName === 'IMG' ? element : element.querySelector('img')
    if (img) {
      if (img.srcset) {
        const parts = img.srcset.split(',').map((s) => s.trim().split(/\s+/))
        if (parts.length > 0) {
          const highest = parts[parts.length - 1][0]
          if (highest && highest.startsWith('http')) return highest
        }
      }
      if (img.src && img.src.startsWith('http')) return img.src
    }
    const bg = element.style && element.style.backgroundImage
    if (bg && bg.includes('url(')) {
      const m = bg.match(/url\(["']?([^"']+)["']?\)/)
      if (m && m[1]) return m[1]
    }
    return null
  }

  // ── Extract Instagram Items from DOM ──────────────────────────
  function extractInstagramFromDOM() {
    const extracted = []
    const seenShortcodes = new Set()

    // 1. Check if currently on a single post/reel page
    const currentUrl = window.location.href
    const singlePost = parseInstagramLink(currentUrl)

    if (singlePost) {
      seenShortcodes.add(singlePost.shortcode)

      // Author
      let authorName = 'instagram_user'
      const authorEl = document.querySelector(
        'header a, article h2 a, [role="main"] header a, a[role="link"][tabindex="0"], a[href^="/"][role="link"]'
      )
      if (authorEl && authorEl.textContent) {
        authorName = authorEl.textContent.trim().replace(/^@/, '')
      }

      // Media
      const imgEl = document.querySelector(
        'article img[style*="object-fit"], article img, [role="main"] img, [role="presentation"] img'
      )
      const mediaUrl = getBestImageSrc(imgEl)

      // Caption
      let captionText = ''
      const captionEl = document.querySelector(
        'article h1, article ul li span, div[data-testid="post-comment-root"] span, article span[dir="auto"]'
      )
      if (captionEl && captionEl.textContent) {
        captionText = captionEl.textContent.trim()
      } else if (imgEl && imgEl.alt) {
        captionText = imgEl.alt
      }

      const isVideo = singlePost.type === 'reel' || Boolean(document.querySelector('article video, [role="main"] video'))

      extracted.push({
        platform: 'instagram',
        external_id: singlePost.shortcode,
        permalink: singlePost.url,
        author: {
          username: authorName,
          full_name: authorName,
          avatar_url: '',
        },
        content: {
          caption: captionText || 'Instagram Gönderisi',
          media_type: isVideo ? 'video' : 'image',
          media_urls: mediaUrl ? [mediaUrl] : [],
        },
        saved_at: new Date().toISOString(),
      })
    }

    // 2. Extract collection / saved grid posts
    const links = document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"], a[href*="/reels/"]')

    links.forEach((a) => {
      const parsed = parseInstagramLink(a.getAttribute('href') || a.href)
      if (!parsed || seenShortcodes.has(parsed.shortcode)) return
      seenShortcodes.add(parsed.shortcode)

      const img = a.querySelector('img')
      const mediaUrl = getBestImageSrc(img || a)
      const altText = img ? (img.getAttribute('alt') || '') : ''

      let mediaType = 'image'
      if (parsed.type === 'reel') {
        mediaType = 'video'
      } else if (a.querySelector('svg[aria-label*="Carousel"], svg[aria-label*="Döngü"], svg[aria-label*="carousel"]')) {
        mediaType = 'carousel'
      }

      let authorUsername = 'instagram_user'
      const authorMatch =
        altText.match(/Photo by ([^on]+) on/i) ||
        altText.match(/Fotoğraf: ([^,]+)/i) ||
        altText.match(/by ([^,]+)/i)
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
          caption: altText || 'Instagram Gönderisi',
          media_type: mediaType,
          media_urls: mediaUrl ? [mediaUrl] : [],
        },
        saved_at: new Date().toISOString(),
      })
    })

    return extracted
  }

  // ── Extract Generic Page Metadata ─────────────────────────────
  function extractPageMetadata() {
    const getMeta = (name) => {
      const el = document.querySelector(`meta[property="${name}"], meta[name="${name}"]`)
      return el ? el.getAttribute('content') : null
    }

    const title = getMeta('og:title') || getMeta('twitter:title') || document.title || ''
    const description = getMeta('og:description') || getMeta('twitter:description') || getMeta('description') || ''
    const image = getMeta('og:image') || getMeta('twitter:image') || ''

    return {
      title: title.trim(),
      description: description.trim(),
      image: image.trim(),
      url: window.location.href,
    }
  }

  // ── Message Listener ──────────────────────────────────────────
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'PING') {
      sendResponse({
        status: 'OK',
        url: window.location.href,
        isInstagram: window.location.hostname.includes('instagram.com'),
      })
      return true
    }

    if (request.action === 'GET_PAGE_METADATA') {
      try {
        const data = extractPageMetadata()
        sendResponse({ success: true, data })
      } catch (err) {
        sendResponse({ success: false, error: err.message })
      }
      return true
    }

    if (request.action === 'EXTRACT_SAVED_POSTS') {
      try {
        const items = extractInstagramFromDOM()
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
}
