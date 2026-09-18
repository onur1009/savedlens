/**
 * SavedLens Content Script (Manifest V3)
 * Handles Instagram saved collections, posts, reels, and general web page metadata extraction.
 */

if (!window.__SAVEDLENS_CONTENT_INJECTED__) {
  window.__SAVEDLENS_CONTENT_INJECTED__ = true

  // ── Auto-Sync Token on SavedLens Dashboard ────────────────────
  if (window.location.hostname.includes('savedlens.vercel.app') || window.location.hostname.includes('localhost')) {
    try {
      // Read any existing token from localStorage and store in extension storage
      const syncToken = localStorage.getItem('savedlens_sync_token')
      if (syncToken && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ savedlens_sync_token: syncToken }, () => {
          console.log('[SavedLens] Sync token auto-saved to extension storage:', syncToken.slice(0, 8) + '...')
        })
      }
    } catch {}

    // Listen for dynamic token updates dispatched by ExtensionSyncBridge
    window.addEventListener('savedlens-sync-token', (e) => {
      if (e.detail && e.detail.token && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ savedlens_sync_token: e.detail.token }, () => {
          console.log('[SavedLens] Token updated from dashboard bridge.')
        })
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

  // ── Helper: clean caption boilerplate ─────────────────────────
  function cleanInstagramCaption(raw) {
    if (!raw) return ''
    let text = raw.trim()
    text = text.replace(/^[A-Za-z0-9_.]+\s+adlı kullanıcının\s+[^:]*tarihli\s*(?:Reel\s+videosu|fotoğrafı|gönderisi|videosu)?[:\s]*/i, '')
    text = text.replace(/^(?:Photo|Video|Reel)\s+by\s+[A-Za-z0-9_.]+\s+on\s+[^:]*[:\s]*/i, '')
    text = text.replace(/^May be an image of\s+/i, '')
    return text.trim()
  }

  // ── Helper: extract author from alt or caption text ───────────
  function extractAuthorFromText(altText) {
    if (!altText) return null

    // 1. Turkish Instagram: "[username] adlı kullanıcının..."
    const trMatch = altText.match(/^([A-Za-z0-9_.]+)\s+adlı kullanıcının/i)
    if (trMatch && trMatch[1]) {
      return trMatch[1].trim()
    }

    // 2. English Instagram: "Photo by [username] on..."
    const enMatch = altText.match(/(?:Photo|Video|Reel)\s+by\s+([A-Za-z0-9_.]+)\s+on/i)
    if (enMatch && enMatch[1]) {
      return enMatch[1].trim()
    }

    // 3. Short format: "by @[username]"
    const byMatch = altText.match(/by\s+@?([A-Za-z0-9_.]+)/i)
    if (byMatch && byMatch[1]) {
      return byMatch[1].trim()
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

  // ── Helper: extract JSON-LD data if present ─────────────────────
  function getInstagramJsonLd() {
    try {
      const scripts = document.querySelectorAll('script[type="application/ld+json"]')
      for (const s of scripts) {
        if (!s.textContent) continue
        const parsed = JSON.parse(s.textContent)
        if (parsed && (parsed['@type'] === 'SocialMediaPosting' || parsed['@type'] === 'VideoObject' || parsed.author || parsed.headline)) {
          return parsed
        }
      }
    } catch {}
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
      const jsonLd = getInstagramJsonLd()

      // Author extraction with fallbacks
      let authorName = 'instagram_creator'

      if (jsonLd && jsonLd.author) {
        if (typeof jsonLd.author === 'string') authorName = jsonLd.author
        else if (jsonLd.author.name) authorName = jsonLd.author.name
        else if (jsonLd.author.identifier) authorName = jsonLd.author.identifier
      }

      if (authorName === 'instagram_creator' || authorName === 'instagram_user') {
        const authorEl = document.querySelector(
          'header a, article h2 a, [role="main"] header a, a[role="link"][tabindex="0"], a[href^="/"][role="link"]'
        )
        if (authorEl && authorEl.textContent) {
          const text = authorEl.textContent.trim().replace(/^@/, '')
          if (text && text !== 'Instagram' && !text.includes(' ')) {
            authorName = text
          }
        }
      }

      // Check og:title for creator
      const ogTitle = document.querySelector('meta[property="og:title"]')?.content
      if (ogTitle) {
        const trAuthor = ogTitle.match(/^([^,]+),\s*Instagram'da:/i)
        const enAuthor = ogTitle.match(/^([^on]+)\s+on\s+Instagram:/i)
        const match = trAuthor || enAuthor
        if (match && match[1] && (authorName === 'instagram_creator' || authorName === 'instagram_user')) {
          authorName = match[1].trim()
        }
      }

      // Media
      const imgEl = document.querySelector(
        'article img[style*="object-fit"], article img, [role="main"] img, [role="presentation"] img'
      )
      const mediaUrl =
        jsonLd?.contentUrl ||
        jsonLd?.thumbnailUrl ||
        getBestImageSrc(imgEl) ||
        document.querySelector('meta[property="og:image"]')?.content ||
        null

      // Caption
      let captionText = ''
      const captionEl = document.querySelector(
        'article h1, article ul li span, div[data-testid="post-comment-root"] span, article span[dir="auto"]'
      )
      if (captionEl && captionEl.textContent) {
        captionText = captionEl.textContent.trim()
      } else if (imgEl && imgEl.alt) {
        captionText = imgEl.alt
      } else if (document.querySelector('meta[property="og:description"]')?.content) {
        captionText = document.querySelector('meta[property="og:description"]').content
      }

      // If author not found yet, check caption text
      const parsedAuthorFromText = extractAuthorFromText(captionText)
      if (parsedAuthorFromText) {
        authorName = parsedAuthorFromText
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
          caption: cleanInstagramCaption(captionText) || captionText || 'Instagram Gönderisi',
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

      let authorUsername = extractAuthorFromText(altText) || 'instagram_creator'

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
          caption: cleanInstagramCaption(altText) || altText || 'Instagram Gönderisi',
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
    const isInstagram = window.location.hostname.includes('instagram.com')
    if (isInstagram) {
      const items = extractInstagramFromDOM()
      if (items && items.length > 0) {
        const first = items[0]
        const clean = cleanInstagramCaption(first.content.caption)
        const firstLine = clean.split('\n')[0] || clean
        const shortTitle = firstLine.length > 70 ? firstLine.slice(0, 68) + '...' : firstLine

        return {
          title: shortTitle || `${first.author.username} Paylaşımı`,
          caption: first.content.caption,
          description: first.content.caption,
          thumbnail_url: first.content.media_urls?.[0] || null,
          image: first.content.media_urls?.[0] || null,
          author_username: first.author.username,
          author_name: first.author.full_name,
          media_type: first.content.media_type,
          // NOTE: do NOT include `url` here — popup always uses activeTab.url as source of truth
        }
      }
    }

    const getMeta = (name) => {
      const el = document.querySelector(`meta[property="${name}"], meta[name="${name}"]`)
      return el ? el.getAttribute('content') : null
    }

    const title = getMeta('og:title') || getMeta('twitter:title') || document.title || ''
    const description = getMeta('og:description') || getMeta('twitter:description') || getMeta('description') || ''
    const image = getMeta('og:image') || getMeta('twitter:image') || ''

    return {
      title: title.trim(),
      caption: description.trim(),
      description: description.trim(),
      thumbnail_url: image.trim() || null,
      image: image.trim() || null,
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
