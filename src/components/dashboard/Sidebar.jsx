import logo from '../../assets/logo.png'

export default function Sidebar({
  view,
  setView,
  currentCat,
  setCurrentCat,
  setTf,
  items,
  cats,
  delCat,
  setShowCatModal,
  profile,
  session,
  onSignOut,
}) {
  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-background border-r border-white/5 flex flex-col z-40 hidden md:flex pt-6 pb-6">
      <div className="px-6 mb-6 flex items-center">
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

        {/* KATEGORİLER SECTION */}
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] text-slate-500 mb-4 px-4 uppercase">Kategoriler</p>
          <div className="flex flex-col gap-1">
            {cats.map(c => (
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
            onClick={(e) => { e.stopPropagation(); onSignOut(); }}
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
  )
}
