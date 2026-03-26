import { Link } from 'react-router-dom'

const cards = [
  { id: 1, img: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400&h=500&fit=crop', title: 'Minimalist UI' },
  { id: 2, img: 'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe4?w=400&h=500&fit=crop', title: 'Creative Motion' },
  { id: 3, img: 'https://images.unsplash.com/photo-1611162618071-b39a2ec055fb?w=400&h=500&fit=crop', title: 'Modern Aesthetics' },
  { id: 4, img: 'https://images.unsplash.com/photo-1611162616475-46b635cb6868?w=400&h=500&fit=crop', title: 'Digital Curation' },
  { id: 5, img: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=400&h=500&fit=crop', title: 'Sleek Design' },
]

export default function Home() {
  return (
    <div style={{ background: '#0a0a0f', color: '#fff', minHeight: '100vh', fontFamily: 'sans-serif', overflowX: 'hidden' }}>
      <style>{`
        @keyframes flow {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-flow {
          display: flex;
          width: calc(400px * 10);
          animation: flow 30s linear infinite;
        }
        .hero-gradient {
          background: radial-gradient(circle at 50% 50%, rgba(168, 85, 247, 0.15) 0%, transparent 50%);
        }
      `}</style>

      {/* Nav */}
      <nav style={{ padding: '30px 60px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'fixed', width: '100%', zIndex: 100, backdropFilter: 'blur(10px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #a855f7, #f472b6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📸</div>
          <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.5px' }}>SavedLens</span>
        </div>
        <Link to="/auth" style={{ padding: '10px 24px', borderRadius: 100, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', textDecoration: 'none', fontSize: 14, fontWeight: 600, transition: '0.2s' }}>Giriş Yap</Link>
      </nav>

      {/* Hero */}
      <section className="hero-gradient" style={{ paddingTop: 160, paddingBottom: 100, textAlign: 'center', position: 'relative' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 20px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 100, background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.2)', color: '#c084fc', fontSize: 12, fontWeight: 700, marginBottom: 24, textTransform: 'uppercase', letterSpacing: 1 }}>
            ✨ AI Destekli Dijital Küratör
          </div>
          <h1 style={{ fontSize: 'clamp(40px, 8vw, 72px)', fontWeight: 900, letterSpacing: '-2px', lineHeight: 1, marginBottom: 24 }}>
            İlham Aldığın Her Şey <br />
            <span style={{ color: '#a855f7' }}>Tek Bir Yerde.</span>
          </h1>
          <p style={{ fontSize: 18, color: '#888899', lineHeight: 1.6, marginBottom: 40, maxWidth: 600, margin: '0 auto 40px' }}>
            Instagram'da kaydettiğin Reels ve gönderileri yapay zeka ile organize et, analiz et ve fikirlerini eyleme dönüştür.
          </p>
          <Link to="/auth" style={{ padding: '16px 40px', borderRadius: 100, background: '#a855f7', color: '#fff', textDecoration: 'none', fontSize: 16, fontWeight: 700, boxShadow: '0 20px 40px rgba(168, 85, 247, 0.3)', display: 'inline-block' }}>
            Hemen Başla — Ücretsiz
          </Link>
        </div>

        {/* Card Animation */}
        <div style={{ marginTop: 80, overflow: 'hidden', position: 'relative' }}>
          <div className="animate-flow">
            {[...cards, ...cards].map((card, i) => (
              <div key={i} style={{ width: 300, height: 400, margin: '0 15px', borderRadius: 24, overflow: 'hidden', flexShrink: 0, border: '1px solid rgba(255,255,255,0.1)', position: 'relative' }}>
                <img src={card.img} alt={card.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 24, background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{card.title}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '100px 60px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 40 }}>
          <div style={{ padding: 40, borderRadius: 32, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: 32, marginBottom: 20 }}>🤖</div>
            <h3 style={{ fontSize: 20, marginBottom: 12 }}>AI Özetleme</h3>
            <p style={{ color: '#888899', lineHeight: 1.6 }}>Uzun açıklamaları tek tıkla özetle ve içeriğin özünü anında kavra.</p>
          </div>
          <div style={{ padding: 40, borderRadius: 32, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: 32, marginBottom: 20 }}>📂</div>
            <h3 style={{ fontSize: 20, marginBottom: 12 }}>Akıllı Kategoriler</h3>
            <p style={{ color: '#888899', lineHeight: 1.6 }}>İçeriklerini projelerine göre grupla ve aradığını saniyeler içinde bul.</p>
          </div>
          <div style={{ padding: 40, borderRadius: 32, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: 32, marginBottom: 20 }}>💬</div>
            <h3 style={{ fontSize: 20, marginBottom: 12 }}>İçerikle Sohbet</h3>
            <p style={{ color: '#888899', lineHeight: 1.6 }}>Kaydettiğin içerik hakkında yapay zekaya sorular sor, yeni fikirler üret.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '60px', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center', color: '#555' }}>
        <div style={{ marginBottom: 20, fontWeight: 700, color: '#888' }}>SavedLens &copy; 2026</div>
        <div style={{ fontSize: 12 }}>Created with passion for curators.</div>
      </footer>
    </div>
  )
}
