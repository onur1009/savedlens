export default function ContentDetail({ item, cat, onClose, onToggleFav, onDelete, onUpdateNote, tempNote, setTempNote, chatObj, setChatObj, onSendMessage, chatEndRef }) {
  if (!item) return null

  const proxiedThumb = item.thumbnail_url 
    ? `https://images.weserv.nl/?url=${encodeURIComponent(item.thumbnail_url)}&w=1000&h=1000&fit=cover`
    : null

  const typeIcon = item.type === 'reel' ? 'movie' : item.type === 'carousel' ? 'view_carousel' : 'image'

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-300">
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-3xl"
        onClick={onClose}
      ></div>
      
      <div className="relative w-full max-w-6xl aspect-[16/9] bg-surface-container-low border border-outline-variant/10 rounded-[40px] shadow-2xl overflow-hidden flex flex-row group">
        {/* Sol Alan: Görsel/Video */}
        <div className="relative w-7/12 h-full bg-black/40 flex items-center justify-center overflow-hidden border-r border-outline-variant/10">
          {proxiedThumb ? (
            <img 
              src={proxiedThumb} 
              className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" 
              alt={item.title}
              onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = '<span class="material-symbols-outlined text-8xl opacity-10">broken_image</span>' }}
            />
          ) : (
            <span className="material-symbols-outlined text-8xl opacity-10 text-on-surface-variant font-extralight">{typeIcon}</span>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          
          <div className="absolute top-8 left-8 flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 shadow-2xl translate-y-4 group-hover:translate-y-0 transition-all duration-700">
            <span className="material-symbols-outlined text-[18px] text-primary">{typeIcon}</span>
            <span className="text-[11px] font-black text-white tracking-[0.2em] uppercase">{item.type}</span>
          </div>
        </div>

        {/* Sağ Alan: İçerik ve Chat */}
        <div className="flex-1 h-full flex flex-col bg-surface/40 backdrop-blur-md relative">
          <header className="p-8 pb-6 flex items-center justify-between border-b border-outline-variant/10 bg-surface/50">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl primary-gradient flex items-center justify-center text-white font-bold shadow-lg shadow-primary/20">
                <span className="material-symbols-outlined text-xl">person</span>
              </div>
              <div>
                <h4 className="text-sm font-bold text-white tracking-tight leading-none mb-1.5 line-clamp-1">{item.title || 'İsimsiz'}</h4>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-on-surface-variant/40 tracking-widest uppercase italic">
                    {new Date(item.created_at).toLocaleDateString('tr-TR', { day:'2-digit', month:'long', year:'numeric' })}
                  </span>
                </div>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-surface-bright flex items-center justify-center text-on-surface-variant hover:text-white hover:bg-surface-container-high transition-all border border-outline-variant/10"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </header>

          <div className="flex-grow overflow-y-auto p-8 space-y-8 no-scrollbar scroll-smooth">
            <section className="space-y-4">
              {cat && (
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-bright border border-outline-variant/10">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cat.color }}></div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">{cat.name}</span>
                </div>
              )}
              <h2 className="text-2xl font-black text-white tracking-tight leading-snug">{item.title}</h2>
              <p className="text-sm text-on-surface-variant leading-relaxed font-medium">
                {item.description || <span className="italic opacity-30">İçerik açıklaması bulunmuyor...</span>}
              </p>
              {item.tags && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {item.tags.split(',').map(tag => (
                    <span key={tag} className="px-3 py-1.5 rounded-xl bg-primary/5 text-primary border border-primary/20 text-[10px] font-bold tracking-tight">#{tag.trim()}</span>
                  ))}
                </div>
              )}
            </section>

            <section className="pt-8 border-t border-outline-variant/10">
              <div className="flex items-center gap-3 mb-6">
                <span className="material-symbols-outlined text-primary text-[20px]">sticky_note_2</span>
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">Kişisel Notlar</h3>
              </div>
              <div className="bg-surface-container-high/40 rounded-3xl p-6 border border-outline-variant/10 focus-within:border-primary/30 transition-all shadow-inner">
                <textarea 
                  className="w-full bg-transparent border-none text-sm text-white placeholder:text-on-surface-variant/20 focus:ring-0 resize-none font-medium leading-relaxed"
                  rows="4"
                  placeholder="Bu içerik hakkında aklına gelenleri not al..."
                  value={tempNote}
                  onChange={e => setTempNote(e.target.value)}
                />
                <div className="flex justify-end mt-4">
                  <button 
                    onClick={() => onUpdateNote(item.id, tempNote)}
                    className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${tempNote === (item.notes || '') ? 'bg-surface-bright text-on-surface-variant/40 cursor-not-allowed' : 'primary-gradient text-white shadow-lg shadow-primary/20 hover:scale-105 active:scale-95'}`}
                    disabled={tempNote === (item.notes || '')}
                  >
                    Notu Güncelle
                  </button>
                </div>
              </div>
            </section>

            <section className="pt-8 border-t border-outline-variant/10 space-y-6">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-secondary text-[24px]">auto_awesome</span>
                  <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-secondary">AI Asistan ile Sohbet</h3>
                </div>
              </div>

              <div className="space-y-6 min-h-[150px]">
                {chatObj.messages.length === 0 ? (
                  <div className="bg-surface-container-low p-6 rounded-2xl border border-outline-variant/10 border-dashed text-center">
                    <p className="text-sm text-on-surface-variant">Bu gönderiye dair merak ettiklerini sorabilirsin. Örneğin: "Bu tasarımı nasıl iyileştirebilirim?"</p>
                  </div>
                ) : (
                  chatObj.messages.map((m, idx) => (
                    <div key={idx} className={`flex gap-4 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center mt-1 border ${m.role === 'user' ? 'bg-surface-container-highest border-outline-variant/30' : 'bg-primary/20 border-primary/30'}`}>
                        <span className="material-symbols-outlined text-[16px] text-white">
                          {m.role === 'user' ? 'person' : 'robot_2'}
                        </span>
                      </div>
                      <div className={`p-4 rounded-2xl max-w-[85%] text-sm leading-relaxed border ${
                        m.role === 'user' 
                          ? 'bg-surface-container-highest border-outline-variant/10 rounded-tr-none text-white shadow-xl' 
                          : 'bg-primary/5 border-primary/20 rounded-tl-none text-on-surface shadow-xl'
                      }`}>
                        {m.content} {/* RESTORED -> .content */}
                      </div>
                    </div>
                  ))
                )}
                {chatObj.loading && (
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center animate-pulse">
                      <span className="material-symbols-outlined text-[16px] text-white">robot_2</span>
                    </div>
                    <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 flex gap-2">
                      <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce"></div>
                      <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                      <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="relative mt-8 sticky bottom-8">
                <input 
                  type="text"
                  placeholder="Asistana bir soru sor..."
                  className="w-full bg-surface-container-high/80 backdrop-blur-xl border border-outline-variant/20 rounded-2xl py-4 pl-6 pr-14 text-sm text-white placeholder:text-on-surface-variant/30 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/40 shadow-2xl transition-all font-medium"
                  value={chatObj.input}
                  onChange={e => setChatObj(c => ({...c, input: e.target.value}))}
                  onKeyDown={e => { if(e.key === 'Enter') onSendMessage(item) }}
                />
                <button 
                  onClick={() => onSendMessage(item)}
                  disabled={chatObj.loading || !chatObj.input.trim()}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 primary-gradient rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/30 hover:scale-105 active:scale-95 disabled:opacity-30 disabled:hover:scale-100 transition-all font-black"
                >
                  <span className="material-symbols-outlined pt-0.5 pr-0.5">send</span>
                </button>
              </div>
            </section>
          </div>

          <footer className="p-8 pb-10 flex items-center gap-4 bg-surface/80 border-t border-outline-variant/10 shadow-2xl">
            <button 
              onClick={() => onToggleFav(item.id, item.is_favorite)}
              className={`flex-grow flex items-center justify-center gap-3 py-3.5 rounded-2xl border transition-all font-black text-xs uppercase tracking-widest ${item.is_favorite ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500 shadow-xl shadow-yellow-500/10' : 'bg-surface-bright border-outline-variant/10 text-on-surface-variant hover:text-white hover:bg-surface-container-high'}`}
            >
              <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: item.is_favorite ? "'FILL' 1" : "" }}>star</span>
              {item.is_favorite ? 'Favorilerden Çıkar' : 'Favorilere Ekle'}
            </button>
            <button 
              onClick={() => window.open(item.instagram_url, '_blank')}
              className="px-6 py-3.5 rounded-2xl bg-surface-bright hover:bg-surface-container-high border border-outline-variant/10 text-on-surface-variant hover:text-white transition-all font-black text-xs uppercase tracking-widest flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">open_in_new</span>
              Gör
            </button>
            <button 
              onClick={() => onDelete(item.id)}
              className="w-14 h-14 rounded-2xl bg-error/10 hover:bg-error border border-error/20 text-error hover:text-white transition-all flex items-center justify-center shadow-xl hover:shadow-error/20"
            >
              <span className="material-symbols-outlined">delete</span>
            </button>
          </footer>
        </div>
      </div>
    </div>
  )
}
