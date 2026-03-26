export default function ContentCard({ item, cat, gv, onSelect, onToggleFav, onDelete }) {
  const typeLabel = item.type === 'reel' ? 'Reel' : item.type === 'carousel' ? 'Carousel' : 'Post'
  const typeIcon = item.type === 'reel' ? 'movie' : item.type === 'carousel' ? 'view_carousel' : 'image'
  
  // Use Weserv proxy for better thumbnail reliability
  const proxiedThumb = item.thumbnail_url 
    ? `https://images.weserv.nl/?url=${encodeURIComponent(item.thumbnail_url)}&w=600&h=600&fit=cover`
    : null

  return (
    <div 
      onClick={() => onSelect(item)}
      className={`group relative bg-surface-container-low/40 border border-outline-variant/10 rounded-3xl overflow-hidden hover:bg-surface-container-high/60 hover:border-outline-variant/30 transition-all duration-500 cursor-pointer shadow-xl hover:shadow-primary/5 hover:-translate-y-1.5 ${gv === 'list' ? 'flex flex-row gap-6 h-48' : 'flex flex-col'}`}
    >
      <div className={`relative overflow-hidden bg-surface-container-highest/50 ${gv === 'list' ? 'w-48 h-full shrink-0' : 'aspect-[4/5] w-full'}`}>
        {proxiedThumb ? (
          <img 
            src={proxiedThumb} 
            alt={item.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            onError={(e) => { e.target.parentElement.innerHTML = '<div class="w-full h-full flex flex-col items-center justify-center bg-surface-container-highest/20"><span class="material-symbols-outlined text-4xl opacity-20">broken_image</span></div>' }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center">
            <span className="material-symbols-outlined text-5xl text-on-surface-variant/20">{typeIcon}</span>
          </div>
        )}
        
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 shadow-2xl">
          <span className="material-symbols-outlined text-[14px] text-white/90 leading-none">{typeIcon}</span>
          <span className="text-[10px] font-black text-white tracking-widest uppercase leading-none">{typeLabel}</span>
        </div>

        {item.is_favorite && (
          <div className="absolute top-4 right-4 z-10 w-9 h-9 rounded-xl bg-yellow-500/90 backdrop-blur-md flex items-center justify-center text-white shadow-lg shadow-yellow-500/20">
            <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
          </div>
        )}
      </div>

      <div className="p-6 flex flex-col flex-grow min-w-0">
        <div className="mb-4 flex-grow">
          {cat && (
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }}></div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant font-headline">{cat.name}</span>
            </div>
          )}
          <h3 className="text-lg font-bold text-white tracking-tight leading-snug group-hover:text-primary transition-colors mb-2 line-clamp-2">
            {item.title || 'İsimsiz İçerik'}
          </h3>
          {item.description && (
            <p className="text-sm text-on-surface-variant line-clamp-2 leading-relaxed font-medium opacity-60 group-hover:opacity-100 transition-opacity">
              {item.description}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 mt-auto border-t border-outline-variant/10">
          <div className="flex items-center gap-2.5">
            <span className="text-[10px] font-black text-on-surface-variant/40 tracking-widest uppercase">
              {new Date(item.created_at).toLocaleDateString('tr-TR', { day:'2-digit', month:'short' })}
            </span>
          </div>

          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
            <button 
              onClick={(e) => { e.stopPropagation(); onToggleFav(item.id, item.is_favorite); }}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${item.is_favorite ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 shadow-lg shadow-yellow-500/10' : 'bg-surface-bright/50 text-on-surface-variant hover:text-white border border-outline-variant/10'}`}
            >
              <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: item.is_favorite ? "'FILL' 1" : "" }}>star</span>
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
              className="w-9 h-9 rounded-xl flex items-center justify-center bg-error/10 text-error hover:bg-error hover:text-white border border-error/20 transition-all shadow-lg hover:shadow-error/20"
            >
              <span className="material-symbols-outlined text-xl">delete</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
