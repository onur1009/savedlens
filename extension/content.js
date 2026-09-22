/**
 * SavedLens Content Script (Manifest V3) — v2.5
 * Smart Instagram detection:
 * 1. Single Post detection (direct post URL or opened modal dialog)
 * 2. Saved Collection bulk detection (all-posts grid) with Auto-Scroll support
 * 3. General web page metadata extraction
 */

if (!window.__SAVEDLENS_CONTENT_INJECTED__) {
  window.__SAVEDLENS_CONTENT_INJECTED__ = true

  // ── Auto-Sync Token from SavedLens Web App ───────────────────
  if (
    window.location.hostname.includes('savedlens.vercel.app') ||
    window.location.hostname.includes('localhost')
  ) {
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
    const match = href.match(/\/(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/)
    if (match) {
      const type = match[1] === 'reels' || match[1] === 'tv' ? 'reel' : match[1]
      return {
        type,
        shortcode: match[2],
        url: `https://www.instagram.com/${match[1] === 'p' ? 'p' : 'reel'}/${match[2]}/`,
      }
    }
    return null
  }

  // ── Helper: clean caption boilerplate ─────────────────────────
  function cleanInstagramCaption(raw) {
    if (!raw) return ''
    let text = raw.trim()
    text = text.replace(
      /^[A-Za-z0-9_.]+\s+adlı kullanıcının\s+[^:]*tarihli\s*(?:Reel\s+videosu|fotoğrafı|gönderisi|videosu)?[:\s]*/i,
      ''
    )
    text = text.replace(/^(?:Photo|Video|Reel)\s+by\s+[A-Za-z0-9_.]+\s+on\s+[^:]*[:\s]*/i, '')
    text = text.replace(/^May be an image of\s+/i, '')
    return text.trim()
  }

  // ── Helper: extract author from alt or caption text ───────────
  function extractAuthorFromText(altText) {
    if (!altText) return null
    const trMatch = altText.match(/^([A-Za-z0-9_.]+)\s+adlı kullanıcının/i)
    if (trMatch && trMatch[1]) return trMatch[1].trim()

    const enMatch = altText.match(/(?:Photo|Video|Reel)\s+by\s+([A-Za-z0-9_.]+)\s+on/i)
    if (enMatch && enMatch[1]) return enMatch[1].trim()

    const byMatch = altText.match(/by\s+@?([A-Za-z0-9_.]+)/i)
    if (byMatch && byMatch[1]) return byMatch[1].trim()

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

  // ── Extract Single Post (Direct URL or Active Modal Dialog) ──
  function extractSinglePost(rootElement = document) {
    const currentUrl = window.location.href
    let link = rootElement.querySelector('a[href*="/p/"], a[href*="/reel/"]')
    let shortcode = null
    let postUrl = currentUrl

    if (link) {
      const parsed = parseInstagramLink(link.getAttribute('href') || link.href)
      if (parsed) {
        shortcode = parsed.shortcode
        postUrl = parsed.url
      }
    }
    if (!shortcode) {
      const parsed = parseInstagramLink(currentUrl)
      if (parsed) {
        shortcode = parsed.shortcode
        postUrl = parsed.url
      }
    }

    // Extract Author
    let authorName = 'instagram_creator'
    const authorEl = rootElement.querySelector(
      'header a[role="link"], header a, article h2 a, [role="main"] header a, a[role="link"][tabindex="0"]'
    )
    if (authorEl && authorEl.textContent) {
      const clean = authorEl.textContent.trim().replace(/^@/, '')
      if (clean && clean !== 'Instagram' && !clean.includes(' ') && clean.length < 40) {
        authorName = clean
      }
    }

    // Extract Caption
    let captionText = ''
    const captionEl = rootElement.querySelector(
      'article h1, article ul li span[dir="auto"], div[data-testid="post-comment-root"] span, article span[dir="auto"], h1[dir="auto"]'
    )
    if (captionEl && captionEl.textContent && captionEl.textContent.length > 3) {
      captionText = captionEl.textContent.trim()
    }

    // Extract Media
    const imgEl = rootElement.querySelector(
      'article img[style*="object-fit"], article img, img[alt*="Photo"], img[alt*="Fotoğraf"]'
    )
    const videoEl = rootElement.querySelector('article video, video[src], video[poster]')
    const mediaUrl =
      videoEl?.poster ||
      getBestImageSrc(imgEl) ||
      document.querySelector('meta[property="og:image"]')?.content ||
      null

    if (!captionText && imgEl?.alt) captionText = imgEl.alt
    if (!captionText) {
      captionText = document.querySelector('meta[property="og:description"]')?.content || ''
    }

    const parsedAuthor = extractAuthorFromText(captionText)
    if (parsedAuthor && (authorName === 'instagram_creator' || authorName === 'instagram_user')) {
      authorName = parsedAuthor
    }

    const isVideo =
      Boolean(videoEl) ||
      (shortcode && (currentUrl.includes('/reel/') || postUrl.includes('/reel/')))
    const isCarousel = Boolean(
      rootElement.querySelector('svg[aria-label*="Carousel"], svg[aria-label*="Döngü"]')
    )

    return {
      platform: 'instagram',
      external_id: shortcode || `ig_${Date.now()}`,
      permalink: postUrl,
      author: {
        username: authorName,
        full_name: authorName,
        avatar_url: '',
      },
      content: {
        caption: cleanInstagramCaption(captionText) || captionText || 'Instagram Gönderisi',
        media_type: isCarousel ? 'carousel' : isVideo ? 'video' : 'image',
        media_urls: mediaUrl ? [mediaUrl] : [],
      },
      saved_at: new Date().toISOString(),
    }
  }

  // ── Global Continuous Harvest Cache (with sessionStorage persistence) ──
  window.__SAVEDLENS_GRID_CACHE__ = window.__SAVEDLENS_GRID_CACHE__ || new Map()

  // Restore previous harvest from sessionStorage if available (prevents loss on page refresh)
  try {
    const savedSnapshot = sessionStorage.getItem('__SAVEDLENS_HARVEST_SNAPSHOT__')
    if (savedSnapshot) {
      const parsed = JSON.parse(savedSnapshot)
      if (Array.isArray(parsed)) {
        for (const it of parsed) {
          if (it && it.external_id) {
            window.__SAVEDLENS_GRID_CACHE__.set(it.external_id, it)
          }
        }
      }
    }
  } catch {}

  let saveSnapshotTimer = null
  function scheduleSnapshotSave() {
    clearTimeout(saveSnapshotTimer)
    saveSnapshotTimer = setTimeout(() => {
      try {
        const items = Array.from(window.__SAVEDLENS_GRID_CACHE__.values())
        if (items.length > 0) {
          sessionStorage.setItem('__SAVEDLENS_HARVEST_SNAPSHOT__', JSON.stringify(items))
        }
      } catch {}
    }, 500)
  }

  // ── Extract All Grid Posts (Saved Collection or Feed) ─────────
  function extractInstagramGridItems() {
    const links = document.querySelectorAll(
      'main a[href*="/p/"], main a[href*="/reel/"], main a[href*="/reels/"], a[href*="/p/"], a[href*="/reel/"], a[href*="/reels/"]'
    )

    links.forEach((a) => {
      // If link is inside header, nav or modal backdrop controls, skip
      if (a.closest('header') || a.closest('nav') || a.closest('footer')) return

      const parsed = parseInstagramLink(a.getAttribute('href') || a.href)
      if (!parsed) return

      const img = a.querySelector('img')
      const mediaUrl = getBestImageSrc(img || a)
      const altText = img ? img.getAttribute('alt') || '' : ''

      let mediaType = 'image'
      if (parsed.type === 'reel') {
        mediaType = 'video'
      } else if (
        a.querySelector(
          'svg[aria-label*="Carousel"], svg[aria-label*="Döngü"], svg[aria-label*="carousel"], svg[aria-label*="Album"]'
        )
      ) {
        mediaType = 'carousel'
      } else if (a.querySelector('video, [aria-label*="Reel"], [aria-label*="Video"]')) {
        mediaType = 'video'
      }

      const authorUsername = extractAuthorFromText(altText) || 'instagram_creator'

      const item = {
        platform: 'instagram',
        external_id: parsed.shortcode,
        permalink: parsed.url,
        author: { username: authorUsername, full_name: authorUsername, avatar_url: '' },
        content: {
          caption: cleanInstagramCaption(altText) || altText || 'Instagram Gönderisi',
          media_type: mediaType,
          media_urls: mediaUrl ? [mediaUrl] : [],
        },
        saved_at: new Date().toISOString(),
      }

      // Add to global persistent cache
      window.__SAVEDLENS_GRID_CACHE__.set(parsed.shortcode, item)
    })

    scheduleSnapshotSave()
    return Array.from(window.__SAVEDLENS_GRID_CACHE__.values())
  }

  // Continuous passive harvesting via MutationObserver & Scroll
  try {
    let debounceTimer = null
    const harvestPassively = () => {
      clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        if (window.location.hostname.includes('instagram.com')) {
          extractInstagramGridItems()
        }
      }, 300)
    }

    window.addEventListener('scroll', harvestPassively, { passive: true })
    const observer = new MutationObserver(harvestPassively)
    observer.observe(document.body, { childList: true, subtree: true })
    // Initial pass
    harvestPassively()
  } catch {}

  // ── High-Performance Smooth Scanner for Instagram Infinite Grid ──
  let isAutoScrolling = false
  let floatingPillEl = null

  function updateFloatingScanner(count, statusText = 'Taranıyor...') {
    if (!floatingPillEl) {
      floatingPillEl = document.createElement('div')
      floatingPillEl.id = 'savedlens-floating-scanner'
      floatingPillEl.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 999999;
        background: linear-gradient(135deg, #18181b 0%, #09090b 100%);
        border: 1px solid rgba(168, 85, 247, 0.4);
        box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.8), 0 0 20px rgba(168, 85, 247, 0.25);
        color: #fff;
        padding: 12px 18px;
        border-radius: 9999px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 13px;
        display: flex;
        align-items: center;
        gap: 12px;
        backdrop-filter: blur(12px);
        transition: all 0.3s ease;
      `
      floatingPillEl.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <div id="savedlens-spin" style="width: 14px; height: 14px; border: 2px solid #a855f7; border-top-color: transparent; border-radius: 50%; animation: sl-spin 0.8s linear infinite;"></div>
          <span style="font-weight: 600; color: #f4f4f5;">SavedLens:</span>
          <span id="savedlens-count" style="color: #c084fc; font-weight: 700;">0</span>
          <span id="savedlens-status" style="color: #a1a1aa;">gönderi toplandı</span>
        </div>
        <button id="savedlens-btn-stop" style="
          background: rgba(239, 68, 68, 0.2);
          border: 1px solid rgba(239, 68, 68, 0.4);
          color: #fca5a5;
          padding: 4px 10px;
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
        ">Durdur & Kaydet</button>
      `
      const styleTag = document.createElement('style')
      styleTag.textContent = '@keyframes sl-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }'
      document.head.appendChild(styleTag)
      document.body.appendChild(floatingPillEl)

      floatingPillEl.querySelector('#savedlens-btn-stop')?.addEventListener('click', () => {
        isAutoScrolling = false
        const btn = floatingPillEl.querySelector('#savedlens-btn-stop')
        if (btn) btn.textContent = 'Durduruldu'
      })
    }

    const cEl = floatingPillEl.querySelector('#savedlens-count')
    const sEl = floatingPillEl.querySelector('#savedlens-status')
    if (cEl) cEl.textContent = String(count)
    if (sEl) sEl.textContent = statusText
  }

  function hideFloatingScanner() {
    if (floatingPillEl) {
      setTimeout(() => {
        floatingPillEl?.remove()
        floatingPillEl = null
      }, 3000)
    }
  }

  async function autoScrollAndCollect(maxRounds = 400, onProgress) {
    if (isAutoScrolling) return Array.from(window.__SAVEDLENS_GRID_CACHE__.values())
    isAutoScrolling = true

    // Initial immediate harvest
    extractInstagramGridItems()
    let lastCount = window.__SAVEDLENS_GRID_CACHE__.size
    if (onProgress) onProgress(lastCount)
    updateFloatingScanner(lastCount, 'Taranıyor...')

    let consecutiveIdleCycles = 0
    const scrollStep = Math.max(650, Math.floor(window.innerHeight * 0.75))

    for (let round = 0; round < maxRounds; round++) {
      if (!isAutoScrolling) break

      // Detect Instagram rate-limit or loading error screen
      const initialText = document.body ? document.body.innerText : ''
      if (
        initialText.includes("This page couldn't load") ||
        initialText.includes('This page couldn’t load') ||
        initialText.includes('Sayfa yüklenemedi')
      ) {
        updateFloatingScanner(lastCount, '⚠️ Instagram mola verdi. Gönderileriniz korundu!')
        break
      }

      // 1. Smooth downward scroll
      window.scrollBy({ top: scrollStep, behavior: 'smooth' })

      // Also scroll main content container if present
      const scrollableMain = document.querySelector('main div[style*="overflow"], [role="main"] div[style*="overflow"]')
      if (scrollableMain) {
        scrollableMain.scrollTop += scrollStep
      }

      // 2. Continuous harvest during the scroll animation (3 checks over 900ms)
      let countIncreased = false
      for (let tick = 0; tick < 3; tick++) {
        await new Promise((resolve) => setTimeout(resolve, 350))
        extractInstagramGridItems()
        const currentCount = window.__SAVEDLENS_GRID_CACHE__.size

        if (currentCount > lastCount) {
          lastCount = currentCount
          countIncreased = true
          consecutiveIdleCycles = 0
          if (onProgress) onProgress(lastCount)
          updateFloatingScanner(lastCount, 'Taranıyor...')
        }
      }

      // 3. If items were actively found during scroll, apply natural human delay before next scroll
      if (countIncreased) {
        // Natural human pacing (1.2s - 1.8s) ensures Instagram NEVER triggers rate limits
        await new Promise((resolve) => setTimeout(resolve, 1200 + Math.random() * 600))
        continue
      }

      // 3. No items grew on this scroll step. Let's check if Instagram is loading or needs time
      const isNearBottom =
        window.innerHeight + window.scrollY >= (document.documentElement.scrollHeight || document.body.scrollHeight) - 250

      const isSpinnerVisible = Boolean(
        document.querySelector(
          'svg circle, div[role="progressbar"], svg[aria-label*="Loading"], svg[aria-label*="Yükleniyor"]'
        )
      )

      if (isSpinnerVisible) {
        // Wait for Instagram's network request to deliver tiles
        updateFloatingScanner(lastCount, 'Instagram yükleniyor...')
        await new Promise((resolve) => setTimeout(resolve, 1800))
        extractInstagramGridItems()
        if (window.__SAVEDLENS_GRID_CACHE__.size > lastCount) {
          lastCount = window.__SAVEDLENS_GRID_CACHE__.size
          consecutiveIdleCycles = 0
          if (onProgress) onProgress(lastCount)
          updateFloatingScanner(lastCount, 'Taranıyor...')
          continue
        }
      }

      // 4. Idle cycle handling (only when near page bottom)
      if (isNearBottom) {
        consecutiveIdleCycles++
        updateFloatingScanner(lastCount, `Bekleniyor (${consecutiveIdleCycles}/6)...`)

        // Gentle re-trigger of IntersectionObserver:
        // Scroll slightly UP and then DOWN smoothly
        window.scrollBy({ top: -300, behavior: 'smooth' })
        await new Promise((resolve) => setTimeout(resolve, 600))

        window.scrollTo({
          top: document.documentElement.scrollHeight || document.body.scrollHeight,
          behavior: 'smooth',
        })
        await new Promise((resolve) => setTimeout(resolve, 1400))

        extractInstagramGridItems()
        if (window.__SAVEDLENS_GRID_CACHE__.size > lastCount) {
          lastCount = window.__SAVEDLENS_GRID_CACHE__.size
          consecutiveIdleCycles = 0
          if (onProgress) onProgress(lastCount)
          updateFloatingScanner(lastCount, 'Taranıyor...')
          continue
        }

        // Only stop if 6 consecutive idle cycles failed at the genuine bottom of the page
        if (consecutiveIdleCycles >= 6) {
          updateFloatingScanner(lastCount, 'Tüm liste tamamlandı ✓')
          break
        }
      } else {
        // Not at bottom yet, just keep scrolling down!
        consecutiveIdleCycles = 0
      }
    }

    isAutoScrolling = false
    const finalItems = Array.from(window.__SAVEDLENS_GRID_CACHE__.values())
    if (onProgress) onProgress(finalItems.length)
    updateFloatingScanner(finalItems.length, 'Tamamlandı ✓')
    hideFloatingScanner()

    return finalItems
  }

  // ── Inspect Page State (Distinguish Single Post vs Saved Grid) ─
  function inspectPageState() {
    const isInstagram = window.location.hostname.includes('instagram.com')
    if (!isInstagram) {
      return {
        type: 'web_page',
        url: window.location.href,
        title: document.title,
      }
    }

    // 1. Is an Instagram modal dialog open right now?
    const dialog = document.querySelector('div[role="dialog"], div[aria-modal="true"]')
    if (dialog && dialog.querySelector('article, video, img')) {
      const post = extractSinglePost(dialog)
      return {
        type: 'single_post',
        isModal: true,
        post,
      }
    }

    // 2. Is current URL directly on a single post/reel? (Not in /saved/ collection)
    const currentUrl = window.location.href
    const isSavedUrl = currentUrl.includes('/saved')
    const singlePostMatch = parseInstagramLink(currentUrl)

    if (singlePostMatch && !isSavedUrl) {
      const post = extractSinglePost(document)
      return {
        type: 'single_post',
        isModal: false,
        post,
      }
    }

    // 3. Is the user on the Saved collection page or has grid items?
    const gridItems = extractInstagramGridItems()
    if (isSavedUrl || gridItems.length > 2) {
      return {
        type: 'saved_collection',
        count: gridItems.length,
        items: gridItems,
        isSavedUrl,
      }
    }

    // 4. Default: single post fallback or generic page
    const post = extractSinglePost(document)
    return {
      type: 'single_post',
      isModal: false,
      post,
    }
  }

  // ── Extract Generic Page Metadata ─────────────────────────────
  function extractPageMetadata() {
    const state = inspectPageState()
    if (state.type === 'single_post' && state.post) {
      const p = state.post
      const firstLine = p.content.caption.split('\n')[0] || p.content.caption
      return {
        title: firstLine.length > 70 ? firstLine.slice(0, 68) + '...' : firstLine,
        caption: p.content.caption,
        description: p.content.caption,
        thumbnail_url: p.content.media_urls?.[0] || null,
        image: p.content.media_urls?.[0] || null,
        author_username: p.author.username,
        author_name: p.author.full_name,
        media_type: p.content.media_type,
        url: p.permalink,
      }
    }

    const getMeta = (name) => {
      const el = document.querySelector(`meta[property="${name}"], meta[name="${name}"]`)
      return el ? el.getAttribute('content') : null
    }

    const title = getMeta('og:title') || getMeta('twitter:title') || document.title || ''
    const description =
      getMeta('og:description') || getMeta('twitter:description') || getMeta('description') || ''
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

    if (request.action === 'INSPECT_PAGE_STATE') {
      try {
        const state = inspectPageState()
        sendResponse({ success: true, state })
      } catch (err) {
        sendResponse({ success: false, error: err.message })
      }
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
        const items = extractInstagramGridItems()
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

    if (request.action === 'STOP_AUTO_SCROLL') {
      isAutoScrolling = false
      const items = Array.from(window.__SAVEDLENS_GRID_CACHE__.values())
      sendResponse({ success: true, count: items.length, items })
      return true
    }

    if (request.action === 'AUTO_SCROLL_AND_EXTRACT') {
      autoScrollAndCollect(400, (currentCount) => {
        chrome.runtime.sendMessage({ action: 'SCROLL_PROGRESS', count: currentCount }).catch(() => {})
      })
        .then((items) => {
          sendResponse({
            success: true,
            count: items.length,
            items,
            pageUrl: window.location.href,
          })
        })
        .catch((err) => {
          sendResponse({ success: false, error: err.message })
        })
      return true // Asynchronous response
    }
  })
}
