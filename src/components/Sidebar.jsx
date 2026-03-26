import { supabase } from '../supabase'

export default function Sidebar({ profile, activeTab, onNav, onLogout, cats, currentCat, onCatClick, catInput, setCatInput, onAddCat, onDelCat, items, onCatDrop }) {
  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-surface/80 backdrop-blur-xl border-r border-outline-variant/10 flex flex-col z-[100] transition-all overflow-hidden shadow-2xl shadow-black/50">
      <div className="p-8 pb-6 flex items-center gap-4 border-b border-outline-variant/10">
        <div className="w-10 h-10 primary-gradient rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 transition-transform hover:scale-110">
          <span className="material-symbols-outlined text-white text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
        </div>
        <div>
          <h1 className="font-headline text-lg font-extrabold tracking-tight text-white leading-tight">SavedLens</h1>
          <p className="text-[9px] text-primary-dim font-bold tracking-widest uppercase">Dijital Küratör</p>
        </div>
      </div>

      <nav className="flex-grow overflow-y-auto px-4 py-8 space-y-10 no-scrollbar">
        <section className="space-y-2">
          <h3 className="px-4 text-[10px] font-black tracking-[0.2em] text-on-surface-variant uppercase mb-4">Ana Galeri</h3>
          <button 
            onClick={() => onNav('gallery')}
            className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all group ${activeTab === 'gallery' ? 'bg-primary/10 text-primary shadow-inner shadow-primary/5' : 'text-on-surface-variant hover:bg-surface-bright hover:text-white'}`}
          >
            <span className={`material-symbols-outlined text-xl transition-transform group-hover:scale-110 ${activeTab === 'gallery' ? 'fill-1' : ''}`}>grid_view</span>
            <span className="text-sm font-bold tracking-tight">Kürasyonlarım</span>
            <span className="ml-auto text-[10px] font-black bg-surface-container-high px-2 py-0.5 rounded-full border border-outline-variant/10">{items.length}</span>
          </button>
        </section>

        <section className="space-y-4">
          <div className="px-4 flex items-center justify-between">
            <h3 className="text-[10px] font-black tracking-[0.2em] text-on-surface-variant uppercase">Koleksiyonlar</h3>
            <button onClick={() => onNav('collections')} className="w-6 h-6 rounded-lg bg-surface-bright flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-sm">add</span>
            </button>
          </div>
          
          <div className="space-y-1">
            {cats.map(c => (
              <div 
                key={c.id} 
                onClick={() => onCatClick(c.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); const itemId = e.dataTransfer.getData('itemId'); if(itemId) onCatDrop(itemId, c.id); }}
                className={`group flex items-center gap-4 px-4 py-3 rounded-xl cursor-pointer transition-all ${currentCat === c.id ? 'bg-surface-bright text-white shadow-lg border border-outline-variant/10' : 'text-on-surface-variant hover:bg-surface-bright/50 hover:text-white'}`}
              >
                <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: c.color, boxShadow: `0 0 10px ${c.color}44` }}></div>
                <span className="text-sm font-bold truncate flex-grow leading-none">{c.name}</span>
                <span className="text-[10px] font-black opacity-40 group-hover:opacity-100 transition-opacity">
                  {items.filter(i => i.category_id === c.id).length}
                </span>
                <button 
                  onClick={(e) => { e.stopPropagation(); onDelCat(c.id); }}
                  className="w-5 h-5 rounded-md hover:bg-error/10 hover:text-error flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              </div>
            ))}
          </div>

          <div className="px-2 pt-2">
            <input 
              id="catInput"
              type="text" 
              placeholder="Yeni Kategori + Enter"
              className="w-full bg-surface-container-high/50 border border-outline-variant/10 rounded-xl px-4 py-3 text-xs text-white placeholder:text-on-surface-variant/30 focus:outline-none focus:border-primary/30 transition-all"
              value={catInput}
              onChange={e => setCatInput(e.target.value)}
              onKeyDown={e => { if(e.key === 'Enter') onAddCat() }}
            />
          </div>
        </section>

        <section className="space-y-2">
          <h3 className="px-4 text-[10px] font-black tracking-[0.2em] text-on-surface-variant uppercase mb-4">Sistem</h3>
          <button 
            onClick={() => onNav('ai_insights')}
            className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all group ${activeTab === 'ai_insights' ? 'bg-secondary/10 text-secondary' : 'text-on-surface-variant hover:bg-surface-bright hover:text-white'}`}
          >
            <span className="material-symbols-outlined text-xl transition-transform group-hover:scale-110">auto_awesome</span>
            <span className="text-sm font-bold tracking-tight">AI İstatistikleri</span>
          </button>
          {profile?.is_admin && (
            <button 
              onClick={() => onNav('admin')}
              className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-yellow-500 hover:bg-yellow-500/10 transition-all group"
            >
              <span className="material-symbols-outlined text-xl transition-transform group-hover:rotate-12" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
              <span className="text-sm font-bold tracking-tight uppercase tracking-wider">Yönetim Paneli</span>
            </button>
          )}
        </section>
      </nav>

      <div className="p-4 border-t border-outline-variant/10 space-y-4 bg-surface-container-low/30">
        <div 
          onClick={() => onNav('profile')}
          className="flex items-center gap-4 p-3 rounded-2xl bg-surface-bright/50 hover:bg-surface-bright transition-all cursor-pointer group border border-transparent hover:border-outline-variant/10 shadow-xl shadow-black/20"
        >
          <div className="relative">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} className="w-10 h-10 rounded-xl object-cover ring-2 ring-outline-variant/10" alt="Avatar" />
            ) : (
              <div className="w-10 h-10 rounded-xl primary-gradient flex items-center justify-center text-white font-bold shadow-lg shadow-primary/20">
                {(profile?.display_name || 'U')[0].toUpperCase()}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-primary rounded-full border-2 border-surface flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
            </div>
          </div>
          <div className="flex-grow min-w-0">
            <h4 className="text-sm font-bold text-white truncate leading-none mb-1.5">{profile?.display_name || 'Kullanıcı'}</h4>
            <span className="text-[9px] font-black uppercase tracking-widest text-primary-dim">Standart Plan</span>
          </div>
          <span className="material-symbols-outlined text-on-surface-variant group-hover:text-white transition-colors">settings</span>
        </div>
        
        <button 
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-outline-variant/10 text-on-surface-variant font-bold text-xs hover:bg-error hover:text-white hover:border-error transition-all group"
        >
          <span className="material-symbols-outlined text-lg transition-transform group-hover:-translate-x-1">logout</span>
          <span>Güvenli Çıkış</span>
        </button>
      </div>
    </aside>
  )
}
