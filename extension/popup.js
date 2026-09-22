/**
 * SavedLens Chrome Extension (Manifest V3) — v3.0
 * Smart Incremental Delta Sync Controller
 * Automatically distinguishes between single posts, new unsynced posts, and full archives.
 */

const DEFAULT_SERVER = 'https://savedlens.vercel.app'

document.addEventListener('DOMContentLoaded', async () => {
  // UI Elements
  const statusEl = document.getElementById('tab-status')
  const contextIcon = document.getElementById('context-icon')
  const contextTitle = document.getElementById('context-title')
  const contextSub = document.getElementById('context-sub')
  const btnMain = document.getElementById('btn-main-action')
  const btnIcon = document.getElementById('btn-icon')
  const btnText = document.getElementById('btn-text')
  const btnAutoscroll = document.getElementById('btn-autoscroll-action')
  const autoscrollText = document.getElementById('autoscroll-text')
  const syncModeHint = document.getElementById('sync-mode-hint')
  const feedbackCard = document.getElementById('feedback-card')
  const feedbackIcon = document.getElementById('feedback-icon')
  const feedbackText = document.getElementById('feedback-text')
  const settingsToggle = document.getElementById('settings-toggle')
  const settingsPanel = document.getElementById('settings-panel')
  const toggleArrow = document.getElementById('toggle-arrow')
  const serverInput = document.getElementById('server-url')
  const tokenInput = document.getElementById('sync-token')
  const tokenStatus = document.getElementById('token-status')
  const pillProd = document.getElementById('pill-prod')
  const pillLocal = document.getElementById('pill-local')
  const dashboardLink = document.getElementById('link-dashboard')

  let currentMode = 'general' // 'single_post' | 'saved_collection' | 'general' | 'system'
  let singlePostData = null
  let activeTab = null
  let knownShortcodes = []
  let libraryCount = 0

  function showFeedback(type, text, linkUrl = null, linkText = 'Kütüphanede Gör ↗') {
    feedbackCard.className = `feedback-card ${type}`
    feedbackIcon.textContent = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'
    feedbackText.innerHTML =
      text + (linkUrl ? ` <a class="feedback-link" href="${linkUrl}" target="_blank">${linkText}</a>` : '')
    feedbackCard.style.display = 'flex'
  }

  function hideFeedback() {
    feedbackCard.className = 'feedback-card'
    feedbackCard.style.display = 'none'
  }

  function updateDashboardLink(baseUrl) {
    if (dashboardLink) dashboardLink.href = `${baseUrl}/dashboard`
  }

  // ── 1. Settings & Storage Management ──────────────────────────
  if (chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(
      ['savedlens_server_url', 'savedlens_sync_token', 'savedlens_known_shortcodes', 'savedlens_library_count'],
      (res) => {
        if (res.savedlens_server_url) {
          serverInput.value = res.savedlens_server_url
          updateDashboardLink(res.savedlens_server_url)
          if (res.savedlens_server_url.includes('localhost')) {
            pillLocal?.classList.add('active')
            pillProd?.classList.remove('active')
          }
        }

        if (res.savedlens_sync_token) {
          tokenInput.value = res.savedlens_sync_token
          if (tokenStatus) {
            tokenStatus.textContent = 'Token Kayıtlı ✓'
            tokenStatus.style.color = 'var(--success)'
          }
        }

        if (Array.isArray(res.savedlens_known_shortcodes)) {
          knownShortcodes = res.savedlens_known_shortcodes
        }
        if (typeof res.savedlens_library_count === 'number') {
          libraryCount = res.savedlens_library_count
        }
      }
    )
  }

  function saveConfig() {
    const sUrl = serverInput.value.trim().replace(/\/$/, '') || DEFAULT_SERVER
    const tVal = tokenInput.value.trim()
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({
        savedlens_server_url: sUrl,
        savedlens_sync_token: tVal,
      })
    }
    updateDashboardLink(sUrl)
  }

  serverInput.addEventListener('change', saveConfig)
  tokenInput.addEventListener('input', saveConfig)

  pillProd?.addEventListener('click', () => {
    serverInput.value = 'https://savedlens.vercel.app'
    pillProd.classList.add('active')
    pillLocal.classList.remove('active')
    saveConfig()
  })

  pillLocal?.addEventListener('click', () => {
    serverInput.value = 'http://localhost:3000'
    pillLocal.classList.add('active')
    pillProd.classList.remove('active')
    saveConfig()
  })

  // Settings Accordion
  settingsToggle?.addEventListener('click', () => {
    const isOpen = settingsPanel.classList.toggle('open')
    toggleArrow.textContent = isOpen ? '▴' : '▾'
  })

  // ── Helper: Fetch known shortcodes from SavedLens API ─────────
  async function refreshKnownShortcodes(serverUrl, token) {
    try {
      const res = await fetch(`${serverUrl}/api/v1/sync/instagram`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'x-savedlens-token': token,
          'Authorization': token ? `Bearer ${token}` : '',
        },
      })
      if (res.ok) {
        const data = await res.json()
        if (data.success && Array.isArray(data.knownShortcodes)) {
          knownShortcodes = data.knownShortcodes
          libraryCount = data.count || knownShortcodes.length
          if (chrome.storage && chrome.storage.local) {
            chrome.storage.local.set({
              savedlens_known_shortcodes: knownShortcodes,
              savedlens_library_count: libraryCount,
            })
          }
          return true
        }
      }
    } catch {}
    return false
  }

  // ── Helper: Inject Content Script if needed ───────────────────
  async function ensureContentScript(tabId) {
    try {
      const ping = await new Promise((resolve) => {
        chrome.tabs.sendMessage(tabId, { action: 'PING' }, (resp) => {
          if (chrome.runtime.lastError || !resp) resolve(null)
          else resolve(resp)
        })
      })
      if (ping && ping.status === 'OK') return true

      if (chrome.scripting && chrome.scripting.executeScript) {
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ['content.js'],
        })
        return true
      }
    } catch {}
    return false
  }

  // ── Helper: Chunked Upload to Server ──────────────────────────
  async function uploadBookmarksChunked(items, serverUrl, token, onProgressText) {
    const CHUNK_SIZE = 60
    let totalSynced = 0
    const totalChunks = Math.ceil(items.length / CHUNK_SIZE)

    for (let chunkIdx = 0; chunkIdx < totalChunks; chunkIdx++) {
      const chunk = items.slice(chunkIdx * CHUNK_SIZE, (chunkIdx + 1) * CHUNK_SIZE)
      const pct = Math.round(((chunkIdx + 1) / totalChunks) * 100)
      if (onProgressText) {
        onProgressText(`Aktarılıyor: ${chunkIdx + 1}/${totalChunks} paket (%${pct})...`)
      }

      const res = await fetch(`${serverUrl}/api/v1/sync/instagram`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-savedlens-token': token,
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ bookmarks: chunk }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || `Paket ${chunkIdx + 1} aktarılamadı.`)
      }
      totalSynced += data.count || chunk.length
    }

    // Add newly uploaded shortcodes to local cache
    for (const it of items) {
      if (it.external_id) knownShortcodes.push(it.external_id)
      if (it.permalink) knownShortcodes.push(it.permalink)
    }
    libraryCount += totalSynced

    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({
        savedlens_known_shortcodes: knownShortcodes,
        savedlens_library_count: libraryCount,
      })
    }

    return totalSynced
  }

  // ── 2. Tab Inspection & Smart State Resolution ────────────────
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
    activeTab = tabs[0]
  } catch {}

  const currentUrl = activeTab?.url || ''
  const isSystemPage =
    !currentUrl ||
    currentUrl.startsWith('chrome://') ||
    currentUrl.startsWith('edge://') ||
    currentUrl.startsWith('about:') ||
    currentUrl.startsWith('chrome-extension://')

  const initialServerUrl = serverInput.value.trim().replace(/\/$/, '') || DEFAULT_SERVER
  const initialToken = tokenInput.value.trim()

  // Proactively fetch library status from server
  refreshKnownShortcodes(initialServerUrl, initialToken).then(() => {
    if (currentMode === 'saved_collection') {
      applySavedCollectionUI()
    }
  })

  function applySavedCollectionUI() {
    currentMode = 'saved_collection'
    if (libraryCount > 0) {
      statusEl.textContent = `📥 ${libraryCount} Arşivde`
      statusEl.className = 'status-badge active'
      contextIcon.textContent = '⚡'
      contextTitle.textContent = 'Instagram Kaydedilenler'
      contextSub.textContent = `Kütüphanenizde ${libraryCount} gönderi var. Akıllı tarama sadece yeni eklediklerinizi çeker.`

      btnIcon.textContent = '⚡'
      btnText.textContent = 'Yeni Gönderileri Tara (Akıllı)'

      if (btnAutoscroll) {
        btnAutoscroll.style.display = 'flex'
        autoscrollText.textContent = '🔄 Tüm Kütüphaneyi Yeniden Tara (Tam)'
      }
      if (syncModeHint) {
        syncModeHint.style.display = 'block'
      }
    } else {
      statusEl.textContent = '📥 İlk Kurulum'
      statusEl.className = 'status-badge'
      contextIcon.textContent = '📥'
      contextTitle.textContent = 'Instagram Kaydedilenler'
      contextSub.textContent = 'Kütüphanenizi oluşturmak için tüm kaydedilmiş gönderileriniz taranıp aktarılacak.'

      btnIcon.textContent = '📥'
      btnText.textContent = 'Tümünü Tara & Kütüphaneme Aktar'

      if (btnAutoscroll) {
        btnAutoscroll.style.display = 'none'
      }
      if (syncModeHint) {
        syncModeHint.style.display = 'none'
      }
    }
  }

  if (isSystemPage) {
    currentMode = 'system'
    statusEl.textContent = '⚙️ Sistem Sekmesi'
    statusEl.className = 'status-badge warning'
    contextIcon.textContent = '💡'
    contextTitle.textContent = 'SavedLens Kütüphaneniz'
    contextSub.textContent = 'Kaydetmek için bir web sayfasına veya Instagram sekmesine geçin.'
    btnIcon.textContent = '🚀'
    btnText.textContent = 'Kütüphaneyi Aç'
  } else if (currentUrl.includes('instagram.com')) {
    // Inspect DOM live state
    await ensureContentScript(activeTab.id)

    chrome.tabs.sendMessage(activeTab.id, { action: 'INSPECT_PAGE_STATE' }, (resp) => {
      if (chrome.runtime.lastError || !resp || !resp.success || !resp.state) {
        fallbackUrlResolution(currentUrl)
        return
      }

      const state = resp.state

      // ── Scenario A: Single Post (direct URL or opened modal dialog)
      if (state.type === 'single_post' && state.post) {
        currentMode = 'single_post'
        singlePostData = state.post
        const isReel = state.post.content.media_type === 'video'

        statusEl.textContent = isReel ? '🎬 Instagram Reel' : '📸 Instagram Gönderisi'
        statusEl.className = 'status-badge active'
        contextIcon.textContent = isReel ? '🎬' : '📸'
        contextTitle.textContent = `@${state.post.author.username}`
        contextSub.textContent =
          state.post.content.caption.length > 5
            ? `"${state.post.content.caption.slice(0, 60)}..."`
            : state.isModal
            ? 'Açık olan gönderi algılandı.'
            : 'Instagram Gönderisi'

        btnIcon.textContent = '✨'
        btnText.textContent = 'Bu Gönderiyi Kaydet'
        if (btnAutoscroll) btnAutoscroll.style.display = 'none'
        if (syncModeHint) syncModeHint.style.display = 'none'
      }
      // ── Scenario B: Saved Collection Grid (All Posts)
      else if (state.type === 'saved_collection') {
        applySavedCollectionUI()
      } else {
        fallbackUrlResolution(currentUrl)
      }
    })
  } else {
    // General Web Page
    currentMode = 'general'
    try {
      const domain = new URL(currentUrl).hostname.replace('www.', '')
      statusEl.textContent = '🌐 ' + domain.slice(0, 18)
      statusEl.className = 'status-badge active'
      contextIcon.textContent = '🌐'
      contextTitle.textContent = (activeTab.title || domain).slice(0, 45)
      contextSub.textContent = domain + ' sayfası kütüphanenize kaydedilecek.'
      btnIcon.textContent = '✨'
      btnText.textContent = 'Bu Sayfayı Kaydet'
    } catch {
      statusEl.textContent = '🌐 Web Sayfası'
      btnText.textContent = 'Kütüphaneme Kaydet'
    }
  }

  function fallbackUrlResolution(url) {
    if (url.includes('/saved')) {
      applySavedCollectionUI()
    } else {
      currentMode = 'single_post'
      statusEl.textContent = '📸 Instagram Gönderisi'
      statusEl.className = 'status-badge active'
      contextIcon.textContent = '📸'
      contextTitle.textContent = activeTab.title ? activeTab.title.split('•')[0].trim() : 'Instagram'
      contextSub.textContent = 'Gönderi SavedLens kütüphanenize kaydedilecek.'
      btnIcon.textContent = '✨'
      btnText.textContent = 'Bu Gönderiyi Kaydet'
      if (btnAutoscroll) btnAutoscroll.style.display = 'none'
      if (syncModeHint) syncModeHint.style.display = 'none'
    }
  }

  // ── 3. Explicit Full Scan Button Handler ("Tüm Kütüphaneyi Yeniden Tara") ──
  let isScanningInProgress = false

  btnAutoscroll?.addEventListener('click', async () => {
    if (isScanningInProgress) {
      autoscrollText.textContent = '⏹ Durduruluyor...'
      btnAutoscroll.disabled = true
      chrome.tabs.sendMessage(activeTab.id, { action: 'STOP_AUTO_SCROLL' })
      return
    }

    const serverUrl = serverInput.value.trim().replace(/\/$/, '') || DEFAULT_SERVER
    const token = tokenInput.value.trim()

    isScanningInProgress = true
    btnAutoscroll.disabled = false
    btnMain.disabled = true
    hideFeedback()
    autoscrollText.textContent = '⏹ Taramayı Durdur (Tıkla)'

    const progressListener = (msg) => {
      if (msg.action === 'SCROLL_PROGRESS') {
        autoscrollText.textContent = `⏹ Durdur (${msg.count} gönderi)...`
        statusEl.textContent = `📥 ${msg.count} Gönderi`
      }
    }
    chrome.runtime.onMessage.addListener(progressListener)

    try {
      // Force FULL scan mode
      chrome.tabs.sendMessage(
        activeTab.id,
        { action: 'AUTO_SCROLL_AND_EXTRACT', options: { mode: 'full' } },
        async (resp) => {
          isScanningInProgress = false
          chrome.runtime.onMessage.removeListener(progressListener)
          btnAutoscroll.disabled = false
          btnMain.disabled = false

          if (chrome.runtime.lastError || !resp || !resp.success) {
            autoscrollText.textContent = '🔄 Tam Tarama Başarısız'
            showFeedback('error', 'Tam tarama tamamlanamadı.')
            return
          }

          const items = resp.items || []
          autoscrollText.textContent = `✓ ${items.length} Gönderi Toplandı`
          statusEl.textContent = `📥 ${items.length} Gönderi`

          if (items.length === 0) {
            showFeedback('info', 'Sayfada kaydedilmiş gönderi bulunamadı.')
            return
          }

          try {
            btnMain.disabled = true
            btnAutoscroll.disabled = true
            btnText.textContent = 'Kütüphaneye aktarılıyor...'
            const synced = await uploadBookmarksChunked(items, serverUrl, token, (msg) => {
              btnText.textContent = msg
            })
            showFeedback('success', `✓ Toplam ${synced} gönderi kütüphanenize eşitlendi! 🎉`, `${serverUrl}/dashboard`)
            btnIcon.textContent = '✓'
            btnText.textContent = 'Tam Senkronize Edildi'
          } catch (uploadErr) {
            showFeedback('error', `Aktarım hatası: ${uploadErr.message}`)
          } finally {
            btnMain.disabled = false
            btnAutoscroll.disabled = false
          }
        }
      )
    } catch {
      isScanningInProgress = false
      chrome.runtime.onMessage.removeListener(progressListener)
      btnAutoscroll.disabled = false
      btnMain.disabled = false
    }
  })

  // ── 4. Main Action Button Handler (Smart Delta Sync / Single Post) ──
  btnMain.addEventListener('click', async () => {
    const serverUrl = serverInput.value.trim().replace(/\/$/, '') || DEFAULT_SERVER
    const token = tokenInput.value.trim()

    // Mode: System page -> Open Dashboard
    if (currentMode === 'system') {
      chrome.tabs.create({ url: `${serverUrl}/dashboard` })
      window.close()
      return
    }

    // Set Loading State
    btnMain.disabled = true
    if (btnAutoscroll) btnAutoscroll.disabled = true
    hideFeedback()
    const originalText = btnText.textContent
    const originalIcon = btnIcon.textContent
    btnIcon.innerHTML = '<div class="spinner"></div>'
    btnText.textContent = 'İşleniyor...'

    // ── Mode A: Single Instagram Post ──
    if (currentMode === 'single_post') {
      try {
        btnText.textContent = 'Gönderi kaydediliyor...'
        let postPayload = singlePostData

        if (!postPayload) {
          const metaRes = await new Promise((resolve) => {
            chrome.tabs.sendMessage(activeTab.id, { action: 'GET_PAGE_METADATA' }, (resp) => {
              if (chrome.runtime.lastError || !resp || !resp.data) resolve(null)
              else resolve(resp.data)
            })
          })
          if (metaRes) {
            postPayload = {
              platform: 'instagram',
              permalink: activeTab.url,
              author: { username: metaRes.author_username || 'instagram_creator' },
              content: {
                caption: metaRes.caption || metaRes.description || '',
                media_type: metaRes.media_type || 'image',
                media_urls: metaRes.thumbnail_url ? [metaRes.thumbnail_url] : [],
              },
            }
          }
        }

        const res = await fetch(`${serverUrl}/api/v1/sync/instagram`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'x-savedlens-token': token,
            'Authorization': token ? `Bearer ${token}` : '',
          },
          body: JSON.stringify({ bookmarks: [postPayload] }),
        })

        const data = await res.json()
        if (res.ok && data.success) {
          const authorDisplay = postPayload?.author?.username ? `@${postPayload.author.username}` : 'Gönderi'
          showFeedback('success', `✓ ${authorDisplay} başarıyla kaydedildi! 🎉`, `${serverUrl}/dashboard`)
          btnIcon.textContent = '✓'
          btnText.textContent = 'Kaydedildi'
        } else {
          showFeedback('error', data.error || 'Kaydetme başarısız oldu.')
          btnIcon.textContent = originalIcon
          btnText.textContent = originalText
        }
      } catch (err) {
        showFeedback('error', `Bağlantı hatası: ${err.message}`)
        btnIcon.textContent = originalIcon
        btnText.textContent = originalText
      } finally {
        btnMain.disabled = false
        if (btnAutoscroll) btnAutoscroll.disabled = false
      }
      return
    }

    // ── Mode B: Smart Incremental Delta Sync (Instagram Saved Collection) ──
    if (currentMode === 'saved_collection') {
      try {
        const isDeltaMode = libraryCount > 0

        btnText.textContent = isDeltaMode ? '⚡ Yeni gönderiler taranıyor...' : 'Tüm gönderiler taranıyor...'

        // Listen for live progress
        const progressListener = (msg) => {
          if (msg.action === 'SCROLL_PROGRESS') {
            if (isDeltaMode && typeof msg.newCount === 'number') {
              btnText.textContent = `⚡ Taranıyor (${msg.newCount} yeni)...`
            } else {
              btnText.textContent = `Taranıyor (${msg.count})...`
            }
          }
        }
        chrome.runtime.onMessage.addListener(progressListener)

        const scanOptions = {
          mode: isDeltaMode ? 'delta' : 'full',
          knownShortcodes,
          consecutiveKnownThreshold: 3,
        }

        const scanResp = await new Promise((resolve) => {
          chrome.tabs.sendMessage(
            activeTab.id,
            { action: 'AUTO_SCROLL_AND_EXTRACT', options: scanOptions },
            (resp) => {
              chrome.runtime.onMessage.removeListener(progressListener)
              if (chrome.runtime.lastError || !resp) resolve(null)
              else resolve(resp)
            }
          )
        })

        if (!scanResp || !scanResp.success) {
          showFeedback('error', 'Sayfa taranırken bir hata oluştu. Lütfen tekrar deneyin.')
          btnIcon.textContent = originalIcon
          btnText.textContent = originalText
          btnMain.disabled = false
          if (btnAutoscroll) btnAutoscroll.disabled = false
          return
        }

        // Determine which items to send
        const itemsToSync = isDeltaMode && Array.isArray(scanResp.newItems)
          ? scanResp.newItems
          : scanResp.items || []

        // If in delta mode and NO new items found:
        if (isDeltaMode && itemsToSync.length === 0) {
          showFeedback(
            'info',
            `✓ Kütüphaneniz zaten tamamen güncel! Yeni kaydedilen bir gönderi bulunamadı. ✨`,
            `${serverUrl}/dashboard`
          )
          btnIcon.textContent = '✓'
          btnText.textContent = 'Kütüphane Güncel ✓'
          btnMain.disabled = false
          if (btnAutoscroll) btnAutoscroll.disabled = false
          return
        }

        if (itemsToSync.length === 0) {
          showFeedback('info', 'Sayfada kaydedilmiş gönderi bulunamadı.')
          btnIcon.textContent = originalIcon
          btnText.textContent = originalText
          btnMain.disabled = false
          if (btnAutoscroll) btnAutoscroll.disabled = false
          return
        }

        btnText.textContent = `${itemsToSync.length} gönderi aktarılıyor...`

        const totalSynced = await uploadBookmarksChunked(itemsToSync, serverUrl, token, (msg) => {
          btnText.textContent = msg
        })

        showFeedback(
          'success',
          `✓ ${totalSynced} adet yeni gönderi SavedLens hesabınıza başarıyla aktarıldı! 🎉`,
          `${serverUrl}/dashboard`
        )
        btnIcon.textContent = '✓'
        btnText.textContent = 'Senkronizasyon Tamamlandı'
      } catch (fetchErr) {
        showFeedback('error', `Bağlantı hatası: Sunucuya erişilemedi (${fetchErr.message}).`)
        btnIcon.textContent = originalIcon
        btnText.textContent = originalText
      } finally {
        btnMain.disabled = false
        if (btnAutoscroll) btnAutoscroll.disabled = false
      }
      return
    }

    // ── Mode C: General Web Page Ingestion ────────────────────────
    try {
      btnText.textContent = 'Sayfa taranıyor...'
      let payload = {
        url: activeTab.url,
        title: activeTab.title || null,
      }

      try {
        const metaRes = await new Promise((resolve) => {
          chrome.tabs.sendMessage(activeTab.id, { action: 'GET_PAGE_METADATA' }, (resp) => {
            if (chrome.runtime.lastError || !resp || !resp.data) resolve(null)
            else resolve(resp.data)
          })
        })
        if (metaRes) {
          payload = { ...payload, ...metaRes, url: activeTab.url }
        }
      } catch {}

      btnText.textContent = 'Kütüphaneye kaydediliyor...'

      const res = await fetch(`${serverUrl}/api/ingest`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-savedlens-token': token,
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        const itemTitle = data.title || payload.title || 'İçerik'
        showFeedback(
          'success',
          `✓ &quot;${itemTitle.slice(0, 32)}...&quot; başarıyla kaydedildi!`,
          `${serverUrl}/dashboard`
        )
        btnIcon.textContent = '✓'
        btnText.textContent = 'Kaydedildi'
      } else {
        showFeedback('error', data.error || 'Kaydetme başarısız oldu.')
        btnIcon.textContent = originalIcon
        btnText.textContent = originalText
      }
    } catch (err) {
      showFeedback('error', `Sunucu bağlantı hatası: ${err.message}`)
      btnIcon.textContent = originalIcon
      btnText.textContent = originalText
    } finally {
      btnMain.disabled = false
      if (btnAutoscroll) btnAutoscroll.disabled = false
    }
  })
})
