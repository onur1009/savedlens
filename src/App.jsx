import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import AuthPage from './pages/Auth'
import Dashboard from './pages/Dashboard'
import LandingPage from './pages/LandingPage'
import HowToUsePage from './pages/HowToUsePage'
import { HelpCenterPage, PrivacyPolicyPage, TermsOfUsePage } from './pages/InfoPages'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState('landing')
  // page: 'landing'|'how'|'auth'|'help'|'privacy'|'terms'

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data }) => {
        setSession(data.session)
        setLoading(false)
      })
      .catch(err => {
        console.error('getSession error:', err)
        setLoading(false)
      })
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_, session) => setSession(session)
    )
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'#0c0e12',color:'#64748b',fontFamily:'Manrope,sans-serif',gap:12}}>
      <div style={{width:10,height:10,borderRadius:'50%',background:'#6366f1',animation:'pulse 1.2s ease-in-out infinite'}} />
      Yükleniyor...
    </div>
  )

  const go = p => () => setPage(p)
  const navProps = {
    onGoToLanding: go('landing'),
    onGoToAuth:    go('auth'),
    onGoToHelp:    go('help'),
    onGoToPrivacy: go('privacy'),
    onGoToTerms:   go('terms'),
    onGoToHow:     go('how'),
  }

  if (session) return <Dashboard session={session} />

  switch (page) {
    case 'auth':    return <AuthPage {...navProps} />
    case 'how':     return <HowToUsePage {...navProps} />
    case 'help':    return <HelpCenterPage {...navProps} />
    case 'privacy': return <PrivacyPolicyPage {...navProps} />
    case 'terms':   return <TermsOfUsePage {...navProps} />
    default:        return <LandingPage {...navProps} />
  }
}