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
  
  const [tempNote, setTempNote] = useState('')
  const [chatObj, setChatObj] = useState({ open:false, item:null, messages:[], input:'', loading:false })
  const chatEndRef = useRef(null)
  const catInputRef = useRef(null)
  const pvtRef = useRef(null)

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' })
  }, [chatObj.messages, chatObj.open])

  useEffect(() => { loadData() }, [])

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
          const itemData = Array.isArray(rd) ? rd[0] : null
          const caption = itemData?.caption || ''
          if (caption) {
            setForm(f => ({ ...f, desc: caption }))
            showToast('Açıklama Apify ile otomatik çekildi!', 'ok')
          } else showToast('Apify: Gönderi bulundu ancak açıklama (caption) boş.', 'warn')
        }
      } catch (apiErr) { showToast('Apify bağlantı hatası!', 'err') }
    } else showToast('Otomatik açıklama çekmek için VITE_APIFY_KEY gerekiyor.', 'warn')
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
      showToast('İçerik eklendi!', 'ok')
    }
  }

  async function handleSendChatMessage() {
    const { input, item, messages } = chatObj
    if (!input.trim() || !apiKey) return
    const userMsg = { role: 'user', content: input.trim() }
    setChatObj(c => ({ ...c, messages: [...c.messages, userMsg], input: '', loading: true }))
    
    const cat = cats.find(c => c.id === item?.category_id)
    const sysPrompt = `Sen harika bir bakış açısına sahip, yetenekli bir asistansın. Gönderi: ${item?.title}. Kategori: ${cat?.name || ''}. Yanıtla.`

    try {
      const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}`, 'HTTP-Referer': window.location.origin },
        body: JSON.stringify({ model: 'openrouter/free', max_tokens: 800, messages: [{ role: 'system', content: sysPrompt }, ...messages, userMsg] })
      })
      const d = await r.json()
      const reply = d.choices?.[0]?.message?.content || 'Hata.'
      setChatObj(c => ({ ...c, messages: [...c.messages, { role: 'assistant', content: reply }], loading: false }))
    } catch (e) { showToast(e.message, 'err'); setChatObj(c => ({ ...c, loading: false })) }
  }

  async function updateNote(id, text) {
    setItems(i => i.map(x => x.id === id ? { ...x, notes: text } : x))
    if (selectedItem?.id === id) setSelectedItem(s => ({ ...s, notes: text }))
    const { error } = await supabase.from('items').update({ notes: text }).eq('id', id)
    if (error) showToast('Hata', 'err')
    else showToast('Not kaydedildi', 'ok')
  }

  function filtered() {
    let it = [...items]
    if (view === 'reels') it = it.filter(i => i.type === 'reel')
    else if (view === 'posts') it = it.filter(i => i.type !== 'reel')
    else if (view === 'fav') it = it.filter(i => i.is_favorite)
    if (currentCat) it = it.filter(i => i.category_id === currentCat)
    if (search) it = it.filter(i => (i.title + (i.description || '')).toLowerCase().includes(search.toLowerCase()))
    return it
  }

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#0a0a0f', color:'#888' }}>Yükleniyor...</div>

  const it = filtered()

  return (
    <div style={{ fontFamily:'sans-serif' }}>
      <style>{css}</style>
      <aside style={{ position:'fixed', left:0, top:0, bottom:0, width:256, background:'#111118', borderRight:'1px solid rgba(255,255,255,0.07)', display:'flex', flexDirection:'column', zIndex:100 }}>
        <div style={{ padding:'22px 18px 18px', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:9, background:'linear-gradient(135deg,#a855f7,#f472b6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15 }}>📸</div>
          <div><div style={{ fontSize:16, fontWeight:700, color:'#f0f0f5' }}>SavedLens</div><div style={{ fontSize:10, color:'#888899' }}>Instagram Koleksiyonum</div></div>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:'0 10px' }}>
          <div style={{ fontSize:10, textTransform:'uppercase', color:'#888899', padding:'14px 8px 7px' }}>Genel</div>
          {[ ['all','🏠','Tümü'],['reels','🎬','Reels'],['posts','🖼️','Postlar'],['fav','⭐','Fav']].map(([v,ic,lb])=>(
            <button key={v} onClick={()=>{setView(v);setCurrentCat(null)}} style={{ width:'100%', display:'flex', alignItems:'center', gap:9, padding:'8px 10px', borderRadius:8, background:view===v&&!currentCat?'#22222c':'none', color:view===v&&!currentCat?'#c084fc':'#888899', cursor:'pointer', border:'none', textAlign:'left' }}>
              <span style={{width:17}}>{ic}</span>{lb}
            </button>
          ))}
          <div style={{ fontSize:10, textTransform:'uppercase', color:'#888899', padding:'20px 8px 7px' }}>Kategoriler</div>
          {cats.map(c=>(
            <div key={c.id} onClick={()=>{setCurrentCat(c.id);setView(null)}} style={{ display:'flex', alignItems:'center', gap:7, padding:'7px 8px', borderRadius:8, cursor:'pointer', color:currentCat===c.id?'#f0f0f5':'#888899', background:currentCat===c.id?'#18181f':'none' }}>
              <div style={{width:7,height:7,borderRadius:'50%',background:c.color}}></div><span style={{flex:1}}>{c.name}</span>
              <span onClick={e=>{e.stopPropagation();delCat(c.id)}} style={{fontSize:11,color:'#f87171'}}>✕</span>
            </div>
          ))}
          <input style={{ width:'100%', background:'#18181f', border:'1px solid rgba(255,255,255,0.13)', borderRadius:8, padding:'7px 10px', color:'#f0f0f5', margin:'10px 0' }} placeholder="+ Kategori" value={catInput} onChange={e=>setCatInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')addCat()}} />
        </div>
        <div style={{ padding:'12px 10px', borderTop:'1px solid rgba(255,255,255,0.07)' }}>
          <button onClick={() => supabase.auth.signOut()} style={{ width:'100%', padding:'6px', borderRadius:100, border:'1px solid rgba(255,255,255,0.15)', background:'none', color:'#888', cursor:'pointer' }}>Çıkış Yap</button>
        </div>
      </aside>

      <main style={{ marginLeft:256, minHeight:'100vh', background:'#0a0a0f', color:'#f0f0f5' }}>
        <div style={{ padding:'18px 28px', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', gap:14, position:'sticky', top:0, background:'#0a0a0f' }}>
          <div style={{ flex:1, fontWeight:700 }}>{currentCat ? cats.find(c=>c.id===currentCat)?.name : 'Galeri'}</div>
          <input style={{ background:'#18181f', border:'1px solid rgba(255,255,255,0.13)', borderRadius:100, padding:'7px 14px', color:'#fff', width:200 }} placeholder="Ara..." value={search} onChange={e=>setSearch(e.target.value)} />
          <button onClick={()=>setShowModal(true)} style={{ padding:'8px 18px', borderRadius:100, background:'#a855f7', color:'#fff', border:'none', cursor:'pointer' }}>+ Ekle</button>
        </div>
        <div style={{ padding:'24px 28px', display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(270px,1fr))', gap:20 }}>
          {it.map(item=>(
            <div key={item.id} className="card" onClick={()=>setSelectedItem(item)} style={{ background:'#111118', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, overflow:'hidden' }}>
              <div style={{ aspectRatio:'1/1', background:'#18181f' }}>
                <img src={`https://images.weserv.nl/?url=${encodeURIComponent(item.thumbnail_url)}&w=400&h=400&fit=cover`} style={{width:'100%',height:'100%',objectFit:'cover'}} alt="" />
              </div>
              <div style={{ padding:'12px' }}>
                <div style={{ fontSize:13, fontWeight:600, marginBottom:5 }}>{item.title}</div>
                <div style={{ display:'flex', justifyContent:'space-between', opacity:0.5, fontSize:10 }}><span>{item.type}</span><span>{new Date(item.created_at).toLocaleDateString()}</span></div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {selectedItem && (
        <div onClick={e=>e.target===e.currentTarget&&setSelectedItem(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'#111118', width:800, height:'80vh', borderRadius:16, display:'flex', overflow:'hidden' }}>
            <div style={{ width:'50%', background:'#000' }}><img src={selectedItem.thumbnail_url} style={{width:'100%',height:'100%',objectFit:'contain'}} alt="" /></div>
            <div style={{ flex:1, padding:20, display:'flex', flexDirection:'column' }}>
              <header style={{ borderBottom:'1px solid #222', paddingBottom:10, marginBottom:10 }}><h3>{selectedItem.title}</h3></header>
              <div style={{ flex:1, overflowY:'auto' }}><p>{selectedItem.description}</p></div>
              <button onClick={() => setChatObj({ open:true, item:selectedItem, messages:[], input:'', loading:false })} style={{ background:'#a855f7', color:'#fff', padding:10, borderRadius:8, border:'none', cursor:'pointer' }}>AI'a Sor</button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div onClick={e => e.target === e.currentTarget && setShowModal(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.7)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'#111118', width:400, padding:20, borderRadius:12 }}>
            <h3>Ekle</h3>
            <input style={{ width:'100%', background:'#18181f', border:'1px solid #333', color:'#fff', padding:10, borderRadius:8, marginBottom:10 }} placeholder="URL" value={form.url} onChange={e=>handleUrlChange(e.target.value)} />
            <button onClick={saveItem} style={{ width:'100%', padding:10, background:'#a855f7', color:'#fff', border:'none', borderRadius:8 }}>Kaydet</button>
          </div>
        </div>
      )}

      {chatObj.open && (
        <div onClick={e=>e.target===e.currentTarget&&setChatObj(c=>({...c,open:false}))} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:400, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'#111118', width:400, height:'60vh', borderRadius:12, display:'flex', flexDirection:'column', padding:20 }}>
            <header><h3>AI</h3></header>
            <div style={{ flex:1, overflowY:'auto' }}>{chatObj.messages.map((m,i)=><div key={i}>{m.content}</div>)}</div>
            <input style={{ background:'#18181f', color:'#fff', padding:10, borderRadius:8, border:'none', width:'100%' }} value={chatObj.input} onChange={e=>setChatObj(c=>({...c,input:e.target.value}))} onKeyDown={e=>{if(e.key==='Enter')handleSendChatMessage()}} />
          </div>
        </div>
      )}
      {toast.show && <div style={{ position:'fixed', bottom:20, right:20, background:'#a855f7', color:'#fff', padding:10, borderRadius:8 }}>{toast.msg}</div>}
    </div>
  )
}