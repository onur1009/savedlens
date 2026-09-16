import { useState } from 'react'
import { supabase } from '../supabase'

import logo from '../assets/logo.png'
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');

  * { box-sizing: border-box; }
  .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24; vertical-align: middle; line-height: 1; }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .auth-card { animation: fadeIn 0.5s ease both; }

  .auth-input {
    width: 100%;
    background: rgba(99,102,241,0.05);
    border: none;
    border-radius: 12px;
    padding: 13px 14px 13px 44px;
    color: #f1f5f9;
    font-family: 'Manrope', sans-serif;
    font-size: 14px;
    outline: none;
    transition: background 0.2s, box-shadow 0.2s;
  }
  .auth-input::placeholder { color: #475569; }
  .auth-input:focus {
    background: rgba(99,102,241,0.1);
    box-shadow: 0 0 0 1px rgba(99,102,241,0.5);
  }
  .auth-label {
    display: block;
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    color: #64748b;
    margin-bottom: 6px;
    margin-left: 4px;
  }
  .auth-btn-primary {
    width: 100%;
    padding: 14px;
    background: #6366f1;
    color: #fff;
    border: none;
    border-radius: 12px;
    font-family: 'Manrope', sans-serif;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: box-shadow 0.3s, transform 0.15s, background 0.2s;
    margin-top: 8px;
  }
  .auth-btn-primary:hover:not(:disabled) { box-shadow: 0 0 28px rgba(99,102,241,0.4); }
  .auth-btn-primary:active:not(:disabled) { transform: scale(0.98); }
  .auth-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

  .auth-divider { display: flex; align-items: center; gap: 12px; }
  .auth-divider::before, .auth-divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: rgba(99,102,241,0.12);
  }

  .tab-btn {
    flex: 1; padding: 10px; border: none; border-radius: 10px;
    font-family: 'Manrope', sans-serif; font-size: 13px; font-weight: 700;
    cursor: pointer; transition: all 0.2s;
  }
  .tab-btn.active { background: #6366f1; color: #fff; box-shadow: 0 4px 20px rgba(99,102,241,0.3); }
  .tab-btn.inactive { background: transparent; color: #64748b; }
  .tab-btn.inactive:hover { color: #94a3b8; background: rgba(255,255,255,0.03); }

  .auth-error {
    background: rgba(248,113,113,0.1);
    border: 1px solid rgba(248,113,113,0.25);
    border-radius: 10px;
    padding: 10px 14px;
    font-size: 13px;
    color: #f87171;
    font-weight: 500;
  }
  .auth-success {
    background: rgba(74,222,128,0.1);
    border: 1px solid rgba(74,222,128,0.25);
    border-radius: 10px;
    padding: 10px 14px;
    font-size: 13px;
    color: #4ade80;
    font-weight: 500;
  }

  /* REPONSIVE */
  .auth-nav { padding: 0 36px; height: 130px; }
  .auth-logo-header { height: 150px; }
  .auth-main { padding: 24px 16px 80px; }
  .auth-card { padding: 28px 28px 24px; }
  
  @media (max-width: 768px) {
    .auth-nav { padding: 0 16px; height: 90px; }
    .auth-logo-header { height: 110px; }
    .auth-main { padding: 12px 16px 60px; }
    .auth-card { padding: 24px 20px 20px; }
  }

  .input-wrap { position: relative; }
  .input-icon {
    position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
    color: #475569; font-size: 18px; pointer-events: none;
    transition: color 0.2s;
  }
  .input-wrap:focus-within .input-icon { color: #818cf8; }
`

export default function AuthPage({ onGoToLanding, onGoToHelp, onGoToPrivacy, onGoToTerms }) {
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const reset = () => { setError(''); setSuccess(''); }

  const handleLogin = async e => {
    e.preventDefault(); reset(); setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setLoading(false)
  }

  const handleRegister = async e => {
    e.preventDefault(); reset()
    if (password !== confirmPass) { setError('Şifreler eşleşmiyor.'); return }
    if (password.length < 6) { setError('Şifre en az 6 karakter olmalı.'); return }
    setLoading(true)
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { username } } })
    if (error) setError(error.message)
    else setSuccess('Kayıt başarılı! E-postanı kontrol et, onay linki gönderdik 📬')
    setLoading(false)
  }

  const isLogin = mode === 'login'

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />

      {/* Background glow layers */}
      <div style={{ position:'fixed', top:'25%', right:'-80px', width:320, height:320, background:'rgba(99,102,241,0.09)', borderRadius:'50%', filter:'blur(100px)', pointerEvents:'none', zIndex:0 }} />
      <div style={{ position:'fixed', bottom:'25%', left:'-80px', width:260, height:260, background:'rgba(99,102,241,0.07)', borderRadius:'50%', filter:'blur(80px)', pointerEvents:'none', zIndex:0 }} />

      <div style={{ minHeight:'100vh', background:'#0c0e12', display:'flex', flexDirection:'column', fontFamily:'Manrope, sans-serif', position:'relative' }}>

        {/* Nav */}
        <nav className="auth-nav" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', position:'relative', zIndex:10 }}>
          <div style={{ display:'flex', alignItems:'center', cursor:'pointer' }} onClick={onGoToLanding}>
            <img className="auth-logo-header" src={logo} alt="SavedLens Logo" style={{ width:'auto', objectFit:'contain', marginTop:15 }} />
          </div>
          <div style={{ display:'flex', gap:7, alignItems:'center', fontSize:13, color:'rgba(148,163,184,0.6)', cursor:'pointer' }} onClick={onGoToHelp}>
            <span className="material-symbols-outlined" style={{ fontSize:16 }}>help_outline</span>
            Yardım
          </div>
        </nav>

        {/* Main */}
        <main className="auth-main" style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', position:'relative', zIndex:5 }}>
          <div style={{ width:'100%', maxWidth:460 }}>

            {/* Logo / title */}
            <div style={{ textAlign:'center', marginBottom:28 }}>
            <div style={{ width:150, height:150, background:'none', display:'inline-flex', alignItems:'center', justifyContent:'center', marginBottom:24 }}>
              <img src={logo} alt="SavedLens Logo" style={{ width:150, height:150, objectFit:'contain' }} />
            </div>
              <h1 style={{ fontSize:28, fontWeight:800, color:'#f1f5f9', letterSpacing:'-0.8px', marginBottom:6 }}>
                {isLogin ? 'Hoş geldin!' : 'Hesap oluştur'}
              </h1>
              <p style={{ fontSize:13, color:'#64748b', fontWeight:500 }}>
                {isLogin ? 'Dijital hafızana ve asistanına erişmek için giriş yap.' : 'SavedLens\'e ücretsiz katıl, hafızanı oluşturmaya başla.'}
              </p>
            </div>

            {/* Card */}
            <div className="auth-card" key={mode} style={{ background:'rgba(22,25,34,0.75)', backdropFilter:'blur(24px)', border:'1px solid rgba(99,102,241,0.1)', borderRadius:22 }}>

              {/* Tabs */}
              <div style={{ display:'flex', gap:6, background:'rgba(0,0,0,0.2)', borderRadius:12, padding:4, marginBottom:24 }}>
                <button className={`tab-btn ${isLogin ? 'active' : 'inactive'}`} onClick={() => { setMode('login'); reset(); }}>
                  Giriş Yap
                </button>
                <button className={`tab-btn ${!isLogin ? 'active' : 'inactive'}`} onClick={() => { setMode('register'); reset(); }}>
                  Kayıt Ol
                </button>
              </div>

              {/* Error / Success */}
              {error && <div className="auth-error" style={{ marginBottom:16 }}>{error}</div>}
              {success && <div className="auth-success" style={{ marginBottom:16 }}>{success}</div>}

              {/* Form */}
              <form onSubmit={isLogin ? handleLogin : handleRegister} style={{ display:'flex', flexDirection:'column', gap:16 }}>

                {/* Username (register only) */}
                {!isLogin && (
                  <div>
                    <label className="auth-label">Kullanıcı Adı</label>
                    <div className="input-wrap">
                      <span className="material-symbols-outlined input-icon">person</span>
                      <input className="auth-input" type="text" placeholder="kullanıcı_adı" value={username} onChange={e => setUsername(e.target.value)} required />
                    </div>
                  </div>
                )}

                {/* Email */}
                <div>
                  <label className="auth-label">E-posta</label>
                  <div className="input-wrap">
                    <span className="material-symbols-outlined input-icon">mail</span>
                    <input className="auth-input" type="email" placeholder="ornek@savedlens.com" value={email} onChange={e => setEmail(e.target.value)} required />
                  </div>
                </div>

                {/* Password row with forgot link */}
                <div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                    <label className="auth-label" style={{ margin:0 }}>Şifre</label>
                    {isLogin && (
                      <button type="button" style={{ background:'none', border:'none', color:'#818cf8', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                        Şifremi Unuttum
                      </button>
                    )}
                  </div>
                  <div className="input-wrap">
                    <span className="material-symbols-outlined input-icon">lock</span>
                    <input className="auth-input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
                  </div>
                </div>

                {/* Confirm password (register only) */}
                {!isLogin && (
                  <div>
                    <label className="auth-label">Şifre Tekrarı</label>
                    <div className="input-wrap">
                      <span className="material-symbols-outlined input-icon">security</span>
                      <input className="auth-input" type="password" placeholder="••••••••" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} required />
                    </div>
                  </div>
                )}

                {/* KVKK (register only) */}
                {!isLogin && (
                  <label style={{ display:'flex', alignItems:'flex-start', gap:10, fontSize:12, color:'#64748b', fontWeight:500, lineHeight:1.6, cursor:'pointer' }}>
                    <input type="checkbox" required style={{ marginTop:2, accentColor:'#6366f1', flexShrink:0 }} />
                    <span>
                      <span style={{ color:'#818cf8', textDecoration:'underline', cursor:'pointer' }}>KVKK Aydınlatma Metni</span>'ni okudum ve kabul ediyorum.
                    </span>
                  </label>
                )}

                <button className="auth-btn-primary" type="submit" disabled={loading}>
                  {loading
                    ? <><span className="material-symbols-outlined" style={{ fontSize:18, animation:'spin 1s linear infinite' }}>autorenew</span> Bekle...</>
                    : isLogin
                      ? <><span>Giriş Yap</span><span className="material-symbols-outlined" style={{ fontSize:18 }}>arrow_forward</span></>
                      : <span>Ücretsiz Kayıt Ol</span>
                  }
                </button>
              </form>

              {/* Divider */}
              <div className="auth-divider" style={{ margin:'20px 0', fontSize:10, color:'#334155', fontWeight:800, textTransform:'uppercase', letterSpacing:'0.18em' }}>veya</div>

              {/* Google SSO */}
              <button
                onClick={async () => {
                  await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })
                }}
                style={{ width:'100%', padding:'12px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(99,102,241,0.1)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', gap:10, color:'#cbd5e1', fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit', transition:'background 0.2s' }}
                onMouseOver={e => e.currentTarget.style.background='rgba(255,255,255,0.08)'}
                onMouseOut={e => e.currentTarget.style.background='rgba(255,255,255,0.04)'}
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#E0E7FF"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#E0E7FF"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#E0E7FF"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#E0E7FF"/>
                </svg>
                Google ile devam et
              </button>

            </div>

            {/* Bottom link */}
            <p style={{ textAlign:'center', marginTop:20, fontSize:13, color:'#64748b', fontWeight:500 }}>
              {isLogin ? 'Hesabın yok mu?' : 'Zaten hesabın var mı?'}{' '}
              <button onClick={() => { setMode(isLogin ? 'register' : 'login'); reset(); }}
                style={{ background:'none', border:'none', color:'#818cf8', fontWeight:700, cursor:'pointer', fontFamily:'inherit', fontSize:13, textDecoration:'underline' }}>
                {isLogin ? 'Kayıt Ol' : 'Giriş Yap'}
              </button>
            </p>
          </div>
        </main>

        {/* Footer */}
        <footer style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 36px', borderTop:'1px solid rgba(255,255,255,0.04)', flexWrap:'wrap', gap:12, position:'relative', zIndex:5 }}>
          <span style={{ fontSize:11, color:'rgba(100,116,139,0.4)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.12em' }}>© 2025 SavedLens Dijital Hafıza</span>
          <div style={{ display:'flex', gap:20 }}>
            {[
              { label: 'Gizlilik Politikası', handler: onGoToPrivacy },
              { label: 'Kullanım Koşulları', handler: onGoToTerms },
              { label: 'Yardım', handler: onGoToHelp }
            ].map(l => (
              <a key={l.label} href="#" style={{ color:'rgba(100,116,139,0.4)', textDecoration:'none', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.12em', transition:'color 0.2s' }}
                onClick={e => { e.preventDefault(); l.handler(); }}
                onMouseOver={e => e.target.style.color='#818cf8'}
                onMouseOut={e => e.target.style.color='rgba(100,116,139,0.4)'}>{l.label}</a>
            ))}
          </div>
        </footer>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { to { transform: rotate(360deg); } }` }} />
    </>
  )
}