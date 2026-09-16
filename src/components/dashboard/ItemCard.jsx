export default function ItemCard({
  item,
  cats,
  gv,
  onSelect,
  onToggleFav,
  onDelete,
  onOpenChat,
}) {
  const cat = cats.find(c => c.id === item.category_id)
  const tl = item.type === 'reel' ? 'Reels' : item.type === 'carousel' ? 'Carousel' : 'Gönderi'
  const tc = item.type === 'reel' ? 'bg-pink-500/20 text-pink-400' : item.type === 'carousel' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-primary/20 text-primary'
  const proxied = item.thumbnail_url ? `https://images.weserv.nl/?url=${encodeURIComponent(item.thumbnail_url)}&w=600&h=600&fit=cover` : null

  return (
    <div 
      onClick={() => onSelect(item)}
      className={`group bg-surface-container-low border border-white/5 rounded-2xl overflow-hidden transition-all duration-300 hover:border-white/10 hover:translate-y-[-3px] cursor-pointer shadow-lg hover:shadow-primary/5 ${gv === 'list' ? 'flex' : 'flex flex-col'}`}
    >
      {/* Media Container */}
      <div className={`relative overflow-hidden bg-surface-container-high ${gv === 'list' ? 'w-48 aspect-video' : 'aspect-square'}`}>
        {proxied ? (
          <img 
            src={proxied} 
            alt={item.title} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-700">
            <span className="material-symbols-outlined text-5xl">{item.type === 'reel' ? 'movie' : 'image'}</span>
          </div>
        )}
        
        {/* Badge */}
        <div className={`absolute top-4 left-4 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${tc} backdrop-blur-md border border-white/5`}>
          {tl}
        </div>

        {/* Action Overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
          <button 
            onClick={(e) => { e.stopPropagation(); onToggleFav(item.id, item.is_favorite); }}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${item.is_favorite ? 'bg-amber-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
          >
            <span className="material-symbols-outlined text-xl">{item.is_favorite ? 'star' : 'star_outline'}</span>
          </button>
          {item.instagram_url && (
            <button 
              onClick={(e) => { e.stopPropagation(); window.open(item.instagram_url, '_blank'); }}
              className="w-10 h-10 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center transition-all"
            >
              <span className="material-symbols-outlined text-xl">open_in_new</span>
            </button>
          )}
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
            className="w-10 h-10 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all"
          >
            <span className="material-symbols-outlined text-xl">delete</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 flex flex-col flex-1">
        {cat && (
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }}></div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">{cat.name}</span>
          </div>
        )}
        <h4 className="text-base font-bold text-white mb-2 line-clamp-1 group-hover:text-primary transition-colors">{item.title || 'İsimsiz İçerik'}</h4>
        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4 flex-1">{item.description || 'Açıklama bulunmuyor...'}</p>
        
        <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">
            {new Date(item.created_at).toLocaleDateString('tr-TR')}
          </span>
          <button 
            onClick={(e) => { e.stopPropagation(); onOpenChat(item); }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/5 text-primary hover:bg-primary hover:text-on-primary transition-all text-[10px] font-black uppercase tracking-wider"
          >
            <span className="material-symbols-outlined text-sm">auto_awesome</span>
            AI ASİSTAN
          </button>
        </div>
      </div>
    </div>
  )
}
