export default function TopNav({ 
  currentTitle, 
  search, 
  setSearch, 
  gv, 
  setGv, 
  onAddClick,
  activeTab 
}) {
  return (
    <header className="sticky top-0 z-50 px-8 py-6 flex items-center gap-6 bg-background/60 backdrop-blur-3xl border-b border-outline-variant/10 shadow-2xl shadow-black/20">
      <div className="flex-grow flex items-center gap-4">
        <h2 className="text-2xl font-black tracking-tighter text-white uppercase drop-shadow-sm">
          {currentTitle}
        </h2>
        <div className="h-4 w-px bg-outline-variant/20 mx-2"></div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 border border-primary/20">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
          <span className="text-[10px] font-black text-primary tracking-widest uppercase">APIFY BOT: AKTIF</span>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative group">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors text-xl">search</span>
          <input 
            type="text"
            placeholder="Kürate edilmiş içeriklerde ara..."
            className="bg-surface-container-high/60 border border-outline-variant/10 rounded-2xl py-3 pl-12 pr-6 text-sm text-white placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/30 w-80 transition-all font-medium"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="flex bg-surface-container-high/60 p-1.5 rounded-2xl border border-outline-variant/10 shadow-inner">
          <button 
            onClick={() => setGv('grid')}
            className={`p-2 px-3 rounded-xl transition-all ${gv === 'grid' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-on-surface-variant hover:text-white'}`}
          >
            <span className="material-symbols-outlined text-xl">grid_view</span>
          </button>
          <button 
            onClick={() => setGv('list')}
            className={`p-2 px-3 rounded-xl transition-all ${gv === 'list' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-on-surface-variant hover:text-white'}`}
          >
            <span className="material-symbols-outlined text-xl">view_list</span>
          </button>
        </div>

        <button 
          onClick={onAddClick}
          className="flex items-center gap-2 primary-gradient px-7 py-3 rounded-2xl text-white font-extrabold text-sm shadow-xl shadow-primary/30 hover:shadow-primary/40 transition-all hover:-translate-y-0.5 active:scale-95 group"
        >
          <span className="material-symbols-outlined text-xl group-hover:rotate-90 transition-transform">add</span>
          <span className="tracking-tight leading-none pt-0.5">İçerik Ekle</span>
        </button>
      </div>
    </header>
  )
}
