import { useEffect, useState, useRef } from 'react'
import { supabase } from '../supabase'

const PAL = ['#c084fc','#f472b6','#2dd4bf','#fbbf24','#4ade80','#f87171','#60a5fa','#a78bfa','#34d399','#fb923c']

const css = `
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeIn { from { opacity:0; transform:scale(.98); } to { opacity:1; transform:scale(1); } }
  @keyframes slideIn { from { transform: translateX(20px); opacity:0; } to { transform: translateX(0); opacity:1; } }
  
  * { box-sizing: border-box; }
  body { margin:0; padding:0; background:#0a0a0f; color:#f0f0f5; -webkit-font-smoothing: antialiased; }
  
  .glass { background: rgba(17, 17, 24, 0.8); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.07); }
  .card:hover { border-color: rgba(168, 85, 247, 0.3) !important; transform: translateY(-4px); box-shadow: 0 20px 40px rgba(0,0,0,0.4); }
  .card { transition: all .3s cubic-bezier(0.4, 0, 0.2, 1); cursor: pointer; }
  .actbtn { opacity: 0; transition: all .2s; transform: translateY(5px); }
  .card:hover .actbtn { opacity: 1; transform: translateY(0); }
  .navbtn:hover { background: rgba(255,255,255,0.05) !important; color: #fff !important; }
  
  .primary-gradient { background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%); }
  .secondary-gradient { background: linear-gradient(135deg, #f472b6 0%, #a855f7 100%); }
  
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-thumb { background: rgba(168, 85, 247, 0.2); border-radius: 10px; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(168, 85, 247, 0.4); }
  
  input::placeholder { color: rgba(255,255,255,0.2) !important; }
  .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .line-clamp-3 { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
`

