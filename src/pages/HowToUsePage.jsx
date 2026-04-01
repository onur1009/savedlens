import logo from '../assets/logo.png'
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0c0e12; color: #f6f6fc; font-family: 'Manrope', sans-serif; -webkit-font-smoothing: antialiased; }
  .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24; vertical-align: middle; line-height: 1; }

  .how-glass {
    background: rgba(35, 38, 44, 0.55);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
  }
  .how-card {
    background: #111318;
    border: 1px solid rgba(129, 140, 248, 0.1);
    transition: border-color 0.3s, box-shadow 0.3s;
  }
  .how-card:hover {
    border-color: rgba(129, 140, 248, 0.3);
    box-shadow: 0 0 50px rgba(129, 140, 248, 0.05);
  }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .fade-up { animation: fadeUp 0.65s ease both; }
  .fade-up-2 { animation: fadeUp 0.65s 0.12s ease both; }
  .fade-up-3 { animation: fadeUp 0.65s 0.24s ease both; }

  .step-badge {
    width: 40px; height: 40px; border-radius: 50%;
    background: rgba(99,102,241,0.1);
    border: 1px solid rgba(99,102,241,0.2);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    color: #a5b4fc; font-weight: 800; font-size: 14px;
  }
  .method-badge {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 5px 14px; border-radius: 100px;
    background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.2);
    font-size: 11px; font-weight: 800; color: #a5b4fc;
    text-transform: uppercase; letter-spacing: 0.14em;
    margin-bottom: 20px;
  }
  .progress-bar {
    height: 6px; border-radius: 100px; overflow: hidden;
    background: rgba(255,255,255,0.08); width: 180px;
  }
  .progress-fill {
    height: 100%; width: 66%;
    background: linear-gradient(90deg, #6366f1, #a5b4fc);
    border-radius: 100px;
    box-shadow: 0 0 12px rgba(129,140,248,0.5);
  }
  .nav-link-how { color: #94a3b8; text-decoration: none; font-size: 14px; font-weight: 500; transition: color 0.2s; }
  .nav-link-how:hover { color: #e2e8f0; }
  .btn-p { background: #6366f1; color: #fff; border: none; font-family: inherit; font-weight: 700; cursor: pointer; transition: transform 0.15s, box-shadow 0.3s; border-radius: 14px; }
  .btn-p:hover { box-shadow: 0 0 30px rgba(99,102,241,0.4); }
  .btn-p:active { transform: scale(0.97); }
  .btn-g { background: rgba(99,102,241,0.1); color: #a5b4fc; border: none; font-family: inherit; font-weight: 700; cursor: pointer; border-radius: 12px; transition: background 0.2s; }
  .btn-g:hover { background: rgba(99,102,241,0.18); }
`

function StepItem({ n, title, desc }) {
  return (
    <div style={{ display:'flex', gap:20, alignItems:'flex-start' }}>
      <div className="step-badge">{n}</div>
      <div>
        <h3 style={{ fontSize:17, fontWeight:700, color:'#e0e7ff', marginBottom:6 }}>{title}</h3>
        <p style={{ fontSize:14, color:'#64748b', lineHeight:1.75, fontWeight:500 }}
           dangerouslySetInnerHTML={{ __html: desc }} />
      </div>
    </div>
  )
}

export default function HowToUsePage({ onGoToAuth, onGoToLanding, onGoToHelp, onGoToPrivacy, onGoToTerms }) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />

      {/* NAV */}
      <header style={{ position:'fixed', top:0, width:'100%', zIndex:50, display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0 40px', height:130, background:'rgba(12,14,18,0.9)', backdropFilter:'blur(14px)', borderBottom:'1px solid rgba(99,102,241,0.06)' }}>
        <div style={{ display:'flex', alignItems:'center', cursor:'pointer' }} onClick={onGoToLanding}>
          <img src={logo} alt="SavedLens Logo" style={{ height:150, width:'auto', objectFit:'contain', marginTop:15 }} />
        </div>
        <nav style={{ display:'flex', gap:28, alignItems:'center' }}>
          <a href="#" className="nav-link-how" onClick={e => { e.preventDefault(); onGoToLanding(); }}>Ana Sayfa</a>
          <a href="#instagram" className="nav-link-how">Instagram İçe Aktarma</a>
          <a href="#manual" className="nav-link-how">Manuel Ekleme</a>
          <span style={{ color:'#c7d2fe', fontSize:14, fontWeight:600, borderBottom:'2px solid #818cf8', paddingBottom:3 }}>Nasıl Çalışır?</span>
        </nav>
        <div style={{ display:'flex', gap:10 }}>
          <button className="btn-g" onClick={onGoToAuth} style={{ padding:'8px 18px', fontSize:13 }}>Giriş Yap</button>
          <button className="btn-p" onClick={onGoToAuth} style={{ padding:'9px 20px', fontSize:13 }}>Kayıt Ol</button>
        </div>
      </header>

      <main style={{ maxWidth:1200, margin:'0 auto', padding:'160px 40px 96px' }}>

        {/* HERO */}
        <header style={{ textAlign:'center', marginBottom:88 }} className="fade-up">
          <h1 style={{ fontSize:'clamp(36px,5.5vw,68px)', fontWeight:800, letterSpacing:'-2px', lineHeight:1.08, marginBottom:20, background:'linear-gradient(180deg, #f1f5f9 0%, rgba(165,180,252,0.7) 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
            Hafızanı İnşa Et.
          </h1>
          <p className="fade-up-2" style={{ fontSize:'clamp(15px,2vw,18px)', color:'#64748b', maxWidth:600, margin:'0 auto', lineHeight:1.8, fontWeight:500 }}>
            SavedLens, dijital dünyadaki izlerini bir araya getiren akıllı bir asistan.
            Verilerini nasıl aktaracağını keşfet.
          </p>
        </header>

        {/* SECTION 1: Instagram İçe Aktarma */}
        <section id="instagram" style={{ marginBottom:120 }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(320px,1fr))', gap:64, alignItems:'center' }}>

            {/* Steps */}
            <div className="fade-up">
              <div className="method-badge">
                <span className="material-symbols-outlined" style={{ fontSize:14 }}>auto_awesome</span>
                Yöntem 01
              </div>
              <h2 style={{ fontSize:'clamp(22px,3vw,36px)', fontWeight:800, color:'#e0e7ff', marginBottom:36, letterSpacing:'-0.8px', lineHeight:1.2 }}>
                Instagram Verilerini<br />İçe Aktarma
              </h2>
              <div style={{ display:'flex', flexDirection:'column', gap:28 }}>
                <StepItem n="1" title="Talep Gönder" desc="Instagram ayarlarından <strong style='color:#a5b4fc'>'Bilgilerini İndir'</strong> kısmına git ve veri talebi oluştur." />
                <StepItem n="2" title="JSON Formatını Seç" desc="Format olarak <strong style='color:#a5b4fc'>JSON</strong> seçeneğini işaretlediğinden emin ol. Bu, asistanımızın veriyi okumasını sağlar." />
                <StepItem n="3" title="Dosyayı İndir" desc="Instagram tarafından e-postana gönderilen bağlantıya tıkla ve ZIP dosyasını indir." />
                <StepItem n="4" title="Panelden Yükle" desc="SavedLens paneline dön ve indirdiğin dosyayı <strong style='color:#a5b4fc'>'Veri Aktar'</strong> bölümüne sürükle." />
              </div>
            </div>

            {/* Visual */}
            <div style={{ position:'relative' }}>
              <div style={{ position:'absolute', inset:-16, background:'rgba(99,102,241,0.08)', borderRadius:36, filter:'blur(32px)', opacity:0.6, zIndex:0 }} />
              <div className="how-card" style={{ borderRadius:28, overflow:'hidden', aspectRatio:'1/1', position:'relative', zIndex:1 }}>
                {/* Decorative grid pattern */}
                <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(rgba(99,102,241,0.08) 1px, transparent 1px)', backgroundSize:'28px 28px', opacity:0.7 }} />
                <div style={{ position:'absolute', inset:0, background:'radial-gradient(circle at 30% 30%, rgba(99,102,241,0.15), transparent 65%)' }} />

                <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <div className="how-glass" style={{ padding:'28px 32px', borderRadius:20, border:'1px solid rgba(255,255,255,0.1)', display:'flex', flexDirection:'column', alignItems:'center', gap:16, maxWidth:240 }}>
                    <span className="material-symbols-outlined" style={{ fontSize:48, color:'#a5b4fc', fontVariationSettings:"'FILL' 0,'wght' 300" }}>cloud_upload</span>
                    <span style={{ fontWeight:700, fontSize:15, color:'#e0e7ff', textAlign:'center' }}>JSON Verisi Yükleniyor</span>
                    <div className="progress-bar">
                      <div className="progress-fill" />
                    </div>
                    <span style={{ fontSize:11, color:'#64748b', fontWeight:600 }}>saved_posts.json • 2.4 MB</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: Manuel Link */}
        <section id="manual" style={{ marginBottom:120 }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(320px,1fr))', gap:64, alignItems:'center' }}>

            {/* Visual */}
            <div style={{ position:'relative', order: 0 }}>
              <div style={{ position:'absolute', inset:-16, background:'rgba(99,102,241,0.07)', borderRadius:36, filter:'blur(32px)', opacity:0.6, zIndex:0 }} />
              <div className="how-card" style={{ borderRadius:28, overflow:'hidden', aspectRatio:'4/3', position:'relative', zIndex:1 }}>
                <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(rgba(99,102,241,0.06) 1px, transparent 1px)', backgroundSize:'24px 24px' }} />
                <div style={{ position:'absolute', inset:0, background:'radial-gradient(circle at 70% 70%, rgba(99,102,241,0.12), transparent 60%)' }} />
                <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
                  <div className="how-glass" style={{ width:'100%', maxWidth:310, padding:20, borderRadius:18, border:'1px solid rgba(255,255,255,0.06)', display:'flex', flexDirection:'column', gap:12 }}>
                    {/* Traffic lights */}
                    <div style={{ display:'flex', gap:6 }}>
                      {['#f87171','#818cf8','#a5b4fc'].map((c,i) => <div key={i} style={{ width:10, height:10, borderRadius:'50%', background:c, opacity:0.7 }} />)}
                    </div>
                    {/* URL bar */}
                    <div style={{ background:'rgba(99,102,241,0.08)', padding:'10px 14px', borderRadius:10, border:'1px solid rgba(99,102,241,0.12)', fontFamily:'monospace', fontSize:11, color:'#a5b4fc', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      https://www.instagram.com/reel/DK4X...
                    </div>
                    {/* Save button */}
                    <div style={{ background:'#6366f1', borderRadius:10, padding:'11px', textAlign:'center', fontWeight:700, fontSize:13, color:'#fff', boxShadow:'0 8px 20px rgba(99,102,241,0.3)' }}>
                      Kaydet
                    </div>
                    {/* Success hint */}
                    <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:11, color:'#4ade80', fontWeight:600 }}>
                      <span className="material-symbols-outlined" style={{ fontSize:14, color:'#4ade80', fontVariationSettings:"'FILL' 1" }}>check_circle</span>
                      Başlık ve kapak otomatik çekildi
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Steps */}
            <div>
              <div className="method-badge">
                <span className="material-symbols-outlined" style={{ fontSize:14 }}>link</span>
                Yöntem 02
              </div>
              <h2 style={{ fontSize:'clamp(22px,3vw,36px)', fontWeight:800, color:'#e0e7ff', marginBottom:36, letterSpacing:'-0.8px', lineHeight:1.2 }}>
                Manuel Link<br />Ekleme
              </h2>
              <div style={{ display:'flex', flexDirection:'column', gap:28 }}>
                <StepItem n="1" title="Linki Kopyala" desc="Beğendiğin bir gönderi, Reels veya video linkini panona kopyala." />
                <StepItem n="2" title="İçerik Ekle" desc="SavedLens panelindeki <strong style='color:#a5b4fc'>'+ İçerik Ekle'</strong> butonuna tıkla." />
                <StepItem n="3" title="Kaydet ve Analiz Et" desc="Linki yapıştırıp <strong style='color:#a5b4fc'>'Kaydet'</strong> butonuna bas. Başlık ve kapak otomatik çekilir." />
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section style={{ textAlign:'center' }}>
          <div className="how-card" style={{ borderRadius:40, padding:'72px 48px', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:0, left:'50%', transform:'translateX(-50%)', width:'100%', height:'100%', background:'radial-gradient(circle at center, rgba(99,102,241,0.07) 0%, transparent 65%)', pointerEvents:'none' }} />
            <h2 style={{ fontSize:'clamp(24px,3.5vw,44px)', fontWeight:800, color:'#e0e7ff', marginBottom:16, letterSpacing:'-1px', position:'relative', zIndex:1 }}>
              Zihnini genişletmeye<br />hazır mısın?
            </h2>
            <p style={{ color:'#64748b', fontSize:16, maxWidth:440, margin:'0 auto 40px', lineHeight:1.8, fontWeight:500, position:'relative', zIndex:1 }}>
              Hafızanı düzenlemek ve yapay zeka asistanınla tanışmak için ilk adımı at.
            </p>
            <button className="btn-p" onClick={onGoToAuth} style={{ padding:'15px 44px', fontSize:16, display:'inline-flex', alignItems:'center', gap:10, position:'relative', zIndex:1, boxShadow:'0 0 40px rgba(99,102,241,0.3)' }}>
              Hemen Başla
              <span className="material-symbols-outlined" style={{ fontSize:20 }}>arrow_forward</span>
            </button>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer style={{ borderTop:'1px solid rgba(255,255,255,0.05)', padding:'40px 40px 28px', display:'flex', flexWrap:'wrap', justifyContent:'space-between', alignItems:'center', gap:20, maxWidth:1200, margin:'0 auto' }}>
        <div style={{ display:'flex', alignItems:'center' }}>
          <img src={logo} alt="SavedLens Logo" style={{ height:40, width:'auto', objectFit:'contain' }} />
        </div>
        <div style={{ display:'flex', gap:28 }}>
          {[
            { label: 'Gizlilik Politikası', handler: onGoToPrivacy },
            { label: 'Kullanım Koşulları', handler: onGoToTerms },
            { label: 'Yardım Merkezi', handler: onGoToHelp }
          ].map(l => (
            <a key={l.label} href="#" style={{ color:'rgba(100,116,139,0.7)', textDecoration:'none', fontSize:12, fontWeight:600, transition:'color 0.2s' }}
              onClick={e => { e.preventDefault(); l.handler(); }}
              onMouseOver={e => e.target.style.color='#a5b4fc'}
              onMouseOut={e => e.target.style.color='rgba(100,116,139,0.7)'}>{l.label}</a>
          ))}
        </div>
        <span style={{ fontSize:12, color:'rgba(100,116,139,0.4)', fontWeight:600 }}>© 2025 SavedLens. Dijital Hafıza Asistanınız.</span>
      </footer>
    </>
  )
}
