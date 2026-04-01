import logo from '../assets/logo.png'
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body { background: #0c0e12; color: #f1f5f9; font-family: 'Manrope', sans-serif; -webkit-font-smoothing: antialiased; overflow-x: hidden; }

  .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; vertical-align: middle; line-height: 1; }

  @keyframes float {
    0%, 100% { transform: rotateX(12deg) rotateY(-12deg) translateY(0px); }
    50% { transform: rotateX(14deg) rotateY(-10deg) translateY(-18px); }
  }
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  @keyframes pulseSoft {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 0.9; }
  }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(24px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .hero-gradient { background: radial-gradient(circle at 50% -20%, rgba(99,102,241,0.18) 0%, transparent 65%); }
  .animated-dashboard { transform-style: preserve-3d; animation: float 8s ease-in-out infinite; }
  .perspective-wrap { perspective: 2000px; }
  .shimmer-bar { background: linear-gradient(90deg, transparent, rgba(99,102,241,0.15), transparent); background-size: 200% 100%; animation: shimmer 4s linear infinite; }
  .pulse-icon { animation: pulseSoft 3s ease-in-out infinite; }
  .fade-up { animation: fadeUp 0.7s ease both; }
  .fade-up-2 { animation: fadeUp 0.7s ease 0.15s both; }
  .fade-up-3 { animation: fadeUp 0.7s ease 0.3s both; }

  .glass-card { background: rgba(35,38,44,0.45); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); }
  .feature-card:hover .feature-icon { transform: scale(1.12); }
  .feature-icon { transition: transform 0.4s cubic-bezier(.34,1.56,.64,1); }
  .nav-link { color: #94a3b8; text-decoration: none; font-size: 14px; transition: color 0.2s; }
  .nav-link:hover { color: #e2e8f0; }
  .nav-link.active { color: #c7d2fe; border-bottom: 2px solid #818cf8; padding-bottom: 4px; font-weight: 600; }
  .btn-primary { background: #6366f1; color: #fff; border: none; font-family: 'Manrope', sans-serif; font-weight: 700; cursor: pointer; transition: box-shadow 0.3s, transform 0.15s; border-radius: 12px; }
  .btn-primary:hover { box-shadow: 0 0 32px rgba(99,102,241,0.4); }
  .btn-primary:active { transform: scale(0.97); }
  .btn-ghost { background: none; border: none; color: #a5b4fc; font-family: 'Manrope', sans-serif; font-weight: 600; cursor: pointer; padding: 8px 20px; border-radius: 10px; transition: background 0.2s; font-size: 14px; }
  .btn-ghost:hover { background: rgba(255,255,255,0.05); }
  .content-card { background: rgba(17,19,24,0.9); border: 1px solid rgba(255,255,255,0.06); border-radius: 24px; transition: border-color 0.25s, transform 0.25s; }
  .content-card:hover { border-color: rgba(99,102,241,0.3); transform: translateY(-4px); }
  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-thumb { background: #1d2025; border-radius: 10px; }
`

export default function LandingPage({ onGoToAuth, onGoToHow, onGoToHelp, onGoToPrivacy, onGoToTerms }) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />

      {/* NAV */}
      <header style={{ position:'fixed', top:0, width:'100%', zIndex:50, display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0 40px', height:120, background:'rgba(12,14,18,0.85)', backdropFilter:'blur(14px)', borderBottom:'1px solid rgba(99,102,241,0.08)' }}>
        <div style={{ display:'flex', alignItems:'center', cursor:'pointer' }} onClick={() => window.scrollTo({top:0, behavior:'smooth'})}>
          <img src={logo} alt="SavedLens Logo" style={{ height:150, width:'auto', objectFit:'contain', marginTop:20 }} />
        </div>
        <nav style={{ display:'flex', gap:32, alignItems:'center' }}>
          <a href="#features" className="nav-link active">Özellikler</a>
          <a href="#how" className="nav-link" onClick={e => { e.preventDefault(); onGoToHow(); }}>Nasıl Çalışır?</a>
          <a href="#cta" className="nav-link">Başla</a>
        </nav>
        <div style={{ display:'flex', gap:10 }}>
          <button className="btn-ghost" onClick={onGoToAuth}>Giriş Yap</button>
          <button className="btn-primary" onClick={onGoToAuth} style={{ padding:'9px 22px', fontSize:14 }}>Ücretsiz Kayıt Ol</button>
        </div>
      </header>

      <main style={{ paddingTop:76 }}>

        {/* HERO */}
        <section className="hero-gradient" style={{ minHeight:'88vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', padding:'60px 24px 80px', overflow:'hidden' }}>
          <div style={{ maxWidth:820, margin:'0 auto', zIndex:1 }} className="fade-up">
            <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(99,102,241,0.1)', border:'1px solid rgba(99,102,241,0.2)', borderRadius:100, padding:'6px 16px', marginBottom:28, fontSize:12, color:'#a5b4fc', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase' }}>
              <span className="material-symbols-outlined pulse-icon" style={{ fontSize:14 }}>auto_awesome</span>
              AI Destekli Dijital Hafıza
            </div>
            <h1 style={{ fontSize:'clamp(38px, 6vw, 72px)', fontWeight:800, letterSpacing:'-2px', lineHeight:1.05, marginBottom:24, color:'#f8fafc' }}>
              Instagram hafızanı<br />
              <span style={{ color:'#818cf8' }}>AI ile canlandır</span>
            </h1>
            <p className="fade-up-2" style={{ fontSize:'clamp(15px, 2vw, 19px)', color:'#94a3b8', lineHeight:1.75, maxWidth:600, margin:'0 auto 40px', fontWeight:500 }}>
              Kaydettiğin içerikler arasında kaybolma. Yapay zeka asistanın
              dijital arşivini organize eder, özetler ve sorularına anında yanıt verir.
            </p>
            <div className="fade-up-3" style={{ display:'flex', gap:16, justifyContent:'center', flexWrap:'wrap', alignItems:'center' }}>
              <button className="btn-primary" onClick={onGoToAuth} style={{ padding:'14px 36px', fontSize:16, borderRadius:14 }}>
                Ücretsiz Başla
              </button>
              <button className="btn-ghost" onClick={onGoToHow} style={{ display:'flex', alignItems:'center', gap:6, fontSize:16 }}>
                <span className="material-symbols-outlined" style={{ fontSize:20 }}>play_circle</span>
                Nasıl Çalışır?
              </button>
            </div>
          </div>

          {/* ANIMATED DASHBOARD PREVIEW */}
          <div className="perspective-wrap" style={{ marginTop:64, width:'100%', maxWidth:1000, padding:'0 16px' }}
            onMouseMove={e => {
              const el = e.currentTarget.querySelector('.animated-dashboard')
              const { left, top, width, height } = e.currentTarget.getBoundingClientRect()
              const x = (e.clientX - left) / width - 0.5
              const y = (e.clientY - top) / height - 0.5
              el.style.animation = 'none'
              el.style.transform = `rotateX(${12 + y * 10}deg) rotateY(${-12 + x * 10}deg)`
            }}
            onMouseLeave={e => {
              const el = e.currentTarget.querySelector('.animated-dashboard')
              el.style.animation = 'float 8s ease-in-out infinite'
            }}>
            <div className="animated-dashboard" style={{ background:'rgba(23,26,31,0.5)', borderRadius:32, border:'1px solid rgba(99,102,241,0.12)', minHeight:380, overflow:'hidden', boxShadow:'0 40px 100px rgba(0,0,0,0.6)' }}>
              {/* Mock topbar */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:'1px solid rgba(255,255,255,0.04)', background:'rgba(12,14,18,0.4)' }}>
                <div style={{ display:'flex', gap:7 }}>
                  {['#f87171','#fbbf24','#4ade80'].map((c,i) => <div key={i} style={{ width:11, height:11, borderRadius:'50%', background:c, opacity:0.4 }} />)}
                </div>
                <div className="shimmer-bar" style={{ width:140, height:8, borderRadius:100 }} />
                <div style={{ width:30, height:30, borderRadius:'50%', background:'rgba(99,102,241,0.1)' }} />
              </div>

              {/* Mock content grid */}
              <div style={{ display:'grid', gridTemplateColumns:'220px 1fr', gap:0 }}>
                {/* Sidebar */}
                <div style={{ padding:'20px 12px', borderRight:'1px solid rgba(255,255,255,0.04)', display:'flex', flexDirection:'column', gap:6 }}>
                  {[['#6366f1',true],['#475569',false],['#475569',false],['#475569',false]].map(([c,active],i) => (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:10, background: active ? 'rgba(99,102,241,0.1)' : 'transparent', borderLeft: active ? '3px solid #818cf8' : '3px solid transparent' }}>
                      <div style={{ width:8, height:8, borderRadius:'50%', background:c }} />
                      <div style={{ height:7, borderRadius:100, background:'rgba(255,255,255,0.1)', flex:1 }} />
                    </div>
                  ))}
                </div>
                {/* Cards area */}
                <div style={{ padding:20, display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  {[0,1,2,3].map(i => (
                    <div key={i} style={{ background:'rgba(255,255,255,0.03)', borderRadius:16, border:'1px solid rgba(255,255,255,0.05)', padding:14, minHeight:110 }}>
                      <div style={{ height:50, background:'rgba(99,102,241,0.08)', borderRadius:10, marginBottom:10 }} />
                      <div style={{ height:6, background:'rgba(255,255,255,0.08)', borderRadius:100, width:'70%', marginBottom:6 }} />
                      <div style={{ height:5, background:'rgba(255,255,255,0.04)', borderRadius:100, width:'50%' }} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Floating AI Hint */}
              <div className="glass-card" style={{ position:'absolute', bottom:20, left:'50%', transform:'translateX(-50%)', border:'1px solid rgba(99,102,241,0.2)', borderRadius:18, padding:'14px 22px', display:'flex', alignItems:'center', gap:16, whiteSpace:'nowrap', boxShadow:'0 20px 60px rgba(0,0,0,0.5)' }}>
                <div style={{ width:38, height:38, borderRadius:'50%', background:'rgba(99,102,241,0.15)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 20px rgba(99,102,241,0.4)' }}>
                  <span className="material-symbols-outlined pulse-icon" style={{ color:'#818cf8', fontSize:18 }}>auto_awesome</span>
                </div>
                <div>
                  <div style={{ fontSize:9, color:'#818cf8', fontWeight:800, textTransform:'uppercase', letterSpacing:'0.15em' }}>Asistan Önerisi</div>
                  <div style={{ fontSize:13, color:'#e2e8f0', marginTop:2 }}>"Geçen haftaki tarif videolarını özetleyeyim mi?"</div>
                </div>
                <button className="btn-primary" style={{ padding:'8px 16px', fontSize:11, borderRadius:10, marginLeft:8, flexShrink:0 }}>Analiz Et</button>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section id="features" style={{ padding:'96px 40px', maxWidth:1200, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:64 }}>
            <div style={{ fontSize:11, color:'#818cf8', fontWeight:800, letterSpacing:'0.18em', textTransform:'uppercase', marginBottom:14 }}>Neden SavedLens?</div>
            <h2 style={{ fontSize:'clamp(28px, 4vw, 42px)', fontWeight:800, letterSpacing:'-1px', color:'#f1f5f9' }}>Her şeyi kaydet,<br /><span style={{ color:'#818cf8' }}>hiçbir şeyi unutma</span></h2>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:20 }}>
            {[
              { icon:'summarize', color:'#818cf8', bg:'rgba(129,140,248,0.1)', title:'AI Özetleme', desc:'Uzun açıklamaları ve rehberleri saniyeler içinde özetler. Ana noktaları kaçırmazsın.' },
              { icon:'grid_view', color:'#f472b6', bg:'rgba(244,114,182,0.1)', title:'Akıllı Gruplama', desc:'İçerikleri kategorilere ayır, etiketle. Arşivini istediğin zaman hızla filtrele.' },
              { icon:'forum', color:'#34d399', bg:'rgba(52,211,153,0.1)', title:'AI ile Sohbet', desc:'"Bu tarifte kaç kalori var?" diye sor. Kaydettiğin içerik hakkında AI\'a her şeyi sorabilirsin.' },
              { icon:'edit_note', color:'#fbbf24', bg:'rgba(251,191,36,0.1)', title:'Kişisel Notlar', desc:'Her gönderi için özel notlar al. Aklındaki fikirleri kayda geçir, unutma.' },
            ].map(({ icon, color, bg, title, desc }) => (
              <div key={title} className="content-card feature-card" style={{ padding:'36px 32px' }}>
                <div className="feature-icon" style={{ width:54, height:54, borderRadius:16, background:bg, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:24 }}>
                  <span className="material-symbols-outlined" style={{ color, fontSize:26 }}>{icon}</span>
                </div>
                <h3 style={{ fontSize:20, fontWeight:700, color:'#f1f5f9', marginBottom:12 }}>{title}</h3>
                <p style={{ fontSize:14, color:'#64748b', lineHeight:1.75, fontWeight:500 }}>{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how" style={{ padding:'80px 40px', background:'rgba(17,19,24,0.6)', borderTop:'1px solid rgba(255,255,255,0.04)', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ maxWidth:900, margin:'0 auto', textAlign:'center' }}>
            <div style={{ fontSize:11, color:'#818cf8', fontWeight:800, letterSpacing:'0.18em', textTransform:'uppercase', marginBottom:14 }}>Nasıl Kullanılır?</div>
            <h2 style={{ fontSize:'clamp(26px, 3.5vw, 38px)', fontWeight:800, letterSpacing:'-1px', marginBottom:56, color:'#f1f5f9' }}>3 adımda dijital hafızan hazır</h2>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:32 }}>
              {[
                { n:'01', icon:'add_link', title:'Linki Yapıştır', desc:'Kaydetmek istediğin Instagram gönderisinin linkini panele yapıştır.' },
                { n:'02', icon:'auto_awesome', title:'AI Analiz Eder', desc:'Yapay zeka içeriği okur, özetler, kategorize eder. Sen hiçbir şey yapmak zorunda değilsin.' },
                { n:'03', icon:'forum', title:'Soru Sor', desc:'İstediğin zaman AI asistanınla konuş. Tarifleri, önerileri, fikirleri anında bul.' },
              ].map(({ n, icon, title, desc }) => (
                <div key={n} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:16 }}>
                  <div style={{ width:64, height:64, borderRadius:'50%', background:'rgba(99,102,241,0.1)', border:'1px solid rgba(99,102,241,0.2)', display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
                    <span className="material-symbols-outlined" style={{ color:'#818cf8', fontSize:26 }}>{icon}</span>
                    <span style={{ position:'absolute', top:-6, right:-6, width:22, height:22, borderRadius:'50%', background:'#4f46e5', display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:800, color:'#fff' }}>{n}</span>
                  </div>
                  <h3 style={{ fontSize:16, fontWeight:700, color:'#e2e8f0' }}>{title}</h3>
                  <p style={{ fontSize:13, color:'#64748b', lineHeight:1.7, fontWeight:500 }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section id="cta" style={{ padding:'96px 40px' }}>
          <div style={{ maxWidth:860, margin:'0 auto', background:'linear-gradient(135deg, #1d2025 0%, #0c0e12 100%)', borderRadius:40, padding:'72px 64px', textAlign:'center', border:'1px solid rgba(255,255,255,0.05)', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:-60, right:-60, width:200, height:200, background:'rgba(99,102,241,0.1)', borderRadius:'50%', filter:'blur(80px)' }} />
            <div style={{ position:'absolute', bottom:-60, left:-60, width:180, height:180, background:'rgba(167,139,250,0.08)', borderRadius:'50%', filter:'blur(80px)' }} />
            <h2 style={{ fontSize:'clamp(26px, 4vw, 44px)', fontWeight:800, letterSpacing:'-1.5px', lineHeight:1.15, marginBottom:20, position:'relative', zIndex:1, color:'#f8fafc' }}>
              Zihnini serbest bırak,<br /><span style={{ color:'#818cf8' }}>gerisini asistanına bırak.</span>
            </h2>
            <p style={{ color:'#64748b', fontSize:16, maxWidth:440, margin:'0 auto 40px', lineHeight:1.7, position:'relative', zIndex:1, fontWeight:500 }}>
              Instagram hafızanı dijital bir kütüphaneye dönüştürmek için bugün katıl.
            </p>
            <button className="btn-primary" onClick={onGoToAuth} style={{ padding:'16px 48px', fontSize:17, borderRadius:16, position:'relative', zIndex:1, boxShadow:'0 0 40px rgba(99,102,241,0.3)' }}>
              Hemen Başla — Ücretsiz
            </button>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer style={{ padding:'48px 40px 32px', borderTop:'1px solid rgba(255,255,255,0.05)', display:'flex', flexDirection:'column', gap:24 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:20 }}>
          <div style={{ display:'flex', alignItems:'center' }}>
            <img src={logo} alt="SavedLens Logo" style={{ height:40, width:'auto', objectFit:'contain' }} />
          </div>
          <div style={{ display:'flex', gap:32 }}>
            {[
              { label: 'Gizlilik', handler: onGoToPrivacy },
              { label: 'Kullanım Koşulları', handler: onGoToTerms },
              { label: 'Destek', handler: onGoToHelp }
            ].map(l => (
              <a key={l.label} href="#" style={{ color:'rgba(148,163,184,0.5)', textDecoration:'none', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.15em', transition:'color 0.2s' }}
                onClick={e => { e.preventDefault(); l.handler(); }}
                onMouseOver={e => e.target.style.color='#a5b4fc'}
                onMouseOut={e => e.target.style.color='rgba(148,163,184,0.5)'}>{l.label}</a>
            ))}
          </div>
        </div>
        <div style={{ borderTop:'1px solid rgba(255,255,255,0.04)', paddingTop:24, display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:11, color:'rgba(148,163,184,0.35)', fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase' }}>
          <span>© 2025 SavedLens Dijital Hafıza</span>
          <span>Created by Onur Çağlar Çakın</span>
        </div>
      </footer>
    </>
  )
}