export default function Dashboard({ session }) {
  const [items, setItems] = useState([])
  const [cats, setCats] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('gallery')
  const [currentCat, setCurrentCat] = useState(null)
  const [gv, setGv] = useState('grid')
  const [search, setSearch] = useState('')
  const [tf, setTf] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [tab, setTab] = useState('link')
  
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY || import.meta.env.VITE_OPENROUTER_KEY || ''
  const rapidApiKey = import.meta.env.VITE_RAPIDAPI_KEY || ''
  const [form, setForm] = useState({ url:'', title:'', desc:'', thumb:'', type:'post', cat:'', tags:'' })
  const [catInput, setCatInput] = useState('')
  const [toast, setToast] = useState({ show:false, msg:'', type:'ok' })
  const [prevData, setPrevData] = useState(null)
  const [prevLoading, setPrevLoading] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  
  const [profile, setProfile] = useState(null)
  const [tempNote, setTempNote] = useState('')
  const [chatObj, setChatObj] = useState({ open:false, item:null, messages:[], input:'', loading:false })
  const chatEndRef = useRef(null)
  const pvtRef = useRef(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const uid = session.user.id
    const [{ data: c }, { data: i }, { data: p }] = await Promise.all([
      supabase.from('categories').select('*').eq('user_id', uid).order('created_at'),
      supabase.from('items').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').eq('id', uid).single()
    ])
    setCats(c || [])
    setItems(i || [])
    if (p) setProfile(p)
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
    if (error) { showToast('Hata oluştu', 'err'); return }
    if (data) {
      setCats(c => [...c, data])
      setCatInput('')
      showToast('Kategori eklendi!', 'ok')
    }
  }

  async function toggleFav(id, val) {
    await supabase.from('items').update({ is_favorite: !val }).eq('id', id)
    setItems(prev => prev.map(x => x.id === id ? { ...x, is_favorite: !val } : x))
    if (selectedItem?.id === id) setSelectedItem(s => ({ ...s, is_favorite: !val }))
  }

  async function delItem(id) {
    if (!window.confirm('Emin misin?')) return
    await supabase.from('items').delete().eq('id', id)
    setItems(i => i.filter(x => x.id !== id))
    if (selectedItem?.id === id) setSelectedItem(null)
    showToast('Silindi', 'ok')
  }

  function handleUrlChange(url) {
    setForm(f => ({ ...f, url }))
    clearTimeout(pvtRef.current)
    if (url.includes('instagram.com')) pvtRef.current = setTimeout(() => previewURL(url), 800)
  }

  async function previewURL(url) {
    const m = url.match(/\/(p|reel|tv|reels)\/([A-Za-z0-9_-]+)/)
    if (!m) return
    const sc = m[2]
    const type = url.includes('/reel/') || url.includes('/reels/') ? 'reel' : 'post'
    setPrevLoading(true)
    setForm(f => ({ ...f, type }))

    try {
      const r = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(url)}&format=json`)
      const d = await r.json()
      const thumb = d.thumbnail_url || `https://www.instagram.com/p/${sc}/media/?size=m`
      setForm(f => ({ ...f, title: d.title || `Instagram ${type}`, thumb }))
      setPrevData({ title: d.title || 'Instagram İçeriği', author: d.author_name, type, thumb })
    } catch (e) {
      setForm(f => ({ ...f, thumb: `https://www.instagram.com/p/${sc}/media/?size=m` }))
    }

    if (rapidApiKey) {
      try {
        const rr = await fetch(`https://instagram-scraper-api2.p.rapidapi.com/v1/post_info?code_or_id_or_url=${sc}`, {
          headers: { 'X-RapidAPI-Key': rapidApiKey, 'X-RapidAPI-Host': 'instagram-scraper-api2.p.rapidapi.com' }
        })
        const rd = await rr.json()
        if (rr.ok) {
          const caption = rd.data?.caption?.text || ''
          const highRes = rd.data?.display_url || rd.data?.thumbnail_url
          if (caption) setForm(f => ({ ...f, desc: caption }))
          if (highRes) {
            setForm(f => ({ ...f, thumb: highRes }))
            setPrevData(p => p ? { ...p, thumb: highRes } : null)
          }
          showToast('Instagram verileri çekildi!', 'ok')
        }
      } catch (err) { console.error(err) }
    }
    setPrevLoading(false)
  }

  async function saveItem() {
    if (!form.title && !form.url) return
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
    if (error) { showToast(error.message, 'err'); return }
    if (data) {
      setItems(i => [data, ...i])
      setShowModal(false)
      setForm({ url:'', title:'', desc:'', thumb:'', type:'post', cat:'', tags:'' })
      setPrevData(null)
      showToast('Koleksiyona eklendi!', 'ok')
    }
  }

  async function handleSendChatMessage(item) {
    const { input, messages } = chatObj
    if (!input.trim() || !apiKey) return
    const userMsg = { role: 'user', content: input.trim() }
    setChatObj(c => ({ ...c, messages: [...c.messages, userMsg], input: '', loading: true }))
    
    const cat = cats.find(c => c.id === item?.category_id)
    const sysPrompt = `Sen bir SavedLens asistanısın. Bağlam: ${item.title}. Açıklama: ${item.description}. Kategori: ${cat?.name || ''}.`

    try {
      const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}`, 'HTTP-Referer': window.location.origin },
        body: JSON.stringify({
          model: 'openrouter/free',
          max_tokens: 800,
          messages: [{ role: 'system', content: sysPrompt }, ...messages, userMsg]
        })
      })
      const d = await r.json()
      const reply = d.choices?.[0]?.message?.content || 'Yanıt yok.'
      setChatObj(c => ({ ...c, messages: [...c.messages, { role: 'assistant', content: reply }], loading: false }))
    } catch (e) {
      setChatObj(c => ({ ...c, loading: false }))
    }
  }

  async function updateNote(id, text) {
    setItems(i => i.map(x => x.id === id ? { ...x, notes: text } : x))
    await supabase.from('items').update({ notes: text }).eq('id', id)
    showToast('Not kaydedildi', 'ok')
  }

  const it = items.filter(i => {
    if (currentCat && i.category_id !== currentCat) return false
    if (view === 'reels' && i.type !== 'reel') return false
    if (view === 'posts' && i.type === 'reel') return false
    if (view === 'fav' && !i.is_favorite) return false
    return (i.title + (i.description||'') + (i.tags||'')).toLowerCase().includes(search.toLowerCase())
  })

  // Helper for Proxied Images
  function prox(url, w=600) {
    if(!url) return null
    return `https://images.weserv.nl/?url=${encodeURIComponent(url)}&w=${w}&h=${w}&fit=cover`
  }

  if (loading) return <div style={{height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0a0a0f', color:'#888', fontWeight:700, letterSpacing:2}}>DIJITAL KURATOR YÜKLENİYOR...</div>

  return (
    <div style={{ fontFamily:'system-ui, sans-serif', minHeight:'100vh', background:'#0a0a0f', color:'#f0f0f5' }}>
      <style>{css}</style>

      {/* SIDEBAR */}
      <aside className="glass" style={{ position:'fixed', left:0, top:0, bottom:0, width:260, zIndex:100, display:'flex', flexDirection:'column' }}>
        <div style={{ padding:'32px 24px', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', gap:12 }}>
          <div className="primary-gradient" style={{ width:40, height:40, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>📸</div>
          <div>
            <div style={{ fontSize:18, fontWeight:800, color:'#fff', letterSpacing:'-0.5px' }}>SavedLens</div>
            <div style={{ fontSize:9, color:'#a855f7', fontWeight:800, textTransform:'uppercase', letterSpacing:1.5 }}>Koleksiyonum</div>
          </div>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:'24px 16px', display:'flex', flexDirection:'column', gap:32 }}>
          <section>
            <div style={{ fontSize:10, fontWeight:900, textTransform:'uppercase', letterSpacing:1.5, color:'rgba(255,255,255,0.3)', marginBottom:12, paddingLeft:12 }}>GALERI</div>
            {[['gallery','🏠','Tümü'],['reels','🎬','Reels'],['posts','🖼️','Postlar'],['fav','⭐','Favoriler']].map(([v,ic,lb]) => (
              <div key={v} onClick={() => {setView(v); setCurrentCat(null)}} className="navbtn"
                style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:12, cursor:'pointer', fontSize:13, fontWeight:600, color:view===v&&!currentCat?'#a855f7':'#888899', background:view===v&&!currentCat?'rgba(168,85,247,0.1)':'none' }}>
                <span style={{width:18, textAlign:'center'}}>{ic}</span> {lb}
              </div>
            ))}
          </section>

          <section>
            <div style={{ fontSize:10, fontWeight:900, textTransform:'uppercase', letterSpacing:1.5, color:'rgba(255,255,255,0.3)', marginBottom:12, paddingLeft:12 }}>KOLEKSIYONLAR</div>
            {cats.map(c => (
              <div key={c.id} onClick={() => {setCurrentCat(c.id); setView('gallery')}} className="navbtn"
                style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 14px', borderRadius:12, cursor:'pointer', fontSize:13, fontWeight:600, color:currentCat===c.id?'#fff':'#888899', background:currentCat===c.id?'rgba(255,255,255,0.05)':'none' }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:c.color }}></div>
                <span style={{flex:1}}>{c.name}</span>
                <span onClick={e => {e.stopPropagation(); delCat(c.id)}} style={{fontSize:10, opacity:0.3}}>✕</span>
              </div>
            ))}
            <input 
              style={{ width:'calc(100% - 24px)', margin:'12px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:10, padding:'8px 12px', color:'#fff', fontSize:12, outline:'none' }}
              placeholder="+ Yeni Kategori" value={catInput} onChange={e=>setCatInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')addCat()}}
            />
          </section>
        </div>

        <div style={{ padding:'20px', borderTop:'1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px', borderRadius:14, background:'rgba(255,255,255,0.03)', marginBottom:12 }}>
            <div className="primary-gradient" style={{ width:32, height:32, borderRadius:10, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800 }}>{(profile?.display_name||'U')[0]}</div>
            <div style={{ minWidth:0 }}><div style={{ fontSize:12, fontWeight:700, color:'#fff', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{profile?.display_name || 'Kullanıcı'}</div><div style={{ fontSize:9, color:'#a855f7' }}>PREMIUM</div></div>
          </div>
          <button onClick={() => supabase.auth.signOut()} style={{ width:'100%', padding:'8px', borderRadius:12, border:'1px solid rgba(255,255,255,0.1)', background:'none', color:'#888', fontSize:11, fontWeight:700, cursor:'pointer' }}>Güvenli Çıkış</button>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ marginLeft:260, padding: 0 }}>
        <header className="glass" style={{ position:'sticky', top:0, zIndex:80, padding:'20px 40px', display:'flex', alignItems:'center', gap:20 }}>
          <div style={{ flex:1 }}><h2 style={{ fontSize:22, fontWeight:900, textTransform:'uppercase', letterSpacing:'-0.5px', margin:0 }}>{currentCat ? cats.find(c=>c.id===currentCat)?.name : 'GALERİ'}</h2></div>
          <input style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:100, padding:'10px 20px', color:'#fff', outline:'none', width:260 }} placeholder="Ara..." value={search} onChange={e=>setSearch(e.target.value)} />
          <button onClick={()=>setShowModal(true)} className="primary-gradient" style={{ border:'none', borderRadius:100, padding:'10px 24px', color:'#fff', fontWeight:800, cursor:'pointer', fontSize:13 }}>+ İÇERİK EKLE</button>
        </header>

        <div style={{ padding:'40px', display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:32 }}>
          {it.map(item => (
            <div key={item.id} className="card glass" onClick={()=>setSelectedItem(item)}
              style={{ borderRadius:24, overflow:'hidden', display:'flex', flexDirection:'column' }}>
              <div style={{ position:'relative', aspectRatio:'4/5', background:'#18181f' }}>
                <img src={prox(item.thumbnail_url)} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                <div style={{ position:'absolute', top:12, left:12, padding:'4px 10px', borderRadius:10, background:'rgba(0,0,0,0.6)', backdropFilter:'blur(4px)', fontSize:9, fontWeight:800, textTransform:'uppercase' }}>{item.type}</div>
              </div>
              <div style={{ padding:'16px' }}>
                <div className="line-clamp-2" style={{ fontSize:14, fontWeight:700, marginBottom:8 }}>{item.title}</div>
                <div style={{ display:'flex', gap:8, opacity:0.4, fontSize:10 }}><span>{new Date(item.created_at).toLocaleDateString()}</span></div>
                <div className="actbtn" style={{ marginTop:16, display:'flex', gap:8 }}>
                  <button onClick={e=>{e.stopPropagation(); toggleFav(item.id, item.is_favorite)}} style={{ flex:1, padding:8, borderRadius:12, border:'1px solid rgba(255,255,255,0.1)', background:'none', color:'#fff', cursor:'pointer' }}>{item.is_favorite?'⭐':'☆'}</button>
                  <button onClick={e=>{e.stopPropagation(); delItem(item.id)}} style={{ flex:1, padding:8, borderRadius:12, border:'1px solid rgba(248,113,113,0.3)', background:'rgba(248,113,113,0.1)', color:'#f87171', cursor:'pointer' }}>SİL</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* DETAIL */}
      {selectedItem && (
        <div style={{ position:'fixed', inset:0, zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:40 }}>
          <div onClick={()=>setSelectedItem(null)} style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.8)', backdropFilter:'blur(20px)' }}></div>
          <div className="glass" style={{ position:'relative', width:'100%', maxWidth:1100, height:700, borderRadius:32, overflow:'hidden', display:'flex' }}>
            <div style={{ width:'55%', background:'#000', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <img src={prox(selectedItem.thumbnail_url, 1000)} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
            </div>
            <div style={{ flex:1, display:'flex', flexDirection:'column' }}>
              <header style={{ padding:'24px', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <h3 className="line-clamp-1" style={{ fontSize:18, fontWeight:800, margin:0 }}>{selectedItem.title}</h3>
                <button onClick={()=>setSelectedItem(null)} style={{ background:'none', border:'none', color:'#888', cursor:'pointer', fontSize:20 }}>✕</button>
              </header>
              <div style={{ flex:1, overflowY:'auto', padding:'24px' }}>
                <div style={{ marginBottom:20, color:'#888', fontSize:14, lineHeight:1.6 }}>{selectedItem.description || 'Açıklama yok.'}</div>
                <div style={{ marginTop:32 }}>
                  <div style={{ fontSize:11, fontWeight:900, textTransform:'uppercase', color:'#a855f7', marginBottom:12 }}>AI ASISTAN</div>
                  {chatObj.messages.map((m,i)=>(
                    <div key={i} style={{ marginBottom:12, padding:12, borderRadius:16, background:m.role==='user'?'rgba(255,255,255,0.05)':'rgba(168,85,247,0.1)', fontSize:13 }}>
                      <b>{m.role==='user'?'Siz:':'AI:'}</b> {m.content}
                    </div>
                  ))}
                  <div style={{ position:'relative', marginTop:16 }}>
                    <input style={{ width:'100%', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:14, padding:'12px 16px', color:'#fff', outline:'none' }} placeholder="Sorunuz..." value={chatObj.input} onChange={e=>setChatObj(c=>({...c,input:e.target.value}))} onKeyDown={e=>{if(e.key==='Enter')handleSendChatMessage(selectedItem)}} />
                  </div>
                </div>
              </div>
              <footer style={{ padding:'24px', borderTop:'1px solid rgba(255,255,255,0.07)', display:'flex', gap:12 }}>
                <button onClick={()=>window.open(selectedItem.instagram_url, '_blank')} className="primary-gradient" style={{ flex:1, border:'none', borderRadius:14, padding:12, color:'#fff', fontWeight:800, cursor:'pointer' }}>INSTAGRAM'DA AÇ</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL */}
      {showModal && (
        <div style={{ position:'fixed', inset:0, zIndex:300, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div onClick={()=>setShowModal(false)} style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.7)', backdropFilter:'blur(10px)' }}></div>
          <div className="glass" style={{ position:'relative', width:480, padding:32, borderRadius:24 }}>
            <h3 style={{ marginTop:0, marginBottom:24 }}>İçerik Ekle</h3>
            <input style={{ width:'100%', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, padding:12, color:'#fff', marginBottom:16, outline:'none' }} placeholder="Instagram URL..." value={form.url} onChange={e=>handleUrlChange(e.target.value)} />
            {prevLoading && <div style={{ fontSize:12, color:'#a855f7', marginBottom:16 }}>Veriler çekiliyor...</div>}
            {prevData && <div style={{ fontSize:13, background:'rgba(255,255,255,0.03)', padding:12, borderRadius:12, marginBottom:16 }}>{prevData.title}</div>}
            <select style={{ width:'100%', background:'#18181f', border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, padding:12, color:'#fff', marginBottom:16 }} value={form.cat} onChange={e=>setForm(f=>({...f,cat:e.target.value}))}>
              <option value="">Kategori Seç...</option>
              {cats.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button onClick={saveItem} className="primary-gradient" style={{ width:'100%', border:'none', borderRadius:12, padding:14, color:'#fff', fontWeight:800, cursor:'pointer' }}>KAYDET</button>
          </div>
        </div>
      )}

      {toast.show && <div style={{ position:'fixed', bottom:32, right:32, background:toast.type==='err'?'#f87171':'#a855f7', color:'#fff', padding:'12px 24px', borderRadius:100, fontWeight:700, fontSize:12, zIndex:1000, boxShadow:'0 10px 30px rgba(0,0,0,0.3)' }}>{toast.msg}</div>}
    </div>
  )
}