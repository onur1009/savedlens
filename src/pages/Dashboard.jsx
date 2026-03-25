import { useEffect, useState, useRef } from 'react'
import { supabase } from '../supabase'

const PAL = ['#c084fc','#f472b6','#2dd4bf','#fbbf24','#4ade80','#f87171','#60a5fa','#a78bfa','#34d399','#fb923c']

const css = `
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeIn { from { opacity:0; transform:scale(.96); } to { opacity:1; transform:scale(1); } }
  * { box-sizing: border-box; }
  .card:hover { border-color: rgba(255,255,255,0.15) !important; transform: translateY(-2px); }
  .card { transition: all .2s; cursor: pointer; }
  .actbtn { opacity: 0; transition: opacity .15s; }
  .card:hover .actbtn { opacity: 1; }
  .catdel { opacity: 0; transition: opacity .15s; }
  .catrow:hover .catdel { opacity: 1; }
  .navbtn:hover { background: #22222c !important; color: #f0f0f5 !important; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-thumb { background: #22222c; border-radius: 10px; }
  select option { background: #18181f; }
  .detail-panel { animation: fadeIn .18s ease; }
  .ig-desc { white-space: pre-wrap; word-break: break-word; }
`

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
  const rapidApiKey = import.meta.env.VITE_RAPIDAPI_KEY || ''
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
  
  const [tempNote, setTempNote] = useState('')
  const [chatObj, setChatObj] = useState({ open:false, item:null, messages:[], input:'', loading:false })
  const chatEndRef = useRef(null)
  const catInputRef = useRef(null)
  const pvtRef = useRef(null)

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
    const uid = session.user.id
    const [{ data: c }, { data: i }, { data: p }] = await Promise.all([
      supabase.from('categories').select('*').eq('user_id', uid).order('created_at'),
      supabase.from('items').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').eq('id', uid).single()
    ])
    setCats(c || [])
    setItems(i || [])
    if (p) {
      setProfile(p)
      if (p.is_admin) {
        const { data: all } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
        if (all) setAllUsers(all)
      }
    }
    setLoading(false)
  }

  function showToast(msg, type = 'ok') {
    setToast({ show: true, msg, type })
    setTimeout(() => setToast(t => ({ ...t, show: false })), 3500)
  }

  async function addCat() {
    const name = catInput.trim()
    if (!name) return
    const { data, error } = await supabase.from('categories').insert({
      user_id: session.user.id,
      name,
      color: PAL[cats.length % PAL.length]
    }).select().single()
    if (error) { showToast('Kategori eklenemedi: ' + error.message, 'err'); return }
    if (data) {
      setCats(c => [...c, data])
      setCatInput('')
      showToast('Kategori eklendi!', 'ok')
    }
  }

  async function delCat(id) {
    await supabase.from('categories').delete().eq('id', id)
    setCats(c => c.filter(x => x.id !== id))
    if (currentCat === id) setCurrentCat(null)
  }

  async function toggleFav(id, val) {
    await supabase.from('items').update({ is_favorite: !val }).eq('id', id)
    setItems(i => i.map(x => x.id === id ? { ...x, is_favorite: !val } : x))
    if (selectedItem?.id === id) setSelectedItem(s => ({ ...s, is_favorite: !val }))
  }

  async function delItem(id) {
    if (!window.confirm('Bu içeriği silmek istiyor musun?')) return
    await supabase.from('items').delete().eq('id', id)
    setItems(i => i.filter(x => x.id !== id))
    if (selectedItem?.id === id) setSelectedItem(null)
    showToast('Silindi', 'ok')
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
    try {
      // 1. Ücretsiz noembed (Sadece başlık ve resim)
      const r = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(url)}&format=json`)
      const d = await r.json()
      if (d.title) setForm(f => ({ ...f, title: d.title }))
      let thumb = d.thumbnail_url || `https://www.instagram.com/p/${sc}/media/?size=m`
      setForm(f => ({ ...f, thumb }))
      setPrevData({ title: d.title || 'Instagram İçeriği', author: d.author_name, type, thumb })
      
      // 2. Eğer RapidAPI Key varsa, gerçek açıklamayı çek!
      if (rapidApiKey) {
        try {
          const rr = await fetch(`https://instagram-scraper-api2.p.rapidapi.com/v1/post_info?code_or_id_or_url=${sc}`, {
            headers: {
              'X-RapidAPI-Key': rapidApiKey,
              'X-RapidAPI-Host': 'instagram-scraper-api2.p.rapidapi.com'
            }
          })
          const rd = await rr.json()
          const caption = rd.data?.caption?.text || ''
          if (caption) {
            setForm(f => ({ ...f, desc: caption }))
            showToast('Açıklama otomatik çekildi!', 'ok')
          }
        } catch (apiErr) {
          console.error("RapidAPI hatası:", apiErr)
        }
      } else {
        // rapidApiKey yoksa uyarı ver
        showToast('Otomatik açıklama çekmek için RapidAPI Key gerekiyor.', 'warn')
      }
      
    } catch (e) {
      setForm(f => ({ ...f, thumb: `https://www.instagram.com/p/${sc}/media/?size=m` }))
      setPrevData({ title: 'Instagram İçeriği', type })
    }
    setPrevLoading(false)
  }

  async function saveItem() {
    if (!form.title && !form.url) { showToast('Başlık veya URL girin', 'err'); return }
    const { data, error } = await supabase.from('items').insert({
      user_id: session.user.id,
      title: form.title || 'Instagram İçeriği',
      description: form.desc,
      thumbnail_url: form.thumb,
      instagram_url: form.url,
      type: form.type,
      category_id: form.cat || null,
      tags: form.tags,
      is_favorite: false
    }).select().single()
    if (error) { showToast('Hata: ' + error.message, 'err'); return }
    if (data) {
      setItems(i => [data, ...i])
      setShowModal(false)
      setForm({ url:'', title:'', desc:'', thumb:'', type:'post', cat:'', tags:'' })
      setPrevData(null)
      showToast('İçerik eklendi!', 'ok')
    }
  }

  // ── OpenRouter AI Chat ──────────────────────────────
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

  async function updateNote(id, text) {
    setItems(i => i.map(x => x.id === id ? { ...x, notes: text } : x))
    if (selectedItem?.id === id) setSelectedItem(s => ({ ...s, notes: text }))
    const { error } = await supabase.from('items').update({ notes: text }).eq('id', id)
    if (error) showToast('Not kaydedilirken hata oluştu (Önce SQL komutunu çalıştırdığından emin ol)', 'err')
    else showToast('Not kaydedildi', 'ok')
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
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#0a0a0f', color:'#888' }}>
      Yükleniyor...
    </div>
  )

  const it = filtered()

  return (
    <div style={{ fontFamily:'sans-serif' }}>
      <style>{css}</style>

      {/* SIDEBAR */}
      <aside style={{ position:'fixed', left:0, top:0, bottom:0, width:256, background:'#111118', borderRight:'1px solid rgba(255,255,255,0.07)', display:'flex', flexDirection:'column', zIndex:100 }}>

        {/* Logo */}
        <div style={{ padding:'22px 18px 18px', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:9, background:'linear-gradient(135deg,#a855f7,#f472b6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15 }}>📸</div>
          <div>
            <div style={{ fontSize:16, fontWeight:700, color:'#f0f0f5' }}>SavedLens</div>
            <div style={{ fontSize:10, color:'#888899' }}>Instagram Koleksiyonum</div>
          </div>
        </div>

        {/* Nav */}
        <div style={{ padding:'14px 10px 6px' }}>
          <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'1.2px', color:'#888899', padding:'0 8px 7px' }}>Genel</div>
          {[
            ['all', '🏠', 'Tüm İçerikler', items.length],
            ['reels', '🎬', 'Reels', items.filter(i => i.type === 'reel').length],
            ['posts', '🖼️', 'Gönderiler', items.filter(i => i.type !== 'reel').length],
            ['fav', '⭐', 'Favoriler', items.filter(i => i.is_favorite).length],
          ].map(([v, ic, lb, cnt]) => (
            <button key={v} className="navbtn" onClick={() => { setView(v); setCurrentCat(null) }}
              style={{ width:'100%', display:'flex', alignItems:'center', gap:9, padding:'8px 10px', borderRadius:8, border:'none', background: view === v && !currentCat ? 'rgba(192,132,252,.12)' : 'none', color: view === v && !currentCat ? '#c084fc' : '#888899', fontFamily:'sans-serif', fontSize:13, cursor:'pointer', textAlign:'left' }}>
              <span style={{ width:17, textAlign:'center' }}>{ic}</span>
              {lb}
              <span style={{ marginLeft:'auto', fontSize:10, background:'#22222c', padding:'1px 6px', borderRadius:20 }}>{cnt}</span>
            </button>
          ))}
        </div>

        {/* Kategoriler */}
        <div style={{ padding:'10px 10px 4px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'1.2px', color:'#888899', paddingLeft:8 }}>Kategoriler</div>
          <button onClick={() => catInputRef.current?.focus()} style={{ fontSize:10, color:'#a855f7', background:'none', border:'none', cursor:'pointer', paddingRight:8 }}>+ Ekle</button>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:'0 10px' }}>
          {cats.map(c => (
            <div key={c.id} className="catrow" onClick={() => { setCurrentCat(c.id); setView(null) }}
              style={{ display:'flex', alignItems:'center', gap:7, padding:'7px 8px', borderRadius:8, cursor:'pointer', fontSize:13, color: currentCat === c.id ? '#f0f0f5' : '#888899', background: currentCat === c.id ? '#18181f' : 'none' }}>
              <div style={{ width:7, height:7, borderRadius:'50%', background:c.color, flexShrink:0 }}></div>
              <span style={{ flex:1 }}>{c.name}</span>
              <span style={{ fontSize:11, color:'#888899' }}>{items.filter(i => i.category_id === c.id).length}</span>
              <span className="catdel" onClick={e => { e.stopPropagation(); delCat(c.id) }}
                style={{ fontSize:11, color:'#f87171', cursor:'pointer', padding:'0 2px' }}>✕</span>
            </div>
          ))}

          {/* Kategori ekle input */}
          <div style={{ padding:'6px 0' }}>
            <input
              ref={catInputRef}
              style={{ width:'100%', background:'#18181f', border:'1px solid rgba(255,255,255,0.13)', borderRadius:8, padding:'7px 10px', color:'#f0f0f5', fontFamily:'sans-serif', fontSize:12, outline:'none' }}
              placeholder="Yeni kategori adı yaz, Enter'a bas..."
              value={catInput}
              onChange={e => setCatInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addCat() }}
            />
          </div>
        </div>

        {/* Kullanıcı / Profil */}
        <div style={{ padding:'12px 10px', borderTop:'1px solid rgba(255,255,255,0.07)' }}>
          <div 
            onClick={() => { setAvatarInput(profile?.avatar_url || ''); setShowProfile(true); }}
            style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10, padding:6, borderRadius:8, cursor:'pointer', background:'rgba(255,255,255,0.03)' }}>
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="avatar" style={{ width:28, height:28, borderRadius:'50%', objectFit:'cover' }} />
            ) : (
              <div style={{ width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg,#a855f7,#f472b6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:'#fff' }}>
                {(session.user.email || 'U')[0].toUpperCase()}
              </div>
            )}
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:12, color:'#f0f0f5', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontWeight:500 }}>
                {session.user.email?.split('@')[0]}
              </div>
              <div style={{ fontSize:9, color:'#888899' }}>Profili Düzenle</div>
            </div>
          </div>
          
          <button onClick={() => supabase.auth.signOut()}
            style={{ width:'100%', padding:'6px 16px', borderRadius:100, border:'1px solid rgba(255,255,255,0.15)', background:'none', color:'#888899', fontFamily:'sans-serif', fontSize:11, cursor:'pointer' }}>
            Çıkış Yap
          </button>
          <div style={{ marginTop: 16, textAlign: 'center', fontSize: 10, color: 'rgba(255,255,255,0.25)', fontFamily: 'sans-serif', lineHeight: 1.5 }}>
            Created by<br/>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 600, letterSpacing: 0.5 }}>Onur Çağlar Çakın</span>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ marginLeft:256, minHeight:'100vh', background:'#0a0a0f', color:'#f0f0f5' }}>

        {/* Topbar */}
        <div style={{ padding:'18px 28px', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', gap:14, position:'sticky', top:0, background:'rgba(10,10,15,0.92)', backdropFilter:'blur(12px)', zIndex:50 }}>
          <div style={{ fontSize:18, fontWeight:700, flex:1 }}>
            {currentCat ? cats.find(c => c.id === currentCat)?.name : { all:'Tüm İçerikler', reels:'Reels', posts:'Gönderiler', fav:'Favoriler' }[view]}
          </div>
          <input style={{ background:'#18181f', border:'1px solid rgba(255,255,255,0.13)', borderRadius:100, padding:'7px 14px', color:'#f0f0f5', fontFamily:'sans-serif', fontSize:13, outline:'none', width:220 }}
            placeholder="Ara..." value={search} onChange={e => setSearch(e.target.value)} />
          <div style={{ display:'flex', background:'#18181f', borderRadius:8, padding:3, gap:2 }}>
            {['grid','list'].map(v => (
              <button key={v} onClick={() => setGv(v)} style={{ padding:'5px 9px', borderRadius:6, border:'none', cursor:'pointer', background: gv === v ? '#22222c' : 'none', color: gv === v ? '#f0f0f5' : '#888899', fontSize:13 }}>
                {v === 'grid' ? '⊞' : '≡'}
              </button>
            ))}
          </div>

          {profile?.is_admin && (
            <button onClick={() => setShowAdmin(true)}
              style={{ padding:'7px 14px', borderRadius:100, border:'1px solid rgba(251,191,36,.3)', background:'rgba(251,191,36,.08)', color:'#fbbf24', fontFamily:'sans-serif', fontSize:12, fontWeight:500, cursor:'pointer' }}>
              👑 Admin Paneli
            </button>
          )}

          <button onClick={() => setShowModal(true)}
            style={{ padding:'8px 18px', borderRadius:100, border:'none', background:'linear-gradient(135deg,#a855f7,#7c3aed)', color:'#fff', fontFamily:'sans-serif', fontSize:13, fontWeight:500, cursor:'pointer' }}>
            + İçerik Ekle
          </button>
        </div>

        <div style={{ padding:'24px 28px' }}>

          {/* Stats */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:22 }}>
            {[
              ['Toplam', it.length, 'kayıtlı içerik'],
              ['Reels', it.filter(i => i.type === 'reel').length, 'video içerik'],
              ['AI Özet', it.filter(i => i.ai_summary).length, 'özetlendi'],
              ['Kategori', [...new Set(it.map(i => i.category_id).filter(Boolean))].length, 'aktif']
            ].map(([l, v, s]) => (
              <div key={l} style={{ background:'#111118', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, padding:'14px 16px' }}>
                <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.8px', color:'#888899', marginBottom:5 }}>{l}</div>
                <div style={{ fontSize:24, fontWeight:700 }}>{v}</div>
                <div style={{ fontSize:10, color:'#888899', marginTop:2 }}>{s}</div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div style={{ display:'flex', gap:7, marginBottom:18, flexWrap:'wrap' }}>
            {[['all','Tümü'],['reel','🎬 Reels'],['post','🖼️ Gönderi'],['carousel','📱 Carousel'],['nocat','⚡ Kategorisiz'],['noai','🤖 Özetsiz']].map(([id, lb]) => (
              <button key={id} onClick={() => setTf(id)}
                style={{ padding:'4px 11px', borderRadius:100, fontSize:11, cursor:'pointer', border:`1px solid ${tf === id ? '#a855f7' : 'rgba(255,255,255,0.13)'}`, background: tf === id ? 'rgba(168,85,247,.12)' : 'none', color: tf === id ? '#c084fc' : '#888899', fontFamily:'sans-serif' }}>
                {lb}
              </button>
            ))}
          </div>

          {/* Cards */}
          {it.length === 0 ? (
            <div style={{ textAlign:'center', padding:'70px 20px', color:'#888899' }}>
              <div style={{ fontSize:44, opacity:.25, marginBottom:12 }}>📭</div>
              <div style={{ fontSize:17, fontWeight:600, opacity:.5, marginBottom:8 }}>Henüz içerik yok</div>
              <div style={{ fontSize:13 }}>Sağ üstteki "+ İçerik Ekle" ile başla</div>
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns: gv === 'grid' ? 'repeat(auto-fill,minmax(270px,1fr))' : '1fr', gap:14 }}>
              {it.map(item => {
                const cat = cats.find(c => c.id === item.category_id)
                const tl = item.type === 'reel' ? 'Reels' : item.type === 'carousel' ? 'Carousel' : 'Gönderi'
                const tc = item.type === 'reel' ? 'rgba(244,114,182,.22)' : item.type === 'carousel' ? 'rgba(45,212,191,.18)' : 'rgba(192,132,252,.22)'
                const proxied = item.thumbnail_url ? `https://images.weserv.nl/?url=${encodeURIComponent(item.thumbnail_url)}&w=400&h=400&fit=cover` : null
                return (
                  <div key={item.id} className="card"
                    onClick={() => { setSelectedItem(item); setTempNote(item.notes || ''); }}
                    style={{ background:'#111118', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, overflow:'hidden', display: gv === 'list' ? 'flex' : 'block' }}>
                    {/* Thumbnail */}
                    <div style={{ position:'relative', aspectRatio: gv === 'list' ? 'unset' : '1/1', width: gv === 'list' ? 96 : '100%', height: gv === 'list' ? 96 : 'auto', background:'#18181f', flexShrink:0, overflow:'hidden' }}>
                      {proxied
                        ? <img src={proxied} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} onError={e => e.target.style.display = 'none'} />
                        : <div style={{ width:'100%', height:'100%', minHeight:100, display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, color:'#888899' }}>{item.type === 'reel' ? '🎬' : '🖼️'}</div>
                      }
                      <div style={{ position:'absolute', top:7, left:7, padding:'2px 7px', borderRadius:100, fontSize:9, fontWeight:600, background:tc, color:'#f0f0f5', textTransform:'uppercase', letterSpacing:.5 }}>{tl}</div>
                      {/* item.ai_summary kaldırıldı. ✨ ikonu gizlendi */}
                    </div>

                    {/* Body */}
                    <div style={{ padding:'12px 13px 10px', flex:1, minWidth:0 }}>
                      {cat && (
                        <div style={{ fontSize:9, textTransform:'uppercase', letterSpacing:'.8px', color:'#888899', marginBottom:5, display:'flex', alignItems:'center', gap:4 }}>
                          <div style={{ width:5, height:5, borderRadius:'50%', background:cat.color }}></div>
                          {cat.name}
                        </div>
                      )}
                      <div style={{ fontSize:13, fontWeight:500, lineHeight:1.4, marginBottom:5, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{item.title || 'Başlıksız'}</div>
                      {item.description && <div style={{ fontSize:11, color:'#888899', lineHeight:1.6, display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{item.description}</div>}
                      {item.tags && (
                        <div style={{ display:'flex', flexWrap:'wrap', gap:3, marginTop:7 }}>
                          {item.tags.split(',').map(t => <span key={t} style={{ padding:'2px 7px', background:'#22222c', borderRadius:100, fontSize:9, color:'#888899' }}>{t.trim()}</span>)}
                        </div>
                      )}

                      {/* AI Chat Button */}
                      <div style={{ borderTop:'1px solid rgba(255,255,255,0.07)', marginTop:9, paddingTop:9 }}>
                        <button onClick={e => { e.stopPropagation(); setChatObj({ open:true, item, messages:[], input:'', loading:false }) }}
                          style={{ width:'100%', padding:'7px', borderRadius:8, border:'1px solid rgba(168,85,247,0.3)', background:'rgba(168,85,247,0.08)', color:'#c084fc', cursor:'pointer', fontSize:11, fontWeight:600, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                          🤖 AI'a Sor
                        </button>
                      </div>

                      {/* Footer */}
                      <div style={{ display:'flex', alignItems:'center', gap:7, marginTop:9 }}>
                        <span style={{ fontSize:10, color:'#888899' }}>{new Date(item.created_at).toLocaleDateString('tr-TR')}</span>
                        <div className="actbtn" style={{ marginLeft:'auto', display:'flex', gap:3 }}>
                          <button onClick={e => { e.stopPropagation(); toggleFav(item.id, item.is_favorite) }}
                            style={{ width:24, height:24, borderRadius:6, border:'1px solid rgba(255,255,255,0.13)', background:'#18181f', color:'#888899', cursor:'pointer', fontSize:11, display:'flex', alignItems:'center', justifyContent:'center' }}>
                            {item.is_favorite ? '⭐' : '☆'}
                          </button>
                          {item.instagram_url && (
                            <button onClick={e => { e.stopPropagation(); window.open(item.instagram_url, '_blank') }}
                              style={{ width:24, height:24, borderRadius:6, border:'1px solid rgba(255,255,255,0.13)', background:'#18181f', color:'#888899', cursor:'pointer', fontSize:11, display:'flex', alignItems:'center', justifyContent:'center' }}>↗</button>
                          )}
                          <button onClick={e => { e.stopPropagation(); delItem(item.id) }}
                            style={{ width:24, height:24, borderRadius:6, border:'1px solid rgba(255,255,255,0.13)', background:'#18181f', color:'#f87171', cursor:'pointer', fontSize:11, display:'flex', alignItems:'center', justifyContent:'center' }}>🗑</button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>

      {/* ── INSTAGRAM-STYLE DETAIL POPUP ─────────────────────────────────────── */}
      {selectedItem && (() => {
        const item = selectedItem
        const cat = cats.find(c => c.id === item.category_id)
        const tl = item.type === 'reel' ? 'Reels' : item.type === 'carousel' ? 'Carousel' : 'Gönderi'
        const tc = item.type === 'reel' ? '#f472b6' : item.type === 'carousel' ? '#2dd4bf' : '#c084fc'
        const proxied = item.thumbnail_url ? `https://images.weserv.nl/?url=${encodeURIComponent(item.thumbnail_url)}&w=900&h=900&fit=cover` : null
        const avatarLetter = (session.user.email || 'U')[0].toUpperCase()
        return (
          <div
            onClick={e => e.target === e.currentTarget && setSelectedItem(null)}
            style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.82)', backdropFilter:'blur(10px)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
            <div className="detail-panel" style={{ background:'#111118', border:'1px solid rgba(255,255,255,0.1)', borderRadius:18, width:'min(900px,95vw)', maxHeight:'92vh', display:'flex', overflow:'hidden', boxShadow:'0 32px 80px rgba(0,0,0,.7)' }}>

              {/* LEFT — Image */}
              <div style={{ width:'50%', background:'#0a0a0f', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', minHeight:400 }}>
                {proxied
                  ? <img src={proxied} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} onError={e => e.target.style.opacity = '0'} />
                  : <div style={{ fontSize:64, opacity:.18 }}>{item.type === 'reel' ? '🎬' : '🖼️'}</div>
                }
              </div>

              {/* RIGHT — Detail */}
              <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>

                {/* Header */}
                <div style={{ padding:'16px 18px', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', gap:11, flexShrink:0 }}>
                  <div style={{ width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg,#a855f7,#f472b6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, color:'#fff', flexShrink:0 }}>
                    {avatarLetter}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:'#f0f0f5', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                      {session.user.email?.split('@')[0]}
                    </div>
                    <div style={{ fontSize:10, color:'#888899' }}>
                      {new Date(item.created_at).toLocaleDateString('tr-TR', { year:'numeric', month:'long', day:'numeric' })}
                    </div>
                  </div>
                  {/* Type badge */}
                  <div style={{ padding:'3px 10px', borderRadius:100, fontSize:9, fontWeight:700, background:`${tc}22`, color:tc, textTransform:'uppercase', letterSpacing:.6, border:`1px solid ${tc}44`, flexShrink:0 }}>
                    {tl}
                  </div>
                  <button onClick={() => setSelectedItem(null)}
                    style={{ width:28, height:28, borderRadius:'50%', border:'1px solid rgba(255,255,255,0.13)', background:'#18181f', color:'#888899', cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>✕</button>
                </div>

                {/* Scrollable content */}
                <div style={{ flex:1, overflowY:'auto', padding:'16px 18px' }}>

                  {/* Category */}
                  {cat && (
                    <div style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px', background:'#18181f', borderRadius:100, fontSize:10, color:'#888899', marginBottom:12, border:'1px solid rgba(255,255,255,0.08)' }}>
                      <div style={{ width:6, height:6, borderRadius:'50%', background:cat.color }}></div>
                      {cat.name}
                    </div>
                  )}

                  {/* Title */}
                  {item.title && (
                    <div style={{ fontSize:15, fontWeight:600, color:'#f0f0f5', lineHeight:1.5, marginBottom:10 }}>
                      {item.title}
                    </div>
                  )}

                  {/* Description */}
                  <div className="ig-desc" style={{ fontSize:13, color: item.description ? '#c0c0cc' : '#555566', lineHeight:1.8, fontStyle: item.description ? 'normal' : 'italic', marginBottom:14 }}>
                    {item.description || 'Bu gönderinin açıklaması bulunmuyor.'}
                  </div>

                  {/* Tags */}
                  {item.tags && (
                    <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:14 }}>
                      {item.tags.split(',').map(t => (
                        <span key={t} style={{ padding:'3px 10px', background:'rgba(168,85,247,.1)', border:'1px solid rgba(168,85,247,.2)', borderRadius:100, fontSize:10, color:'#a855f7' }}>
                          #{t.trim()}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Notes */}
                  <div style={{ marginTop:14, background:'#18181f', border:'1px solid rgba(255,255,255,0.08)', borderRadius:12, padding:14 }}>
                    <div style={{ fontSize:11, textTransform:'uppercase', letterSpacing:'.8px', color:'#888899', marginBottom:8, display:'flex', alignItems:'center', gap:5 }}>
                      <span>📝</span> Kişisel Notlar
                    </div>
                    <textarea 
                      placeholder="Bu içerik hakkında kendi notlarınızı buraya yazın..."
                      value={tempNote}
                      onChange={e => setTempNote(e.target.value)}
                      style={{ width:'100%', minHeight:90, background:'transparent', border:'none', color:'#f0f0f5', fontFamily:'sans-serif', fontSize:13, outline:'none', resize:'vertical', lineHeight:1.6, marginBottom:10 }}
                    />
                    <div style={{ display:'flex', justifyContent:'flex-end' }}>
                      <button onClick={() => updateNote(item.id, tempNote)}
                        disabled={tempNote === (item.notes || '')}
                        style={{ padding:'6px 14px', borderRadius:100, border:'1px solid rgba(168,85,247,.4)', background: tempNote === (item.notes || '') ? 'transparent' : 'rgba(168,85,247,.15)', color: tempNote === (item.notes || '') ? '#888899' : '#c084fc', cursor: tempNote === (item.notes || '') ? 'not-allowed' : 'pointer', fontSize:11, fontWeight:600, transition:'all .2s' }}>
                        {tempNote === (item.notes || '') ? 'Kaydedildi' : 'Kaydet'}
                      </button>
                    </div>
                  </div>

                  {/* AI Chat Feature */}
                  <div style={{ marginTop:14 }}>
                    <button onClick={() => { setChatObj({ open:true, item, messages:[], input:'', loading:false }); setSelectedItem(null); }}
                      style={{ width:'100%', padding:'12px', borderRadius:12, border:'1px solid rgba(168,85,247,0.3)', background:'rgba(168,85,247,0.08)', color:'#c084fc', fontFamily:'sans-serif', fontSize:13, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                      🤖 Bu İçerik Hakkında AI ile Sohbet Et
                    </button>
                  </div>
                </div>

                {/* Actions footer */}
                <div style={{ padding:'12px 18px', borderTop:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                  <button onClick={() => toggleFav(item.id, item.is_favorite)}
                    style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 12px', borderRadius:100, border:'1px solid rgba(255,255,255,0.13)', background: item.is_favorite ? 'rgba(251,191,36,.1)' : '#18181f', color: item.is_favorite ? '#fbbf24' : '#888899', fontFamily:'sans-serif', fontSize:12, cursor:'pointer' }}>
                    {item.is_favorite ? '⭐' : '☆'} {item.is_favorite ? 'Favoride' : 'Favori'}
                  </button>
                  {item.instagram_url && (
                    <button onClick={() => window.open(item.instagram_url, '_blank')}
                      style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 12px', borderRadius:100, border:'1px solid rgba(255,255,255,0.13)', background:'#18181f', color:'#888899', fontFamily:'sans-serif', fontSize:12, cursor:'pointer' }}>
                      ↗ Instagram'da Aç
                    </button>
                  )}
                  <div style={{ marginLeft:'auto' }}>
                    <button onClick={() => delItem(item.id)}
                      style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 12px', borderRadius:100, border:'1px solid rgba(248,113,113,.3)', background:'rgba(248,113,113,.08)', color:'#f87171', fontFamily:'sans-serif', fontSize:12, cursor:'pointer' }}>
                      🗑 Sil
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ADD MODAL */}
      {showModal && (
        <div onClick={e => e.target === e.currentTarget && setShowModal(false)}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.72)', backdropFilter:'blur(6px)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'#111118', border:'1px solid rgba(255,255,255,0.13)', borderRadius:16, width:520, maxWidth:'95vw', maxHeight:'90vh', overflowY:'auto' }}>
            <div style={{ padding:'18px 22px 0', display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
              <div style={{ fontSize:15, fontWeight:700 }}>İçerik Ekle</div>
              <button onClick={() => setShowModal(false)} style={{ background:'none', border:'none', color:'#888899', cursor:'pointer', fontSize:17 }}>✕</button>
            </div>
            <div style={{ padding:'14px 22px 22px' }}>
              {/* Tabs */}
              <div style={{ display:'flex', gap:4, marginBottom:18 }}>
                {[['link','🔗 Link ile'],['man','✍️ Manuel']].map(([t, l]) => (
                  <button key={t} onClick={() => setTab(t)}
                    style={{ flex:1, padding:7, borderRadius:8, border:`1px solid ${tab === t ? '#a855f7' : 'rgba(255,255,255,0.13)'}`, background: tab === t ? 'rgba(168,85,247,.12)' : 'none', color: tab === t ? '#c084fc' : '#888899', fontFamily:'sans-serif', fontSize:12, cursor:'pointer' }}>
                    {l}
                  </button>
                ))}
              </div>

              {tab === 'link' ? (
                <div style={{ marginBottom:14 }}>
                  <label style={{ fontSize:11, color:'#888899', display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:.5 }}>Instagram URL</label>
                  <input style={{ width:'100%', background:'#18181f', border:'1px solid rgba(255,255,255,0.13)', borderRadius:8, padding:'9px 11px', color:'#f0f0f5', fontFamily:'sans-serif', fontSize:13, outline:'none' }}
                    placeholder="https://www.instagram.com/p/..." value={form.url}
                    onChange={e => { setForm(f => ({ ...f, url: e.target.value })); schedulePreview(e.target.value) }} />
                  {prevLoading && <div style={{ fontSize:11, color:'#888899', marginTop:8, display:'flex', alignItems:'center', gap:6 }}><div style={{ width:11, height:11, border:'1.5px solid rgba(255,255,255,0.13)', borderTopColor:'#a855f7', borderRadius:'50%', animation:'spin .8s linear infinite' }}></div>Önizleme yükleniyor...</div>}
                  {prevData && (
                    <div style={{ background:'#18181f', border:'1px solid rgba(255,255,255,0.13)', borderRadius:8, padding:12, marginTop:10, display:'flex', alignItems:'center', gap:12 }}>
                      {form.thumb && <img src={`https://images.weserv.nl/?url=${encodeURIComponent(form.thumb)}&w=128&h=128&fit=cover`} alt="" style={{ width:56, height:56, borderRadius:8, objectFit:'cover', flexShrink:0 }} onError={e => e.target.style.display = 'none'} />}
                      <div>
                        <div style={{ fontSize:13, fontWeight:500, marginBottom:3 }}>{prevData.title}</div>
                        <div style={{ fontSize:11, color:'#888899' }}>{prevData.author ? `@${prevData.author} · ` : ''}{prevData.type === 'reel' ? '🎬 Reels' : '🖼️ Gönderi'}</div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div style={{ marginBottom:14 }}>
                    <label style={{ fontSize:11, color:'#888899', display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:.5 }}>Başlık</label>
                    <input style={{ width:'100%', background:'#18181f', border:'1px solid rgba(255,255,255,0.13)', borderRadius:8, padding:'9px 11px', color:'#f0f0f5', fontFamily:'sans-serif', fontSize:13, outline:'none' }}
                      placeholder="İçerik başlığı..." value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                  </div>
                  <div style={{ marginBottom:14 }}>
                    <label style={{ fontSize:11, color:'#888899', display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:.5 }}>Açıklama</label>
                    <textarea style={{ width:'100%', background:'#18181f', border:'1px solid rgba(255,255,255,0.13)', borderRadius:8, padding:'9px 11px', color:'#f0f0f5', fontFamily:'sans-serif', fontSize:13, outline:'none', resize:'vertical' }}
                      rows={3} placeholder="İçeriğin açıklaması..." value={form.desc} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))} />
                  </div>
                  <div style={{ marginBottom:14 }}>
                    <label style={{ fontSize:11, color:'#888899', display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:.5 }}>Thumbnail URL</label>
                    <input style={{ width:'100%', background:'#18181f', border:'1px solid rgba(255,255,255,0.13)', borderRadius:8, padding:'9px 11px', color:'#f0f0f5', fontFamily:'sans-serif', fontSize:13, outline:'none' }}
                      placeholder="https://..." value={form.thumb} onChange={e => setForm(f => ({ ...f, thumb: e.target.value }))} />
                  </div>
                </>
              )}

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
                <div>
                  <label style={{ fontSize:11, color:'#888899', display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:.5 }}>Tür</label>
                  <select style={{ width:'100%', background:'#18181f', border:'1px solid rgba(255,255,255,0.13)', borderRadius:8, padding:'9px 11px', color:'#f0f0f5', fontFamily:'sans-serif', fontSize:13, outline:'none' }}
                    value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                    <option value="post">Gönderi</option>
                    <option value="reel">Reels</option>
                    <option value="carousel">Carousel</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize:11, color:'#888899', display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:.5 }}>Kategori</label>
                  <select style={{ width:'100%', background:'#18181f', border:'1px solid rgba(255,255,255,0.13)', borderRadius:8, padding:'9px 11px', color:'#f0f0f5', fontFamily:'sans-serif', fontSize:13, outline:'none' }}
                    value={form.cat} onChange={e => setForm(f => ({ ...f, cat: e.target.value }))}>
                    <option value="">Seç...</option>
                    {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:11, color:'#888899', display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:.5 }}>Etiketler (virgülle ayır)</label>
                <input style={{ width:'100%', background:'#18181f', border:'1px solid rgba(255,255,255,0.13)', borderRadius:8, padding:'9px 11px', color:'#f0f0f5', fontFamily:'sans-serif', fontSize:13, outline:'none' }}
                  placeholder="yemek, tarif, kolay..." value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
              </div>

              <div style={{ display:'flex', gap:7, justifyContent:'flex-end', marginTop:18 }}>
                <button onClick={() => setShowModal(false)}
                  style={{ padding:'8px 16px', borderRadius:100, border:'1px solid rgba(255,255,255,0.15)', background:'none', color:'#888899', fontFamily:'sans-serif', fontSize:13, cursor:'pointer' }}>İptal</button>
                <button onClick={saveItem}
                  style={{ padding:'8px 18px', borderRadius:100, border:'none', background:'linear-gradient(135deg,#a855f7,#7c3aed)', color:'#fff', fontFamily:'sans-serif', fontSize:13, fontWeight:500, cursor:'pointer' }}>Kaydet</button>
              </div>
            </div>
          </div>
        </div>
      )}



      {/* AI CHAT MODAL */}
      {chatObj.open && (
        <div onClick={e => e.target === e.currentTarget && setChatObj(c => ({ ...c, open:false }))}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.72)', backdropFilter:'blur(6px)', zIndex:400, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div style={{ background:'#111118', border:'1px solid rgba(168,85,247,0.2)', borderRadius:16, width:500, maxWidth:'95vw', height:'85vh', display:'flex', flexDirection:'column', boxShadow:'0 32px 80px rgba(0,0,0,.7)' }}>
            <div style={{ padding:'16px 20px', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
              <div style={{ width:34, height:34, borderRadius:'50%', background:'linear-gradient(135deg,#a855f7,#f472b6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>🤖</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:15, fontWeight:700, color:'#f0f0f5' }}>AI Asistan</div>
                <div style={{ fontSize:10, color:'#888899', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{chatObj.item?.title || 'Instagram İçeriği'}</div>
              </div>
              <button onClick={() => setChatObj(c => ({ ...c, open:false }))} style={{ background:'none', border:'none', color:'#888899', cursor:'pointer', fontSize:17 }}>✕</button>
            </div>
            
            <div style={{ flex:1, overflowY:'auto', padding:'20px', display:'flex', flexDirection:'column', gap:12 }}>
              <div style={{ background:'rgba(168,85,247,.08)', border:'1px solid rgba(168,85,247,.2)', borderRadius:12, padding:'12px 14px', fontSize:13, color:'#c084fc', alignSelf:'center', textAlign:'center', maxWidth:'85%' }}>
                Merhaba! Bu gönderi hakkında bana her şeyi sorabilirsin. Örneğin: "Buradaki tarifi 2 kişilik yap" veya "Uygulama isimlerini listele."
              </div>
              {chatObj.messages.map((m, i) => (
                <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', background: m.role === 'user' ? '#22222c' : '#18181f', border:`1px solid ${m.role === 'user' ? 'rgba(255,255,255,0.1)' : 'rgba(168,85,247,0.15)'}`, borderRadius:12, padding:'10px 14px', fontSize:13, color:'#f0f0f5', maxWidth:'85%', lineHeight:1.5, whiteSpace:'pre-wrap' }}>
                  {m.content}
                </div>
              ))}
              {chatObj.loading && (
                <div style={{ alignSelf:'flex-start', background:'#18181f', border:'1px solid rgba(168,85,247,0.15)', borderRadius:12, padding:'10px 14px', fontSize:13, color:'#888899', display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:12, height:12, border:'1.5px solid rgba(168,85,247,0.3)', borderTopColor:'#a855f7', borderRadius:'50%', animation:'spin .8s linear infinite' }}></div>
                  AI yazıyor...
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            
            <div style={{ padding:'14px 20px', borderTop:'1px solid rgba(255,255,255,0.07)', display:'flex', gap:10, flexShrink:0 }}>
              <input 
                placeholder="Bir soru sor..."
                value={chatObj.input}
                onChange={e => setChatObj(c => ({ ...c, input: e.target.value }))}
                onKeyDown={e => { if(e.key === 'Enter') handleSendChatMessage() }}
                style={{ flex:1, background:'#18181f', border:'1px solid rgba(255,255,255,0.13)', borderRadius:100, padding:'10px 16px', color:'#f0f0f5', fontFamily:'sans-serif', fontSize:13, outline:'none' }}
              />
              <button 
                onClick={handleSendChatMessage}
                disabled={chatObj.loading || !chatObj.input.trim()}
                style={{ width:40, height:40, borderRadius:'50%', background:'linear-gradient(135deg,#a855f7,#7c3aed)', border:'none', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', cursor: (chatObj.loading || !chatObj.input.trim()) ? 'not-allowed' : 'pointer', opacity: (chatObj.loading || !chatObj.input.trim()) ? 0.5 : 1 }}>
                ➤
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PROFILE SETTINGS MODAL */}
      {showProfile && (
        <div onClick={e => e.target === e.currentTarget && setShowProfile(false)}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.72)', backdropFilter:'blur(6px)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'#111118', border:'1px solid rgba(255,255,255,0.13)', borderRadius:16, width:400, maxWidth:'95vw', padding:'18px 22px 22px' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
              <div style={{ fontSize:15, fontWeight:700 }}>Profil Kişiselleştirme</div>
              <button onClick={() => setShowProfile(false)} style={{ background:'none', border:'none', color:'#888899', cursor:'pointer', fontSize:17 }}>✕</button>
            </div>
            
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
              {avatarInput ? (
                <img src={avatarInput} alt="avatar" style={{ width:56, height:56, borderRadius:'50%', objectFit:'cover' }} onError={e => e.target.style.display='none'} />
              ) : (
                <div style={{ width:56, height:56, borderRadius:'50%', background:'linear-gradient(135deg,#a855f7,#f472b6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, fontWeight:700, color:'#fff' }}>
                  {(session.user.email || 'U')[0].toUpperCase()}
                </div>
              )}
            </div>
            
            <label style={{ fontSize:11, color:'#888899', display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:.5 }}>Profil Fotoğrafı URL</label>
            <input placeholder="https://resim-url.com/foto.jpg"
              style={{ width:'100%', background:'#18181f', border:'1px solid rgba(255,255,255,0.13)', borderRadius:8, padding:'9px 11px', color:'#f0f0f5', fontFamily:'sans-serif', fontSize:13, outline:'none', marginBottom:16 }}
              value={avatarInput} onChange={e => setAvatarInput(e.target.value)} />
            
            <div style={{ display:'flex', gap:7, justifyContent:'flex-end' }}>
              <button onClick={() => setShowProfile(false)}
                style={{ padding:'8px 16px', borderRadius:100, border:'1px solid rgba(255,255,255,0.15)', background:'none', color:'#888899', fontFamily:'sans-serif', fontSize:13, cursor:'pointer' }}>İptal</button>
              <button onClick={async () => {
                const { error } = await supabase.from('profiles').update({ avatar_url: avatarInput }).eq('id', session.user.id)
                if(!error) { setProfile(p => ({...p, avatar_url: avatarInput})); showToast('Profil güncellendi', 'ok'); setShowProfile(false); }
                else showToast('Hata: '+error.message, 'err')
              }}
                style={{ padding:'8px 18px', borderRadius:100, border:'none', background:'linear-gradient(135deg,#a855f7,#7c3aed)', color:'#fff', fontFamily:'sans-serif', fontSize:13, fontWeight:500, cursor:'pointer' }}>Kaydet</button>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN MODAL */}
      {showAdmin && (
        <div onClick={e => e.target === e.currentTarget && setShowAdmin(false)}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.72)', backdropFilter:'blur(6px)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'#111118', border:'1px solid rgba(255,255,255,0.13)', borderRadius:16, width:600, maxWidth:'95vw', maxHeight:'80vh', display:'flex', flexDirection:'column' }}>
            <div style={{ padding:'18px 22px 14px', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ fontSize:15, fontWeight:700, display:'flex', alignItems:'center', gap:8 }}>👑 Admin Paneli - Gemiye Binenler <span style={{ background:'rgba(251,191,36,.1)', color:'#fbbf24', padding:'2px 8px', borderRadius:100, fontSize:10 }}>{allUsers.length} Üye</span></div>
              <button onClick={() => setShowAdmin(false)} style={{ background:'none', border:'none', color:'#888899', cursor:'pointer', fontSize:17 }}>✕</button>
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:'14px 22px 22px' }}>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {allUsers.map(u => (
                  <div key={u.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', background:'#18181f', borderRadius:12, border:'1px solid rgba(255,255,255,0.05)' }}>
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt="" style={{ width:38, height:38, borderRadius:'50%', objectFit:'cover' }} />
                    ) : (
                      <div style={{ width:38, height:38, borderRadius:'50%', background:'linear-gradient(135deg,#a855f7,#f472b6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, color:'#fff' }}>
                        {(u.email || 'U')[0].toUpperCase()}
                      </div>
                    )}
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:14, fontWeight:500, color:'#f0f0f5', display:'flex', alignItems:'center', gap:6 }}>
                        {u.email}
                        {u.is_admin && <span style={{ background:'rgba(251,191,36,.1)', color:'#fbbf24', padding:'1px 6px', borderRadius:100, fontSize:9, fontWeight:700 }}>ADMIN</span>}
                      </div>
                      <div style={{ fontSize:10, color:'#888899', marginTop:2 }}>Katılım: {new Date(u.created_at).toLocaleDateString('tr-TR')}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast.show && (
        <div style={{ position:'fixed', bottom:22, right:22, background:'#18181f', border:`1px solid ${toast.type === 'ok' ? 'rgba(74,222,128,.28)' : toast.type === 'err' ? 'rgba(248,113,113,.28)' : 'rgba(251,191,36,.28)'}`, borderRadius:12, padding:'11px 16px', fontSize:13, zIndex:999, color: toast.type === 'ok' ? '#4ade80' : toast.type === 'err' ? '#f87171' : '#fbbf24' }}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}