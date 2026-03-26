import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '../supabase'
import { Link } from 'react-router-dom'

export default function AuthPage() {
  return (
    <div style={{
      minHeight:'100vh', background:'#0a0a0f',
      display:'flex', alignItems:'center', justifyContent:'center',
      fontFamily: 'sans-serif'
    }}>
      <div style={{
        width:'100%', maxWidth:420, padding:'40px',
        background:'#111118', borderRadius:16,
        border:'1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 40px 100px rgba(0,0,0,0.5)'
      }}>
        <div style={{textAlign:'center', marginBottom:32}}>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <div style={{fontSize:40, marginBottom:16}}>📸</div>
          </Link>
          <h1 style={{color:'#f0f0f5', fontSize:26, fontWeight:800, margin:0, letterSpacing: '-1px'}}>Hoş Geldiniz</h1>
          <p style={{color:'#888899', fontSize:14, marginTop:8}}>İlhamınızı organize etmeye başlayın</p>
        </div>

        <Auth
          supabaseClient={supabase}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: '#a855f7',
                  brandAccent: '#7c3aed',
                  inputBackground: '#18181f',
                  inputText: '#f0f0f5',
                  inputBorder: 'rgba(255,255,255,0.1)',
                  inputBorderFocus: '#a855f7',
                }
              }
            }
          }}
          providers={['google', 'github']}
          localization={{
            variables: {
              sign_up: { email_label: 'E-posta', password_label: 'Şifre', button_label: 'Kayıt Ol', link_text: 'Hesabın yok mu? Kayıt ol' },
              sign_in: { email_label: 'E-posta', password_label: 'Şifre', button_label: 'Giriş Yap', link_text: 'Zaten hesabın var mı? Giriş yap' },
              forgotten_password: { link_text: 'Şifremi unuttum', button_label: 'Şifre sıfırlama linki gönder' }
            }
          }}
        />

        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <Link to="/" style={{ color: '#888899', fontSize: 13, textDecoration: 'none', opacity: 0.6 }}>← Anasayfaya Dön</Link>
        </div>
      </div>
    </div>
  )
}