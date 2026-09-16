/**
 * SavedLens Chrome Extension Popup Logic
 */

document.addEventListener('DOMContentLoaded', async () => {
  const statusEl = document.getElementById('tab-status')
  const serverInput = document.getElementById('server-url')
  const btnSync = document.getElementById('btn-sync')
  const btnTestSync = document.getElementById('btn-test-sync')
  const logBox = document.getElementById('log-box')
  const dashboardLink = document.getElementById('link-dashboard')
  const pillProd = document.getElementById('pill-prod')
  const pillLocal = document.getElementById('pill-local')

  // Load saved server URL from storage
  if (chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['savedlens_server_url'], (res) => {
      if (res.savedlens_server_url) {
        serverInput.value = res.savedlens_server_url
        dashboardLink.href = `${res.savedlens_server_url}/dashboard`
      }
    })
  }

  function setUrl(url) {
    serverInput.value = url
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ savedlens_server_url: url })
    }
    dashboardLink.href = `${url}/dashboard`
  }

  if (pillProd) {
    pillProd.addEventListener('click', () => setUrl('https://savedlens.vercel.app'))
  }
  if (pillLocal) {
    pillLocal.addEventListener('click', () => setUrl('http://localhost:3000'))
  }

  serverInput.addEventListener('change', () => {
    setUrl(serverInput.value.trim().replace(/\/$/, ''))
  })

  function log(msg) {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    logBox.textContent = `[${time}] ${msg}\n` + logBox.textContent
  }

  // Detect active tab
  let activeTab = null
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
    activeTab = tabs[0]
  } catch {
    // fallback if testing outside extension context
  }

  if (activeTab && activeTab.url && activeTab.url.includes('instagram.com')) {
    statusEl.textContent = 'Instagram Aktif'
    statusEl.classList.add('active')
    btnSync.disabled = false
    log('Instagram sekmesi bağlandı. Senkronizasyonu başlatabilirsiniz.')
  } else {
    statusEl.textContent = 'Instagram Dışı'
    log('Aktif sekme Instagram değil. Test butonunu kullanabilir veya instagram.com/saved sekmesine geçebilirsiniz.')
  }

  // Handle Instagram DOM extraction and sync
  btnSync.addEventListener('click', async () => {
    if (!activeTab || !activeTab.id) return
    btnSync.disabled = true
    log('Gönderiler taranıyor...')

    try {
      chrome.tabs.sendMessage(
        activeTab.id,
        { action: 'EXTRACT_SAVED_POSTS' },
        async (response) => {
          if (chrome.runtime.lastError || !response || !response.success) {
            log('Sayfa taranamadı. Lütfen Instagram sayfasını yenileyin.')
            btnSync.disabled = false
            return
          }

          const items = response.items || []
          if (items.length === 0) {
            log('Sayfada kaydedilen gönderi bulunamadı. Lütfen /saved/ sayfasına kaydırın.')
            btnSync.disabled = false
            return
          }

          log(`${items.length} adet gönderi bulundu. API'ye gönderiliyor...`)
          await sendPayloadToSavedLens(items)
          btnSync.disabled = false
        }
      )
    } catch (err) {
      log(`Hata: ${err.message}`)
      btnSync.disabled = false
    }
  })

  // Handle Test Sync (works anywhere, ideal for offline/online development)
  btnTestSync.addEventListener('click', async () => {
    btnTestSync.disabled = true
    log('Test yükü hazırlanıyor...')

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
          media_urls: [
            'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80',
          ],
        },
        saved_at: new Date().toISOString(),
      },
    ]

    await sendPayloadToSavedLens(testPayload)
    btnTestSync.disabled = false
  })

  async function sendPayloadToSavedLens(bookmarks) {
    const serverUrl = serverInput.value.trim().replace(/\/$/, '')
    const endpoint = `${serverUrl}/api/v1/sync/instagram`

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookmarks }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        log(`✓ Başarılı: ${data.count} gönderi aktarıldı! (${data.offline ? 'Çevrimdışı Mod' : 'Supabase'})`)
      } else {
        log(`✗ Sunucu yanıtı: ${data.error || 'Bilinmeyen hata'}`)
      }
    } catch (err) {
      log(`✗ Bağlantı hatası: ${err.message}. Server (${serverUrl}) erişilebilir mi?`)
    }
  }
})
