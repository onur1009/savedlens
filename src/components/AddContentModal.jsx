export default function AddContentModal({ 
  show, 
  onClose, 
  tab, 
  setTab, 
  form, 
  setForm, 
  onUrlChange, 
  prevLoading, 
  prevData, 
  cats, 
  onSave 
}) {
  if (!show) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-in fade-in zoom-in duration-200">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-xl" onClick={onClose}></div>
      <div className="relative w-full max-w-xl bg-surface-container-low border border-outline-variant/10 rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <header className="p-8 pb-4 flex items-center justify-between">
          <h3 className="text-xl font-black text-white tracking-tight">Yeni İçerik Ekle</h3>
          <button onClick={onClose} className="w-10 h-10 rounded-xl bg-surface-bright flex items-center justify-center text-on-surface-variant hover:text-white transition-all">
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>

        <div className="px-8 pb-8 overflow-y-auto no-scrollbar space-y-6">
          <div className="flex bg-surface-container-high/60 p-1.5 rounded-2xl border border-outline-variant/10 shadow-inner">
            <button 
              onClick={() => setTab('link')}
              className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${tab === 'link' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-on-surface-variant hover:text-white'}`}
            >
              Link ile
            </button>
            <button 
              onClick={() => setTab('man')}
              className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${tab === 'man' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-on-surface-variant hover:text-white'}`}
            >
              Manuel
            </button>
          </div>

          {tab === 'link' ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-1">Instagram URL</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-primary">link</span>
                  <input 
                    type="text" 
                    placeholder="https://www.instagram.com/p/..."
                    className="w-full bg-surface-container-high/60 border border-outline-variant/10 rounded-2xl py-4 pl-12 pr-6 text-sm text-white placeholder:text-on-surface-variant/30 focus:outline-none focus:border-primary/40 transition-all font-medium"
                    value={form.url}
                    onChange={e => onUrlChange(e.target.value)}
                  />
                </div>
              </div>

              {prevLoading && (
                <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10 flex items-center gap-4 animate-pulse">
                  <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin"></div>
                  <span className="text-xs font-bold text-primary tracking-tight">Önizleme hazırlanıyor...</span>
                </div>
              )}

              {prevData && (
                <div className="p-6 rounded-3xl bg-surface-bright/50 border border-outline-variant/10 flex items-start gap-6 animate-in slide-in-from-top-4 duration-500">
                  <div className="w-20 h-20 rounded-2xl bg-surface-container-highest overflow-hidden shrink-0 border border-outline-variant/10 shadow-xl">
                    {form.thumb ? (
                      <img 
                        src={`https://images.weserv.nl/?url=${encodeURIComponent(form.thumb)}&w=200&h=200&fit=cover`} 
                        className="w-full h-full object-cover" 
                        alt="Önizleme" 
                        onError={e => e.target.style.display = 'none'}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center opacity-10">
                        <span className="material-symbols-outlined text-3xl">image</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-grow min-w-0 py-1">
                    <h4 className="text-sm font-bold text-white mb-1.5 leading-snug line-clamp-2">{prevData.title}</h4>
                    <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest bg-surface-container-high px-2 py-1 rounded-lg inline-block border border-outline-variant/10">
                      {prevData.author ? `@${prevData.author} · ` : ''} {prevData.type}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-1">Başlık</label>
                <input 
                  type="text" 
                  placeholder="İçerik başlığı..."
                  className="w-full bg-surface-container-high/60 border border-outline-variant/10 rounded-2xl py-4 px-6 text-sm text-white placeholder:text-on-surface-variant/30 focus:outline-none focus:border-primary/40 transition-all font-medium"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-1">Açıklama</label>
                <textarea 
                  rows="3"
                  placeholder="İçeriğin açıklaması..."
                  className="w-full bg-surface-container-high/60 border border-outline-variant/10 rounded-2xl py-4 px-6 text-sm text-white placeholder:text-on-surface-variant/30 focus:outline-none focus:border-primary/40 transition-all font-medium resize-none"
                  value={form.desc}
                  onChange={e => setForm(f => ({ ...f, desc: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-1">Görsel URL (Thumbnail)</label>
                <input 
                  type="text" 
                  placeholder="https://..."
                  className="w-full bg-surface-container-high/60 border border-outline-variant/10 rounded-2xl py-4 px-6 text-sm text-white placeholder:text-on-surface-variant/30 focus:outline-none focus:border-primary/40 transition-all font-medium"
                  value={form.thumb}
                  onChange={e => setForm(f => ({ ...f, thumb: e.target.value }))}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-1">Tür</label>
              <select 
                className="w-full bg-surface-container-high/60 border border-outline-variant/10 rounded-2xl py-4 px-6 text-sm text-white focus:outline-none focus:border-primary/40 transition-all font-medium appearance-none cursor-pointer"
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
              >
                <option value="post" className="bg-surface">Gönderi</option>
                <option value="reel" className="bg-surface">Reel / Video</option>
                <option value="carousel" className="bg-surface">Carousel</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-1">Kategori</label>
              <select 
                className="w-full bg-surface-container-high/60 border border-outline-variant/10 rounded-2xl py-4 px-6 text-sm text-white focus:outline-none focus:border-primary/40 transition-all font-medium appearance-none cursor-pointer"
                value={form.cat}
                onChange={e => setForm(f => ({ ...f, cat: e.target.value }))}
              >
                <option value="" className="bg-surface">Seçilmedi</option>
                {cats.map(c => <option key={c.id} value={c.id} className="bg-surface">{c.name}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-1">Etiketler (Virgülle ayır)</label>
            <input 
              type="text" 
              placeholder="tasarım, minimal, ui..."
              className="w-full bg-surface-container-high/60 border border-outline-variant/10 rounded-2xl py-4 px-6 text-sm text-white placeholder:text-on-surface-variant/30 focus:outline-none focus:border-primary/40 transition-all font-medium"
              value={form.tags}
              onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
            />
          </div>
        </div>

        <footer className="p-8 pt-0 flex gap-4 mt-auto">
          <button 
            onClick={onClose}
            className="flex-1 py-4 rounded-2xl border border-outline-variant/10 text-on-surface-variant font-black text-xs uppercase tracking-widest hover:bg-surface-bright transition-all"
          >
            Vazgeç
          </button>
          <button 
            onClick={onSave}
            className="flex-[2] py-4 rounded-2xl primary-gradient text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
          >
            Koleksiyona Ekle
          </button>
        </footer>
      </div>
    </div>
  )
}
