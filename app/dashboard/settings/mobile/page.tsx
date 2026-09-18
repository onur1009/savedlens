'use client'

import { useState, useEffect } from 'react'
import {
  Smartphone,
  Check,
  Send,
  ExternalLink,
  ShieldCheck,
  Zap,
  KeyRound,
  Share2,
  Sparkles,
  Terminal,
  MessageSquare,
  Globe,
  Layers,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function MobileSyncSettingsPage() {
  const [token, setToken] = useState<string>('')
  const [copiedToken, setCopiedToken] = useState(false)
  const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [testResult, setTestResult] = useState<string | null>(null)

  useEffect(() => {
    async function loadUserToken() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setToken(user.id)
        } else {
          setToken('demo-user-token-offline')
        }
      } catch {
        setToken('demo-user-token-offline')
      }
    }
    loadUserToken()
  }, [])

  function handleCopyToken() {
    if (!token) return
    navigator.clipboard.writeText(token)
    setCopiedToken(true)
    setTimeout(() => setCopiedToken(false), 2000)
  }

  // Trigger Native Browser Web Share API if supported
  async function handleNativeShareTest() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'KREP PİZZA 🍕 — SavedLens Test',
          text: '5 Malzemeyle nefis fırınsız krep pizza tarifi!',
          url: 'https://www.instagram.com/reel/C-mobile_test_123/',
        })
      } catch {
        // user cancelled or share failed
      }
    } else {
      alert('Cihazınızda yerel Paylaşım Menüsü (Web Share API) bu tarayıcıda desteklenmiyor. Lütfen mobil cihazınızda Safari veya Chrome ile deneyin.')
    }
  }

  async function handleTestMobileIngest() {
    setTestStatus('loading')
    setTestResult(null)

    try {
      const res = await fetch('/api/v1/mobile/ingest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-savedlens-token': token,
        },
        body: JSON.stringify({
          url: 'https://www.instagram.com/reel/C-mobile_test_123/',
          text: 'https://www.instagram.com/reel/C-mobile_test_123/ — Yerel Mobil Paylaşım Testi',
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setTestStatus('success')
        setTestResult(`✓ Başarılı: ${data.message} (${data.title})`)
      } else {
        setTestStatus('error')
        setTestResult(`✗ Hata: ${data.error || 'Mobil kayıt başarısız'}`)
      }
    } catch (err: any) {
      setTestStatus('error')
      setTestResult(`✗ İstek hatası: ${err.message}`)
    }
  }

  return (
    <div className="flex flex-col gap-8 animate-fade-up max-w-4xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Smartphone className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            Mobil Yerel Paylaşım Menüsü & Telegram Bot
          </h1>
        </div>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Kestirme veya uygulama indirmeye gerek kalmadan, telefonunuzun kendi <strong>Paylaş (Share)</strong> menüsünden ve Telegram üzerinden içerikleri yapay zeka ile SavedLens kütüphanenize aktarın.
        </p>
      </div>

      {/* ── 1. Yerel Paylaşım Menüsü (Web Share Target / PWA) ──── */}
      <div className="glass rounded-2xl p-6 glow-border flex flex-col gap-5 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white font-bold shadow-lg">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[var(--text-primary)]">
                Özellik 1: Cihazın Yerel Paylaşım Menüsü (PWA Web Share Target)
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                Instagram, TikTok, YouTube veya Safari&apos;deki &quot;Paylaş&quot; listenize SavedLens amblemini 1. sınıf olarak ekler.
              </p>
            </div>
          </div>

          <button
            onClick={handleNativeShareTest}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shrink-0"
          >
            <Share2 className="w-4 h-4" />
            <span>Paylaşım Menüsünü Test Et</span>
          </button>
        </div>

        {/* 3 Step Visual Setup for PWA Native Share Target */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] space-y-1.5">
            <div className="w-6 h-6 rounded-full bg-indigo-950/80 text-indigo-400 text-xs font-bold flex items-center justify-center border border-indigo-800/40">
              1
            </div>
            <h4 className="text-xs font-bold text-white flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-indigo-400" />
              <span>Safari / Chrome&apos;da Aç</span>
            </h4>
            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
              Telefonunuzda Safari veya Chrome ile <code className="text-zinc-200 font-mono">savedlens.vercel.app</code> adresini açın.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] space-y-1.5">
            <div className="w-6 h-6 rounded-full bg-indigo-950/80 text-indigo-400 text-xs font-bold flex items-center justify-center border border-indigo-800/40">
              2
            </div>
            <h4 className="text-xs font-bold text-white flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>Ana Ekrana Ekle</span>
            </h4>
            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
              Tarayıcı menüsünden <strong>&quot;Ana Ekrana Ekle&quot;</strong> (Add to Home Screen) butonuna tıklayın.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] space-y-1.5">
            <div className="w-6 h-6 rounded-full bg-indigo-950/80 text-indigo-400 text-xs font-bold flex items-center justify-center border border-indigo-800/40">
              3
            </div>
            <h4 className="text-xs font-bold text-white flex items-center gap-1">
              <Share2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Paylaşım Listesinde Seç!</span>
            </h4>
            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
              Instagram veya herhangi bir uygulamada <strong>Paylaş &gt; SavedLens</strong> seçin. İçerik anında yapay zeka ile arşivlenir!
            </p>
          </div>
        </div>
      </div>

      {/* ── 2. Telegram & WhatsApp AI Bot Sync ──────────────────── */}
      <div className="glass rounded-2xl p-6 glow-border flex flex-col gap-5 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-lg">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[var(--text-primary)]">
                Özellik 2: Telegram AI Bot Entegrasyonu (@SavedLensBot)
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                Gönderileri sohbet mesajı veya iletilen mesaj (forward) olarak bota gönderin, anında yapay zeka ile arşivlesin.
              </p>
            </div>
          </div>

          <a
            href="https://t.me/SavedLensBot"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shrink-0"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Telegram Botunu Aç</span>
            <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
          </a>
        </div>

        {/* Telegram Command Guide */}
        <div className="p-4 rounded-xl bg-sky-950/30 border border-sky-800/40 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-sky-400" />
              Hesap Eşleştirme Komutu (Telegram Chat)
            </span>
            <button
              onClick={handleCopyToken}
              className="text-[11px] text-sky-300 hover:text-white flex items-center gap-1 font-medium"
            >
              {copiedToken ? <Check className="w-3 h-3 text-emerald-400" /> : <Share2 className="w-3 h-3" />}
              <span>Token Kopyala</span>
            </button>
          </div>

          <div className="bg-black/60 p-3 rounded-lg border border-sky-800/40 text-xs font-mono text-sky-200 select-all">
            <code>/start {token || 'KİŞİSEL_SYNC_TOKENINIZ'}</code>
          </div>

          <p className="text-[11px] text-sky-200/80 leading-relaxed">
            Telegram sohbetinde yukarıdaki komutu gönderdiğinizde SavedLens hesabınız Telegram ile bağlanır. Ardından tüm Reels ve Web bağlantılarınızı bu sohbete iletmeniz yeterlidir!
          </p>
        </div>
      </div>

      {/* ── 3. Mobil Kaydetme Canlı Testi ──────────────────────── */}
      <div className="glass rounded-2xl p-6 glow-border flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              Yerel Mobil Paylaşım API Testi (Share Target)
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Doğrudan <code className="text-indigo-400 font-mono">POST /api/v1/mobile/ingest</code> servisine mobil paylaşım simülasyonu gönderir.
            </p>
          </div>

          <button
            onClick={handleTestMobileIngest}
            disabled={testStatus === 'loading'}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 disabled:opacity-50 shadow-md"
          >
            {testStatus === 'loading' ? (
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Terminal className="w-3.5 h-3.5" />
            )}
            Mobil Test İsteği Gönder
          </button>
        </div>

        {testResult && (
          <div
            className={`p-3 rounded-xl text-xs font-mono border ${
              testStatus === 'success'
                ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-300'
                : 'bg-rose-950/30 border-rose-800/40 text-rose-300'
            }`}
          >
            {testResult}
          </div>
        )}
      </div>

      {/* Security & Reliability Footer */}
      <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] flex flex-col gap-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          Mobil Gizlilik & Yüksek Hız
        </h4>
        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
          Mobil entegrasyonlar telefonunuzda pil tüketmez ve uygulamanızın sürekli arka planda çalışmasını gerektirmez. Tüm yapay zeka analizleri sunucumuzda 1 saniyeden kısa sürede tamamlanır.
        </p>
      </div>
    </div>
  )
}
