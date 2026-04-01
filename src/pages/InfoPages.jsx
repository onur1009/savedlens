import logo from '../assets/logo.png'
const sharedCss = `
  @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&family=Inter:wght@300;400;500;600&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0c0e12; color: #f6f6fc; font-family: 'Inter', sans-serif; -webkit-font-smoothing: antialiased; }
  h1,h2,h3,h4 { font-family: 'Manrope', sans-serif; }
  .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24; vertical-align: middle; line-height: 1; }
  a { text-decoration: none; }
  .glass-panel { background: rgba(35,38,44,0.6); backdrop-filter: blur(20px); }
`

function SharedNav({ active, onGoToLanding, onGoToAuth, onGoToHelp, onGoToPrivacy, onGoToTerms }) {
  const links = [
    { label: 'Yardım Merkezi', page: 'help', handler: onGoToHelp },
    { label: 'Kullanım Koşulları', page: 'terms', handler: onGoToTerms },
    { label: 'Gizlilik', page: 'privacy', handler: onGoToPrivacy },
  ]
  return (
    <nav style={{ position:'fixed', top:0, width:'100%', zIndex:50, display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0 32px', height:130, background:'rgba(12,14,18,0.92)', backdropFilter:'blur(14px)', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
      <div style={{ display:'flex', alignItems:'center', cursor:'pointer' }} onClick={onGoToLanding}>
        <img src={logo} alt="SavedLens Logo" style={{ height:150, width:'auto', objectFit:'contain', marginTop:15 }} />
      </div>
      <div style={{ display:'flex', gap:24, alignItems:'center' }}>
        {links.map(l => (
          <button key={l.page} onClick={l.handler} style={{ background:'none', border:'none', cursor:'pointer', fontFamily:'Inter,sans-serif', fontSize:13, fontWeight: active === l.page ? 600 : 400, color: active === l.page ? '#9ba8ff' : 'rgba(221,226,246,0.6)', borderBottom: active === l.page ? '2px solid #9ba8ff' : '2px solid transparent', paddingBottom:2, transition:'color 0.2s' }}>
            {l.label}
          </button>
        ))}
      </div>
      <button onClick={onGoToAuth} style={{ padding:'9px 22px', background:'#4963ff', color:'#fff', border:'none', borderRadius:12, fontFamily:'Manrope,sans-serif', fontWeight:700, fontSize:13, cursor:'pointer', transition:'opacity 0.2s' }}
        onMouseOver={e => e.currentTarget.style.opacity='0.88'}
        onMouseOut={e => e.currentTarget.style.opacity='1'}>
        Giriş Yap
      </button>
    </nav>
  )
}

function SharedFooter({ onGoToPrivacy, onGoToTerms, onGoToHelp }) {
  return (
    <footer style={{ borderTop:'1px solid rgba(255,255,255,0.05)', padding:'32px 32px 24px', display:'flex', flexWrap:'wrap', justifyContent:'space-between', alignItems:'center', gap:16 }}>
      <div>
        <div style={{ display:'flex', alignItems:'center', marginBottom:6 }}>
          <img src={logo} alt="SavedLens Logo" style={{ height:32, width:'auto', objectFit:'contain' }} />
        </div>
        <div style={{ fontSize:11, color:'rgba(221,226,246,0.4)' }}>© 2025 SavedLens Dijital Hafıza Asistanı</div>
      </div>
      <div style={{ display:'flex', gap:20 }}>
        {[['Gizlilik Politikası', onGoToPrivacy],['Kullanım Koşulları', onGoToTerms],['Yardım Merkezi', onGoToHelp]].map(([label, fn]) => (
          <button key={label} onClick={fn} style={{ background:'none', border:'none', cursor:'pointer', fontFamily:'Inter,sans-serif', fontSize:12, color:'rgba(221,226,246,0.4)', transition:'color 0.2s' }}
            onMouseOver={e => e.currentTarget.style.color='#9ba8ff'}
            onMouseOut={e => e.currentTarget.style.color='rgba(221,226,246,0.4)'}>{label}</button>
        ))}
      </div>
    </footer>
  )
}

// ============================================================
// YARDIM MERKEZİ
// ============================================================
export function HelpCenterPage({ onGoToLanding, onGoToAuth, onGoToPrivacy, onGoToTerms }) {
  const navProps = { active:'help', onGoToLanding, onGoToAuth, onGoToHelp:()=>{}, onGoToPrivacy, onGoToTerms }
  const ftrProps = { onGoToPrivacy, onGoToTerms, onGoToHelp:()=>{} }

  const topics = [
    { icon:'chat_bubble', title:'Canlı Destek', desc:'Asistanlarımız her gün 09:00–22:00 arası yayında.', btn:'Sohbeti Başlat' },
    { icon:'mail', title:'E-posta Gönder', desc:'Kapsamlı sorunlarınız için bize detaylı bir mesaj yazın.', btn:'Destek Formu' },
    { icon:'communities', title:'Topluluk', desc:'Diğer kullanıcılarla ipuçlarını paylaşın ve çözüm bulun.', btn:"Discord'a Katıl" },
  ]
  const articles = [
    { title:'Yapay Zeka Hafıza Optimizasyonu Nasıl Çalışır?', desc:'Hafızanızı nasıl daha verimli hale getirebileceğinizi ve SavedLens\'in verileri nasıl işlediğini öğrenin.' },
    { title:'Cihazlar Arası Senkronizasyon Sorunları', desc:'Mobil ve masaüstü uygulamaları arasındaki bağlantı kopmalarını dakikalar içinde çözün.' },
    { title:'Veri Gizliliği ve Şifreleme Protokolleri', desc:'Kişisel verilerinizin nasıl korunduğunu ve uçtan uca şifreleme süreçlerimizi inceleyin.' },
  ]

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: sharedCss }} />
      <SharedNav {...navProps} />
      {/* Glow bg */}
      <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:700, height:700, background:'rgba(99,102,241,0.05)', borderRadius:'50%', filter:'blur(120px)', pointerEvents:'none', zIndex:0 }} />

      <main style={{ paddingTop:130, position:'relative', zIndex:1 }}>
        {/* Hero */}
        <section style={{ minHeight:440, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', padding:'60px 24px 40px', position:'relative' }}>
          <h1 style={{ fontSize:'clamp(32px,5.5vw,64px)', fontWeight:800, letterSpacing:'-1.5px', lineHeight:1.1, marginBottom:20 }}>
            Hafızanızla <span style={{ color:'#9ba8ff' }}>İletişimde</span> Kalın.
          </h1>
          <p style={{ color:'#aaabb0', fontSize:16, maxWidth:540, lineHeight:1.8, marginBottom:36 }}>
            SavedLens asistanınızla ilgili her türlü teknik destek, kullanım rehberi ve merak ettikleriniz için buradayız.
          </p>
          <div style={{ position:'relative', width:'100%', maxWidth:520 }}>
            <span className="material-symbols-outlined" style={{ position:'absolute', left:18, top:'50%', transform:'translateY(-50%)', color:'#9ba8ff', fontSize:20 }}>search</span>
            <input placeholder="Nasıl yardımcı olabiliriz?" style={{ width:'100%', background:'#23262c', border:'none', borderRadius:16, padding:'18px 20px 18px 52px', color:'#f6f6fc', fontSize:15, outline:'none', fontFamily:'Inter,sans-serif' }} />
          </div>
        </section>

        {/* Cards grid */}
        <section style={{ maxWidth:1200, margin:'0 auto', padding:'40px 32px 80px' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:20, marginBottom:56 }}>
            {/* SSS big card */}
            <div style={{ gridColumn:'span 2', background:'#111318', borderRadius:28, padding:'36px 32px', border:'1px solid rgba(255,255,255,0.05)', cursor:'pointer', transition:'border-color 0.3s' }}
              onMouseOver={e => e.currentTarget.style.borderColor='rgba(155,168,255,0.2)'}
              onMouseOut={e => e.currentTarget.style.borderColor='rgba(255,255,255,0.05)'}>
              <div style={{ width:52, height:52, background:'rgba(155,168,255,0.1)', borderRadius:16, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:20 }}>
                <span className="material-symbols-outlined" style={{ color:'#9ba8ff', fontSize:26 }}>quiz</span>
              </div>
              <h2 style={{ fontSize:24, fontWeight:700, marginBottom:10 }}>Sıkça Sorulan Sorular</h2>
              <p style={{ color:'#aaabb0', fontSize:14, lineHeight:1.7, marginBottom:24 }}>Hesap güvenliği, abonelikler ve temel özellikler hakkında en çok merak edilenler.</p>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                {['Şifremi Unuttum','Abonelik İptali','Veri Güvenliği','API Erişimi'].map(t => (
                  <span key={t} style={{ padding:'6px 14px', background:'#23262c', borderRadius:100, fontSize:12, color:'#9ba8ff', fontWeight:600 }}>{t}</span>
                ))}
              </div>
            </div>
            {/* İkincil kart */}
            <div style={{ background:'#9ba8ff', borderRadius:28, padding:'36px 32px', cursor:'pointer', transition:'transform 0.3s' }}
              onMouseOver={e => e.currentTarget.style.transform='translateY(-6px)'}
              onMouseOut={e => e.currentTarget.style.transform='translateY(0)'}>
              <span className="material-symbols-outlined" style={{ fontSize:36, color:'#001470', marginBottom:16, display:'block' }}>menu_book</span>
              <h2 style={{ fontSize:24, fontWeight:800, color:'#001470', marginBottom:10 }}>Kullanım Rehberi</h2>
              <p style={{ color:'rgba(0,20,112,0.75)', fontSize:14, lineHeight:1.7, marginBottom:24 }}>SavedLens'i bir profesyonel gibi kullanmaya başlamanız için adım adım yönergeler.</p>
              <div style={{ display:'flex', alignItems:'center', gap:6, color:'#001470', fontWeight:700, fontSize:14 }}>
                Rehberi Keşfet <span className="material-symbols-outlined" style={{ fontSize:18, color:'#001470' }}>arrow_forward</span>
              </div>
            </div>
          </div>

          {/* Contact cards */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:16, marginBottom:64 }}>
            {topics.map(({ icon, title, desc, btn }) => (
              <div key={title} style={{ background:'rgba(35,38,44,0.4)', backdropFilter:'blur(16px)', borderRadius:22, padding:'28px 24px', textAlign:'center', border:'1px solid rgba(255,255,255,0.05)' }}>
                <span className="material-symbols-outlined" style={{ fontSize:36, color:'#9ba8ff', marginBottom:12, display:'block' }}>{icon}</span>
                <h3 style={{ fontSize:17, fontWeight:700, marginBottom:8 }}>{title}</h3>
                <p style={{ fontSize:13, color:'#aaabb0', lineHeight:1.65, marginBottom:20 }}>{desc}</p>
                <button style={{ width:'100%', padding:'11px', background:'none', border:'1px solid rgba(155,168,255,0.3)', borderRadius:12, color:'#9ba8ff', fontWeight:600, fontSize:13, cursor:'pointer', transition:'background 0.2s', fontFamily:'inherit' }}
                  onMouseOver={e => e.currentTarget.style.background='rgba(155,168,255,0.08)'}
                  onMouseOut={e => e.currentTarget.style.background='none'}>{btn}</button>
              </div>
            ))}
          </div>

          {/* Articles */}
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:10, color:'#9ba8ff', fontWeight:800, letterSpacing:'0.18em', textTransform:'uppercase', marginBottom:12 }}>ÖNERİLENLER</div>
            <h2 style={{ fontSize:28, fontWeight:800, letterSpacing:'-0.5px', marginBottom:32 }}>Popüler Yardım Konuları</h2>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:24 }}>
              {articles.map(({ title, desc }) => (
                <div key={title} style={{ cursor:'pointer' }}
                  onMouseOver={e => e.currentTarget.querySelector('h3').style.color='#9ba8ff'}
                  onMouseOut={e => e.currentTarget.querySelector('h3').style.color='#f6f6fc'}>
                  <div style={{ background:'rgba(99,102,241,0.06)', borderRadius:16, aspectRatio:'16/9', marginBottom:14, display:'flex', alignItems:'center', justifyContent:'center', border:'1px solid rgba(255,255,255,0.04)' }}>
                    <span className="material-symbols-outlined" style={{ fontSize:36, color:'rgba(155,168,255,0.3)' }}>article</span>
                  </div>
                  <h3 style={{ fontSize:16, fontWeight:700, marginBottom:8, transition:'color 0.2s' }}>{title}</h3>
                  <p style={{ fontSize:13, color:'#aaabb0', lineHeight:1.7, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div style={{ background:'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(137,153,255,0.05))', borderRadius:32, padding:'72px 40px', textAlign:'center', border:'1px solid rgba(137,153,255,0.2)', position:'relative', overflow:'hidden', marginTop:64 }}>
            <div style={{ position:'absolute', top:-40, right:-40, width:160, height:160, background:'rgba(255,255,255,0.05)', borderRadius:'50%', filter:'blur(60px)' }} />
            <h2 style={{ fontSize:'clamp(22px,3vw,36px)', fontWeight:800, color:'#fff', marginBottom:16 }}>Hâlâ aradığınızı bulamadınız mı?</h2>
            <p style={{ color:'rgba(221,226,246,0.6)', fontSize:16, maxWidth:480, margin:'0 auto 36px', lineHeight:1.8 }}>
              Müşteri başarı ekibimiz, her türlü teknik veya operasyonel konuda size destek vermeye hazır.
            </p>
            <div style={{ display:'flex', justifyContent:'center', gap:16, flexWrap:'wrap' }}>
              <button style={{ padding:'14px 32px', background:'#4963ff', color:'#fff', border:'none', borderRadius:14, fontWeight:700, fontSize:14, cursor:'pointer', fontFamily:'Manrope,sans-serif', boxShadow:'0 8px 24px rgba(73,99,255,0.25)' }}>
                Destek Talebi Oluştur
              </button>
              <button style={{ padding:'14px 32px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'#fff', borderRadius:14, fontWeight:700, fontSize:14, cursor:'pointer', fontFamily:'Manrope,sans-serif', transition:'background 0.2s' }}
                onMouseOver={e => e.currentTarget.style.background='rgba(255,255,255,0.1)'}
                onMouseOut={e => e.currentTarget.style.background='rgba(255,255,255,0.05)'}>
                Geri Bildirim Gönder
              </button>
            </div>
          </div>

        </section>
      </main>
      <SharedFooter {...ftrProps} />
    </>
  )
}

// ============================================================
// GİZLİLİK POLİTİKASI
// ============================================================
export function PrivacyPolicyPage({ onGoToLanding, onGoToAuth, onGoToHelp, onGoToTerms }) {
  const navProps = { active:'privacy', onGoToLanding, onGoToAuth, onGoToHelp, onGoToPrivacy:()=>{}, onGoToTerms }
  const sections = [
    { id:'veri-toplama', icon:'database', color:'#9ba8ff', bg:'rgba(155,168,255,0.1)', title:'Veri Toplama', content: <>
      <p style={{ color:'#aaabb0', lineHeight:1.8, marginBottom:20 }}>SavedLens, dijital hafıza asistanı olarak görevini yerine getirebilmek adına yalnızca sizin onay verdiğiniz verileri toplar.</p>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
        {[['Kimlik Bilgileri','E-posta adresi ve tercih ettiğiniz kullanıcı adı.'],['Hafıza İçerikleri','Kaydettiğiniz notlar, bağlantılar ve görsel dökümanlar.']].map(([t,d]) => (
          <div key={t} style={{ background:'#1d2025', borderRadius:14, padding:'18px 20px' }}>
            <div style={{ fontWeight:700, marginBottom:6 }}>{t}</div>
            <div style={{ fontSize:13, color:'#aaabb0' }}>{d}</div>
          </div>
        ))}
      </div>
      <p style={{ color:'#aaabb0', lineHeight:1.8 }}>Tüm veriler, asimetrik şifreleme yöntemleri ile cihazınızdan sunucularımıza aktarılmadan önce korunur.</p>
    </> },
    { id:'veri-kullanimi', icon:'psychology', color:'#9dabff', bg:'rgba(157,171,255,0.1)', title:'Veri Kullanımı', content: <>
      <div className="glass-panel" style={{ borderRadius:20, padding:28 }}>
        <p style={{ color:'#aaabb0', lineHeight:1.8, marginBottom:20 }}>Verileriniz hiçbir zaman üçüncü taraflara satılmaz veya pazarlama amacıyla paylaşılmaz. Yapay zeka asistanımız verilerinizi şu amaçlarla işler:</p>
        {['Hafıza geri çağırma ve akıllı arama optimizasyonu.','Kişiselleştirilmiş hatırlatıcılar ve bağlamsal öneriler.','Sistem güvenliğini artırmak ve hata tespiti yapmak.'].map(item => (
          <div key={item} style={{ display:'flex', gap:12, alignItems:'flex-start', marginBottom:14 }}>
            <span className="material-symbols-outlined" style={{ color:'#9ba8ff', fontSize:20, flexShrink:0 }}>check_circle</span>
            <span style={{ fontSize:14, color:'#f6f6fc', fontWeight:500, lineHeight:1.6 }}>{item}</span>
          </div>
        ))}
      </div>
    </> },
    { id:'cerezler', icon:'cookie', color:'#dde2f6', bg:'rgba(221,226,246,0.07)', title:'Çerezler', content: <>
      <p style={{ color:'#aaabb0', lineHeight:1.8, marginBottom:20 }}>Web sitemizde deneyiminizi iyileştirmek için minimum düzeyde çerez kullanıyoruz. Bunlar teknik olarak zorunlu oturum çerezleri ve fonksiyonel çerezlerdir.</p>
      <div style={{ borderRadius:14, overflow:'hidden', border:'1px solid rgba(255,255,255,0.05)' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
          <thead>
            <tr style={{ background:'#23262c' }}>
              {['Tür','Amaç','Süre'].map(h => <th key={h} style={{ padding:'12px 16px', textAlign:'left', color:'#f6f6fc', fontWeight:700 }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {[['Oturum','Giriş durumunuzu korumak için.','Tarayıcı kapatılana kadar'],['Analitik','Platform kullanım istatistikleri.','1 Yıl']].map(([t,a,s]) => (
              <tr key={t} style={{ borderTop:'1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding:'12px 16px', color:'#aaabb0' }}>{t}</td>
                <td style={{ padding:'12px 16px', color:'#aaabb0' }}>{a}</td>
                <td style={{ padding:'12px 16px', color:'#aaabb0' }}>{s}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </> },
    { id:'kullanici-haklari', icon:'gavel', color:'#ff6e84', bg:'rgba(255,110,132,0.1)', title:'Kullanıcı Hakları', content: <>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        {[['Veri Taşınabilirliği','Tüm verilerinizi istediğiniz an standart formatlarda (JSON, CSV) dışa aktarabilirsiniz.'],['Unutulma Hakkı','Hesabınızı sildiğinizde, tüm verileriniz sunucularımızdan kalıcı ve geri döndürülemez şekilde silinir.']].map(([t,d]) => (
          <div key={t} style={{ background:'#111318', borderRadius:20, padding:'28px 24px', borderTop:'2px solid rgba(155,168,255,0.15)' }}>
            <h3 style={{ fontSize:17, fontWeight:700, marginBottom:10 }}>{t}</h3>
            <p style={{ fontSize:13, color:'#aaabb0', lineHeight:1.75 }}>{d}</p>
          </div>
        ))}
      </div>
    </> },
  ]

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: sharedCss }} />
      <SharedNav {...navProps} />
      <div style={{ position:'fixed', top:'-10%', left:'-10%', width:'40%', height:'40%', background:'rgba(155,168,255,0.04)', borderRadius:'50%', filter:'blur(120px)', pointerEvents:'none', zIndex:0 }} />
      <div style={{ position:'fixed', bottom:'-10%', right:'-10%', width:'40%', height:'40%', background:'rgba(157,171,255,0.04)', borderRadius:'50%', filter:'blur(120px)', pointerEvents:'none', zIndex:0 }} />

      <main style={{ paddingTop:130, maxWidth:1000, margin:'0 auto', padding:'128px 32px 96px', position:'relative', zIndex:1 }}>
        <header style={{ marginBottom:64 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'#23262c', borderRadius:100, padding:'6px 16px', marginBottom:20, fontSize:11, color:'#9ba8ff', fontWeight:800, textTransform:'uppercase', letterSpacing:'0.14em' }}>
            <span className="material-symbols-outlined" style={{ fontSize:14 }}>security</span>
            Dijital Hafıza Güvenliği
          </div>
          <h1 style={{ fontSize:'clamp(32px,5vw,60px)', fontWeight:800, letterSpacing:'-1.5px', lineHeight:1.1, marginBottom:18 }}>
            Gizlilik <span style={{ color:'#9ba8ff', fontStyle:'italic' }}>Politikası</span>
          </h1>
          <p style={{ color:'#aaabb0', fontSize:16, maxWidth:600, lineHeight:1.8, fontWeight:400 }}>
            SavedLens olarak verilerinizin mahremiyeti bizim için bir özellik değil, temel bir haktır. Hafızanızı nasıl koruduğumuzu keşfedin.
          </p>
        </header>

        <div style={{ display:'grid', gridTemplateColumns:'200px 1fr', gap:40 }}>
          {/* Sidebar TOC */}
          <aside style={{ position:'sticky', top:96, height:'fit-content' }}>
            <nav style={{ display:'flex', flexDirection:'column', gap:4 }}>
              {sections.map((s,i) => (
                <a key={s.id} href={`#${s.id}`} style={{ padding:'8px 10px', borderRadius:8, fontSize:13, color: i===0 ? '#9ba8ff' : '#aaabb0', borderLeft: i===0 ? '2px solid #9ba8ff' : '2px solid transparent', background: i===0 ? 'rgba(155,168,255,0.06)' : 'transparent', fontWeight:500, transition:'all 0.2s' }}>{s.title}</a>
              ))}
            </nav>
            <div style={{ background:'#111318', borderRadius:12, padding:16, marginTop:24, fontSize:11, color:'#aaabb0' }}>
              <div style={{ marginBottom:6 }}>Son Güncelleme</div>
              <div style={{ fontWeight:700, color:'#f6f6fc', fontSize:13 }}>15 Ekim 2024</div>
            </div>
          </aside>

          {/* Content */}
          <div style={{ display:'flex', flexDirection:'column', gap:56 }}>
            {sections.map(s => (
              <section key={s.id} id={s.id}>
                <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:24 }}>
                  <div style={{ width:44, height:44, background:s.bg, borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <span className="material-symbols-outlined" style={{ color:s.color, fontSize:22 }}>{s.icon}</span>
                  </div>
                  <h2 style={{ fontSize:24, fontWeight:800, letterSpacing:'-0.3px' }}>{s.title}</h2>
                </div>
                {s.content}
              </section>
            ))}
          </div>
        </div>
      </main>
      <SharedFooter onGoToPrivacy={() => {}} onGoToTerms={navProps.onGoToTerms} onGoToHelp={navProps.onGoToHelp} />
    </>
  )
}

// ============================================================
// KULLANIM KOŞULLARI
// ============================================================
export function TermsOfUsePage({ onGoToLanding, onGoToAuth, onGoToHelp, onGoToPrivacy }) {
  const navProps = { active:'terms', onGoToLanding, onGoToAuth, onGoToHelp, onGoToPrivacy, onGoToTerms:()=>{} }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: sharedCss }} />
      <SharedNav {...navProps} />

      <main style={{ paddingTop:130, maxWidth:1000, margin:'0 auto', padding:'128px 32px 80px', position:'relative', zIndex:1 }}>
        <header style={{ marginBottom:52 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(155,168,255,0.08)', borderRadius:100, padding:'6px 16px', marginBottom:18, fontSize:11, color:'#9ba8ff', fontWeight:800, textTransform:'uppercase', letterSpacing:'0.14em' }}>
            <span className="material-symbols-outlined" style={{ fontSize:14 }}>gavel</span>
            Yasal Mevzuat
          </div>
          <h1 style={{ fontSize:'clamp(30px,5vw,56px)', fontWeight:800, letterSpacing:'-1.5px', lineHeight:1.1, marginBottom:16 }}>
            Kullanım Koşulları
          </h1>
          <p style={{ color:'#aaabb0', fontSize:15, maxWidth:600, lineHeight:1.8 }}>
            SavedLens dijital hafıza asistanını kullanarak, verilerinizin nasıl işlendiği ve platform kullanım kuralları konusundaki şartları kabul etmiş sayılırsınız.
          </p>
        </header>

        {/* Bento grid */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(12,1fr)', gap:20 }}>
          {/* Hizmet Şartları - large */}
          <section style={{ gridColumn:'span 8', background:'#1d2025', borderRadius:24, padding:'32px 28px', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:-30, right:-30, width:100, height:100, background:'rgba(155,168,255,0.05)', borderRadius:'50%', filter:'blur(40px)' }} />
            <div style={{ display:'flex', alignItems:'flex-start', gap:12, marginBottom:20 }}>
              <div style={{ background:'#23262c', borderRadius:14, padding:'10px', color:'#9ba8ff' }}>
                <span className="material-symbols-outlined">description</span>
              </div>
              <div>
                <h2 style={{ fontSize:22, fontWeight:800, marginBottom:4 }}>Hizmet Şartları</h2>
                <span style={{ fontSize:11, color:'rgba(170,171,176,0.6)', fontWeight:500 }}>Son Güncelleme: 14 Mart 2024</span>
              </div>
            </div>
            <p style={{ color:'#aaabb0', fontSize:13.5, lineHeight:1.8, marginBottom:12 }}>
              SavedLens, kullanıcılarına yapay zeka destekli bir dijital hafıza ve organizasyon hizmeti sunar. Bu hizmet, kişisel verilerin analiz edilmesini, kategorize edilmesini ve hatırlatılmasını içerir.
            </p>
            <p style={{ color:'#aaabb0', fontSize:13.5, lineHeight:1.8 }}>
              Hizmetin sürekliliği ve kalitesi için sistem güncellemeleri önceden haber verilmeksizin yapılabilir. Platformun amacı, kullanıcı deneyimini asistan odaklı bir yaklaşımla maksimize etmektir.
            </p>
          </section>

          {/* Sidebar info */}
          <div style={{ gridColumn:'span 4', display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ background:'rgba(137,153,255,0.07)', borderRadius:20, padding:'20px', border:'1px solid rgba(155,168,255,0.08)' }}>
              <h3 style={{ color:'#9ba8ff', fontWeight:700, marginBottom:10, display:'flex', alignItems:'center', gap:6, fontSize:14 }}>
                <span className="material-symbols-outlined" style={{ fontSize:18 }}>info</span> Özet Bilgi
              </h3>
              {['Asistan odaklı veri yönetimi.','Yüksek güvenlik standartları.','Fikri mülkiyet korunması.'].map(item => (
                <div key={item} style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, color:'#aaabb0', marginBottom:8 }}>
                  <div style={{ width:5, height:5, borderRadius:'50%', background:'#9ba8ff', flexShrink:0 }} />
                  {item}
                </div>
              ))}
            </div>
            <div style={{ background:'#23262c', borderRadius:20, padding:'20px' }}>
              <div style={{ fontSize:13, fontWeight:600, marginBottom:8 }}>Yardıma mı ihtiyacınız var?</div>
              <p style={{ fontSize:11, color:'#aaabb0', marginBottom:14, lineHeight:1.6 }}>Koşullar hakkında sorunuz varsa destek ekibimizle iletişime geçin.</p>
              <button style={{ width:'100%', padding:'10px', background:'#292c33', border:'none', borderRadius:12, color:'#f6f6fc', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>Destekle Konuş</button>
            </div>
          </div>

          {/* Kullanıcı Sorumlulukları */}
          <section style={{ gridColumn:'span 6', background:'#171a1f', borderRadius:24, padding:'28px 24px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
              <div style={{ background:'rgba(221,226,246,0.08)', borderRadius:14, padding:'10px' }}>
                <span className="material-symbols-outlined" style={{ color:'#dde2f6', fontSize:20 }}>person_check</span>
              </div>
              <h2 style={{ fontSize:20, fontWeight:800 }}>Kullanıcı Sorumlulukları</h2>
            </div>
            {[
              'Kullanıcılar, hesap bilgilerinin gizliliğinden ve platform üzerinden gerçekleştirilen tüm aktivitelerden bizzat sorumludur.',
              'Platformun kötüye kullanımı, otomatik veri çekme işlemleri ve sistem güvenliğini tehdit eden her türlü girişim yasaktır.',
            ].map((item, i) => (
              <div key={i} style={{ display:'flex', gap:14, marginBottom:16 }}>
                <span style={{ color:'#9ba8ff', fontWeight:800, fontSize:13, flexShrink:0 }}>0{i+1}.</span>
                <p style={{ fontSize:13, color:'#aaabb0', lineHeight:1.7 }}>{item}</p>
              </div>
            ))}
          </section>

          {/* Fikri Mülkiyet */}
          <section style={{ gridColumn:'span 6', background:'#111318', borderRadius:24, padding:'28px 24px', border:'1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
              <div style={{ background:'rgba(157,171,255,0.1)', borderRadius:14, padding:'10px' }}>
                <span className="material-symbols-outlined" style={{ color:'#9dabff', fontSize:20 }}>copyright</span>
              </div>
              <h2 style={{ fontSize:20, fontWeight:800 }}>Fikri Mülkiyet</h2>
            </div>
            <p style={{ fontSize:13, color:'#aaabb0', lineHeight:1.8 }}>
              SavedLens markası, logosu, arayüz tasarımları ve kullanılan yapay zeka algoritmaları SavedLens'in mülkiyetindedir. Kullanıcılar tarafından yüklenen içeriklerin mülkiyeti kullanıcıya aittir; ancak asistanın analizi için platforma sınırlı kullanım izni verilir.
            </p>
            <div style={{ marginTop:16, textAlign:'right', fontSize:9, color:'rgba(170,171,176,0.3)', fontWeight:700, letterSpacing:'0.18em', textTransform:'uppercase' }}>Legal Protection Enabled</div>
          </section>

          {/* Sorumluluk Reddi */}
          <section style={{ gridColumn:'span 12', background:'linear-gradient(135deg,#23262c,#111318)', borderRadius:24, padding:'28px 24px', border:'1px solid rgba(255,110,132,0.07)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, color:'#ff6e84', marginBottom:12 }}>
              <span className="material-symbols-outlined">warning</span>
              <h2 style={{ fontSize:20, fontWeight:800 }}>Sorumluluk Reddi</h2>
            </div>
            <p style={{ fontSize:13, color:'#aaabb0', lineHeight:1.8, maxWidth:800 }}>
              SavedLens, hizmeti "olduğu gibi" sunar. Yazılım hataları, geçici kesintiler veya verilerin asistan tarafından yanlış yorumlanması durumunda doğrudan bir garanti verilmez. Dijital hafıza kayıtlarının yedeklenmesi sorumluluğu, platformun sağladığı araçlara rağmen son kertede kullanıcıya aittir.
            </p>
          </section>
        </div>

        {/* Visual closer */}
        <div style={{ marginTop:64, display:'flex', flexDirection:'column', alignItems:'center' }}>
          <div style={{ width:1, height:80, background:'linear-gradient(to bottom,rgba(155,168,255,0.4),transparent)', marginBottom:20 }} />
          <p style={{ fontSize:10, color:'rgba(170,171,176,0.35)', fontWeight:700, letterSpacing:'0.2em', textTransform:'uppercase' }}>SavedLens Dijital Hafıza Asistanı © 2025</p>
        </div>
      </main>
      <SharedFooter onGoToPrivacy={navProps.onGoToPrivacy} onGoToTerms={() => {}} onGoToHelp={navProps.onGoToHelp} />
    </>
  )
}
