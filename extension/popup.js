/**
 * SavedLens Chrome Extension Popup Controller
 * V2.0 Manifest V3
 */

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

  // 1. Load saved config from chrome.storage
  if (chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['savedlens_server_url', 'savedlens_sync_token'], (res) => {
      if (res.savedlens_server_url) {
        serverInput.value = res.savedlens_server_url
        updateLinks(res.savedlens_server_url)
      }
      if (res.savedlens_sync_token) {
        tokenInput.value = res.savedlens_sync_token
        tokenStatus.textContent = 'Token Kayıtlı ✓'
        tokenStatus.style.color = 'var(--success)'
      }
    })
  }

  function updateLinks(url) {
    dashboardLink.href = `${url}/dashboard`
    syncSettingsLink.href = `${url}/dashboard/settings/sync`
  }

  function saveConfig() {
    const serverUrl = serverInput.value.trim().replace(/\/$/, '')
    const token = tokenInput.value.trim()
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({
        savedlens_server_url: serverUrl,
        savedlens_sync_token: token,
      })
    }
    if (token) {
      tokenStatus.textContent = 'Token Kayıtlı ✓'
      tokenStatus.style.color = 'var(--success)'
    } else {
      tokenStatus.textContent = 'Eksik Token'
      tokenStatus.style.color = 'var(--amber)'
    }
    updateLinks(serverUrl)
  }

  serverInput.addEventListener('change', saveConfig)
  tokenInput.addEventListener('input', saveConfig)

  if (pillProd) {
    pillProd.addEventListener('click', () => {
      serverInput.value = 'https://savedlens.vercel.app'
      saveConfig()
    })
  }
  if (pillLocal) {
    pillLocal.addEventListener('click', () => {
      serverInput.value = 'http://localhost:3000'
      saveConfig()
    })
  }

  // 2. Detect active tab
  let activeTab = null
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
    activeTab = tabs[0]
  } catch (err) {
    log('Sekme bilgisi alınamadı: ' + err.message)
  }

  if (activeTab && activeTab.url) {
    if (activeTab.url.includes('instagram.com')) {
      statusEl.textContent = 'Instagram'
      statusEl.classList.add('active')
      btnSyncInstagram.disabled = false
      log('Instagram sekmesi tespit edildi. Kaydedilenleri eşitleyebilir veya aktif sekmeyi ekleyebilirsiniz.')
    } else {
      const domain = new URL(activeTab.url).hostname.replace('www.', '')
      statusEl.textContent = domain.slice(0, 16)
      log(`Aktif sekme: ${domain}. "Aktif Sekmeyi Kaydet" ile yapay zeka analizli olarak arşivleyebilirsiniz.`)
    }
  }

  // 3. Action: Save Active Tab via /api/ingest
  btnSaveTab.addEventListener('click', async () => {
    if (!activeTab || !activeTab.url) {
      log('Aktif sekme URL\'si bulunamadı.')
      return
    }

    const serverUrl = serverInput.value.trim().replace(/\/$/, '')
    const token = tokenInput.value.trim()
    btnSaveTab.disabled = true
    log(`Sayfa taranıyor: ${activeTab.url.slice(0, 45)}...`)

    try {
      const headers = { 'Content-Type': 'application/json' }
      if (token) {
        headers['x-savedlens-token'] = token
        headers['Authorization'] = `Bearer ${token}`
      }

      const res = await fetch(`${serverUrl}/api/ingest`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ url: activeTab.url }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        log(`✓ Kaydedildi: "${data.title || activeTab.title || 'İçerik'}"`)
        log('Yapay zeka özeti ve etiketler kütüphanenize eklendi!')
      } else {
        log(`✗ Hata: ${data.error || 'Kaydetme başarısız oldu'}`)
      }
    } catch (err) {
      log(`✗ Bağlantı hatası: ${err.message}. Sunucu erişilebilir mi?`)
    } finally {
      btnSaveTab.disabled = false
    }
  })

  // 4. Action: Sync Instagram Saved Posts from DOM
  btnSyncInstagram.addEventListener('click', async () => {
    if (!activeTab || !activeTab.id) return
    btnSyncInstagram.disabled = true
    log('Instagram gönderileri taranıyor...')

    try {
      chrome.tabs.sendMessage(
        activeTab.id,
        { action: 'EXTRACT_SAVED_POSTS' },
        async (response) => {
          if (chrome.runtime.lastError || !response || !response.success) {
            log('Sayfa taranamadı. Lütfen Instagram sayfasını yenileyin veya /saved/ sayfasına geçin.')
            btnSyncInstagram.disabled = false
            return
          }

          const items = response.items || []
          if (items.length === 0) {
            log('Sayfada kaydedilen gönderi bulunamadı. Lütfen instagram.com/saved sayfasına kaydırın.')
            btnSyncInstagram.disabled = false
            return
          }

          log(`${items.length} adet gönderi bulundu. API'ye gönderiliyor...`)
          await sendInstagramPayload(items)
          btnSyncInstagram.disabled = false
        }
      )
    } catch (err) {
      log(`Hata: ${err.message}`)
      btnSyncInstagram.disabled = false
    }
  })

  // 5. Action: Test Sync
  btnTestSync.addEventListener('click', async () => {
    btnTestSync.disabled = true
    log('Test yükü gönderiliyor...')

    const testPayload = [
      {
        platform: 'instagram',
        external_id: `ext_${Date.now()}`,
        permalink: `https://www.instagram.com/p/test_${Date.now().toString(36)}/`,
        author: {
          username: 'tasarim_gunlugu',
          full_name: 'Tasarım Günlüğü',
          avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120',
        },
        content: {
          caption: "2026'nın En İyi UI Tasarım Trendleri! Minimalist tipografi ve cam efektleri.",
          media_type: 'carousel',
          media_urls: ['https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80'],
        },
        saved_at: new Date().toISOString(),
      },
    ]

    await sendInstagramPayload(testPayload)
    btnTestSync.disabled = false
  })

  async function sendInstagramPayload(bookmarks) {
    const serverUrl = serverInput.value.trim().replace(/\/$/, '')
    const token = tokenInput.value.trim()
    const endpoint = `${serverUrl}/api/v1/sync/instagram`

    try {
      const headers = { 'Content-Type': 'application/json' }
      if (token) {
        headers['x-savedlens-token'] = token
        headers['Authorization'] = `Bearer ${token}`
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({ bookmarks }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        log(`✓ Başarılı: ${data.count} gönderi SavedLens'e aktarıldı!`)
      } else {
        log(`✗ Sunucu yanıtı: ${data.error || 'Bilinmeyen hata'}`)
      }
    } catch (err) {
      log(`✗ Bağlantı hatası: ${err.message}`)
    }
  }
})
