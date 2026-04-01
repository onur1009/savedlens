import { useEffect, useState, useRef } from 'react'
import { supabase } from '../supabase'

import logo from '../assets/logo.png'

const PAL = ['#c084fc','#f472b6','#2dd4bf','#fbbf24','#4ade80','#f87171','#60a5fa','#a78bfa','#34d399','#fb923c']

export default function Dashboard({ session }) {
  const [items, setItems] = useState([])
  const [cats, setCats] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('all')
  const [currentCat, setCurrentCat] = useState(null)
  const [gv, setGv] = useState('grid')
  const [search, setSearch] = useState('')
  const [tf, setTf] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [tab, setTab] = useState('link')
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY || ''
  const apifyKey = import.meta.env.VITE_APIFY_KEY || ''
  const [form, setForm] = useState({ url:'', title:'', desc:'', thumb:'', type:'post', cat:'', tags:'' })
  const [catInput, setCatInput] = useState('')
  const [toast, setToast] = useState({ show:false, msg:'', type:'ok' })
  const [prevData, setPrevData] = useState(null)
  const [prevLoading, setPrevLoading] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  
  const [profile, setProfile] = useState(null)
  const [showProfile, setShowProfile] = useState(false)
  const [avatarInput, setAvatarInput] = useState('')
  const [showAdmin, setShowAdmin] = useState(false)
  const [allUsers, setAllUsers] = useState([])
  
  const [showCatModal, setShowCatModal] = useState(false)
  const [tempNote, setTempNote] = useState('')
  const [chatObj, setChatObj] = useState({ open:false, item:null, messages:[], input:'', loading:false })
  const chatEndRef = useRef(null)
  const detailChatEndRef = useRef(null)
  const catInputRef = useRef(null)
  const pvtRef = useRef(null)
  const [isOnline, setIsOnline] = useState(window.navigator.onLine)
  const [syncing, setSyncing] = useState(false)
  const [profForm, setProfForm] = useState({ username: '', bio: '', avatar: '' })

  useEffect(() => {
    if (profile) {
      setProfForm({
        username: profile.username || '',
        bio: profile.bio || '',
        avatar: profile.avatar_url || ''
      })
    }
  }, [profile])

  // LocalStorage Helpers
  const getLocal = (key) => {
    const d = localStorage.getItem(`sl_${key}_${session.user.id}`)
    return d ? JSON.parse(d) : null
  }
  const setLocal = (key, val) => {
    localStorage.setItem(`sl_${key}_${session.user.id}`, JSON.stringify(val))
  }
  const getQueue = () => {
    const q = localStorage.getItem(`sl_sync_queue_${session.user.id}`)
    return q ? JSON.parse(q) : []
  }
  const addToQueue = (action, table, data) => {
    const q = getQueue()
    q.push({ id: Date.now(), action, table, data })
    localStorage.setItem(`sl_sync_queue_${session.user.id}`, JSON.stringify(q))
  }

  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); triggerSync(); }
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' })
  }, [chatObj.messages, chatObj.open])

  useEffect(() => { loadData() }, [])

  // ESC closes detail popup
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') setSelectedItem(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  async function loadData() {
    setLoading(true)
    const uid = session.user.id
    
    // 1. Load from Local First (Instant UI)
    const localCats = getLocal('categories')
    const localItems = getLocal('items')
    const localProf = getLocal('profile')
    
    if (localCats) setCats(localCats)
    if (localItems) setItems(localItems)
    if (localProf) setProfile(localProf)
    
    // If we have local data, we can stop loading early for better UX
    if (localCats && localItems) setLoading(false)

    try {
      // 2. Fetch from Supabase (Background Sync)
      const [{ data: c, error: ce }, { data: i, error: ie }, { data: p, error: pe }] = await Promise.all([
        supabase.from('categories').select('*').eq('user_id', uid).order('created_at'),
        supabase.from('items').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').eq('id', uid).single()
      ])
      
      if (ce || ie || pe) {
        const firstErr = ce?.message || ie?.message || pe?.message
        console.warn('Supabase Sync Fetch Failed:', { ce, ie, pe })
        if (firstErr?.includes('policy')) {
          showToast('Senkronizasyon Hatası: RLS Politikası hatası (403). Veritabanı izinlerinizi kontrol edin.', 'err')
        }
      }

      if (!ce && c) { setCats(c); setLocal('categories', c); }
      if (!ie && i) { setItems(i); setLocal('items', i); }
      if (!pe && p) {
        setProfile(p);
        setLocal('profile', p);
        if (p.is_admin) {
          const { data: all } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
          if (all) setAllUsers(all)
        }
      }
      
      // Trigger sync for any pending offline changes
      triggerSync()
      
    } catch (err) {
      console.error('Sync Error:', err)
      if (!localCats) showToast('Bağlantı hatası ve yerel veri bulunamadı.', 'err')
    } finally {
      setLoading(false)
    }
  }

  async function triggerSync() {
    if (!window.navigator.onLine || syncing) return
    const q = getQueue()
    if (q.length === 0) return
    
    setSyncing(true)
    const newQueue = [...q]
    
    for (const item of q) {
      try {
        let err = null
        if (item.action === 'INSERT') {
          const { error } = await supabase.from(item.table).insert(item.data)
          err = error
        } else if (item.action === 'UPDATE') {
          const { error } = await supabase.from(item.table).update(item.data).eq('id', item.data.id)
          err = error
        } else if (item.action === 'DELETE') {
          const { error } = await supabase.from(item.table).delete().eq('id', item.id_to_delete || item.data.id)
          err = error
        }
        
        if (!err) {
          const idx = newQueue.findIndex(x => x.id === item.id)
          if (idx > -1) newQueue.splice(idx, 1)
        }
      } catch (e) {
        console.error('Sync item error:', e)
      }
    }
    
    localStorage.setItem(`sl_sync_queue_${session.user.id}`, JSON.stringify(newQueue))
    setSyncing(false)
    if (newQueue.length === 0) showToast('Tüm veriler bulutla senkronize edildi.', 'ok')
    else showToast(`${q.length - newQueue.length} işlem senkronize edildi, ${newQueue.length} bekliyor.`, 'warn')
  }

  function showToast(msg, type = 'ok') {
    setToast({ show: true, msg, type })
    setTimeout(() => setToast(t => ({ ...t, show: false })), 3500)
  }

  async function addCat() {
    const name = catInput.trim()
    if (!name) return
    const newCat = {
      id: `local_${Date.now()}`,
      user_id: session.user.id,
      name,
      color: PAL[cats.length % PAL.length],
      created_at: new Date().toISOString()
    }
    
    // Optimistic Update
    const updatedCats = [...cats, newCat]
    setCats(updatedCats)
    setLocal('categories', updatedCats)
    setCatInput('')
    showToast('Kategori eklendi!', 'ok')
    
    // Sync
    const { data, error } = await supabase.from('categories').insert({
      user_id: session.user.id,
      name: newCat.name,
      color: newCat.color
    }).select().single()
    
    if (error) {
      addToQueue('INSERT', 'categories', { user_id: session.user.id, name: newCat.name, color: newCat.color })
    } else if (data) {
      // Replace local ID with real DB ID
      const finalCats = updatedCats.map(c => c.id === newCat.id ? data : c)
      setCats(finalCats)
      setLocal('categories', finalCats)
    }
  }

  async function delCat(id) {
    const updatedCats = cats.filter(x => x.id !== id)
    setCats(updatedCats)
    setLocal('categories', updatedCats)
    if (currentCat === id) setCurrentCat(null)
    
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (error) addToQueue('DELETE', 'categories', { id })
  }

  async function toggleFav(id, val) {
    const updatedItems = items.map(x => x.id === id ? { ...x, is_favorite: !val } : x)
    setItems(updatedItems)
    setLocal('items', updatedItems)
    if (selectedItem?.id === id) setSelectedItem(s => ({ ...s, is_favorite: !val }))
    
    const { error } = await supabase.from('items').update({ is_favorite: !val }).eq('id', id)
    if (error) addToQueue('UPDATE', 'items', { id, is_favorite: !val })
  }

  async function delItem(id) {
    if (!window.confirm('Bu içeriği silmek istiyor musun?')) return
    const updatedItems = items.filter(x => x.id !== id)
    setItems(updatedItems)
    setLocal('items', updatedItems)
    if (selectedItem?.id === id) setSelectedItem(null)
    showToast('Silindi', 'ok')
    
    const { error } = await supabase.from('items').delete().eq('id', id)
    if (error) addToQueue('DELETE', 'items', { id })
  }

  async function updateNote(id, note) {
    const updatedItems = items.map(x => x.id === id ? { ...x, notes: note } : x)
    setItems(updatedItems)
    setLocal('items', updatedItems)
    if (selectedItem?.id === id) setSelectedItem(s => ({ ...s, notes: note }))
    
    const { error } = await supabase.from('items').update({ notes: note }).eq('id', id)
    if (error) {
      addToQueue('UPDATE', 'items', { id, notes: note })
    } else {
      showToast('Not kaydedildi!', 'ok')
    }
  }

  function schedulePreview(url) {
    clearTimeout(pvtRef.current)
    pvtRef.current = setTimeout(() => previewURL(url), 800)
  }

  async function previewURL(url) {
    if (!url || !url.includes('instagram.com')) { setPrevData(null); return }
    const m = url.match(/\/(p|reel|tv)\/([A-Za-z0-9_-]+)/)
    if (!m) return
    const sc = m[2]
    const type = m[1] === 'reel' ? 'reel' : 'post'
    setPrevLoading(true)
    setForm(f => ({ ...f, type, title: `Instagram ${type === 'reel' ? 'Reels' : 'Gönderi'}` }))
    // Real-time preview data for Add Modal
    setPrevData({ title: `Instagram ${type === 'reel' ? 'Reels' : 'Gönderi'}`, type, thumb: `https://www.instagram.com/p/${sc}/media/?size=m` })
    try {
      // 1. Ücretsiz noembed (Sadece başlık ve resim)
      const r = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(url)}&format=json`)
      const d = await r.json()
      if (d.title) setForm(f => ({ ...f, title: d.title }))
      let thumb = d.thumbnail_url || `https://www.instagram.com/p/${sc}/media/?size=m`
      setForm(f => ({ ...f, thumb }))
      setPrevData({ title: d.title || 'Instagram İçeriği', author: d.author_name, type, thumb })
    } catch (e) {
      setForm(f => ({ ...f, thumb: `https://www.instagram.com/p/${sc}/media/?size=m` }))
      setPrevData({ title: 'Instagram İçeriği', type })
    }

    // 2. Apify Key varsa, gerçek açıklamayı çek!
    if (apifyKey) {
      try {
        showToast('Apify başlatıldı, Instagram verisi çekiliyor (10-20sn sürebilir)...', 'ok')
        const rr = await fetch(`https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items?token=${apifyKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ directUrls: [url], resultsType: 'details' })
        })
        const rd = await rr.json()
        if (!rr.ok) {
          showToast('Apify Hatası: ' + (rd.error?.message || 'Yetkisiz erişim'), 'err')
        } else {
          // Apify veriyi array olarak döner
          const itemData = Array.isArray(rd) ? rd[0] : null
          const caption = itemData?.caption || ''
          
          if (caption) {
            setForm(f => ({ ...f, desc: caption }))
            showToast('Açıklama Apify ile otomatik çekildi!', 'ok')
          } else {
            showToast('Apify: Gönderi bulundu ancak açıklama (caption) boş.', 'warn')
          }
        }
      } catch (apiErr) {
        console.error("Apify hatası:", apiErr)
        showToast('Apify bağlantı hatası!', 'err')
      }
    } else {
      // apifyKey yoksa uyarı ver
      showToast('Otomatik açıklama çekmek için VITE_APIFY_KEY gerekiyor.', 'warn')
    }

    setPrevLoading(false)
  }

  async function saveItem() {
    if (!form.title && !form.url) { showToast('Başlık veya URL girin', 'err'); return }
    
    // Mükerrer Kontrolü (Duplicate Check)
    const urlMatch = form.url.match(/\/(p|reel|tv)\/([A-Za-z0-9_-]+)/)
    const shortcode = urlMatch ? urlMatch[2] : null
    const existing = items.find(i => {
      if (shortcode && i.instagram_url) return i.instagram_url.includes(shortcode)
      return i.instagram_url === form.url
    })
    
    if (existing) {
      showToast('Bu içeriği daha önce zaten eklemişsin!', 'warn')
      return
    }

    const newItem = {
      id: `local_${Date.now()}`,
      user_id: session.user.id,
      title: form.title || 'Instagram İçeriği',
      description: form.desc,
      thumbnail_url: form.thumb,
      instagram_url: form.url,
      type: form.type,
      category_id: form.cat || null,
      tags: form.tags,
      is_favorite: false,
      created_at: new Date().toISOString()
    }

    const updatedItems = [newItem, ...items]
    setItems(updatedItems)
    setLocal('items', updatedItems)
    setShowModal(false)
    setForm({ url:'', title:'', desc:'', thumb:'', type:'post', cat:'', tags:'' })
    setPrevData(null)
    showToast('İçerik eklendi!', 'ok')

    const { data, error } = await supabase.from('items').insert({
      user_id: session.user.id,
      title: newItem.title,
      description: newItem.description,
      thumbnail_url: newItem.thumbnail_url,
      instagram_url: newItem.instagram_url,
      type: newItem.type,
      category_id: newItem.category_id,
      tags: newItem.tags,
      is_favorite: false
    }).select().single()

    if (error) {
      addToQueue('INSERT', 'items', { ...newItem, id: undefined })
    } else if (data) {
      const finalItems = updatedItems.map(i => i.id === newItem.id ? data : i)
      setItems(finalItems)
      setLocal('items', finalItems)
    }
  }

  // AI Chat Handler
  async function handleSendChatMessage() {
    const { input, item, messages } = chatObj
    if (!input.trim() || !apiKey) return
    const userMsg = { role: 'user', content: input.trim() }
    setChatObj(c => ({ ...c, messages: [...c.messages, userMsg], input: '', loading: true }))
    
    const cat = cats.find(c => c.id === item?.category_id)
    const sysPrompt = `Sen harika bir bakış açısına sahip, yetenekli bir asistansın. Kullanıcı sana aşağıdaki kaydettiği Instagram gönderisi ile ilgili sorular soracak. 
Gönderi Başlığı: ${item?.title || 'Yok'}
Açıklama: ${item?.description || 'Yok'}
Tür: ${item?.type || 'Yok'}
Kategori: ${cat?.name || 'Yok'}
Etiketler: ${item?.tags || 'Yok'}
Kullanıcının sorusunu bu bağlama göre, doğrudan, gereksiz laf kalabalığı yapmadan harika bir Türkçe ile yanıtla.`

    try {
      const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': window.location.origin
        },
        body: JSON.stringify({
          model: 'openrouter/free',
          max_tokens: 800,
          messages: [{ role: 'system', content: sysPrompt }, ...messages, userMsg]
        })
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error?.message || 'API Hatası')
      const reply = d.choices?.[0]?.message?.content || 'Yanıt alınamadı.'
      setChatObj(c => ({ ...c, messages: [...c.messages, { role: 'assistant', content: reply }], loading: false }))
    } catch (e) {
      showToast('AI hatası: ' + e.message, 'err')
      setChatObj(c => ({ ...c, loading: false }))
    }
  }

  async function handleUpdateProfile() {
    const updatedProf = { ...profile, ...profForm, username: profForm.username, bio: profForm.bio, avatar_url: profForm.avatar }
    setProfile(updatedProf)
    setLocal('profile', updatedProf)
    showToast('Profil güncellendi (Yerel)', 'ok')

    const { error } = await supabase.from('profiles').update({ 
      username: profForm.username, 
      bio: profForm.bio, 
      avatar_url: profForm.avatar 
    }).eq('id', session.user.id)

    if (error) {
      addToQueue('UPDATE', 'profiles', { id: session.user.id, ...profForm, avatar_url: profForm.avatar })
    } else {
      showToast('Profil bulutla eşitlendi', 'ok')
    }
  }

  function filtered() {
    let it = [...items]
    if (view === 'reels') it = it.filter(i => i.type === 'reel')
    else if (view === 'posts') it = it.filter(i => i.type !== 'reel')
    else if (view === 'fav') it = it.filter(i => i.is_favorite)
    if (currentCat) it = it.filter(i => i.category_id === currentCat)
    if (tf === 'nocat') it = it.filter(i => !i.category_id)
    else if (tf === 'noai') it = it.filter(i => !i.ai_summary)
    else if (tf !== 'all') it = it.filter(i => i.type === tf)
    if (search) it = it.filter(i =>
      (i.title + ' ' + (i.description || '') + ' ' + (i.tags || '')).toLowerCase().includes(search.toLowerCase())
    )
    return it
  }

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#0a0a0f', color:'#888', fontFamily:'Manrope, sans-serif' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ width:12, height:12, borderRadius:'50%', background:'#6366f1', animation:'pulse 1.5s infinite' }} />
        <span style={{ fontWeight:700, letterSpacing:'0.05em' }}>Y\u00fckleniyor...</span>
      </div>
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.9); } }`}</style>
    </div>
  )

  const it = filtered()

  return (
    <div className="flex min-h-screen bg-background font-body text-on-surface">
      {/* SideNavBar */}
      <aside className="fixed left-0 top-0 h-full w-72 bg-background border-r border-white/5 flex flex-col z-40 hidden md:flex pt-8 pb-8">
        <div className="px-8 mb-10 flex items-center">
          <img src={logo} alt="SavedLens" className="h-10 w-auto object-contain" />
        </div>
        
        <nav className="flex-1 px-4 space-y-8 overflow-y-auto no-scrollbar">
          {/* GENEL SECTION */}
          <div>
            <p className="text-[10px] font-bold tracking-[0.2em] text-slate-500 mb-4 px-4 uppercase">Genel</p>
            <div className="flex flex-col gap-1">
                {[
                  { id: 'all', label: 'Hafıza Akışı', icon: 'data_thresholding', count: items.length },
                  { id: 'reels', label: 'Reels', icon: 'movie', count: items.filter(i => i.type === 'reel').length },
                  { id: 'posts', label: 'Gönderiler', icon: 'image', count: items.filter(i => i.type === 'post').length },
                  { id: 'fav', label: 'Favoriler', icon: 'star', count: items.filter(i => i.is_favorite).length },
                  { id: 'settings', label: 'Ayarlar', icon: 'settings', count: null },
                ].map(v => (
                  <button
                    key={v.id}
                    onClick={() => { setView(v.id); setCurrentCat(null); setTf('all'); }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                      view === v.id && !currentCat 
                        ? 'bg-white/5 text-white border-l-4 border-primary' 
                        : 'text-slate-500 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span className={`material-symbols-outlined text-xl ${view === v.id && !currentCat ? 'fill-1' : ''}`}>{v.icon}</span>
                    <span className="flex-1 text-left font-bold tracking-tight">{v.label}</span>
                    {v.count !== null && <span className="text-[10px] font-black bg-white/5 px-2 py-0.5 rounded-full text-slate-500">{v.count}</span>}
                  </button>
                ))}
            </div>
          </div>

          {/* KATEGORÄ°LER SECTION */}
          <div>
            <p className="text-[10px] font-bold tracking-[0.2em] text-slate-500 mb-4 px-4 uppercase">Kategoriler</p>
            <div className="flex flex-col gap-1">
              {cats.map((c, idx) => (
                <button
                  key={c.id}
                  onClick={() => { setCurrentCat(c.id); setView(null); }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${
                    currentCat === c.id 
                      ? 'bg-white/5 text-white border-l-4' 
                      : 'text-slate-500 hover:text-white hover:bg-white/5'
                  }`}
                  style={currentCat === c.id ? { borderLeftColor: c.color } : {}}
                >
                  <span className="material-symbols-outlined text-xl" style={{ color: c.color }}>folder</span>
                  <span className="flex-1 text-left truncate">{c.name}</span>
                  <span className="text-[10px] opacity-50">{items.filter(i => i.category_id === c.id).length}</span>
                  <span 
                    onClick={(e) => { e.stopPropagation(); delCat(c.id); }}
                    className="material-symbols-outlined text-sm opacity-0 group-hover:opacity-100 text-red-400 hover:scale-110 transition-all"
                  >
                    delete
                  </span>
                </button>
              ))}
              
              <button 
                onClick={() => setShowCatModal(true)}
                className="mt-4 mx-2 flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-primary border border-white/5 rounded-xl transition-all text-sm font-bold active:scale-95 group"
              >
                <span className="material-symbols-outlined text-sm transition-transform group-hover:rotate-90">add_circle</span>
                Yeni Kategori
              </button>
            </div>
          </div>
        </nav>

        <div className="px-4 mt-auto border-t border-white/5 pt-6">
          <div 
            onClick={() => setView('settings')}
            className="bg-surface-container-low rounded-2xl p-4 flex items-center gap-3 group cursor-pointer hover:bg-white/5 transition-all"
          >
            {profile?.avatar_url ? (
               <img alt="User Avatar" className="w-10 h-10 rounded-xl object-cover" src={profile.avatar_url} />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary font-bold">
                {(session.user.email || 'U')[0].toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-on-surface truncate">{session.user.email?.split('@')[0]}</p>
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Premium Üye</p>
            </div>
            <span 
              onClick={(e) => { e.stopPropagation(); supabase.auth.signOut(); }}
              className="material-symbols-outlined text-slate-500 hover:text-red-400 transition-colors"
            >
              logout
            </span>
          </div>
          <div className="mt-4 text-center text-[10px] text-slate-600 font-medium tracking-tight">
            Created by <span className="text-slate-400">Onur Çağlar Çakın</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-72 flex flex-col min-h-screen bg-background">
        {/* TopAppBar */}
        <header className="fixed top-0 right-0 left-0 md:left-72 z-50 bg-background/80 backdrop-blur-xl flex items-center justify-between px-6 h-20 border-b border-white/5 gap-4">
          <div className="md:hidden">
            <img src={logo} alt="Logo" className="h-10 w-auto object-contain" />
          </div>
          <div className="flex-1 max-w-xl relative group">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors">search</span>
            <input 
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-surface-container-low border-none rounded-xl py-2.5 pl-12 pr-4 text-sm font-body text-on-surface placeholder:text-slate-600 focus:ring-1 focus:ring-white/10 transition-all font-medium" 
              placeholder="Arşivinde ara..." 
            />
          </div>
          <div className="flex items-center gap-4 ml-6">
            <div className="hidden sm:flex items-center gap-3">
              <div className="flex bg-surface-container-low rounded-xl p-1 gap-1 border border-white/5">
                {['grid','list'].map(v => (
                  <button key={v} onClick={() => setGv(v)} className={`p-1.5 rounded-lg transition-all ${gv === v ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
                    <span className="material-symbols-outlined text-xl">{v === 'grid' ? 'grid_view' : 'view_list'}</span>
                  </button>
                ))}
              </div>
              <button className="p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-xl transition-all">
                <span className="material-symbols-outlined">notifications</span>
              </button>
              {profile?.is_admin && (
                <button onClick={() => setShowAdmin(true)} className="p-2 text-amber-500 hover:bg-amber-500/10 rounded-xl transition-all">
                  <span className="material-symbols-outlined">admin_panel_settings</span>
                </button>
              )}
            </div>
            <button 
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-primary hover:bg-primary-container text-on-primary px-5 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 shadow-lg shadow-primary/10"
            >
              <span className="material-symbols-outlined text-sm font-bold">add</span>
              İçerik Ekle
            </button>
          </div>
        </header>

        <div className="pt-28 px-8 pb-12 flex flex-col gap-8">
          {view === 'settings' ? (
            /* Membership / Profile Section */
            <div className="max-w-6xl mx-auto w-full space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Profile Header */}
              <section className="flex flex-col lg:flex-row gap-8 items-start mt-6">
                <div className="relative group">
                  <div 
                    className="w-32 h-32 md:w-44 md:h-44 rounded-[2.5rem] overflow-hidden bg-surface-container-highest shadow-2xl transition-all duration-500 group-hover:shadow-primary/10 border border-white/5"
                  >
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center p-4 text-center text-[10px] font-black uppercase tracking-widest text-slate-500 bg-white/5">
                        FOTOĞRAF YÜKLE
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex-1 space-y-6">
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                      <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white">{profile?.username || session.user.email?.split('@')[0]}</h1>
                      <p className="text-slate-400 font-bold mt-2 tracking-tight">{session.user.email}</p>
                    </div>
                    <button 
                      onClick={triggerSync}
                      disabled={syncing}
                      className="flex items-center gap-3 px-6 py-3 bg-white/5 border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-primary hover:bg-white/10 transition-all active:scale-95"
                    >
                      <span className={`material-symbols-outlined text-base ${syncing ? 'animate-spin' : ''}`}>sync</span>
                      {syncing ? 'EŞİTLENİYOR...' : 'ŞİMDİ BULUTLA EŞİTLE'}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    {[
                      { label: 'HAFIZA KAYDI', value: items.length.toLocaleString(), color: 'text-primary' },
                      { label: 'AKTİF KOLEKSİYON', value: cats.length, color: 'text-white' },
                      { label: 'ÜYELİK SÜRESİ', value: '2 Yıl', color: 'text-white' }
                    ].map(stat => (
                      <div key={stat.label} className="bg-surface-container-low/40 backdrop-blur-md px-6 py-4 rounded-3xl flex flex-col border border-white/5 hover:border-primary/20 transition-all">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{stat.label}</span>
                        <span className={`text-2xl font-black mt-1 ${stat.color}`}>{stat.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                {/* Settings Form */}
                <div className="xl:col-span-8 space-y-8">
                  <div className="bg-surface-container-low/60 p-8 rounded-[3rem] border border-white/5 shadow-sm">
                    <div className="flex items-center gap-3 mb-8">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <span className="material-symbols-outlined text-primary text-2xl">manage_accounts</span>
                      </div>
                      <h2 className="text-2xl font-bold text-white tracking-tight">Hesap Ayarları</h2>
                    </div>
                    <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleUpdateProfile(); }}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Kullanıcı Adı</label>
                          <input 
                            className="w-full bg-white/5 border border-white/5 rounded-2xl px-5 py-3.5 text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none font-bold" 
                            type="text" 
                            value={profForm.username} 
                            onChange={e => setProfForm(f => ({...f, username: e.target.value}))}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">E-Posta</label>
                          <input className="w-full bg-white/5 border border-white/5 rounded-2xl px-5 py-3.5 text-slate-500 cursor-not-allowed outline-none font-bold" type="email" value={session.user.email} disabled />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Biyografi</label>
                        <textarea 
                          className="w-full bg-white/5 border border-white/5 rounded-2xl px-5 py-3.5 text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none font-medium text-sm" 
                          rows="3" 
                          placeholder="Kendinden bahset..."
                          value={profForm.bio}
                          onChange={e => setProfForm(f => ({...f, bio: e.target.value}))}
                        ></textarea>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Profil Fotoğrafı URL</label>
                        <input 
                          className="w-full bg-white/5 border border-white/5 rounded-2xl px-5 py-3.5 text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none font-bold" 
                          type="text" 
                          value={profForm.avatar} 
                          onChange={e => setProfForm(f => ({...f, avatar: e.target.value}))}
                          placeholder="https://..."
                        />
                      </div>
                      <div className="pt-4 flex justify-end gap-4">
                        <button className="px-6 py-3 rounded-2xl font-bold text-slate-500 hover:text-white hover:bg-white/5 transition-all text-sm uppercase tracking-widest" type="button" onClick={() => profile && setProfForm({ username: profile.username || '', bio: profile.bio || '', avatar: profile.avatar_url || '' })}>Vazgeç</button>
                        <button className="bg-primary text-on-primary px-8 py-3.5 rounded-2xl font-black hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20 text-sm uppercase tracking-widest" type="submit">Değişiklikleri Kaydet</button>
                      </div>
                    </form>
                  </div>

                  {/* Preferences */}
                  <div className="bg-surface-container-low/60 p-8 rounded-[3rem] border border-white/5 space-y-6">
                    <h2 className="text-xl font-bold text-white tracking-tight">Tercihler</h2>
                    <div className="space-y-3">
                      {[
                        { icon: 'shield', label: 'Gizlilik ve Güvenlik' },
                        { icon: 'notifications_active', label: 'Bildirim Yönetimi' },
                        { icon: 'language', label: 'Dil Seçenekleri', value: 'Türkçe' }
                      ].map(pref => (
                        <div key={pref.label} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-all group border border-white/5 cursor-pointer">
                          <div className="flex items-center gap-4">
                            <span className="material-symbols-outlined text-slate-500 group-hover:text-primary transition-colors">{pref.icon}</span>
                            <span className="font-bold text-slate-400 group-hover:text-white">{pref.label}</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-500">
                            {pref.value && <span className="text-xs font-bold">{pref.value}</span>}
                            <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">chevron_right</span>
                          </div>
                        </div>
                      ))}
                      <button 
                        onClick={() => supabase.auth.signOut()}
                        className="w-full flex items-center justify-between p-4 rounded-2xl bg-red-500/5 hover:bg-red-500/10 transition-all group border border-red-500/20 mt-4 text-red-500"
                      >
                        <div className="flex items-center gap-4">
                          <span className="material-symbols-outlined">logout</span>
                          <span className="font-black uppercase tracking-widest text-xs">Oturumu Kapat</span>
                        </div>
                        <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">logout</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Sidebar Info Column */}
                <div className="xl:col-span-4 space-y-8">
                  {/* Support Card */}
                  <div className="bg-primary/5 p-8 rounded-[3rem] border border-primary/10 relative overflow-hidden group">
                    <h2 className="text-xl font-bold mb-2 text-white">Bağış ve Destek</h2>
                    <p className="text-xs text-slate-400 mb-8 leading-relaxed font-bold tracking-tight">Savedlens gelişimine katkıda bulunarak dijital hafızanın geleceğini şekillendirin.</p>
                    <div className="space-y-3 relative z-10">
                      <button className="w-full flex items-center gap-4 bg-[#FFD700] text-black p-4 rounded-2xl font-black hover:scale-[1.02] active:scale-95 transition-all shadow-xl uppercase tracking-widest text-xs">
                        <span className="material-symbols-outlined fill-1">coffee</span>
                        <span>Bir Kahve Ismarla</span>
                      </button>
                      <button className="w-full flex items-center gap-4 bg-[#ff424d] text-white p-4 rounded-2xl font-black hover:scale-[1.02] active:scale-95 transition-all shadow-xl uppercase tracking-widest text-xs">
                        <span className="material-symbols-outlined fill-1">favorite</span>
                        <span>Patreon ile Destekle</span>
                      </button>
                    </div>
                    <div className="absolute -right-8 -bottom-8 opacity-10 group-hover:scale-110 transition-transform">
                      <span className="material-symbols-outlined text-[150px] text-primary fill-1">volunteer_activism</span>
                    </div>
                  </div>

                  {/* Memory Capacity */}
                  <div className="bg-surface-container-low/60 p-8 rounded-[3rem] border border-white/5 relative overflow-hidden group">
                    <h2 className="text-lg font-bold mb-6 text-white">Hafıza Kapasitesi</h2>
                    <div className="space-y-6">
                      <div className="space-y-3">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
                          <span>Kullanılan Alan</span>
                          <span className="text-primary font-black">{Math.min(100, Math.round((items.length / 500) * 100))}%</span>
                        </div>
                        <div className="h-3 bg-white/5 rounded-full overflow-hidden border border-white/5">
                          <div 
                            className="h-full bg-gradient-to-r from-primary to-indigo-300 rounded-full shadow-[0_0_20px_rgba(129,140,248,0.4)] transition-all duration-1000"
                            style={{ width: `${Math.min(100, Math.round((items.length / 500) * 100))}%` }}
                          ></div>
                        </div>
                        <p className="text-[10px] text-slate-500 font-bold tracking-tight uppercase">{items.length} / 500 İÇERİK KAYDEDİLDİ</p>
                      </div>
                      <button className="w-full py-3.5 rounded-2xl bg-primary text-on-primary font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-primary/20">Planı Yükselt</button>
                    </div>
                  </div>

                  {/* Danger Zone */}
                  <div className="bg-red-500/5 p-6 rounded-[2.5rem] border border-red-500/10">
                    <h2 className="text-sm font-black text-red-500 mb-2 uppercase tracking-widest">Tehlikeli Bölge</h2>
                    <p className="text-[10px] text-slate-500 mb-5 leading-relaxed font-bold">Hesabınızı sildiğinizde tüm hafıza kayıtlarınız kalıcı olarak kaldırılır.</p>
                    <button className="w-full py-3 border border-red-500/20 rounded-xl text-red-500 text-[10px] font-black hover:bg-red-500 hover:text-white transition-all uppercase tracking-widest">Hesabı Kalıcı Olarak Sil</button>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <>
              {/* Welcome Header */}
              <section>
                <h1 className="text-4xl font-black tracking-tight text-white mb-2">
                  Hoş geldin, <span className="text-primary">{session.user.email?.split('@')[0]}</span>
                </h1>
                <p className="text-slate-400 font-semibold tracking-tight">
                  {currentCat ? cats.find(c => c.id === currentCat)?.name : 'Tüm Arşivin'} burada. {it.length} içerik bulundu.
                </p>
              </section>

              {/* Stats Section */}
              <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {[
                  { label: 'TOPLAM', value: items.length, icon: 'inventory_2', sub: 'kayıtlı içerik' },
                  { label: 'REELS', value: items.filter(i => i.type === 'reel').length, icon: 'movie', sub: 'video içerik' },
                  { label: 'ÖZET', value: items.filter(i => i.ai_summary).length, icon: 'auto_awesome', sub: 'AI özetlendi' },
                  { label: 'FAVORİ', value: items.filter(i => i.is_favorite).length, icon: 'star', sub: 'yıldızlı' }
                ].map(s => (
                  <div key={s.label} className="bg-surface-container-low rounded-2xl p-6 border border-white/5 relative overflow-hidden group">
                    <div className="relative z-10">
                      <p className="text-[10px] font-bold tracking-[0.1em] text-slate-500 mb-1 uppercase">{s.label}</p>
                      <h3 className="text-3xl font-black text-white">{s.value}</h3>
                      <p className="text-xs text-slate-400 mt-1 font-medium">{s.sub}</p>
                    </div>
                    <span className="material-symbols-outlined absolute -right-2 -bottom-2 text-6xl text-white/5 group-hover:scale-110 group-hover:text-primary/10 transition-all duration-500">{s.icon}</span>
                  </div>
                ))}
              </section>

              {/* Filters Area */}
              <section className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {[
                  { id: 'all', label: 'Tümü' },
                  { id: 'reel', label: 'Reels' },
                  { id: 'post', label: 'Gönderi' },
                  { id: 'carousel', label: 'Carousel' },
                  { id: 'nocat', label: 'Kategorisiz' },
                  { id: 'noai', label: 'Özetsiz' }
                ].map(f => (
                  <button 
                    key={f.id}
                    onClick={() => setTf(f.id)}
                    className={`whitespace-nowrap px-5 py-2 rounded-xl font-bold text-sm transition-all border ${
                      tf === f.id 
                        ? 'bg-primary text-on-primary border-primary shadow-lg shadow-primary/10' 
                        : 'bg-surface-container-high text-slate-400 border-white/5 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <button 
                onClick={() => setTf('all')}
                className="p-2 text-slate-500 hover:text-primary transition-colors"
              >
                <span className="material-symbols-outlined">filter_list_off</span>
              </button>
            </div>

          {/* Cards Area */}
          {it.length === 0 ? (
            <div className="flex-1 min-h-[400px] flex flex-col items-center justify-center text-center p-12 bg-surface-container-low rounded-[2.5rem] border border-white/5 group">
              <div className="w-24 h-24 mb-6 rounded-full bg-surface-container-high flex items-center justify-center relative transition-transform group-hover:scale-105 duration-500">
                <span className="material-symbols-outlined text-4xl text-primary/60">archive</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">Henüz içerik yok</h2>
              <p className="text-slate-400 max-w-sm mb-8 leading-relaxed font-medium">
                Arşivin bomboş görünüyor. Sağ üstteki <span className="text-primary font-bold inline-flex items-center gap-1 mx-1"><span className="material-symbols-outlined text-sm">add</span> İçerik Ekle</span> butonu ile favori içeriklerini kaydetmeye başla.
              </p>
              <button 
                onClick={() => setShowModal(true)}
                className="flex items-center gap-3 px-8 py-3.5 bg-surface-container-high hover:bg-white/5 text-white rounded-2xl font-bold text-sm transition-all border border-white/5 shadow-xl"
              >
                <span className="material-symbols-outlined text-lg">explore</span>
                Keşfetmeye Başla
              </button>
            </div>
          ) : (
            <div className={`grid gap-6 ${gv === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
              {it.map(item => {
                const cat = cats.find(c => c.id === item.category_id)
                const tl = item.type === 'reel' ? 'Reels' : item.type === 'carousel' ? 'Carousel' : 'Gönderi'
                const tc = item.type === 'reel' ? 'bg-pink-500/20 text-pink-400' : item.type === 'carousel' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-primary/20 text-primary'
                const proxied = item.thumbnail_url ? `https://images.weserv.nl/?url=${encodeURIComponent(item.thumbnail_url)}&w=600&h=600&fit=cover` : null
                
                return (
                  <div 
                    key={item.id} 
                    onClick={() => { setSelectedItem(item); setTempNote(item.notes || ''); }}
                    className={`group bg-surface-container-low border border-white/5 rounded-[2.5rem] overflow-hidden transition-all duration-300 hover:border-white/10 hover:translate-y-[-4px] cursor-pointer shadow-lg hover:shadow-primary/5 ${gv === 'list' ? 'flex' : 'flex flex-col'}`}
                  >
                    {/* Media Container */}
                    <div className={`relative overflow-hidden bg-surface-container-high ${gv === 'list' ? 'w-48 aspect-video' : 'aspect-square'}`}>
                      {proxied ? (
                        <img 
                          src={proxied} 
                          alt={item.title} 
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-700">
                          <span className="material-symbols-outlined text-5xl">{item.type === 'reel' ? 'movie' : 'image'}</span>
                        </div>
                      )}
                      
                      {/* Badge */}
                      <div className={`absolute top-4 left-4 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${tc} backdrop-blur-md border border-white/5`}>
                        {tl}
                      </div>

                      {/* Action Overlay */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                         <button 
                          onClick={(e) => { e.stopPropagation(); toggleFav(item.id, item.is_favorite); }}
                          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${item.is_favorite ? 'bg-amber-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
                        >
                          <span className="material-symbols-outlined text-xl">{item.is_favorite ? 'star' : 'star_outline'}</span>
                        </button>
                        {item.instagram_url && (
                           <button 
                            onClick={(e) => { e.stopPropagation(); window.open(item.instagram_url, '_blank'); }}
                            className="w-10 h-10 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center transition-all"
                          >
                            <span className="material-symbols-outlined text-xl">open_in_new</span>
                          </button>
                        )}
                        <button 
                          onClick={(e) => { e.stopPropagation(); delItem(item.id); }}
                          className="w-10 h-10 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all"
                        >
                          <span className="material-symbols-outlined text-xl">delete</span>
                        </button>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 flex flex-col flex-1">
                      {cat && (
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }}></div>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">{cat.name}</span>
                        </div>
                      )}
                      <h4 className="text-base font-bold text-white mb-2 line-clamp-1 group-hover:text-primary transition-colors">{item.title || 'İsimsiz İçerik'}</h4>
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4 flex-1">{item.description || 'Açıklama bulunmuyor...'}</p>
                      
                      <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">
                          {new Date(item.created_at).toLocaleDateString('tr-TR')}
                        </span>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setChatObj({ open:true, item, messages:[], input:'', loading:false }) }}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/5 text-primary hover:bg-primary hover:text-on-primary transition-all text-[10px] font-black uppercase tracking-wider"
                        >
                          <span className="material-symbols-outlined text-sm">auto_awesome</span>
                          AI ASİSTAN
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Pro Banner Area */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                <div className="bg-surface-container-low p-8 rounded-[2.5rem] border border-white/5 relative overflow-hidden group">
                  <div className="relative z-10">
                    <h4 className="text-xl font-bold text-white mb-2">Pro Arşivci Ol</h4>
                    <p className="text-slate-400 text-sm mb-6 leading-relaxed font-medium">AI özetleme sınırlarını kaldır ve sınırsız kategori oluşturma hakkı kazan.</p>
                    <button className="px-6 py-2.5 bg-primary text-on-primary font-bold text-xs uppercase tracking-widest rounded-xl hover:scale-105 transition-transform">Yükselt</button>
                  </div>
                  <div className="absolute -right-10 -bottom-10 opacity-5 transition-transform group-hover:scale-110">
                    <span className="material-symbols-outlined text-[160px] fill-1">auto_awesome</span>
                  </div>
                </div>
                <div className="bg-surface-container-low p-8 rounded-[2.5rem] flex flex-col justify-center border border-white/5">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                      <span className="material-symbols-outlined text-primary">trending_up</span>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Haftalık Trend</p>
                      <h4 className="text-lg font-bold text-white">Yapay Zeka Araçları</h4>
                    </div>
                  </div>
                  <div className="flex -space-x-3 overflow-hidden">
                     {[1,2,3,4].map(idx => (
                       <div key={idx} className="inline-block h-8 w-8 rounded-full ring-2 ring-surface-container-low bg-surface-container-high border border-white/10 flex items-center justify-center text-[10px] font-bold text-slate-500">U{idx}</div>
                     ))}
                     <div className="flex items-center justify-center h-8 w-8 rounded-full ring-2 ring-surface-container-low bg-surface-container-high text-[10px] font-bold text-slate-400">+12</div>
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
      </main>

      {/* DETAIL POPUP (Premium 2-Column Layout) */}
      {selectedItem && (() => {
        const item = selectedItem
        const cat = cats.find(c => c.id === item.category_id)
        const tl = item.type === 'reel' ? 'Reels' : item.type === 'carousel' ? 'Carousel' : 'Gönderi'
        const tc = item.type === 'reel' ? 'text-pink-400 bg-pink-500/10 border-pink-500/20' : item.type === 'carousel' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-primary bg-primary/10 border-primary/20'
        const proxied = item.thumbnail_url ? `https://images.weserv.nl/?url=${encodeURIComponent(item.thumbnail_url)}&w=1200&h=1200&fit=cover` : null
        
        return (
          <div
            onClick={e => e.target === e.currentTarget && setSelectedItem(null)}
            className="fixed inset-0 bg-background/95 backdrop-blur-2xl z-[100] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-500"
          >
            <div className="bg-surface-container-lowest w-full max-w-7xl h-full max-h-[900px] rounded-[3rem] border border-white/5 shadow-2xl overflow-hidden flex flex-col md:flex-row relative">
              {/* Close Button Mobile */}
              <button onClick={() => setSelectedItem(null)} className="md:hidden absolute top-6 right-6 z-50 w-10 h-10 rounded-full bg-black/50 backdrop-blur-md text-white flex items-center justify-center">
                 <span className="material-symbols-outlined">close</span>
              </button>

              {/* Left Column: Content & Details (60%) */}
              <div className="w-full md:w-[60%] flex flex-col overflow-y-auto no-scrollbar bg-[#0c0e12]">
                {/* Media Container */}
                <div className="relative aspect-video bg-black/40 group overflow-hidden">
                  {proxied ? (
                    <img src={proxied} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-slate-700">
                      <span className="material-symbols-outlined text-8xl">{item.type === 'reel' ? 'movie' : 'image'}</span>
                      <span className="text-xs font-black uppercase tracking-widest">Önizleme Bulunamadı</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end p-8">
                     <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${tc} border`}>
                      {tl}
                    </div>
                  </div>
                </div>

                {/* Details Area */}
                <div className="p-8 md:p-12 space-y-10">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                         {cat && (
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/5">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }}></div>
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{cat.name}</span>
                            </div>
                          )}
                          <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{new Date(item.created_at).toLocaleDateString('tr-TR', { day:'numeric', month:'long', year:'numeric' })}</span>
                      </div>
                      <h1 className="text-3xl md:text-4xl font-black text-white leading-tight tracking-tight">{item.title || 'İsimsiz İçerik'}</h1>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {item.instagram_url && (
                        <button onClick={() => window.open(item.instagram_url, '_blank')} className="flex items-center gap-2 px-6 py-3 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-2xl text-xs font-black uppercase tracking-widest transition-all">
                          <span className="material-symbols-outlined text-sm">open_in_new</span>
                          Instagram
                        </button>
                      )}
                      <button onClick={() => delItem(item.id)} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-red-500/5 border border-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all">
                        <span className="material-symbols-outlined text-xl">delete_outline</span>
                      </button>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="p-8 bg-surface-container-low/50 rounded-[2.5rem] border border-white/5 shadow-inner">
                    <p className="text-slate-300 leading-relaxed text-lg font-medium opacity-90 whitespace-pre-wrap">
                      {item.description || 'Bu içerik için henüz bir açıklama eklenmemiş.'}
                    </p>
                  </div>

                  {/* Personal Notes */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold flex items-center gap-3 text-white">
                        <span className="material-symbols-outlined text-primary bg-primary/10 p-2 rounded-xl">edit_note</span>
                        Kişisel Notlarım
                      </h3>
                      <button 
                        onClick={() => updateNote(item.id, tempNote)}
                        className={`text-[11px] font-black uppercase tracking-[0.2em] transition-all ${tempNote === (item.notes || '') ? 'text-slate-600' : 'text-primary hover:text-white'}`}
                      >
                        {tempNote === (item.notes || '') ? 'KAYDEDİLDİ' : 'KAYDET'}
                      </button>
                    </div>
                    <div className="relative group">
                      <textarea 
                        value={tempNote}
                        onChange={e => setTempNote(e.target.value)}
                        onBlur={() => tempNote !== (item.notes || '') && updateNote(item.id, tempNote)}
                        className="w-full bg-surface-container-low border border-white/5 rounded-3xl p-8 text-slate-300 focus:ring-2 focus:ring-primary/20 focus:border-primary/20 min-h-[200px] font-medium resize-none transition-all placeholder:text-slate-700 text-base"
                        placeholder="Bu içerik hakkında ne düşünüyorsun?.."
                      />
                      <div className="absolute bottom-6 right-8 flex gap-4 text-slate-700">
                        <span className="material-symbols-outlined hover:text-primary cursor-pointer transition-colors">attachment</span>
                        <span className="material-symbols-outlined hover:text-primary cursor-pointer transition-colors">mood</span>
                      </div>
                    </div>
                  </div>

                  {/* Tags Management */}
                  <div className="flex flex-wrap gap-2.5 pt-4">
                    {item.tags ? item.tags.split(',').map(tag => (
                      <span key={tag} className="px-5 py-2.5 bg-primary/5 border border-primary/10 rounded-full text-xs font-black text-primary hover:bg-primary/10 transition-all cursor-default">
                        #{tag.trim()}
                      </span>
                    )) : (
                      <p className="text-xs text-slate-600 font-bold uppercase tracking-widest px-2">Etiket Bulunmuyor</p>
                    )}
                    <button className="px-5 py-2.5 border border-white/10 rounded-full text-xs font-black text-slate-500 hover:bg-primary/5 hover:border-primary/20 hover:text-primary transition-all flex items-center gap-2 group">
                      <span className="material-symbols-outlined text-sm transition-transform group-hover:rotate-90">add</span>
                      Etiket Ekle
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Lens AI Assistant Panel (40%) */}
              <div className="flex flex-col w-full md:w-[40%] bg-surface-container-lowest border-t md:border-t-0 md:border-l border-white/5 shadow-2xl relative">
                {/* AI Header */}
                <div className="p-8 border-b border-white/5 flex items-center justify-between bg-black/20 backdrop-blur-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center shadow-lg shadow-primary/20">
                      <span className="material-symbols-outlined text-white text-2xl fill-1">auto_awesome</span>
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-white tracking-tight leading-none">Lens AI Asistanı</h2>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-[10px] text-primary font-black uppercase tracking-[0.2em] opacity-80">Analiz Ediliyor</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setSelectedItem(null)} className="w-11 h-11 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-500 transition-all">
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                {/* AI Chat Area */}
                <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar bg-black/10">
                  {/* AI Greeting */}
                  <div className="flex gap-4 animate-in fade-in slide-in-from-left-4 duration-500">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex-shrink-0 flex items-center justify-center border border-primary/20">
                      <span className="material-symbols-outlined text-primary text-xl">smart_toy</span>
                    </div>
                    <div className="bg-surface-container-low p-5 rounded-3xl rounded-tl-none border border-white/5">
                      <p className="text-sm text-slate-300 leading-relaxed font-medium">
                        Selam! Bu gönderiyi senin için analiz ettim. İçerikle ilgili merak ettiğin her şeyi sorabilirsin.
                      </p>
                    </div>
                  </div>

                  {/* Integrated Chat Messages from state would go here if synced */}
                  {chatObj.item?.id === item.id && chatObj.messages.map((m, i) => (
                    <div key={i} className={`flex gap-4 ${m.role === 'user' ? 'flex-row-reverse' : ''} animate-in fade-in slide-in-from-bottom-4 duration-300`}>
                      <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center border ${m.role === 'user' ? 'bg-primary text-on-primary border-primary/20' : 'bg-primary/10 text-primary border-primary/20'}`}>
                        <span className="material-symbols-outlined text-xl">{m.role === 'user' ? 'person' : 'smart_toy'}</span>
                      </div>
                      <div className={`p-5 rounded-3xl border ${m.role === 'user' ? 'bg-primary/10 text-white border-primary/20 rounded-tr-none' : 'bg-surface-container-low text-slate-300 border-white/5 rounded-tl-none'}`}>
                        <p className="text-sm leading-relaxed font-medium">{m.content}</p>
                      </div>
                    </div>
                  ))}

                  {/* AI Quick Actions */}
                  <div className="grid grid-cols-1 gap-4 mt-8">
                    {[
                      { q: "Bu gönderinin ana fikirleri neler?", sub: "Özet ve kilit noktaları çıkarır." },
                      { q: "Bu içeriğe uygun 5 etiket öner", sub: "İçerik analizi ile yeni etiketler bulur." },
                      { q: "Benzer gönderileri bul", sub: "Koleksiyonundaki ilgili içerikleri listeler." }
                    ].map(btn => (
                      <button 
                        key={btn.q} 
                        onClick={() => {
                          setChatObj(c => ({ 
                            ...c, 
                            open: true, 
                            item: item, 
                            messages: [...c.messages, { role: 'user', content: btn.q }],
                            input: btn.q,
                            loading: true 
                          }));
                          // Automatically send the quick message
                          setTimeout(() => handleSendChatMessage(), 100);
                        }}
                        className="text-left p-6 bg-primary/5 hover:bg-primary/10 border border-primary/10 rounded-[2rem] transition-all group active:scale-95"
                      >
                        <p className="text-sm font-black text-primary group-hover:translate-x-1 transition-transform">{btn.q}</p>
                        <p className="text-[11px] text-slate-500 mt-1 font-bold uppercase tracking-tight">{btn.sub}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* AI Input Area */}
                <div className="p-8 bg-black/20 border-t border-white/5 backdrop-blur-xl">
                  <div className="relative group">
                    <input 
                      type="text"
                      className="w-full bg-surface-container-low border border-white/5 rounded-2xl py-4.5 pl-6 pr-16 text-sm text-white placeholder:text-slate-700 focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                      placeholder="Asistana bir soru sor..."
                      value={chatObj.input}
                      onChange={e => setChatObj(c => ({...c, input: e.target.value}))}
                      onKeyDown={e => e.key === 'Enter' && handleSendChatMessage()}
                    />
                    <button 
                      onClick={handleSendChatMessage}
                      disabled={chatObj.loading || !chatObj.input.trim()}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 bg-primary text-on-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 transition-all active:scale-90"
                    >
                      <span className="material-symbols-outlined text-xl">send</span>
                    </button>
                  </div>
                  <div className="mt-4 flex items-center justify-between px-2 text-[9px] text-slate-600 font-black uppercase tracking-[0.2em]">
                    <div className="flex gap-4">
                      <span className="material-symbols-outlined text-base hover:text-primary cursor-pointer transition-colors">image</span>
                      <span className="material-symbols-outlined text-base hover:text-primary cursor-pointer transition-colors">mic</span>
                    </div>
                    <span>Powered by Lens Engine</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── ADD CONTENT MODAL ─────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-background/90 backdrop-blur-xl z-[150] flex items-center justify-center p-4">
          <div className="bg-surface-container-low w-full max-w-lg rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden p-8 animate-in fade-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-white tracking-tight">İçerik Ekle</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-white transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Real-time Preview Area */}
              {form.url.includes('instagram.com') && (
                <div className="bg-surface-container-high rounded-3xl overflow-hidden border border-white/5 animate-in slide-in-from-top-4 duration-500 mb-2 shadow-2xl">
                  <div className="aspect-video relative bg-black/20 flex items-center justify-center overflow-hidden">
                    {prevData?.thumb ? (
                      <img src={prevData.thumb} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-slate-600">
                        <span className="material-symbols-outlined text-4xl animate-pulse">downloading</span>
                        <span className="text-[10px] font-black uppercase tracking-widest">Önizleme Alınıyor...</span>
                      </div>
                    )}
                    <div className="absolute top-4 left-4 flex gap-2">
                       <span className="px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-[9px] font-black text-primary uppercase tracking-widest flex items-center gap-2">
                         <span className="material-symbols-outlined text-[10px]">brand_awareness</span>
                         Instagram
                       </span>
                    </div>
                  </div>
                  <div className="p-4 bg-surface-container-high/50 backdrop-blur-md">
                    <p className="text-xs font-bold text-white truncate px-1">{prevData?.title || 'İçerik Başlığı Çekiliyor...'}</p>
                    <div className="flex items-center gap-2 mt-2 px-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Bağlantı Doğrulandı</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">INSTAGRAM URL</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm">link</span>
                  <input 
                    type="text"
                    value={form.url}
                    onChange={e => { setForm(f => ({...f, url: e.target.value})); schedulePreview(e.target.value); }}
                    placeholder="https://www.instagram.com/p/..."
                    className="w-full bg-surface-container-high border-none rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white placeholder:text-slate-700 focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">KATEGORİ (OPSİYONEL)</label>
                <div className="flex flex-wrap gap-2">
                   <button 
                      onClick={() => setForm(f => ({...f, cat: ''}))}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all border ${
                        form.cat === '' 
                          ? 'bg-primary/20 border-primary text-primary' 
                          : 'bg-surface-container-high border-white/5 text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      Kategorisiz
                    </button>
                  {cats.map(c => (
                    <button 
                      key={c.id}
                      onClick={() => setForm(f => ({...f, cat: c.id}))}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all border ${
                        form.cat === c.id 
                          ? 'bg-primary/20 border-primary text-primary' 
                          : 'bg-surface-container-high border-white/5 text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                  <button 
                    onClick={() => { setShowModal(false); setShowCatModal(true); }}
                    className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tight bg-white/5 border border-dashed border-white/10 text-primary hover:bg-white/10"
                  >
                    + YENİ
                  </button>
                </div>
              </div>

              <div className="pt-4">
                <button 
                  onClick={saveItem}
                  disabled={loading || !form.url}
                  className="w-full py-4 rounded-2xl bg-primary hover:bg-primary-container text-on-primary font-black text-xs uppercase tracking-[0.2em] transition-all active:scale-95 shadow-xl shadow-primary/20 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="material-symbols-outlined animate-spin text-sm">refresh</span>
                  ) : (
                    <span className="material-symbols-outlined text-sm">auto_awesome</span>
                  )}
                  {loading ? 'ANALİZ EDİLİYOR...' : 'İÇERİĞİ ANALİZ ET VE EKLE'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD CATEGORY MODAL ─────────────────────────────────── */}
      {showCatModal && (
        <div className="fixed inset-0 bg-background/90 backdrop-blur-xl z-[160] flex items-center justify-center p-4">
          <div className="bg-surface-container-low w-full max-w-md rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden p-8 animate-in fade-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-white tracking-tight">Kategori Ekle</h3>
              <button 
                onClick={() => setShowCatModal(false)}
                className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">KATEGORİ ADI</label>
                <input 
                  type="text"
                  value={catInput}
                  onChange={e => setCatInput(e.target.value)}
                  placeholder="Örn: Yemek Tarifleri, Tasarım..."
                  className="w-full bg-surface-container-high border-none rounded-2xl py-3.5 px-4 text-sm text-white placeholder:text-slate-700 focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                />
              </div>

              <div className="pt-4">
                <button 
                  onClick={() => { addCat(); setShowCatModal(false); }}
                  disabled={!catInput.trim()}
                  className="w-full py-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 text-primary font-black text-xs uppercase tracking-[0.2em] transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  KATEGORİYİ OLUŞTUR
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── AI CHAT MODAL ─────────────────────────────────── */}
      {chatObj.open && (
        <div className="fixed inset-0 bg-background/90 backdrop-blur-xl z-[200] flex items-center justify-center p-4">
          <div className="bg-surface-container-low w-full max-w-xl h-[85vh] rounded-[3rem] border border-primary/20 shadow-2xl overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-8 duration-500">
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-surface-container-low">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group">
                  <span className="material-symbols-outlined text-2xl group-hover:rotate-12 transition-transform">auto_awesome</span>
                </div>
                <div>
                  <h3 className="text-base font-black text-white uppercase tracking-wider">SavedLens AI</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase truncate max-w-[200px]">{chatObj.item?.title || 'Instagram İçeriği'}</p>
                </div>
              </div>
              <button onClick={() => setChatObj(c => ({...c, open:false}))} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6 flex flex-col no-scrollbar bg-surface-container-low/50">
               <div className="self-center bg-primary/10 border border-primary/20 rounded-2xl px-6 py-3 text-[10px] font-black text-primary uppercase tracking-[0.2em] text-center max-w-xs transition-all animate-pulse">
                Süper Zeka Devrede. Bu içerik hakkında her şeyi biliyorum.
              </div>
              
              {chatObj.messages.map((m, i) => (
                <div 
                  key={i} 
                  className={`max-w-[85%] rounded-[2rem] p-5 text-sm font-medium leading-relaxed ${
                    m.role === 'user' 
                      ? 'self-end bg-primary text-on-primary rounded-tr-lg shadow-lg shadow-primary/10' 
                      : 'self-start bg-surface-container-high text-on-surface rounded-tl-lg border border-white/5 shadow-xl shadow-black/20'
                  }`}
                >
                  {m.content}
                </div>
              ))}
              
              {chatObj.loading && (
                <div className="self-start bg-surface-container-high rounded-[2rem] rounded-tl-lg p-5 flex items-center gap-3 border border-white/5 animate-pulse">
                  <div className="flex gap-1.5">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></div>
                    <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '400ms' }}></div>
                  </div>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Düşünüyorum</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="p-6 bg-surface-container-low border-t border-white/10">
              <div className="relative group">
                <input 
                  type="text"
                  value={chatObj.input}
                  onChange={e => setChatObj(c => ({...c, input: e.target.value}))}
                  onKeyDown={e => e.key === 'Enter' && handleSendChatMessage()}
                  placeholder="AI'a bu içerik hakkında bir şeyler sor..."
                  className="w-full bg-surface-container-high border-none rounded-2xl py-4 pl-6 pr-16 text-sm text-white placeholder:text-slate-700 focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                />
                <button 
                  onClick={handleSendChatMessage}
                  disabled={chatObj.loading || !chatObj.input.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-12 h-12 rounded-xl bg-primary text-on-primary flex items-center justify-center shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-xl">send</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── PROFILE MODAL ─────────────────────────────────── */}
      {showProfile && (
        <div className="fixed inset-0 bg-background/90 backdrop-blur-xl z-[150] flex items-center justify-center p-4">
          <div className="bg-surface-container-low w-full max-w-sm rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden p-8 animate-in fade-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black text-white tracking-tight">Profil</h3>
              <button onClick={() => setShowProfile(false)} className="text-slate-500 hover:text-white transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="flex flex-col items-center gap-6">
              <div className="relative group">
                {avatarInput ? (
                  <img src={avatarInput} className="w-24 h-24 rounded-[2rem] object-cover border-4 border-white/5 shadow-2xl" alt="avatar" />
                ) : (
                  <div className="w-24 h-24 rounded-[2rem] bg-primary/20 flex items-center justify-center text-primary text-4xl font-black border-4 border-white/5">
                    {(session.user.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <div className="absolute -bottom-2 -right-2 bg-background p-2 rounded-xl border border-white/5 shadow-lg">
                  <span className="material-symbols-outlined text-primary text-xl">face_retouching_natural</span>
                </div>
              </div>

              <div className="w-full space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1 text-center block">PROFİL FOTOĞRAFI URL</label>
                  <input 
                    type="text"
                    value={avatarInput}
                    onChange={e => setAvatarInput(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-surface-container-high border-none rounded-2xl py-3 px-4 text-xs text-white placeholder:text-slate-700 focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                  />
                </div>
                
                <button 
                  onClick={async () => {
                    const { error } = await supabase.from('profiles').update({ avatar_url: avatarInput }).eq('id', session.user.id)
                    if(!error) { setProfile(p => ({...p, avatar_url: avatarInput})); showToast('Profil güncellendi!', 'ok'); setShowProfile(false); }
                    else showToast('Hata: '+error.message, 'err')
                  }}
                  className="w-full py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-primary font-black text-[10px] uppercase tracking-[0.2em] transition-all active:scale-95 border border-white/5"
                >
                  DEĞİŞİKLİKLERİ KAYDET
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* â”€â”€ ADMIN MODAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {showAdmin && (
        <div className="fixed inset-0 bg-background/90 backdrop-blur-xl z-[200] flex items-center justify-center p-4">
          <div className="bg-surface-container-low w-full max-w-2xl max-h-[80vh] rounded-[3rem] border border-amber-500/20 shadow-2xl overflow-hidden flex flex-col">
            <div className="p-8 border-b border-white/5 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-500">crown</span>
                  Üye Yönetimi
                </h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">SİSTEME KAYITLI {allUsers.length} ÜYE</p>
              </div>
              <button onClick={() => setShowAdmin(false)} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-4 no-scrollbar">
              {allUsers.map(u => (
                <div key={u.id} className="flex items-center gap-4 bg-surface-container-high/50 p-4 rounded-3xl border border-white/5 hover:border-amber-500/20 transition-all group">
                  {u.avatar_url ? (
                    <img src={u.avatar_url} className="w-12 h-12 rounded-2xl object-cover" alt="" />
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 font-bold">
                      {(u.email || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-bold text-white group-hover:text-amber-500 transition-colors">{u.email}</p>
                    <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">{new Date(u.created_at).toLocaleDateString()}</p>
                  </div>
                  {u.is_admin && (
                     <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] font-black text-amber-500 tracking-tight">SÜPER ADMIN</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TOAST PANEL */}
      {toast.show && (
        <div className={`fixed bottom-10 right-10 z-[1000] p-5 rounded-[2rem] border backdrop-blur-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right-10 duration-300 ${
          toast.type === 'ok' ? 'bg-primary/20 border-primary/30 text-white' : toast.type === 'err' ? 'bg-red-500/20 border-red-500/30 text-white' : 'bg-amber-500/20 border-amber-500/30 text-white'
        }`}>
          <span className="material-symbols-outlined text-xl">
            {toast.type === 'ok' ? 'check_circle' : toast.type === 'err' ? 'error' : 'warning'}
          </span>
          <span className="text-xs font-black uppercase tracking-widest">{toast.msg}</span>
        </div>
      )}

      {/* MOBILE NAV */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-background/80 backdrop-blur-2xl border-t border-white/5 flex items-center justify-around px-4 z-50">
        {[
          { id: 'all', icon: 'grid_view' },
          { id: 'reels', icon: 'movie' },
          { id: 'fav', icon: 'star' },
          { id: 'settings', icon: 'settings' }
        ].map(item => (
          <button 
            key={item.id}
            onClick={() => { setView(item.id); setCurrentCat(null); }}
            className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all ${
              view === item.id ? 'bg-primary/10 text-primary' : 'text-slate-500 hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: view === item.id ? "'FILL' 1" : "" }}>{item.icon}</span>
          </button>
        ))}
      </nav>

      {/* MOBILE FAB */}
      <button 
        onClick={() => setShowModal(true)}
        className="md:hidden fixed bottom-24 right-6 w-16 h-16 bg-primary text-on-primary rounded-2xl shadow-2xl shadow-primary/40 flex items-center justify-center z-50 active:scale-90 transition-transform"
      >
        <span className="material-symbols-outlined text-3xl font-bold">add</span>
      </button>
    </div>
  )
}
