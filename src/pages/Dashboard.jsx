import { useEffect, useState, useRef } from 'react'
import { supabase } from '../supabase'
import Sidebar from '../components/Sidebar'
import TopNav from '../components/TopNav'
import ContentCard from '../components/ContentCard'
import AddContentModal from '../components/AddContentModal'
import ContentDetail from '../components/ContentDetail'

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
    const colors = ['#c084fc','#f472b6','#2dd4bf','#fbbf24','#4ade80','#f87171','#60a5fa','#a78bfa','#34d399','#fb923c']
    const { data, error } = await supabase.from('categories').insert({
      user_id: session.user.id,
      name,
      color: colors[cats.length % colors.length]
    }).select().single()
    if (error) { showToast('Kategori eklenemedi', 'err'); return }
    if (data) {
      setCats(c => [...c, data])
      setCatInput('')
      showToast('Kategori eklendi!', 'ok')
    }
  }

  async function delCat(id) {
    await supabase.from('categories').delete().eq('id', id)
    setCats(c => c.filter(x => x.id !== id))
  }

  async function toggleFav(id, val) {
    await supabase.from('items').update({ is_favorite: !val }).eq('id', id)
    setItems(prev => prev.map(x => x.id === id ? { ...x, is_favorite: !val } : x))
    if (selectedItem?.id === id) setSelectedItem(s => ({ ...s, is_favorite: !val }))
  }

  async function delItem(id) {
    if (!window.confirm('Bu içeriği silmek istiyor musun?')) return
    await supabase.from('items').delete().eq('id', id)
    setItems(i => i.filter(x => x.id !== id))
    if (selectedItem?.id === id) setSelectedItem(null)
    showToast('Silindi', 'ok')
  }

  function handleUrlChange(url) {
    setForm(f => ({ ...f, url }))
    clearTimeout(pvtRef.current)
    if (url.includes('instagram.com')) {
      pvtRef.current = setTimeout(() => previewURL(url), 800)
    }
  }

  async function previewURL(url) {
    const m = url.match(/\/(p|reel|tv|reels)\/([A-Za-z0-9_-]+)/)
    if (!m) return
    const sc = m[2]
    const type = url.includes('/reel/') || url.includes('/reels/') ? 'reel' : 'post'
    setPrevLoading(true)
    setForm(f => ({ ...f, type }))

    try {
      // 1. Initial noembed fetch
      const r = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(url)}&format=json`)
      const d = await r.json()
      const thumb = d.thumbnail_url || `https://www.instagram.com/p/${sc}/media/?size=m`
      setForm(f => ({ ...f, title: d.title || `Instagram ${type}`, thumb }))
      setPrevData({ title: d.title || 'İçerik Yükleniyor...', author: d.author_name, type, thumb })
    } catch (e) {
      setForm(f => ({ ...f, thumb: `https://www.instagram.com/p/${sc}/media/?size=m` }))
    }

    // 2. Working RapidAPI Logic from Backup
    if (rapidApiKey) {
      try {
        const rr = await fetch(`https://instagram-scraper-api2.p.rapidapi.com/v1/post_info?code_or_id_or_url=${sc}`, {
          headers: {
            'X-RapidAPI-Key': rapidApiKey,
            'X-RapidAPI-Host': 'instagram-scraper-api2.p.rapidapi.com'
          }
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
      } catch (err) { console.error("RapidAPI Error:", err) }
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
      showToast('Başarıyla kaydedildi!', 'ok')
    }
  }

  async function handleSendMessage(item) {
    const { input, messages } = chatObj
    if (!input.trim() || !apiKey) return
    const userMsg = { role: 'user', content: input.trim() } // RESTORED .content
    setChatObj(c => ({ ...c, messages: [...c.messages, userMsg], input: '', loading: true }))
    
    const cat = cats.find(c => c.id === item?.category_id)
    const sysPrompt = `Sen bir SavedLens asistanısın. Bu gönderi hakkında yardımcı ol: ${item.title}. Açıklama: ${item.description}. Kategori: ${cat?.name || 'Yok'}.`

    try {
      const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': window.location.origin
        },
        body: JSON.stringify({
          model: 'openrouter/free', // RESTORED model
          max_tokens: 800,
          messages: [{ role: 'system', content: sysPrompt }, ...messages, userMsg]
        })
      })
      const d = await r.json()
      const reply = d.choices?.[0]?.message?.content || 'Yanıt alınamadı.'
      setChatObj(c => ({ ...c, messages: [...c.messages, { role: 'assistant', content: reply }], loading: false }))
    } catch (e) {
      showToast('AI Hatası', 'err')
      setChatObj(c => ({ ...c, loading: false }))
    }
  }

  async function updateNote(id, text) {
    setItems(i => i.map(x => x.id === id ? { ...x, notes: text } : x))
    await supabase.from('items').update({ notes: text }).eq('id', id)
    showToast('Not kaydedildi', 'ok')
  }

  const filteredItems = items.filter(i => {
    if (currentCat && i.category_id !== currentCat) return false
    if (view === 'reels' && i.type !== 'reel') return false
    if (view === 'posts' && i.type === 'reel') return false
    if (view === 'fav' && !i.is_favorite) return false
    if (search) {
      const s = search.toLowerCase()
      return i.title?.toLowerCase().includes(s) || i.description?.toLowerCase().includes(s) || i.tags?.toLowerCase().includes(s)
    }
    return true
  })

  if (loading) return <div className="h-screen bg-background flex items-center justify-center text-on-surface-variant font-black tracking-widest animate-pulse">LENS YÜKLENİYOR...</div>

  return (
    <div className="flex min-h-screen bg-background text-on-surface font-sans selection:bg-primary/30">
      <Sidebar 
        profile={profile}
        activeTab={view}
        onNav={setView}
        onLogout={() => supabase.auth.signOut()}
        cats={cats}
        currentCat={currentCat}
        onCatClick={id => { setCurrentCat(id); setView('gallery'); }}
        catInput={catInput}
        setCatInput={setCatInput}
        onAddCat={addCat}
        onDelCat={delCat}
        items={items}
      />

      <main className="flex-grow ml-64 overflow-x-hidden relative">
        <TopNav 
          currentTitle={currentCat ? cats.find(c => c.id === currentCat)?.name : (view === 'gallery' ? 'Tüm Galeri' : (view === 'reels' ? 'Reels & Video' : (view === 'fav' ? 'Favoriler' : 'Profil')))}
          search={search}
          setSearch={setSearch}
          gv={gv}
          setGv={setGv}
          onAddClick={() => setShowModal(true)}
          activeTab={view}
        />

        <div className="p-8 pb-32 max-w-[1600px] mx-auto">
          {filteredItems.length === 0 ? (
            <div className="h-[60vh] flex flex-col items-center justify-center text-center opacity-20">
              <span className="material-symbols-outlined text-8xl mb-4 font-extralight">folder_open</span>
              <p className="text-xl font-black uppercase tracking-widest">Kürasyon Bulunamadı</p>
            </div>
          ) : (
            <div className={`grid gap-8 transition-all duration-500 ${gv === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1 max-w-4xl mx-auto'}`}>
              {filteredItems.map(item => (
                <ContentCard 
                  key={item.id}
                  item={item}
                  cat={cats.find(c => c.id === item.category_id)}
                  gv={gv}
                  onSelect={setSelectedItem}
                  onToggleFav={toggleFav}
                  onDelete={delItem}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <AddContentModal 
        show={showModal}
        onClose={() => setShowModal(false)}
        tab={tab}
        setTab={setTab}
        form={form}
        setForm={setForm}
        onUrlChange={handleUrlChange}
        prevLoading={prevLoading}
        prevData={prevData}
        cats={cats}
        onSave={saveItem}
      />

      <ContentDetail 
        item={selectedItem}
        cat={cats.find(c => c.id === selectedItem?.category_id)}
        onClose={() => setSelectedItem(null)}
        onToggleFav={toggleFav}
        onDelete={delItem}
        onUpdateNote={updateNote}
        tempNote={tempNote}
        setTempNote={setTempNote}
        chatObj={chatObj}
        setChatObj={setChatObj}
        onSendMessage={handleSendMessage}
        chatEndRef={chatEndRef}
      />

      {toast.show && (
        <div className={`fixed bottom-12 right-12 z-[300] px-8 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-right-12 duration-500 border ${toast.type === 'err' ? 'bg-error text-white border-white/10' : 'bg-primary text-white border-white/10'}`}>
          <p className="font-black text-xs uppercase tracking-widest">{toast.msg}</p>
        </div>
      )}
    </div>
  )
}