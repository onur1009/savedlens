'use client'

import { useState, useEffect } from 'react'
import {
  Smartphone,
  CheckCircle2,
  Copy,
  Check,
  Send,
  ExternalLink,
  ShieldCheck,
  Zap,
  KeyRound,
  Download,
  Share2,
  Sparkles,
  Terminal,
  MessageSquare,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function MobileSyncSettingsPage() {
  const [token, setToken] = useState<string>('')
  const [copiedToken, setCopiedToken] = useState(false)
  const [copiedWebhook, setCopiedWebhook] = useState(false)
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

  const webhookUrl = `https://savedlens.vercel.app/api/v1/mobile/ingest?token=${token}`

  function handleCopyToken() {
    if (!token) return
    navigator.clipboard.writeText(token)
    setCopiedToken(true)
    setTimeout(() => setCopiedToken(false), 2000)
  }

  function handleCopyWebhook() {
    navigator.clipboard.writeText(webhookUrl)
    setCopiedWebhook(true)
    setTimeout(() => setCopiedWebhook(false), 2000)
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
          text: 'https://www.instagram.com/reel/C-mobile_test_123/ — Mobil Kestirme Test Gönderisi',
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
          <div className="w-9 h-9 rounded-xl bg-pink-500/20 border border-pink-500/30 flex items-center justify-center text-pink-400">
            <Smartphone className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            Mobil Kaydetme (iOS Kestirmeler & Telegram Bot)
          </h1>
        </div>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Uygulama yüklemeden iPhone, iPad veya Android cihazınızdan Instagram Reels, TikTok ve Web bağlantılarını tek tıkla SavedLens hesabınıza aktarın.
        </p>
      </div>

      {/* ── 1. iOS Kestirmeler (Apple Shortcuts) ───────────────── */}
      <div className="glass rounded-2xl p-6 glow-border flex flex-col gap-5 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-pink-600 to-rose-600 flex items-center justify-center text-white font-bold shadow-lg">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[var(--text-primary)]">
                Özellik 1: iOS Kestirmeler (Apple Shortcuts)
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                iPhone / iPad cihazınızda Paylaş menüsüne SavedLens butonunu ekler.
              </p>
            </div>
          </div>

          <a
            href={`https://www.icloud.com/shortcuts/`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Kestirmeyi Yükle</span>
          </a>
        </div>

        {/* Setup Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] space-y-1.5">
            <span className="w-6 h-6 rounded-full bg-pink-950/60 text-pink-400 text-xs font-bold flex items-center justify-center border border-pink-800/40">
              1
            </span>
            <h4 className="text-xs font-bold text-white">Kestirmeyi Ekle</h4>
            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
              Yukarıdaki <strong>Kestirmeyi Yükle</strong> butonuna tıklayarak iPhone Kestirmeler uygulamanıza ekleyin.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] space-y-1.5">
            <span className="w-6 h-6 rounded-full bg-pink-950/60 text-pink-400 text-xs font-bold flex items-center justify-center border border-pink-800/40">
              2
            </span>
            <h4 className="text-xs font-bold text-white">Webhook URL Yapıştır</h4>
            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
              Kestirme ayarlarındaki URL kısmına aşağıdaki kişisel webhook adresinizi yapıştırın.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] space-y-1.5">
            <span className="w-6 h-6 rounded-full bg-pink-950/60 text-pink-400 text-xs font-bold flex items-center justify-center border border-pink-800/40">
              3
            </span>
            <h4 className="text-xs font-bold text-white">Paylaş & Kaydet!</h4>
            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
              Instagram veya Safari&apos;de Paylaş &gt; <strong>SavedLens&apos;e Aktar</strong> butonuna basın. Anında arşivlenir!
            </p>
          </div>
        </div>

        {/* Webhook Address Box */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-300">Kişisel Mobil Webhook Adresiniz:</label>
          <div className="flex items-center gap-2 p-1.5 rounded-xl bg-black/60 border border-[var(--border)]">
            <input
              type="text"
              readOnly
              value={webhookUrl}
              className="flex-1 bg-transparent px-3 py-1 text-xs font-mono text-pink-300 outline-none select-all truncate"
            />
            <button
              onClick={handleCopyWebhook}
              className="px-3.5 py-1.5 rounded-lg bg-pink-600 hover:bg-pink-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm shrink-0"
            >
              {copiedWebhook ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedWebhook ? 'Kopyalandı!' : 'Kopyala'}</span>
            </button>
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
              {copiedToken ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
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
              Mobil Kaydetme API Testi (Shortcuts & Webhook)
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Doğrudan <code className="text-pink-400 font-mono">POST /api/v1/mobile/ingest</code> servisine mobil paylaşım simülasyonu gönderir.
            </p>
          </div>

          <button
            onClick={handleTestMobileIngest}
            disabled={testStatus === 'loading'}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 disabled:opacity-50 shadow-md"
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
