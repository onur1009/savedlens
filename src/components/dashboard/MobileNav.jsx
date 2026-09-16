export default function MobileNav({
  view,
  setView,
  setCurrentCat,
  setShowModal,
}) {
  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 w-full h-20 bg-surface-container-high/95 backdrop-blur-xl border-t border-white/10 z-50 flex items-center justify-around px-2 pb-2 pt-2">
        {[
          { id: 'all', icon: 'home', label: 'Ana Sayfa' },
          { id: 'reels', icon: 'movie', label: 'Reels' },
          { id: 'fav', icon: 'star', label: 'Favoriler' },
          { id: 'settings', icon: 'person', label: 'Profil' }
        ].map(item => (
          <button 
            key={item.id}
            onClick={() => { setView(item.id); setCurrentCat(null); }}
            className={`flex flex-col items-center justify-center gap-1 w-16 h-12 rounded-xl transition-all ${
              view === item.id ? 'text-primary' : 'text-slate-500 hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[26px]" style={{ fontVariationSettings: view === item.id ? "'FILL' 1" : "'FILL' 0" }}>{item.icon}</span>
            <span className="text-[9px] font-bold tracking-wide">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* MOBILE FAB */}
      <button 
        onClick={() => setShowModal(true)}
        className="md:hidden fixed bottom-24 right-6 w-16 h-16 bg-primary text-on-primary rounded-2xl shadow-2xl shadow-primary/40 flex items-center justify-center z-50 active:scale-90 transition-transform"
      >
        <span className="material-symbols-outlined text-3xl font-bold">add</span>
      </button>
    </>
  )
}
