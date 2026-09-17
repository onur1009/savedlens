/**
 * SavedLens Chrome Extension Popup Controller (Manifest V3)
 * Provides seamless 1-click tab ingestion and Instagram bookmark extraction.
 */

const DEFAULT_SERVER = 'https://savedlens.vercel.app'
const DEFAULT_TOKEN = '6f5cfc25-3063-4084-a610-2ec60705fe00' // Verified owner account

document.addEventListener('DOMContentLoaded', async () => {
  const statusEl = document.getElementById('tab-status')
  const serverInput = document.getElementById('server-url')
  const tokenInput = document.getElementById('sync-token')
  const tokenStatus = document.getElementById('token-status')
  const btnSaveTab = document.getElementById('btn-save-tab')
  const btnSyncInstagram = document.getElementById('btn-sync-instagram')
  const btnTestSync = document.getElementById('btn-test-sync')
  const logBox = document.getElementById('log-box')
  const dashboardLink = document.getElementById('link-dashboard')
  const syncSettingsLink = document.getElementById('link-sync-settings')
  const pillProd = document.getElementById('pill-prod')
  const pillLocal = document.getElementById('pill-local')

  function log(msg) {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    logBox.textContent = `[${time}] ${msg}\n` + logBox.textContent
  }

  function updateLinks(url) {
    if (dashboardLink) dashboardLink.href = `${url}/dashboard`
    if (syncSettingsLink) syncSettingsLink.href = `${url}/dashboard/settings/sync`
  }

  // ── 1. Load configuration from chrome.storage ─────────────────
  if (chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['savedlens_server_url', 'savedlens_sync_token'], (res) => {
      if (res.savedlens_server_url) {
        serverInput.value = res.savedlens_server_url
        updateLinks(res.savedlens_server_url)
      } else {
        serverInput.value = DEFAULT_SERVER
      }

      if (res.savedlens_sync_token) {
        tokenInput.value = res.savedlens_sync_token
      } else {
        tokenInput.value = DEFAULT_TOKEN
      }

      tokenStatus.textContent = 'Bağlı ✓'
      tokenStatus.style.color = 'var(--success)'
    })
  }

  function saveConfig() {
    const serverUrl = serverInput.value.trim().replace(/\/$/, '')
    const token = tokenInput.value.trim() || DEFAULT_TOKEN
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({
        savedlens_server_url: serverUrl,
        savedlens_sync_token: token,
      })
    }
    updateLinks(serverUrl)
  }

  serverInput.addEventListener('change', saveConfig)
  tokenInput.addEventListener('input', saveConfig)

  if (pillProd) {
    pillProd.addEventListener('click', () => {
      serverInput.value = 'https://savedlens.vercel.app'
      pillProd.classList.add('active')
      pillLocal.classList.remove('active')
      saveConfig()
      log('Sunucu: Vercel (Canlı) seçildi.')
    })
  }

  if (pillLocal) {
    pillLocal.addEventListener('click', () => {
      serverInput.value = 'http://localhost:3000'
      pillLocal.classList.add('active')
      pillProd.classList.remove('active')
      saveConfig()
      log('Sunucu: Localhost (3000) seçildi.')
    })
  }

  // ── 2. Inspect active tab ─────────────────────────────────────
  let activeTab = null
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
    activeTab = tabs[0]
  } catch (err) {
    log('Sekme bilgisi alınamadı: ' + err.message)
  }

  const isSystemPage =
    !activeTab ||
    !activeTab.url ||
    activeTab.url.startsWith('chrome://') ||
    activeTab.url.startsWith('edge://') ||
    activeTab.url.startsWith('about:')

  if (activeTab && activeTab.url) {
    const url = activeTab.url
    if (url.includes('instagram.com')) {
      statusEl.textContent = '📸 Instagram'
      statusEl.classList.add('active')
      log('Instagram sekmesi aktif. "Instagram Kaydedilenleri Eşitle" veya bu sekmeyi kaydedebilirsiniz.')
    } else if (isSystemPage) {
      statusEl.textContent = '⚙️ Sistem Sekmesi'
      statusEl.classList.add('warning')
      btnSaveTab.disabled = true
      log('Sistem sekmesindesiniz. Web içeriği kaydetmek için bir web sitesine geçin veya aşağıdaki Test butonunu deneyin.')
    } else {
      try {
        const domain = new URL(url).hostname.replace('www.', '')
        statusEl.textContent = '🌐 ' + domain.slice(0, 16)
        statusEl.classList.add('active')
        log(`Aktif sekme: ${domain}. "Aktif Sekmeyi Kaydet" ile yapay zeka analizli arşivleyebilirsiniz.`)
      } catch {
        statusEl.textContent = '🌐 Web Sayfası'
      }
    }
  }

  // ── Helper: Inject content script safely ──────────────────────
  async function ensureContentScriptInjected(tabId) {
    try {
      const pingRes = await new Promise((resolve) => {
        chrome.tabs.sendMessage(tabId, { action: 'PING' }, (resp) => {
          if (chrome.runtime.lastError || !resp) resolve(null)
          else resolve(resp)
        })
      })

      if (pingRes && pingRes.status === 'OK') {
        return true
      }

      if (chrome.scripting && chrome.scripting.executeScript) {
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ['content.js'],
        })
        return true
      }
    } catch (err) {
      console.warn('Script injection notice:', err)
    }
    return false
  }

  // ── 3. Action: Save Active Tab via /api/ingest ────────────────
  btnSaveTab.addEventListener('click', async () => {
    if (!activeTab || !activeTab.url || isSystemPage) {
      log('⚠️ Lütfen kaydetmek istediğiniz bir web sayfasına veya sosyal medya sekmesine geçin.')
      return
    }

    const serverUrl = serverInput.value.trim().replace(/\/$/, '') || DEFAULT_SERVER
    const token = tokenInput.value.trim() || DEFAULT_TOKEN

    btnSaveTab.disabled = true
    log(`Sayfa taranıyor: ${activeTab.title || activeTab.url.slice(0, 40)}...`)

    let richPayload = {
      url: activeTab.url,
      title: activeTab.title || null,
    }

    // Try extracting rich DOM metadata (especially for Instagram posts & reels)
    try {
      const injected = await ensureContentScriptInjected(activeTab.id)
      if (injected) {
        const metaRes = await new Promise((resolve) => {
          chrome.tabs.sendMessage(activeTab.id, { action: 'GET_PAGE_METADATA' }, (resp) => {
            if (chrome.runtime.lastError || !resp || !resp.data) resolve(null)
            else resolve(resp.data)
          })
        })

        if (metaRes) {
          richPayload = {
            ...richPayload,
            ...metaRes,
            url: activeTab.url, // ensure url is intact
          }
          if (metaRes.author_username) {
            log(`İçerik üreticisi: @${metaRes.author_username} tespit edildi.`)
          }
        }
      }
    } catch (err) {
      console.warn('Metadata extraction notice:', err)
    }

    try {
      const res = await fetch(`${serverUrl}/api/ingest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-savedlens-token': token,
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(richPayload),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        log(`✓ Başarıyla Kaydedildi: "${data.title || richPayload.title || 'İçerik'}"`)
        log('Yapay zeka özeti, etiketler ve yüksek çözünürlüklü medya kütüphanenize eklendi! 🎉')
      } else {
        log(`✗ Hata: ${data.error || 'Kaydetme başarısız oldu'}`)
      }
    } catch (err) {
      log(`✗ Bağlantı hatası: ${err.message}. Sunucuya erişilemiyor olabilir.`)
    } finally {
      btnSaveTab.disabled = false
    }
  })

  // ── 4. Action: Sync Instagram Saved Posts from DOM ────────────
  btnSyncInstagram.addEventListener('click', async () => {
    const serverUrl = serverInput.value.trim().replace(/\/$/, '') || DEFAULT_SERVER
    const token = tokenInput.value.trim() || DEFAULT_TOKEN

    if (!activeTab || !activeTab.url || !activeTab.url.includes('instagram.com')) {
      log('⚠️ Bu işlem için lütfen önce Instagram sekmesine (örn: instagram.com/saved) geçin.')
      return
    }

    btnSyncInstagram.disabled = true
    log('Instagram kaydedilen gönderileri taranıyor...')

    try {
      await ensureContentScriptInjected(activeTab.id)

      chrome.tabs.sendMessage(
        activeTab.id,
        { action: 'EXTRACT_SAVED_POSTS' },
        async (response) => {
          if (chrome.runtime.lastError || !response || !response.success) {
            log('Sayfa taranamadı. Lütfen Instagram sayfasını yenileyip tekrar deneyin.')
            btnSyncInstagram.disabled = false
            return
          }

          const items = response.items || []
          if (items.length === 0) {
            log('Sayfada kaydedilen gönderi bulunamadı. Lütfen instagram.com/saved sayfasına kaydırın veya bir gönderi açın.')
            btnSyncInstagram.disabled = false
            return
          }

          log(`${items.length} adet gönderi bulundu. API'ye gönderiliyor...`)
          await sendPayloadToApi(serverUrl, token, items)
          btnSyncInstagram.disabled = false
        }
      )
    } catch (err) {
      log(`Hata: ${err.message}`)
      btnSyncInstagram.disabled = false
    }
  })

  // ── 5. Action: Test Sync (Verifies End-to-End API Connection) ─
  btnTestSync.addEventListener('click', async () => {
    const serverUrl = serverInput.value.trim().replace(/\/$/, '') || DEFAULT_SERVER
    const token = tokenInput.value.trim() || DEFAULT_TOKEN

    btnTestSync.disabled = true
    log(`Test bağlantısı gönderiliyor (${serverUrl})...`)

    const testPayload = [
      {
        platform: 'instagram',
        external_id: `ext_${Date.now()}`,
        permalink: `https://www.instagram.com/p/test_${Date.now().toString(36)}/`,
        author: {
          username: 'tasarim_rehberi',
          full_name: 'Tasarım Rehberi',
          avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120',
        },
        content: {
          caption: "2026 UI & UX Trendleri — Chrome Eklentisi Canlı Senkronizasyon Testi! Minimalist tasarım ve akıllı arşivleme.",
          media_type: 'carousel',
          media_urls: ['https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80'],
        },
        saved_at: new Date().toISOString(),
      },
    ]

    await sendPayloadToApi(serverUrl, token, testPayload)
    btnTestSync.disabled = false
  })

  async function sendPayloadToApi(serverUrl, token, bookmarks) {
    const endpoint = `${serverUrl}/api/v1/sync/instagram`

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-savedlens-token': token,
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ bookmarks }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        log(`✓ BAŞARILI: ${data.count} gönderi SavedLens hesabınıza aktarıldı! 🎉`)
        log('Kütüphanenizi açarak yeni eklenen gönderiyi görebilirsiniz.')
      } else {
        log(`✗ Sunucu yanıtı: ${data.error || 'Bilinmeyen hata'}`)
      }
    } catch (err) {
      log(`✗ Bağlantı hatası: ${err.message}. ${serverUrl} erişilebilir mi?`)
    }
  }
})
