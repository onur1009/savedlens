import logo from '../../assets/logo.png'

export default function Header({
  search,
  setSearch,
  gv,
  setGv,
  isOnline,
  getQueue,
  clearSyncQueue,
  profile,
  setShowAdmin,
  setShowModal,
}) {
  return (
    <header className="fixed top-0 right-0 left-0 md:left-72 z-50 bg-background/80 backdrop-blur-xl flex items-center justify-between px-4 md:px-6 h-16 md:h-20 border-b border-white/5 gap-3 md:gap-4">
      <div className="md:hidden flex-shrink-0">
        <img src={logo} alt="Logo" style={{ width: 120, height: 40, objectFit: 'contain' }} />
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

          {/* Online / Offline Status */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container-low border border-white/5 text-[11px] font-bold" title={isOnline ? 'Bağlantı Aktif' : 'Çevrimdışı Mod'}>
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
            <span className="text-slate-400">{isOnline ? 'Çevrimiçi' : 'Çevrimdışı'}</span>
          </div>

          {/* Clear / Sync Queue Button */}
          {getQueue().length > 0 && (
            <button
              onClick={clearSyncQueue}
              title="Senkronizasyon kuyruğunu sıfırla"
              className="px-2.5 py-1.5 text-[11px] font-bold text-amber-400 bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/20 rounded-xl transition-all flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">sync_problem</span>
              <span>{getQueue().length} bekleyen</span>
            </button>
          )}

          {profile?.is_admin && (
            <button onClick={() => setShowAdmin(true)} className="p-2 text-amber-500 hover:bg-amber-500/10 rounded-xl transition-all">
              <span className="material-symbols-outlined">admin_panel_settings</span>
            </button>
          )}
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1 md:gap-2 bg-primary hover:bg-primary-container text-on-primary px-3 md:px-5 py-2 md:py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all active:scale-95 shadow-lg shadow-primary/10"
        >
          <span className="material-symbols-outlined text-sm font-bold">add</span>
          <span className="hidden sm:inline">İçerik Ekle</span>
          <span className="sm:hidden">Ekle</span>
        </button>
      </div>
    </header>
  )
}
