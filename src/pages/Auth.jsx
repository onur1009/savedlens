import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '../supabase'

export default function AuthPage() {
  return (
    <div style={{
      minHeight:'100vh', background:'#0a0a0f',
      display:'flex', alignItems:'center', justifyContent:'center'
    }}>
      <div style={{
        width:'100%', maxWidth:420, padding:'40px',
        background:'#111118', borderRadius:16,
        border:'1px solid rgba(255,255,255,0.1)'
      }}>
        <div style={{textAlign:'center', marginBottom:32}}>
          <div style={{fontSize:32, marginBottom:8}}>📸</div>
          <h1 style={{color:'#f0f0f5', fontFamily:'sans-serif', fontSize:22, fontWeight:700}}>SavedLens</h1>
          <p style={{color:'#888899', fontSize:13, marginTop:6}}>Instagram koleksiyonunu yönet</p>
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
                  inputBorder: 'rgba(255,255,255,0.13)',
                  inputBorderFocus: '#a855f7',
                }
              }
            }
          }}
          providers={[]}
          localization={{
            variables: {
              sign_up: {
                email_label: 'E-posta',
                password_label: 'Şifre (en az 6 karakter)',
                button_label: 'Kayıt Ol',
                link_text: 'Hesabın yok mu? Kayıt ol',
                confirmation_text: 'E-postanı kontrol et, onay linki gönderdik'
              },
              sign_in: {
                email_label: 'E-posta',
                password_label: 'Şifre',
                button_label: 'Giriş Yap',
                link_text: 'Zaten hesabın var mı? Giriş yap'
              },
              forgotten_password: {
                link_text: 'Şifremi unuttum',
                button_label: 'Şifre sıfırlama linki gönder'
              }
            }
          }}
        />
      </div>
    </div>
  )
}